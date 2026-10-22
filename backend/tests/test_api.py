from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["synthetic_demo_data"] is True

def test_drugs():
    r = client.get("/api/drugs")
    assert r.status_code == 200
    assert len(r.json()) >= 2

def test_analyze_pair():
    drugs = client.get("/api/drugs").json()
    r = client.post("/api/analyze", json={
        "drug_a": drugs[0]["id"], "drug_b": drugs[1]["id"], "max_hops": 4
    })
    assert r.status_code == 200
    assert "candidate_paths" in r.json()
    assert r.json()["synthetic_demo_data"] is True
