# Social Network Algorithm Analysis - HTML CSS JS Python

This is the web version of the original Tkinter application.

## Technologies
- HTML
- CSS
- JavaScript
- Python Flask
- Pandas
- NetworkX
- Plotly.js
- Chart.js

## Algorithms
1. BFS Traversal
2. DFS Traversal
3. Greedy Graph Coloring
4. Floyd-Warshall
5. Branch & Bound Maximum Clique
6. Execution Time Comparison

## Run

Open Command Prompt/PowerShell in this folder:

```bash
pip install -r requirements.txt
python app.py
```

Then open:

http://127.0.0.1:5000

## Dataset

Upload a CSV file containing two columns representing connections, for example:

source,target
Alice,Bob
Alice,Charlie
Bob,David

After upload:
1. Select Source Column.
2. Select Target Column.
3. Click Build Network.
4. Select Start and End nodes.
5. Run BFS, DFS, Floyd-Warshall, or another algorithm.

## Notes
- Floyd-Warshall is restricted to 180 nodes for browser visualization/demo performance.
- Exact Branch & Bound Maximum Clique is restricted to 65 nodes.
- The algorithm implementations are based on the supplied Tkinter version.
