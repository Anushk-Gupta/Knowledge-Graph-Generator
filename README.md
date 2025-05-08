# Knowledge Graph Generator

This application creates a Knowledge Representation Graph from various content sources:
- Text input
- PDF files
- Web URLs

## Features

- Extract entities and relationships from text using NLP
- Process PDF documents and extract their content
- Scrape web pages and extract meaningful text
- Visualize knowledge graphs with interactive network visualization
- Responsive design for desktop and mobile devices

## Technologies Used

- **Backend**: Python, Flask
- **NLP**: spaCy
- **PDF Processing**: PyPDF2
- **Web Scraping**: BeautifulSoup4, Requests
- **Graph Visualization**: vis.js
- **Frontend**: HTML, CSS, JavaScript

## Local Development

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Download the spaCy model:
   ```
   python -m spacy download en_core_web_sm
   ```
4. Run the application:
   ```
   python app.py
   ```
5. Open your browser and navigate to `http://localhost:5000`

## Deployment

This application is configured for deployment on Render.com:

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - Build Command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm`
   - Start Command: `gunicorn app:app`

## Usage

1. Choose your input method (Text, PDF, or URL)
2. Enter or upload your content
3. Click "Generate Graph"
4. Explore the interactive knowledge graph
   - Zoom in/out using the mouse wheel
   - Pan by clicking and dragging
   - Click on nodes to see entity details

## License

MIT
