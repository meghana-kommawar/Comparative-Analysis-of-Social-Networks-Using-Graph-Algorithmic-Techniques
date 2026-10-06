/* ============================================================
   SOCIAL NETWORK ALGORITHM ANALYSIS
   UPDATED APP.JS
============================================================ */


/* ============================================================
   GLOBAL VARIABLES
============================================================ */

let uploadedData = null;

let currentGraph = {
    nodes: [],
    edges: []
};

let graphPositions = {};

let timingChart = null;

let sourceColumn = null;
let targetColumn = null;


/*
    Start and End nodes are intentionally NULL initially.
*/

let selectedStartNode = null;
let selectedEndNode = null;


/*
    Current graph visualization state.
*/

let currentHighlightNodes = [];
let currentHighlightEdges = [];
let currentNodeColors = {};
let currentVisualization = "normal";


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
            UPDATED HTML IDs
        */

        const fileInput =
            document.getElementById(
                "datasetFile"
            );

        const buildButton =
            document.getElementById(
                "buildNetworkBtn"
            );

        const startSelect =
            document.getElementById(
                "startNode"
            );

        const endSelect =
            document.getElementById(
                "endNode"
            );


        /* ----------------------------------------------------
           FILE INPUT
        ---------------------------------------------------- */

        if (fileInput) {

            fileInput.addEventListener(
                "change",
                handleFileUpload
            );

        }


        /* ----------------------------------------------------
           BUILD NETWORK
        ---------------------------------------------------- */

        if (buildButton) {

            buildButton.addEventListener(
                "click",
                buildNetwork
            );

        }


        /* ----------------------------------------------------
           START NODE
        ---------------------------------------------------- */

        if (startSelect) {

            startSelect.addEventListener(
                "change",
                function () {

                    selectedStartNode =
                        this.value || null;

                    clearAlgorithmVisualization();

                    drawNetwork();

                    updateSelectionMessage();

                }
            );

        }


        /* ----------------------------------------------------
           END NODE
        ---------------------------------------------------- */

        if (endSelect) {

            endSelect.addEventListener(
                "change",
                function () {

                    selectedEndNode =
                        this.value || null;

                    clearAlgorithmVisualization();

                    drawNetwork();

                    updateSelectionMessage();

                }
            );

        }

    }
);


/* ============================================================
   FILE UPLOAD
============================================================ */

async function handleFileUpload(event) {

    const file =
        event.target.files[0];


    if (!file) {

        const uploadStatus =
            document.getElementById(
                "uploadStatus"
            );

        if (uploadStatus) {

            uploadStatus.textContent =
                "No dataset selected.";

        }

        return;
    }


    /* --------------------------------------------------------
       CSV VALIDATION
    -------------------------------------------------------- */

    if (
        !file.name
            .toLowerCase()
            .endsWith(".csv")
    ) {

        showUploadError(
            "Please select a CSV file."
        );

        event.target.value = "";

        return;
    }


    const uploadStatus =
        document.getElementById(
            "uploadStatus"
        );


    if (uploadStatus) {

        uploadStatus.textContent =
            "Selected: " +
            file.name +
            " (" +
            formatBytes(file.size) +
            ")";

        uploadStatus.classList.add(
            "success"
        );

    }

}


/* ============================================================
   BUILD NETWORK / UPLOAD DATASET
============================================================ */

