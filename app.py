from flask import Flask, render_template, request, jsonify
import pandas as pd
import networkx as nx
import time
import os

app = Flask(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

UPLOAD_FOLDER = "uploads"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# ============================================================
# GLOBAL VARIABLES
# ============================================================

df = None

graph = nx.Graph()

source_column = None

target_column = None


# ============================================================
# HOME
# ============================================================

@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def safe_value(value):

    if pd.isna(value):
        return None

    return str(value)


def get_graph_positions(G):

    if G.number_of_nodes() == 0:
        return {}

    positions = nx.spring_layout(
        G,
        seed=42,
        k=1.2,
        iterations=100
    )

    result = {}

    for node, position in positions.items():

        result[str(node)] = [
            float(position[0]),
            float(position[1])
        ]

    return result


def serialize_nodes(G):

    return [
        str(node)
        for node in G.nodes()
    ]


def serialize_edges(G):

    return [
        [
            str(source),
            str(target)
        ]

        for source, target in G.edges()
    ]


def get_preview(dataframe, limit=10):

    preview = []

    for _, row in dataframe.head(limit).iterrows():

        row_data = {}

        for column in dataframe.columns:

            row_data[str(column)] = safe_value(
                row[column]
            )

        preview.append(row_data)

    return preview


def build_graph_from_dataframe(
    dataframe,
    source_col,
    target_col
):

    G = nx.Graph()

    if dataframe is None:
        return G

    if source_col not in dataframe.columns:
        return G

    if target_col not in dataframe.columns:
        return G

    for _, row in dataframe.iterrows():

        source = row[source_col]
        target = row[target_col]

        if pd.isna(source) or pd.isna(target):
            continue

        source = str(source).strip()
        target = str(target).strip()

        if source == "" or target == "":
            continue

        G.add_edge(
            source,
            target
        )

    return G


# ============================================================
# UPLOAD CSV
# ============================================================

@app.route("/upload", methods=["POST"])
def upload_file():

    global df
    global graph
    global source_column
    global target_column

    try:

        if "file" not in request.files:

            return jsonify({
                "success": False,
                "error": "No file uploaded."
            }), 400

        file = request.files["file"]

        if file.filename == "":

            return jsonify({
                "success": False,
                "error": "No file selected."
            }), 400

        if not file.filename.lower().endswith(".csv"):

            return jsonify({
                "success": False,
                "error": "Please upload a CSV file."
            }), 400

        filepath = os.path.join(
            app.config["UPLOAD_FOLDER"],
            file.filename
        )

        file.save(filepath)

        df = pd.read_csv(filepath)

        if len(df.columns) < 2:

            return jsonify({
                "success": False,
                "error": (
                    "Dataset must contain at least "
                    "two columns."
                )
            }), 400

        # First column = Source
        source_column = df.columns[0]

        # Second column = Target
        target_column = df.columns[1]

        graph = build_graph_from_dataframe(
            df,
            source_column,
            target_column
        )

        return jsonify({

            "success": True,

            "filename": file.filename,

            "columns": [
                str(column)
                for column in df.columns
            ],

            "rows": int(len(df)),

            "row_count": int(len(df)),

            "column_count": int(
                len(df.columns)
            ),

            "columns_count": int(
                len(df.columns)
            ),

            "source_column": str(
                source_column
            ),

            "target_column": str(
                target_column
            ),

            "node_count": int(
                graph.number_of_nodes()
            ),

            "edge_count": int(
                graph.number_of_edges()
            ),

            "nodes": serialize_nodes(graph),

            "edges": serialize_edges(graph),

            "positions": get_graph_positions(
                graph
            ),

            "preview": get_preview(df)

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# BUILD NETWORK
# ============================================================

@app.route("/build-network", methods=["POST"])
def build_network():

    global graph
    global source_column
    global target_column

    try:

        if df is None:

            return jsonify({
                "success": False,
                "error": "Please upload a dataset first."
            }), 400

        data = request.get_json(
            silent=True
        ) or {}

        requested_source = data.get(
            "source"
        )

        requested_target = data.get(
            "target"
        )

        if (
            requested_source
            and requested_source in df.columns
        ):

            source_column = requested_source

        else:

            source_column = df.columns[0]

        if (
            requested_target
            and requested_target in df.columns
        ):

            target_column = requested_target

        else:

            target_column = df.columns[1]

        graph = build_graph_from_dataframe(
            df,
            source_column,
            target_column
        )

        return jsonify({

            "success": True,

            "source_column": str(
                source_column
            ),

            "target_column": str(
                target_column
            ),

            "nodes": serialize_nodes(graph),

            "edges": serialize_edges(graph),

            "positions": get_graph_positions(
                graph
            ),

            "node_count": int(
                graph.number_of_nodes()
            ),

            "edge_count": int(
                graph.number_of_edges()
            ),

            "row_count": int(
                len(df)
            ),

            "column_count": int(
                len(df.columns)
            )

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# BFS
# ============================================================

@app.route("/bfs", methods=["POST"])
def bfs():

    try:

        if graph.number_of_nodes() == 0:

            return jsonify({
                "success": False,
                "error": "Network is empty."
            }), 400

        data = request.get_json(
            silent=True
        ) or {}

        start = str(
            data.get("start", "")
        ).strip()

        end = str(
            data.get("end", "")
        ).strip()

        if start not in graph:

            return jsonify({
                "success": False,
                "error": (
                    f"Start node '{start}' "
                    "not found."
                )
            }), 400

        if end not in graph:

            return jsonify({
                "success": False,
                "error": (
                    f"End node '{end}' "
                    "not found."
                )
            }), 400

        start_time = time.perf_counter()

        queue = [start]

        visited = {start}

        parent = {
            start: None
        }

        traversal = []

        found = False

        while queue:

            current = queue.pop(0)

            traversal.append(
                str(current)
            )

            if current == end:

                found = True
                break

            for neighbor in graph.neighbors(
                current
            ):

                if neighbor not in visited:

                    visited.add(
                        neighbor
                    )

                    parent[neighbor] = current

                    queue.append(
                        neighbor
                    )

        path = []

        if found:

            current = end

            while current is not None:

                path.append(
                    str(current)
                )

                current = parent.get(
                    current
                )

            path.reverse()

        execution_time = (
            time.perf_counter()
            - start_time
        )

        return jsonify({

            "success": True,

            "algorithm": "BFS",

            "start": start,

            "end": end,

            "found": found,

            "visited": [
                str(node)
                for node in visited
            ],

            "visited_count": len(
                visited
            ),

            "traversal": traversal,

            "path": path,

            "path_length": (
                len(path) - 1
                if path
                else 0
            ),

            "execution_time": execution_time

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# DFS
# ============================================================

@app.route("/dfs", methods=["POST"])
def dfs():

    try:

        if graph.number_of_nodes() == 0:

            return jsonify({
                "success": False,
                "error": "Network is empty."
            }), 400

        data = request.get_json(
            silent=True
        ) or {}

        start = str(
            data.get("start", "")
        ).strip()

        end = str(
            data.get("end", "")
        ).strip()

        if start not in graph:

            return jsonify({
                "success": False,
                "error": (
                    f"Start node '{start}' "
                    "not found."
                )
            }), 400

        if end not in graph:

            return jsonify({
                "success": False,
                "error": (
                    f"End node '{end}' "
                    "not found."
                )
            }), 400

        start_time = time.perf_counter()

        stack = [start]

        visited = set()

        parent = {
            start: None
        }

        traversal = []

        found = False

        while stack:

            current = stack.pop()

            if current in visited:
                continue

            visited.add(current)

            traversal.append(
                str(current)
            )

            if current == end:

                found = True
                break

            neighbors = list(
                graph.neighbors(current)
            )

            for neighbor in reversed(
                neighbors
            ):

                if neighbor not in visited:

                    if neighbor not in parent:

                        parent[neighbor] = current

                    stack.append(
                        neighbor
                    )

        path = []

        if found:

            current = end

            while current is not None:

                path.append(
                    str(current)
                )

                current = parent.get(
                    current
                )

            path.reverse()

        execution_time = (
            time.perf_counter()
            - start_time
        )

        return jsonify({

            "success": True,

            "algorithm": "DFS",

            "start": start,

            "end": end,

            "found": found,

            "visited": [
                str(node)
                for node in visited
            ],

            "visited_count": len(
                visited
            ),

            "traversal": traversal,

            "path": path,

            "path_length": (
                len(path) - 1
                if path
                else 0
            ),

            "execution_time": execution_time

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# GREEDY COLORING
# ============================================================

@app.route(
    "/greedy-coloring",
    methods=["POST"]
)
def greedy_coloring():

    try:

        if graph.number_of_nodes() == 0:

            return jsonify({
                "success": False,
                "error": "Network is empty."
            }), 400

        start_time = time.perf_counter()

        coloring = nx.coloring.greedy_color(
            graph,
            strategy="largest_first"
        )

        execution_time = (
            time.perf_counter()
            - start_time
        )

        colors = {

            str(node): int(color)

            for node, color
            in coloring.items()

        }

        number_of_colors = (

            max(
                coloring.values()
            ) + 1

            if coloring

            else 0

        )

        return jsonify({

            "success": True,

            "algorithm": "Greedy Coloring",

            "coloring": colors,

            "number_of_colors":
                number_of_colors,

            "total_nodes":
                graph.number_of_nodes(),

            "execution_time":
                execution_time

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# FLOYD-WARSHALL
# ============================================================

@app.route(
    "/floyd-warshall",
    methods=["POST"]
)
def floyd_warshall():

    try:

        if graph.number_of_nodes() == 0:

            return jsonify({
                "success": False,
                "error": "Network is empty."
            }), 400

        data = request.get_json(
            silent=True
        ) or {}

        start = str(
            data.get("start", "")
        ).strip()

        end = str(
            data.get("end", "")
        ).strip()

        if start not in graph:

            return jsonify({
                "success": False,
                "error": (
                    f"Start node '{start}' "
                    "not found."
                )
            }), 400

        if end not in graph:

            return jsonify({
                "success": False,
                "error": (
                    f"End node '{end}' "
                    "not found."
                )
            }), 400

        start_time = time.perf_counter()

        distances = dict(
            nx.floyd_warshall(graph)
        )

        execution_time = (
            time.perf_counter()
            - start_time
        )

        try:

            shortest_path = nx.shortest_path(
                graph,
                source=start,
                target=end
            )

            distance = nx.shortest_path_length(
                graph,
                source=start,
                target=end
            )

            shortest_path = [
                str(node)
                for node in shortest_path
            ]

        except nx.NetworkXNoPath:

            shortest_path = []

            distance = None

        return jsonify({

            "success": True,

            "algorithm":
                "Floyd-Warshall",

            "start":
                start,

            "end":
                end,

            "shortest_path":
                shortest_path,

            "path":
                shortest_path,

            "distance":
                distance,

            "hops":
                (
                    len(shortest_path) - 1
                    if shortest_path
                    else 0
                ),

            "execution_time":
                execution_time

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# BRANCH AND BOUND - MAXIMUM CLIQUE
# ============================================================

def maximum_clique_branch_and_bound(G):

    best_clique = []

    def expand(
        current_clique,
        candidates
    ):

        nonlocal best_clique

        if (
            len(current_clique)
            + len(candidates)
            <= len(best_clique)
        ):

            return

        if not candidates:

            if (
                len(current_clique)
                > len(best_clique)
            ):

                best_clique = (
                    current_clique.copy()
                )

            return

        while candidates:

            node = candidates.pop()

            if (
                len(current_clique)
                + 1
                + len(candidates)
                <= len(best_clique)
            ):

                return

            new_candidates = [

                candidate

                for candidate
                in candidates

                if G.has_edge(
                    node,
                    candidate
                )

            ]

            expand(

                current_clique + [
                    node
                ],

                new_candidates

            )

    expand(
        [],
        list(G.nodes())
    )

    return best_clique


@app.route(
    "/branch-bound",
    methods=["POST"]
)
def branch_bound():

    try:

        if graph.number_of_nodes() == 0:

            return jsonify({
                "success": False,
                "error": "Network is empty."
            }), 400

        start_time = time.perf_counter()

        clique = (
            maximum_clique_branch_and_bound(
                graph
            )
        )

        execution_time = (
            time.perf_counter()
            - start_time
        )

        clique = [
            str(node)
            for node in clique
        ]

        clique_size = len(clique)

        clique_edges = (
            clique_size
            * (clique_size - 1)
            // 2
        )

        return jsonify({

            "success": True,

            "algorithm":
                "Branch & Bound",

            "clique":
                clique,

            "maximum_clique":
                clique,

            "size":
                clique_size,

            "clique_edges":
                clique_edges,

            "execution_time":
                execution_time

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# COMPARE TIMES
# ============================================================

@app.route(
    "/compare-times",
    methods=["POST"]
)
def compare_times():

    try:

        if graph.number_of_nodes() == 0:

            return jsonify({
                "success": False,
                "error": "Network is empty."
            }), 400

        results = {}

        first_node = list(
            graph.nodes()
        )[0]

        # BFS
        start_time = time.perf_counter()

        queue = [first_node]
        visited = {first_node}

        while queue:

            current = queue.pop(0)

            for neighbor in graph.neighbors(
                current
            ):

                if neighbor not in visited:

                    visited.add(neighbor)

                    queue.append(neighbor)

        results["BFS"] = (
            time.perf_counter()
            - start_time
        )

        # DFS
        start_time = time.perf_counter()

        stack = [first_node]
        visited = set()

        while stack:

            current = stack.pop()

            if current in visited:
                continue

            visited.add(current)

            for neighbor in graph.neighbors(
                current
            ):

                if neighbor not in visited:

                    stack.append(neighbor)

        results["DFS"] = (
            time.perf_counter()
            - start_time
        )

        # Greedy
        start_time = time.perf_counter()

        nx.coloring.greedy_color(
            graph,
            strategy="largest_first"
        )

        results["Greedy Coloring"] = (
            time.perf_counter()
            - start_time
        )

        # Floyd-Warshall
        start_time = time.perf_counter()

        nx.floyd_warshall(graph)

        results["Floyd-Warshall"] = (
            time.perf_counter()
            - start_time
        )

        # Branch & Bound
        start_time = time.perf_counter()

        maximum_clique_branch_and_bound(
            graph
        )

        results["Branch & Bound"] = (
            time.perf_counter()
            - start_time
        )

        return jsonify({

            "success": True,

            "algorithms":
                list(results.keys()),

            "times":
                list(results.values()),

            "execution_times":
                results

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def page_not_found(error):

    return jsonify({
        "success": False,
        "error": "Page not found."
    }), 404


@app.errorhandler(500)
def internal_server_error(error):

    return jsonify({
        "success": False,
        "error": "Internal server error."
    }), 500


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )