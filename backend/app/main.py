from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .graph_service import load_graph, graph_json, node_payload, analyze_pair
from .schemas import AnalyzeRequest

app = FastAPI(title="DrugGraph API", version="1.0.0",
              description="Research-only knowledge graph hypothesis explorer. Demo data is synthetic.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
G = load_graph()
NOTICE = ("Research prototype only. Connections are hypotheses, not confirmed drug interactions. "
          "Demo records are synthetic. Do not use for medication decisions.")

@app.get("/api/health")
def health():
    return {"status": "ok", "nodes": G.number_of_nodes(), "edges": G.number_of_edges(),
            "synthetic_demo_data": True}

@app.get("/api/graph")
def get_graph():
    return graph_json(G)

@app.get("/api/drugs")
def drugs():
    return [node_payload(G, n) for n, d in G.nodes(data=True) if d["type"] == "drug"]

@app.get("/api/search")
def search(q: str = Query(default="", max_length=100)):
    q = q.strip().lower()
    return [node_payload(G, n) for n, d in G.nodes(data=True)
            if q in d["label"].lower() or q in d.get("description", "").lower()][:30]

@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    try:
        paths = analyze_pair(G, req.drug_a, req.drug_b, req.max_hops)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown node ID. Select a drug from the list.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"drug_a": node_payload(G, req.drug_a), "drug_b": node_payload(G, req.drug_b),
            "candidate_paths": paths,
            "interpretation": "Graph connectivity is a lead for literature review, not proof of interaction. "
                              "Review edge provenance and validate every assertion using primary sources.",
            "safety_notice": NOTICE, "synthetic_demo_data": True}
