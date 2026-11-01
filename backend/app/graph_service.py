import csv
import os
from pathlib import Path
import networkx as nx

BASE = Path(__file__).resolve().parents[2]
DATA = Path(os.getenv("DRUGGRAPH_DATA_DIR", str(BASE / "data")))

def load_graph() -> nx.MultiDiGraph:
    graph = nx.MultiDiGraph()
    with (DATA / "nodes.csv").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            graph.add_node(row["id"], label=row["label"], type=row["type"],
                           description=row["description"], synthetic=row["synthetic"].lower() == "true")
    with (DATA / "edges.csv").open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            graph.add_edge(row["source"], row["target"], relation=row["relation"],
                           evidence=row["evidence"], source_name=row["source_name"],
                           confidence=float(row["confidence"]),
                           synthetic=row["synthetic"].lower() == "true")
    return graph

def node_payload(g, node_id):
    d = g.nodes[node_id]
    return {"id": node_id, "label": d["label"], "type": d["type"],
            "description": d.get("description", ""), "synthetic": d.get("synthetic", True)}

def edge_payload(g, u, v, key):
    d = g.edges[u, v, key]
    return {"source": u, "target": v, "relation": d["relation"],
            "evidence": d["evidence"], "source_name": d["source_name"],
            "confidence": d["confidence"], "synthetic": d["synthetic"]}

def graph_json(g):
    nodes = [node_payload(g, n) for n in g.nodes]
    edges = [edge_payload(g, u, v, k) for u, v, k in g.edges(keys=True)]
    return {"nodes": nodes, "edges": edges, "synthetic_demo_data": True}

def analyze_pair(g, drug_a, drug_b, max_hops=4):
    if drug_a not in g or drug_b not in g:
        raise KeyError("Unknown drug identifier")
    if g.nodes[drug_a]["type"] != "drug" or g.nodes[drug_b]["type"] != "drug":
        raise ValueError("Both selected identifiers must be drug nodes")
    # Search an undirected projection so paths can expose shared neighborhood
    # connections even when source relationships have different directions.
    ug = nx.Graph()
    ug.add_nodes_from(g.nodes(data=True))
    for u, v, d in g.edges(data=True):
        if u != v:
            if not ug.has_edge(u, v):
                ug.add_edge(u, v, relation=d["relation"], original_source=u,
                            original_target=v, evidence=d["evidence"],
                            source_name=d["source_name"], confidence=d["confidence"],
                            synthetic=d["synthetic"])
    paths = []
    try:
        iterator = nx.shortest_simple_paths(ug, drug_a, drug_b)
        for path in iterator:
            if len(path) - 1 > max_hops:
                break
            if len(path) < 3:
                continue
            edges = []
            for u, v in zip(path, path[1:]):
                d = ug.edges[u, v]
                edges.append({"source": u, "target": v, "relation": d["relation"],
                              "evidence": d["evidence"], "source_name": d["source_name"],
                              "confidence": d["confidence"], "synthetic": d["synthetic"]})
            middle_types = [g.nodes[n]["type"] for n in path[1:-1]]
            paths.append({
                "nodes": [node_payload(g, n) for n in path],
                "edges": edges,
                "path_length": len(path)-1,
                "hypothesis": "Indirect graph connection through " + ", ".join(dict.fromkeys(middle_types)) +
                              "; investigate with domain evidence before drawing conclusions."
            })
            if len(paths) >= 8:
                break
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        pass
    return paths