async function buildNetwork() {

    const fileInput =
        document.getElementById(
            "datasetFile"
        );


    const uploadStatus =
        document.getElementById(
            "uploadStatus"
        );


    const buildButton =
        document.getElementById(
            "buildNetworkBtn"
        );


    /* --------------------------------------------------------
       CHECK FILE
    -------------------------------------------------------- */

    if (
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        showUploadError(
            "Please select a CSV dataset first."
        );

        return;
    }


    const file =
        fileInput.files[0];


    if (
        !file.name
            .toLowerCase()
            .endsWith(".csv")
    ) {

        showUploadError(
            "Only CSV files are supported."
        );

        return;
    }


    /* --------------------------------------------------------
       BUTTON STATE
    -------------------------------------------------------- */

    if (buildButton) {

        buildButton.disabled = true;

        buildButton.textContent =
            "UPLOADING...";

    }


    if (uploadStatus) {

        uploadStatus.textContent =
            "Uploading " +
            file.name +
            "...";

        uploadStatus.classList.add(
            "success"
        );

    }


    /* --------------------------------------------------------
       FORM DATA
    -------------------------------------------------------- */

    const formData =
        new FormData();

    /*
        IMPORTANT:

        The HTML input uses:

        name="file"

        Flask receives:

        request.files["file"]
    */

    formData.append(
        "file",
        file
    );


    try {

        /* ----------------------------------------------------
           SEND FILE TO FLASK
        ---------------------------------------------------- */

        const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        /* ----------------------------------------------------
           READ RESPONSE
        ---------------------------------------------------- */

        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Dataset upload failed."
            );

        }


        /* ----------------------------------------------------
           STORE DATA
        ---------------------------------------------------- */

        uploadedData =
            data;


        sourceColumn =
            data.source_column ||
            data.columns?.[0] ||
            null;


        targetColumn =
            data.target_column ||
            data.columns?.[1] ||
            null;


        currentGraph = {

            nodes:
                data.nodes || [],

            edges:
                data.edges || []

        };


        graphPositions =
            data.positions || {};


        /* ----------------------------------------------------
           RESET VISUALIZATION
        ---------------------------------------------------- */

        selectedStartNode = null;

        selectedEndNode = null;

        currentHighlightNodes = [];

        currentHighlightEdges = [];

        currentNodeColors = {};

        currentVisualization =
            "normal";


        /* ----------------------------------------------------
           UPDATE SUMMARY
        ---------------------------------------------------- */

        updateDatasetSummary(
            data
        );


        /* ----------------------------------------------------
           UPDATE NETWORK INFORMATION
        ---------------------------------------------------- */

        updateNetworkInformation(
            data
        );


        /* ----------------------------------------------------
           POPULATE NODE SELECTORS
        ---------------------------------------------------- */

        populateNodeSelectors(
            currentGraph.nodes
        );


        /* ----------------------------------------------------
           SHOW SUMMARY
        ---------------------------------------------------- */

        const summary =
            document.getElementById(
                "datasetSummary"
            );


        if (summary) {

            summary.classList.remove(
                "hidden"
            );

        }


        /* ----------------------------------------------------
           SUCCESS MESSAGE
        ---------------------------------------------------- */

        if (uploadStatus) {

            uploadStatus.innerHTML = `

                <strong>
                    ✓ ${escapeHTML(file.name)}
                </strong>

                &nbsp; • &nbsp;

                ${formatBytes(file.size)}

                &nbsp; • &nbsp;

                ${data.rows ?? data.row_count ?? 0}
                rows

                &nbsp; • &nbsp;

                ${
                    data.columns
                    ? data.columns.length
                    : 0
                }
                columns

            `;

            uploadStatus.classList.add(
                "success"
            );

        }


        /* ----------------------------------------------------
           DRAW NETWORK
        ---------------------------------------------------- */

        drawNetwork();


        /* ----------------------------------------------------
           STATUS
        ---------------------------------------------------- */

        setNetworkStatus(
            "Dataset uploaded successfully"
        );


        updateSelectionMessage();


        /*
            Scroll to summary.
        */

        if (summary) {

            summary.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    }

    catch (error) {

        console.error(
            "UPLOAD ERROR:",
            error
        );


        showUploadError(
            error.message
        );

    }

    finally {

        if (buildButton) {

            buildButton.disabled =
                false;

            buildButton.textContent =
                "BUILD NETWORK";

        }

    }

}


/* ============================================================
   DATASET SUMMARY
============================================================ */

function updateDatasetSummary(data) {

    const nodes =
        data.node_count ??
        (
            data.nodes
            ? data.nodes.length
            : 0
        );


    const edges =
        data.edge_count ??
        (
            Array.isArray(data.edges)
            ? data.edges.length
            : Number(data.edges ?? 0)
        );


    const columns =
        data.column_count ??
        (
            data.columns
            ? data.columns.length
            : 0
        );


    const rows =
        data.row_count ??
        data.rows ??
        0;


    const nodeElement =
        document.getElementById(
            "nodeCount"
        );


    const edgeElement =
        document.getElementById(
            "edgeCount"
        );


    const columnElement =
        document.getElementById(
            "columnCount"
        );


    const rowElement =
        document.getElementById(
            "rowCount"
        );


    if (nodeElement) {

        nodeElement.textContent =
            nodes;

    }


    if (edgeElement) {

        edgeElement.textContent =
            edges;

    }


    if (columnElement) {

        columnElement.textContent =
            columns;

    }


    if (rowElement) {

        rowElement.textContent =
            rows;

    }

}


/* ============================================================
   NETWORK INFORMATION
============================================================ */

function updateNetworkInformation(data) {

    const nodeCount =
        data.node_count ??
        (
            data.nodes
            ? data.nodes.length
            : 0
        );


    const edgeCount =
        data.edge_count ??
        (
            Array.isArray(data.edges)
            ? data.edges.length
            : Number(data.edges ?? 0)
        );


    const nodeElement =
        document.getElementById(
            "networkNodeCount"
        );


    const edgeElement =
        document.getElementById(
            "networkEdgeCount"
        );


    const sourceElement =
        document.getElementById(
            "networkSourceColumn"
        );


    const targetElement =
        document.getElementById(
            "networkTargetColumn"
        );


    if (nodeElement) {

        nodeElement.textContent =
            nodeCount;

    }


    if (edgeElement) {

        edgeElement.textContent =
            edgeCount;

    }


    if (sourceElement) {

        sourceElement.textContent =
            data.source_column ||
            sourceColumn ||
            (
                data.columns
                ? data.columns[0]
                : "-"
            );

    }


    if (targetElement) {

        targetElement.textContent =
            data.target_column ||
            targetColumn ||
            (
                data.columns
                ? data.columns[1]
                : "-"
            );

    }

}


