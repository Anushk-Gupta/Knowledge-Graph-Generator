document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = `${button.dataset.tab}-tab`;
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // File input display
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileName.textContent = fileInput.files[0].name;
        } else {
            fileName.textContent = 'No file chosen';
        }
    });
    
    // Network graph visualization setup
    let network = null;
    
    function initializeNetwork(data) {
        const container = document.getElementById('graph');
        
        // Create nodes with different colors based on entity type
        const nodes = new vis.DataSet(
            data.nodes.map(node => ({
                id: node.id,
                label: node.label,
                title: `Type: ${node.type}`,
                color: getNodeColor(node.type),
                font: { size: 14 }
            }))
        );
        
        // Create edges
        const edges = new vis.DataSet(
            data.edges.map(edge => ({
                id: edge.id,
                from: edge.source,
                to: edge.target,
                label: edge.label,
                arrows: 'to',
                font: { size: 12, align: 'middle' }
            }))
        );
        
        // Network configuration
        const options = {
            nodes: {
                shape: 'dot',
                size: 16,
                borderWidth: 2,
                shadow: true
            },
            edges: {
                width: 2,
                shadow: true,
                smooth: { type: 'continuous' }
            },
            physics: {
                stabilization: true,
                barnesHut: {
                    gravitationalConstant: -80000,
                    springConstant: 0.001,
                    springLength: 200
                }
            },
            interaction: {
                navigationButtons: true,
                keyboard: true,
                tooltipDelay: 300,
                hover: true
            }
        };
        
        // Initialize network
        network = new vis.Network(container, { nodes, edges }, options);
        
        // Update graph info
        document.getElementById('node-count').textContent = `Nodes: ${data.nodes.length}`;
        document.getElementById('edge-count').textContent = `Edges: ${data.edges.length}`;
        
        // Show graph container
        document.getElementById('graph-container').style.display = 'block';
        
        // Add event listeners for node/edge selection
        network.on('selectNode', function(params) {
            if (params.nodes.length === 1) {
                const nodeId = params.nodes[0];
                const node = nodes.get(nodeId);
                console.log('Selected node:', node);
            }
        });
    }
    
    function getNodeColor(entityType) {
        // Color mapping for different entity types
        const colorMap = {
            'PERSON': '#e74c3c',      // Red
            'ORG': '#3498db',         // Blue
            'GPE': '#2ecc71',         // Green
            'LOC': '#9b59b6',         // Purple
            'DATE': '#f39c12',        // Orange
            'TIME': '#1abc9c',        // Teal
            'MONEY': '#f1c40f',       // Yellow
            'PERCENT': '#e67e22',     // Dark Orange
            'FACILITY': '#95a5a6',    // Gray
            'PRODUCT': '#d35400'      // Brown
        };
        
        return colorMap[entityType] || '#7f8c8d'; // Default gray
    }
    
    // Form submission handlers
    const textForm = document.getElementById('text-form');
    const fileForm = document.getElementById('file-form');
    const urlForm = document.getElementById('url-form');
    const loadingIndicator = document.getElementById('loading');
    
    textForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('text-input').value.trim();
        
        if (!text) {
            alert('Please enter some text');
            return;
        }
        
        try {
            loadingIndicator.style.display = 'block';
            
            const response = await fetch('/api/process-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error('Server error');
            }
            
            const data = await response.json();
            initializeNetwork(data);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while processing the text');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });
    
    fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('file-input');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a file');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        try {
            loadingIndicator.style.display = 'block';
            
            const response = await fetch('/api/process-file', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Server error');
            }
            
            const data = await response.json();
            initializeNetwork(data);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while processing the file');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });
    
    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('url-input').value.trim();
        
        if (!url) {
            alert('Please enter a URL');
            return;
        }
        
        try {
            loadingIndicator.style.display = 'block';
            
            const response = await fetch('/api/process-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            
            if (!response.ok) {
                throw new Error('Server error');
            }
            
            const data = await response.json();
            initializeNetwork(data);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while processing the URL');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });
});
