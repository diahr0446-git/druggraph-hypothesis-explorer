# DrugGraph — Knowledge-Graph Hypothesis Explorer

DrugGraph is a full-stack research prototype for exploring potential drug–drug interaction hypotheses through a biomedical knowledge graph. It combines a React frontend, FastAPI backend, graph traversal, transparent evidence paths, and an optional graph-embedding experiment.

> **Research use only.** DrugGraph is not a clinical decision-support system, does not provide medical advice, and must not be used to start, stop, or change medication. Demonstration data is synthetic. A path in a graph is a hypothesis to investigate, not evidence that a drug interaction exists.

## Features
- Interactive drug-pair exploration with evidence-path explanations
- Knowledge graph of drugs, proteins, genes, pathways, diseases, and adverse effects
- Graph traversal that surfaces shared targets/pathways and indirect connections
- Evidence ledger with source, relationship, confidence, and provenance fields
- Searchable graph explorer and network visualization
- Demo dataset included; clearly marked synthetic
- Optional PyTorch Geometric experiment scaffold for link prediction
- API docs, Docker Compose, tests, and reproducible setup

## Architecture
- **Frontend:** React + Vite + TypeScript + Cytoscape.js
- **Backend:** FastAPI + Pydantic + NetworkX
- **Research ML:** optional PyTorch baseline for link-prediction experiments
- **Data:** CSV seed files in `data/`; synthetic rows are not biomedical evidence

## Quick start (local)
Requirements: Node.js 20+, Python 3.11+.

### 1. Backend
```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

### Docker Compose
```bash
docker compose up --build
```
Open http://localhost:5173.

## Demo workflow
1. Open the dashboard and choose a demo drug pair.
2. Inspect the candidate paths and relationship types.
3. Review each edge's provenance and synthetic-data warning.
4. Export a JSON report for a research notebook.

## Real biomedical data: safe extension path
Replace the demo seed dataset only with legally usable, versioned sources such as:
- **DrugBank** (license/access terms apply)
- **Open Targets** (review terms and API policies)
- **ChEMBL** (document provenance and release)
- **CTD** (verify current licensing and attribution)
- **SIDER** (verify release and redistribution terms)
- **PubChem / PubMed** (follow API, data, and citation policies)

Do not scrape restricted datasets. Store source name, release/version, retrieval date, original identifier, URL/DOI, evidence type, and licensing metadata for every assertion. Normalize identifiers before merging entities. Never infer a clinically actionable interaction from graph connectivity alone.

## Research methodology
A credible major-project evaluation should compare:
1. A simple rule/path baseline
2. A graph embedding or link-prediction model
3. A held-out benchmark with temporal or entity split
4. Precision@K / Recall@K / AUROC / AUPRC where appropriate
5. Ablation studies and calibration
6. Expert review of a small, provenance-backed candidate set

Avoid random edge splits that leak near-duplicate relations. Report negative-sampling strategy and class imbalance. The optional ML scaffold is a starting point, not a validated model.

## API
- `GET /api/health`
- `GET /api/graph`
- `GET /api/drugs`
- `GET /api/search?q=...`
- `POST /api/analyze` with `{ "drug_a": "DG-001", "drug_b": "DG-002", "max_hops": 4 }`

## Project structure
```text
DrugGraph/
├── backend/app/main.py
├── backend/app/graph_service.py
├── backend/app/schemas.py
├── backend/tests/test_api.py
├── frontend/src/App.tsx
├── frontend/src/main.tsx
├── frontend/src/styles.css
├── data/nodes.csv
├── data/edges.csv
├── docker-compose.yml
└── README.md
```

## Important limitations
- The included entities and relationships are explicitly synthetic demonstration records.
- Path discovery explains connectivity; it does not establish pharmacological causality.
- No clinical interaction severity, dosage, patient context, or treatment recommendation is produced.
- Before presenting scientific claims, replace demo data, cite primary evidence, validate entity resolution, and obtain qualified domain review.

## License
MIT for this starter implementation. Dataset licensing remains the responsibility of the dataset provider and may differ from the code license.