/* ============================================================
   STATUS
============================================================ */

function setNetworkStatus(status) {

    const element =
        document.getElementById(
            "networkStatus"
        );


    if (element) {

        element.textContent =
            status;

    }

}


/* ============================================================
   UPLOAD ERROR
============================================================ */

function showUploadError(message) {

    const uploadStatus =
        document.getElementById(
            "uploadStatus"
        );


    if (uploadStatus) {

        uploadStatus.innerHTML = `

            <strong>
                ✕ ERROR
            </strong>

            &nbsp;

            ${escapeHTML(message)}

        `;

        uploadStatus.classList.remove(
            "success"
        );

    }


    console.error(
        "Upload Error:",
        message
    );

}


/* ============================================================
   NODE SELECTORS
============================================================ */

function populateNodeSelectors(nodes) {

    const startSelect =
        document.getElementById(
            "startNode"
        );


    const endSelect =
        document.getElementById(
            "endNode"
        );


    if (
        !startSelect ||
        !endSelect
    ) {

        console.error(
            "Start/End node selectors not found."
        );

        return;
    }


    /* --------------------------------------------------------
       CLEAR
    -------------------------------------------------------- */

    startSelect.innerHTML = "";

    endSelect.innerHTML = "";


    /* --------------------------------------------------------
       START PLACEHOLDER
    -------------------------------------------------------- */

    const startPlaceholder =
        document.createElement(
            "option"
        );


    startPlaceholder.value =
        "";


    startPlaceholder.textContent =
        "Select Start Node";


    startPlaceholder.disabled =
        true;


    startPlaceholder.selected =
        true;


    startSelect.appendChild(
        startPlaceholder
    );


    /* --------------------------------------------------------
       END PLACEHOLDER
    -------------------------------------------------------- */

    const endPlaceholder =
        document.createElement(
            "option"
        );


    endPlaceholder.value =
        "";


    endPlaceholder.textContent =
        "Select End Node";


    endPlaceholder.disabled =
        true;


    endPlaceholder.selected =
        true;


    endSelect.appendChild(
        endPlaceholder
    );


    /* --------------------------------------------------------
       ADD NODES
    -------------------------------------------------------- */

    nodes.forEach(
        function (node) {

            const value =
                String(node);


            const startOption =
                document.createElement(
                    "option"
                );


            startOption.value =
                value;


            startOption.textContent =
                value;


            const endOption =
                document.createElement(
                    "option"
                );


            endOption.value =
                value;


            endOption.textContent =
                value;


            startSelect.appendChild(
                startOption
            );


            endSelect.appendChild(
                endOption
            );

        }
    );


    /*
        IMPORTANT:

        Do NOT automatically select
        a node.
    */

    selectedStartNode =
        null;

    selectedEndNode =
        null;

}


/* ============================================================
   SELECTION MESSAGE
============================================================ */

function updateSelectionMessage() {

    const message =
        document.getElementById(
            "selectionMessage"
        );


    if (!message) {
        return;
    }


    if (
        selectedStartNode &&
        selectedEndNode
    ) {

        if (
            selectedStartNode ===
            selectedEndNode
        ) {

            message.textContent =
                "Start Node and End Node must be different.";

            return;

        }


        message.textContent =
            "Start: " +
            selectedStartNode +
            " | End: " +
            selectedEndNode +
            " | Ready to run BFS, DFS or Floyd-Warshall.";

        return;

    }


    message.textContent =
        "Select both nodes to run the traversal and shortest-path algorithms.";

}


/* ============================================================
   DRAW NETWORK
============================================================ */

