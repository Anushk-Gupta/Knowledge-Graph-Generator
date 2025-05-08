import os
import json
import uuid
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import spacy
import networkx as nx
from werkzeug.utils import secure_filename
import PyPDF2
import requests
from bs4 import BeautifulSoup

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    # If model is not installed, download it
    import subprocess
    subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file"""
    text = ""
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page_num in range(len(pdf_reader.pages)):
            text += pdf_reader.pages[page_num].extract_text()
    return text

def extract_text_from_url(url):
    """Extract text from a URL"""
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.extract()

        # Get text
        text = soup.get_text()

        # Break into lines and remove leading and trailing space on each
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Remove blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)

        return text
    except Exception as e:
        return f"Error extracting text from URL: {str(e)}"

def generate_knowledge_graph(text):
    """Generate a knowledge graph from text using spaCy"""
    try:
        # Limit text length to prevent processing issues
        if len(text) > 10000:
            text = text[:10000]

        doc = nlp(text)

        # Create a directed graph
        G = nx.DiGraph()

        # Extract entities and add as nodes
        entities = {}
        for ent in doc.ents:
            # Clean entity text to avoid issues
            clean_text = ent.text.strip()
            if not clean_text or len(clean_text) > 100:
                continue

            if clean_text not in entities:
                entities[clean_text] = {
                    "id": str(uuid.uuid4()),
                    "label": clean_text,
                    "type": ent.label_
                }
                G.add_node(entities[clean_text]["id"], label=clean_text, type=ent.label_)

        # If no entities found, return empty graph
        if not entities:
            return {"nodes": [], "edges": []}

        # Extract relationships from sentences
        edges = []
        for sent in doc.sents:
            try:
                # Get entities in this sentence
                sent_entities = []
                for ent in doc.ents:
                    if ent.start >= sent.start and ent.end <= sent.end:
                        clean_text = ent.text.strip()
                        if clean_text in entities:
                            sent_entities.append(ent)

                # Connect entities within the same sentence
                for i, entity1 in enumerate(sent_entities):
                    for entity2 in sent_entities[i+1:]:
                        entity1_text = entity1.text.strip()
                        entity2_text = entity2.text.strip()

                        if entity1_text in entities and entity2_text in entities:
                            # Find the verb connecting these entities if possible
                            verbs = [token for token in sent if token.pos_ == "VERB"]
                            relation = verbs[0].text if verbs else "related_to"

                            # Create a unique edge ID by including a UUID
                            edge_id = f"{entities[entity1_text]['id']}-{entities[entity2_text]['id']}-{str(uuid.uuid4())}"

                            # Add edge to graph
                            G.add_edge(
                                entities[entity1_text]["id"],
                                entities[entity2_text]["id"],
                                id=edge_id,
                                label=relation
                            )

                            edges.append({
                                "id": edge_id,
                                "source": entities[entity1_text]["id"],
                                "target": entities[entity2_text]["id"],
                                "label": relation
                            })
            except Exception as e:
                print(f"Error processing sentence: {str(e)}")
                continue

        # Convert to format suitable for visualization
        nodes = [{"id": data["id"], "label": data["label"], "type": data["type"]}
                for _, data in entities.items()]

        return {
            "nodes": nodes,
            "edges": edges
        }
    except Exception as e:
        print(f"Error generating knowledge graph: {str(e)}")
        return {"nodes": [], "edges": [], "error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """Process text input and generate knowledge graph"""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text']
        if not text.strip():
            return jsonify({"error": "Empty text provided"}), 400

        print(f"Processing text of length: {len(text)}")
        graph_data = generate_knowledge_graph(text)

        # Check if we have any nodes
        if not graph_data.get("nodes"):
            return jsonify({"error": "No entities found in the text. Try a different text with named entities."}), 400

        return jsonify(graph_data)
    except Exception as e:
        print(f"Error in process_text: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/process-file', methods=['POST'])
def process_file():
    """Process uploaded file and generate knowledge graph"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            try:
                if filename.endswith('.pdf'):
                    text = extract_text_from_pdf(file_path)
                else:  # Assume it's a text file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        text = f.read()

                if not text.strip():
                    return jsonify({"error": "No text could be extracted from the file"}), 400

                print(f"Processing file text of length: {len(text)}")
                graph_data = generate_knowledge_graph(text)

                # Check if we have any nodes
                if not graph_data.get("nodes"):
                    return jsonify({"error": "No entities found in the file. Try a different file with named entities."}), 400

                return jsonify(graph_data)
            except Exception as e:
                print(f"Error processing file: {str(e)}")
                return jsonify({"error": f"Error processing file: {str(e)}"}), 500

        return jsonify({"error": "File type not allowed"}), 400
    except Exception as e:
        print(f"Error in process_file: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/api/process-url', methods=['POST'])
def process_url():
    """Process URL and generate knowledge graph"""
    try:
        data = request.json
        if not data or 'url' not in data:
            return jsonify({"error": "No URL provided"}), 400

        url = data['url']
        if not url.strip():
            return jsonify({"error": "Empty URL provided"}), 400

        print(f"Processing URL: {url}")
        text = extract_text_from_url(url)

        if text.startswith("Error"):
            return jsonify({"error": text}), 400

        if not text.strip():
            return jsonify({"error": "No text could be extracted from the URL"}), 400

        print(f"Extracted text of length: {len(text)}")
        graph_data = generate_knowledge_graph(text)

        # Check if we have any nodes
        if not graph_data.get("nodes"):
            return jsonify({"error": "No entities found in the URL content. Try a different URL with named entities."}), 400

        return jsonify(graph_data)
    except Exception as e:
        print(f"Error in process_url: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
