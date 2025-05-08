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
        try {
            const container = document.getElementById('graph');

            // Validate data
            if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
                showError('Invalid graph data received from server');
                return;
            }

            // Check for duplicate IDs and make them unique if needed
            const nodeIds = new Set();
            const edgeIds = new Set();

            // Process nodes
            const processedNodes = data.nodes.map(node => {
                // Ensure node has an ID
                if (!node.id) {
                    node.id = `node-${Math.random().toString(36).substr(2, 9)}`;
                }

                // Make ID unique if duplicate
                if (nodeIds.has(node.id)) {
                    node.id = `${node.id}-${Math.random().toString(36).substr(2, 9)}`;
                }

                nodeIds.add(node.id);

                return {
                    id: node.id,
                    label: node.label || 'Unknown',
                    title: `Type: ${node.type || 'Unknown'}`,
                    color: getNodeColor(node.type),
                    font: { size: 14 }
                };
            });

            // Process edges
            const processedEdges = data.edges.map(edge => {
                // Ensure edge has an ID
                if (!edge.id) {
                    edge.id = `edge-${Math.random().toString(36).substr(2, 9)}`;
                }

                // Make ID unique if duplicate
                if (edgeIds.has(edge.id)) {
                    edge.id = `${edge.id}-${Math.random().toString(36).substr(2, 9)}`;
                }

                edgeIds.add(edge.id);

                return {
                    id: edge.id,
                    from: edge.source,
                    to: edge.target,
                    label: edge.label || '',
                    arrows: 'to',
                    font: { size: 12, align: 'middle' }
                };
            });

            // Create datasets
            const nodes = new vis.DataSet(processedNodes);
            const edges = new vis.DataSet(processedEdges);

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
            document.getElementById('node-count').textContent = `Nodes: ${processedNodes.length}`;
            document.getElementById('edge-count').textContent = `Edges: ${processedEdges.length}`;

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
        } catch (error) {
            console.error('Error initializing network:', error);
            showError(`Error initializing graph: ${error.message}`);
        }
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

    // Helper function to handle API responses
    async function handleApiResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();

            if (!response.ok) {
                // If the server returned an error message
                if (data && data.error) {
                    throw new Error(data.error);
                } else {
                    throw new Error(`Server error: ${response.status}`);
                }
            }

            return data;
        } else {
            throw new Error('Invalid response format from server');
        }
    }

    // Helper function to show error messages
    function showError(message) {
        // Hide the loading indicator
        loadingIndicator.style.display = 'none';

        // Hide any existing graph
        document.getElementById('graph-container').style.display = 'none';

        // Show error message
        alert(message);
        console.error(message);
    }

    textForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('text-input').value.trim();

        if (!text) {
            showError('Please enter some text');
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

            const data = await handleApiResponse(response);

            if (data.nodes && data.nodes.length > 0) {
                initializeNetwork(data);
            } else {
                showError('No entities found in the text. Try a different text with named entities like people, organizations, locations, etc.');
            }
        } catch (error) {
            showError(`Error: ${error.message}`);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });

    fileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('file-input');

        if (!fileInput.files || fileInput.files.length === 0) {
            showError('Please select a file');
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

            const data = await handleApiResponse(response);

            if (data.nodes && data.nodes.length > 0) {
                initializeNetwork(data);
            } else {
                showError('No entities found in the file. Try a different file with named entities like people, organizations, locations, etc.');
            }
        } catch (error) {
            showError(`Error: ${error.message}`);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });

    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('url-input').value.trim();

        if (!url) {
            showError('Please enter a URL');
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

            const data = await handleApiResponse(response);

            if (data.nodes && data.nodes.length > 0) {
                initializeNetwork(data);
            } else {
                showError('No entities found in the URL content. Try a different URL with named entities like people, organizations, locations, etc.');
            }
        } catch (error) {
            showError(`Error: ${error.message}`);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    });
});