function drawNetwork() {

    const container =
        document.getElementById(
            "networkGraph"
        );


    if (!container) {
        return;
    }


    const nodes =
        currentGraph.nodes || [];


    const edges =
        currentGraph.edges || [];


    const positions =
        graphPositions || {};


    if (nodes.length === 0) {

        if (
            typeof Plotly !==
            "undefined"
        ) {

            Plotly.purge(
                container
            );

        }

        return;
    }


    /* ========================================================
       NORMAL EDGES
    ======================================================== */

    const edgeX = [];
    const edgeY = [];


    edges.forEach(
        function (edge) {

            const source =
                String(edge[0]);


            const target =
                String(edge[1]);


            if (
                !positions[source] ||
                !positions[target]
            ) {

                return;

            }


            edgeX.push(
                positions[source][0]
            );

            edgeY.push(
                positions[source][1]
            );


            edgeX.push(
                positions[target][0]
            );

            edgeY.push(
                positions[target][1]
            );


            edgeX.push(null);

            edgeY.push(null);

        }
    );


    const normalEdgeTrace = {

        x: edgeX,

        y: edgeY,

        type: "scatter",

        mode: "lines",

        line: {

            color: "#94a3b8",

            width: 2

        },

        hoverinfo: "none",

        showlegend: false

    };


    /* ========================================================
       HIGHLIGHT EDGES
    ======================================================== */

    const highlightX = [];

    const highlightY = [];


    currentHighlightEdges.forEach(
        function (edge) {

            const source =
                String(edge[0]);


            const target =
                String(edge[1]);


            if (
                !positions[source] ||
                !positions[target]
            ) {

                return;

            }


            highlightX.push(
                positions[source][0]
            );

            highlightY.push(
                positions[source][1]
            );


            highlightX.push(
                positions[target][0]
            );

            highlightY.push(
                positions[target][1]
            );


            highlightX.push(null);

            highlightY.push(null);

        }
    );


    let highlightColor =
        "#2563eb";


    let highlightWidth =
        6;


    if (
        currentVisualization ===
        "clique"
    ) {

        highlightColor =
            "#7c3aed";

        highlightWidth =
            5;

    }


    const highlightEdgeTrace = {

        x: highlightX,

        y: highlightY,

        type: "scatter",

        mode: "lines",

        line: {

            color:
                highlightColor,

            width:
                highlightWidth

        },

        hoverinfo: "none",

        showlegend: false

    };


    /* ========================================================
       NODES
    ======================================================== */

    const nodeX = [];

    const nodeY = [];

    const nodeText = [];

    const nodeColors = [];


    nodes.forEach(
        function (node) {

            const nodeId =
                String(node);


            if (!positions[nodeId]) {
                return;
            }


            nodeX.push(
                positions[nodeId][0]
            );


            nodeY.push(
                positions[nodeId][1]
            );


            nodeText.push(
                nodeId
            );


            /*
                COLOR PRIORITY

                1. START = ORANGE
                2. END = RED
                3. CLIQUE = PURPLE
                4. GREEDY COLORING
                5. PATH = LIGHT BLUE
                6. NORMAL = ROYAL BLUE
            */

            let color =
                "#2563eb";


            /* ------------------------------------------------
               GREEDY COLORING
            ------------------------------------------------ */

            if (
                Object.prototype.hasOwnProperty.call(
                    currentNodeColors,
                    nodeId
                )
            ) {

                color =
                    currentNodeColors[nodeId];

            }


            /* ------------------------------------------------
               PATH / CLIQUE
            ------------------------------------------------ */

            if (
                currentHighlightNodes
                    .map(String)
                    .includes(nodeId)
            ) {

                if (
                    currentVisualization ===
                    "path"
                ) {

                    color =
                        "#60a5fa";

                }


                if (
                    currentVisualization ===
                    "clique"
                ) {

                    color =
                        "#7c3aed";

                }

            }


            /* ------------------------------------------------
               START ALWAYS ORANGE
            ------------------------------------------------ */

            if (
                currentVisualization !== "clique" &&
                selectedStartNode !== null &&
                nodeId ===
                String(selectedStartNode)
            ) {

                color =
                    "#f59e0b";

            }


            /* ------------------------------------------------
               END ALWAYS RED
            ------------------------------------------------ */

            if (
                currentVisualization !== "clique" &&
                selectedEndNode !== null &&
                nodeId ===
                String(selectedEndNode)
            ) {

                color =
                    "#ef4444";

            }


            nodeColors.push(
                color
            );

        }
    );


    const nodeTrace = {

        x: nodeX,

        y: nodeY,

        type: "scatter",

        mode: "markers+text",

        text: nodeText,

        textposition:
            "top center",

        textfont: {

            family:
                "Times New Roman",

            size: 14,

            color:
                "#1d4ed8"

        },

        marker: {

            size: 24,

            color: nodeColors,

            line: {

                color:
                    "#ffffff",

                width: 3

            }

        },

        hovertemplate:
            "<b>Node:</b> %{text}<extra></extra>",

        showlegend: false

    };


    /* ========================================================
       GRAPH LAYOUT
    ======================================================== */

    const layout = {

        paper_bgcolor:
            "#ffffff",

        plot_bgcolor:
            "#f8faff",

        hovermode:
            "closest",

        margin: {

            l: 30,

            r: 30,

            t: 30,

            b: 30

        },

        xaxis: {

            visible: false,

            showgrid: false,

            zeroline: false,

            showticklabels: false,

            fixedrange: false

        },

        yaxis: {

            visible: false,

            showgrid: false,

            zeroline: false,

            showticklabels: false,

            fixedrange: false,

            scaleanchor: "x",

            scaleratio: 1

        }

    };


    /* ========================================================
       PLOT
    ======================================================== */

    const plotData = [

        normalEdgeTrace,

        highlightEdgeTrace,

        nodeTrace

    ];


    const config = {

        responsive: true,

        displaylogo: false,

        scrollZoom: true

    };


    if (
        typeof Plotly !==
        "undefined"
    ) {

        Plotly.react(
            container,
            plotData,
            layout,
            config
        );

    }

}


