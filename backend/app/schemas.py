from pydantic import BaseModel, Field
from typing import Any

class AnalyzeRequest(BaseModel):
    drug_a: str
    drug_b: str
    max_hops: int = Field(default=4, ge=2, le=6)

class EvidenceEdge(BaseModel):
    source: str
    target: str
    relation: str
    evidence: str
    source_name: str
    confidence: float
    synthetic: bool = True

class CandidatePath(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[EvidenceEdge]
    path_length: int
    hypothesis: str

class AnalyzeResponse(BaseModel):
    drug_a: dict[str, Any]
    drug_b: dict[str, Any]
    candidate_paths: list[CandidatePath]
    interpretation: str
    safety_notice: str
    synthetic_demo_data: bool = True