/* ============================================================
   VALIDATE START / END
============================================================ */

function validateStartEnd() {

    if (
        !currentGraph.nodes ||
        !currentGraph.nodes.length
    ) {

        alert(
            "Please upload and build the network first."
        );

        return false;

    }


    if (
        selectedStartNode === null ||
        selectedStartNode === ""
    ) {

        alert(
            "Please select a Start Node."
        );

        return false;

    }


    if (
        selectedEndNode === null ||
        selectedEndNode === ""
    ) {

        alert(
            "Please select an End Node."
        );

        return false;

    }


    if (
        String(selectedStartNode) ===
        String(selectedEndNode)
    ) {

        alert(
            "Start Node and End Node must be different."
        );

        return false;

    }


    return true;

}


/* ============================================================
   BFS
============================================================ */

async function runBFS() {

    if (!validateStartEnd()) {
        return;
    }


    try {

        const data =
            await postJSON(
                "/bfs",
                {

                    start:
                        selectedStartNode,

                    end:
                        selectedEndNode

                }
            );


        currentHighlightNodes =
            data.path || [];


        currentHighlightEdges =
            createPathEdges(
                data.path
            );


        currentNodeColors = {};

        currentVisualization =
            "path";


        drawNetwork();


        const result =
            document.getElementById(
                "bfsResult"
            );


        if (result) {

            result.innerHTML = `

                <div class="result-success">
                    ✓ BFS COMPLETED
                </div>

                <div class="result-item">

                    <span class="result-label">
                        Start Node
                    </span>

                    <span class="result-value">
                        ${escapeHTML(data.start)}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        End Node
                    </span>

                    <span class="result-value">
                        ${escapeHTML(data.end)}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Path Found
                    </span>

                    <span class="result-value">
                        ${data.found ? "YES" : "NO"}
                    </span>

                </div>

                <strong>
                    BFS SHORTEST DISCOVERED PATH
                </strong>

                <div class="result-path">

                    ${
                        data.path &&
                        data.path.length
                        ?
                        data.path.join(" → ")
                        :
                        "No path found"
                    }

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Path Length
                    </span>

                    <span class="result-value">
                        ${data.path_length ?? "-"}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Visited Nodes
                    </span>

                    <span class="result-value">
                        ${data.visited_count ?? "-"}
                    </span>

                </div>

                <div class="result-list">

                    <strong>
                        BFS Traversal:
                    </strong>

                    <br>

                    ${
                        data.traversal
                        ?
                        data.traversal.join(" → ")
                        :
                        "-"
                    }

                </div>

                <div class="execution-time">

                    Execution Time:

                    ${
                        (
                            Number(
                                data.execution_time
                            ) * 1000
                        ).toFixed(4)
                    }

                    ms

                </div>

            `;

        }


        setNetworkStatus(
            "BFS path highlighted"
        );

    }

    catch (error) {

        showError(
            "bfsResult",
            error.message
        );

    }

}


/* ============================================================
   DFS
============================================================ */

async function runDFS() {

    if (!validateStartEnd()) {
        return;
    }


    try {

        const data =
            await postJSON(
                "/dfs",
                {

                    start:
                        selectedStartNode,

                    end:
                        selectedEndNode

                }
            );


        currentHighlightNodes =
            data.path || [];


        currentHighlightEdges =
            createPathEdges(
                data.path
            );


        currentNodeColors = {};

        currentVisualization =
            "path";


        drawNetwork();


        const result =
            document.getElementById(
                "dfsResult"
            );


        if (result) {

            result.innerHTML = `

                <div class="result-success">
                    ✓ DFS COMPLETED
                </div>

                <div class="result-item">

                    <span class="result-label">
                        Start Node
                    </span>

                    <span class="result-value">
                        ${escapeHTML(data.start)}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        End Node
                    </span>

                    <span class="result-value">
                        ${escapeHTML(data.end)}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Path Found
                    </span>

                    <span class="result-value">
                        ${data.found ? "YES" : "NO"}
                    </span>

                </div>

                <strong>
                    DFS PATH
                </strong>

                <div class="result-path">

                    ${
                        data.path &&
                        data.path.length
                        ?
                        data.path.join(" → ")
                        :
                        "No path found"
                    }

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Path Length
                    </span>

                    <span class="result-value">
                        ${data.path_length ?? "-"}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Visited Nodes
                    </span>

                    <span class="result-value">
                        ${data.visited_count ?? "-"}
                    </span>

                </div>

                <div class="result-list">

                    <strong>
                        DFS Traversal:
                    </strong>

                    <br>

                    ${
                        data.traversal
                        ?
                        data.traversal.join(" → ")
                        :
                        "-"
                    }

                </div>

                <div class="execution-time">

                    Execution Time:

                    ${
                        (
                            Number(
                                data.execution_time
                            ) * 1000
                        ).toFixed(4)
                    }

                    ms

                </div>

            `;

        }


        setNetworkStatus(
            "DFS path highlighted"
        );

    }

    catch (error) {

        showError(
            "dfsResult",
            error.message
        );

    }

}


/* ============================================================
   GREEDY COLORING
============================================================ */

async function runGreedy() {

    if (
        !currentGraph.nodes ||
        !currentGraph.nodes.length
    ) {

        alert(
            "Please upload and build the network first."
        );

        return;

    }


    try {

        const data =
            await postJSON(
                "/greedy-coloring",
                {}
            );


        const palette = [

            "#2563eb",

            "#7c3aed",

            "#16a34a",

            "#f59e0b",

            "#ef4444",

            "#0891b2",

            "#db2777",

            "#65a30d"

        ];


        currentNodeColors = {};


        Object.entries(
            data.coloring || {}
        ).forEach(
            function ([node, color]) {

                currentNodeColors[node] =
                    palette[
                        Number(color) %
                        palette.length
                    ];

            }
        );


        currentHighlightNodes = [];

        currentHighlightEdges = [];

        currentVisualization =
            "coloring";


        drawNetwork();


        let coloringHTML = "";


        Object.entries(
            data.coloring || {}
        ).forEach(
            function ([node, color]) {

                coloringHTML += `

                    <span class="color-node">

                        Node
                        ${escapeHTML(node)}

                        →

                        Color
                        ${Number(color) + 1}

                    </span>

                `;

            }
        );


        const result =
            document.getElementById(
                "greedyResult"
            );


        if (result) {

            result.innerHTML = `

                <div class="result-success">
                    ✓ GREEDY COLORING COMPLETED
                </div>

                <div class="result-item">

                    <span class="result-label">
                        Total Nodes
                    </span>

                    <span class="result-value">
                        ${data.total_nodes ?? "-"}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Colors Used
                    </span>

                    <span class="result-value">
                        ${data.number_of_colors ?? "-"}
                    </span>

                </div>

                <strong>
                    NODE COLOR ASSIGNMENTS
                </strong>

                <div class="coloring-grid">

                    ${coloringHTML}

                </div>

                <div class="execution-time">

                    Execution Time:

                    ${
                        (
                            Number(
                                data.execution_time
                            ) * 1000
                        ).toFixed(4)
                    }

                    ms

                </div>

            `;

        }


        setNetworkStatus(
            "Greedy coloring displayed"
        );

    }

    catch (error) {

        showError(
            "greedyResult",
            error.message
        );

    }

}


/* ============================================================
   FLOYD-WARSHALL
============================================================ */

async function runFloyd() {

    if (!validateStartEnd()) {
        return;
    }


    try {

        const data =
            await postJSON(
                "/floyd-warshall",
                {

                    start:
                        selectedStartNode,

                    end:
                        selectedEndNode

                }
            );


        currentHighlightNodes =
            data.shortest_path || [];


        currentHighlightEdges =
            createPathEdges(
                data.shortest_path
            );


        currentNodeColors = {};

        currentVisualization =
            "path";


        drawNetwork();


        const result =
            document.getElementById(
                "floydResult"
            );


        if (result) {

            result.innerHTML = `

                <div class="result-success">
                    ✓ FLOYD-WARSHALL COMPLETED
                </div>

                <div class="result-item">

                    <span class="result-label">
                        Start Node
                    </span>

                    <span class="result-value">
                        ${escapeHTML(data.start)}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        End Node
                    </span>

                    <span class="result-value">
                        ${escapeHTML(data.end)}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Shortest Distance
                    </span>

                    <span class="result-value">

                        ${
                            data.distance !== null &&
                            data.distance !== undefined
                            ?
                            data.distance
                            :
                            "No Path"
                        }

                    </span>

                </div>

                <strong>
                    SHORTEST PATH
                </strong>

                <div class="result-path">

                    ${
                        data.shortest_path &&
                        data.shortest_path.length
                        ?
                        data.shortest_path.join(" → ")
                        :
                        "No path found"
                    }

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Number of Hops
                    </span>

                    <span class="result-value">
                        ${data.hops ?? "-"}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Algorithm
                    </span>

                    <span class="result-value">
                        Floyd-Warshall
                    </span>

                </div>

                <div class="execution-time">

                    Execution Time:

                    ${
                        (
                            Number(
                                data.execution_time
                            ) * 1000
                        ).toFixed(4)
                    }

                    ms

                </div>

            `;

        }


        setNetworkStatus(
            "Floyd-Warshall path highlighted"
        );

    }

    catch (error) {

        showError(
            "floydResult",
            error.message
        );

    }

}


/* ============================================================
   BRANCH & BOUND
============================================================ */

async function runBranchBound() {

    if (
        !currentGraph.nodes ||
        !currentGraph.nodes.length
    ) {

        alert(
            "Please upload and build the network first."
        );

        return;

    }


    try {

        const data =
            await postJSON(
                "/branch-bound",
                {}
            );


        currentHighlightNodes =
            data.clique || [];


        currentHighlightEdges =
            createCliqueEdges(
                data.clique || []
            );


        currentNodeColors = {};

        currentVisualization =
            "clique";


        drawNetwork();


        let cliqueHTML = "";


        (
            data.clique || []
        ).forEach(
            function (node) {

                cliqueHTML += `

                    <span class="clique-node">

                        ${escapeHTML(node)}

                    </span>

                `;

            }
        );


        const result =
            document.getElementById(
                "cliqueResult"
            );


        if (result) {

            result.innerHTML = `

                <div class="result-success">
                    ✓ BRANCH &amp; BOUND COMPLETED
                </div>

                <div class="result-item">

                    <span class="result-label">
                        Problem
                    </span>

                    <span class="result-value">
                        Maximum Clique
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Clique Size
                    </span>

                    <span class="result-value">
                        ${data.size ?? "-"}
                    </span>

                </div>

                <strong>
                    MAXIMUM CLIQUE NODES
                </strong>

                <div class="clique-container">

                    ${cliqueHTML}

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Clique Edges
                    </span>

                    <span class="result-value">
                        ${data.clique_edges ?? "-"}
                    </span>

                </div>

                <div class="result-item">

                    <span class="result-label">
                        Algorithm
                    </span>

                    <span class="result-value">
                        Branch &amp; Bound
                    </span>

                </div>

                <div class="execution-time">

                    Execution Time:

                    ${
                        (
                            Number(
                                data.execution_time
                            ) * 1000
                        ).toFixed(4)
                    }

                    ms

                </div>

            `;

        }


        setNetworkStatus(
            "Maximum clique highlighted"
        );

    }

    catch (error) {

        showError(
            "cliqueResult",
            error.message
        );

    }

}


/* ============================================================
   CLEAR VISUALIZATION
============================================================ */

function clearAlgorithmVisualization() {

    currentHighlightNodes = [];

    currentHighlightEdges = [];

    currentNodeColors = {};

    currentVisualization =
        "normal";

}


/* ============================================================
   CREATE PATH EDGES
============================================================ */

function createPathEdges(path) {

    const result = [];


    if (
        !path ||
        path.length < 2
    ) {

        return result;

    }


    for (
        let i = 0;
        i < path.length - 1;
        i++
    ) {

        result.push([

            String(path[i]),

            String(path[i + 1])

        ]);

    }


    return result;

}


/* ============================================================
   CREATE CLIQUE EDGES
============================================================ */

function createCliqueEdges(clique) {

    const result = [];


    if (
        !clique ||
        clique.length < 2
    ) {

        return result;

    }


    for (
        let i = 0;
        i < clique.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < clique.length;
            j++
        ) {

            result.push([

                String(clique[i]),

                String(clique[j])

            ]);

        }

    }


    return result;

}


/* ============================================================
   PROFESSIONAL EXECUTION TIME COMPARISON
============================================================ */

async function compareExecutionTimes() {

    if (
        !currentGraph.nodes ||
        !currentGraph.nodes.length
    ) {

        alert(
            "Please upload and build the network first."
        );

        return;
    }

    try {

        const data =
            await postJSON(
                "/compare-times",
                {}
            );


        const canvas =
            document.getElementById(
                "timingChart"
            );


        if (!canvas) {

            console.error(
                "timingChart not found."
            );

            return;
        }


        /* ----------------------------------------------------
           DESTROY PREVIOUS CHART
        ---------------------------------------------------- */

        if (timingChart) {

            timingChart.destroy();

            timingChart = null;

        }


        /* ----------------------------------------------------
           GET DATA
        ---------------------------------------------------- */

        const algorithms =
            data.algorithms || [];


        const times =
            (
                data.times || []
            ).map(
                value =>
                    Number(value) * 1000
            );


        /* ----------------------------------------------------
           PROFESSIONAL CHART
        ---------------------------------------------------- */

        const ctx =
            canvas.getContext("2d");


        /*
            Create a blue gradient for the bars.
        */

        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                450
            );

        gradient.addColorStop(
            0,
            "#2563eb"
        );

        gradient.addColorStop(
            1,
            "#60a5fa"
        );


        timingChart =
            new Chart(
                ctx,
                {

                    type: "bar",


                    data: {

                        labels:
                            algorithms,

                        datasets: [

                            {

                                label:
                                    "Execution Time",

                                data:
                                    times,

                                backgroundColor:
                                    gradient,

                                borderColor:
                                    "#1d4ed8",

                                borderWidth:
                                    1,

                                borderRadius:
                                    10,

                                borderSkipped:
                                    false,

                                barPercentage:
                                    0.65,

                                categoryPercentage:
                                    0.75

                            }

                        ]

                    },


                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,


                        animation: {

                            duration:
                                1200,

                            easing:
                                "easeOutQuart"

                        },


                        interaction: {

                            mode:
                                "index",

                            intersect:
                                false

                        },


                        plugins: {

                            legend: {

                                display:
                                    false

                            },


                            tooltip: {

                                backgroundColor:
                                    "#0f172a",

                                titleColor:
                                    "#ffffff",

                                bodyColor:
                                    "#e2e8f0",

                                borderColor:
                                    "#2563eb",

                                borderWidth:
                                    1,

                                padding:
                                    12,

                                cornerRadius:
                                    8,


                                callbacks: {

                                    title:
                                        function (
                                            tooltipItems
                                        ) {

                                            return (
                                                tooltipItems[0]
                                                    .label
                                            );

                                        },


                                    label:
                                        function (
                                            context
                                        ) {

                                            const value =
                                                Number(
                                                    context.raw
                                                );

                                            return (
                                                " Execution Time: " +
                                                value.toFixed(4) +
                                                " ms"
                                            );

                                        }

                                }

                            }

                        },


                        scales: {

                            x: {

                                grid: {

                                    display:
                                        false

                                },

                                border: {

                                    display:
                                        false

                                },

                                ticks: {

                                    color:
                                        "#475569",

                                    font: {

                                        family:
                                            "Times New Roman",

                                        size:
                                            14,

                                        weight:
                                            "bold"

                                    },

                                    padding:
                                        10

                                },

                                title: {

                                    display:
                                        true,

                                    text:
                                        "Algorithms",

                                    color:
                                        "#1e3a8a",

                                    font: {

                                        family:
                                            "Times New Roman",

                                        size:
                                            15,

                                        weight:
                                            "bold"

                                    }

                                }

                            },


                            y: {

                                type:
                                    "logarithmic",

                                beginAtZero:
                                    false,

                                grid: {

                                    color:
                                        "rgba(148, 163, 184, 0.20)",

                                    drawBorder:
                                        false

                                },

                                border: {

                                    display:
                                        false

                                },

                                ticks: {

                                    color:
                                        "#475569",

                                    font: {

                                        family:
                                            "Times New Roman",

                                        size:
                                            13

                                    },

                                    callback:
                                        function (
                                            value
                                        ) {

                                            return (
                                                value +
                                                " ms"
                                            );

                                        }

                                },

                                title: {

                                    display:
                                        true,

                                    text:
                                        "Execution Time (ms)",

                                    color:
                                        "#1e3a8a",

                                    font: {

                                        family:
                                            "Times New Roman",

                                        size:
                                            15,

                                        weight:
                                            "bold"

                                    }

                                }

                            }

                        }

                    }

                }
            );


        setNetworkStatus(
            "Professional execution time comparison displayed"
        );

    }


    catch (error) {

        console.error(
            "Comparison Error:",
            error
        );


        alert(
            "Comparison Error: " +
            error.message
        );

    }

}

/* ============================================================
   POST JSON
============================================================ */

async function postJSON(
    url,
    body
) {

    const response =
        await fetch(
            url,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        body
                    )

            }
        );


    let data;


    try {

        data =
            await response.json();

    }

    catch (error) {

        throw new Error(
            "Server returned an invalid response."
        );

    }


    if (
        !response.ok ||
        !data.success
    ) {

        throw new Error(
            data.error ||
            "Request failed."
        );

    }


    return data;

}


/* ============================================================
   SHOW ALGORITHM ERROR
============================================================ */

function showError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {

        alert(
            message
        );

        return;

    }


    element.innerHTML = `

        <div
            class="result-success"
            style="
                color:#991b1b;
                background:#fef2f2;
                border-color:#fecaca;
            "
        >

            ✕ ERROR

        </div>

        <p>

            ${escapeHTML(message)}

        </p>

    `;

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


/* ============================================================
   FILE SIZE
============================================================ */

function formatBytes(bytes) {

    if (
        !bytes ||
        bytes === 0
    ) {

        return "0 Bytes";

    }


    const units = [

        "Bytes",

        "KB",

        "MB",

        "GB"

    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (

        parseFloat(

            (
                bytes /
                Math.pow(
                    1024,
                    index
                )

            ).toFixed(2)

        )

        +

        " "

        +

        units[index]

    );

}