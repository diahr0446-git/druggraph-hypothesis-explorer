
import { useEffect, useMemo, useState } from 'react';
import CytoscapeComponent from 'cytoscape';
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Beaker,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Dna,
  FlaskConical,
  GitBranch,
  Search,
  ShieldAlert,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Node = {
  id: string;
  label: string;
  type: string;
  description: string;
  synthetic: boolean;
};

type Edge = {
  source: string;
  target: string;
  relation: string;
  evidence: string;
  source_name: string;
  confidence: number;
  synthetic: boolean;
};

type Graph = {
  nodes: Node[];
  edges: Edge[];
  synthetic_demo_data: boolean;
};

type Path = {
  nodes: Node[];
  edges: Edge[];
  path_length: number;
  hypothesis: string;
};

const typeColors: Record<string, string> = {
  drug: '#8b5cf6',
  protein: '#38bdf8',
  gene: '#34d399',
  pathway: '#fbbf24',
  disease: '#fb7185',
  side_effect: '#f97316',
};

const typeIcons: Record<string, string> = {
  drug: 'DRUG',
  protein: 'PROTEIN',
  gene: 'GENE',
  pathway: 'PATHWAY',
  disease: 'DISEASE',
  side_effect: 'EFFECT',
};

function App() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [drugs, setDrugs] = useState<Node[]>([]);
  const [a, setA] = useState('DG-001');
  const [b, setB] = useState('DG-004');
  const [result, setResult] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/graph`).then((r) => r.json()),
      fetch(`${API}/api/drugs`).then((r) => r.json()),
    ])
      .then(([g, d]) => {
        setGraph(g);
        setDrugs(d);

        if (d.length > 1) {
          setA(d[0].id);
          setB(d[d.length - 1].id);
        }
      })
      .catch(() => {
        setError('Could not reach API. Start the FastAPI server on port 8000.');
      });
  }, []);

  const analyze = async () => {
    setBusy(true);
    setError('');

    try {
      const response = await fetch(`${API}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drug_a: a,
          drug_b: b,
          max_hops: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed');
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const search = async (value: string) => {
    setQuery(value);

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/search?q=${encodeURIComponent(value)}`
      );
      setSearchResults(await response.json());
    } catch {
      // Search errors should not interrupt the rest of the interface.
    }
  };

  const elements = useMemo(() => {
    if (!graph) return [];

    const focus = new Set<string>();

    (result?.candidate_paths || [])
      .slice(0, 4)
      .forEach((path: Path) => {
        path.nodes.forEach((node) => focus.add(node.id));
      });

    const visible = focus.size
      ? graph.nodes.filter((node) => focus.has(node.id))
      : graph.nodes;

    const ids = new Set(visible.map((node) => node.id));

    return [
      ...visible.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          color: typeColors[node.type] || '#94a3b8',
        },
      })),
      ...graph.edges
        .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
        .map((edge, index) => ({
          data: {
            id: `e${index}`,
            source: edge.source,
            target: edge.target,
            label: edge.relation,
          },
        })),
    ];
  }, [graph, result]);

  useEffect(() => {
    const element = document.getElementById('cy');

    if (!element || !elements.length) return;

    const cy = CytoscapeComponent({
      container: element,
      elements: elements as any,

      // The cast keeps Cytoscape's stylesheet typing from blocking the build.
      style: ([
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: '#e2e8f0',
            'font-size': 10,
            'text-wrap': 'wrap',
            'text-max-width': 100,
            width: 34,
            height: 34,
            'border-width': 1,
            'border-color': '#cbd5e1',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1,
            'line-color': '#334155',
            'target-arrow-color': '#64748b',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': 7,
            color: '#94a3b8',
            'text-rotation': 'autorotate',
            'text-background-color': '#0b1220',
            'text-background-opacity': 0.8,
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#fff',
          },
        },
      ] as any),

      layout: {
        name: 'cose',
        animate: false,
        padding: 25,
      },
      minZoom: 0.4,
      maxZoom: 2,
    });

    return () => cy.destroy();
  }, [elements]);

  const exportReport = () => {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `druggraph-${a}-${b}-hypothesis.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <GitBranch size={22} />
          </div>
          <div>
            <strong>DrugGraph</strong>
            <small>RESEARCH STUDIO</small>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <div className="nav-item active">
          <Activity size={17} /> Hypothesis explorer
        </div>
        <div className="nav-item">
          <Dna size={17} /> Knowledge graph
        </div>
        <div className="nav-item">
          <BookOpen size={17} /> Evidence ledger
        </div>

        <div className="side-bottom">
          <div className="status-dot" /> API workspace <span>DEMO</span>
          <p>Version 1.0 · Research prototype</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              BIOMEDICAL KNOWLEDGE GRAPH / EXPLORATION
            </div>
            <h1>Hypothesis Explorer</h1>
            <p>Trace indirect connections. Generate leads for scientific investigation.</p>
          </div>

          <div className="top-right">
            <span className="demo-pill">
              <span /> Synthetic demo dataset
            </span>
            <button className="icon-button" title="Research-only tool">
              <CircleHelp size={18} />
            </button>
          </div>
        </header>

        <div className="notice">
          <ShieldAlert size={18} />
          <div>
            <b>Research use only</b>
            <span>
              Graph paths are not confirmed drug interactions. Demo records are
              synthetic; never use this tool for medication decisions.
            </span>
          </div>
        </div>

        <section className="metrics">
          <div className="metric">
            <div className="metric-icon purple">
              <GitBranch size={18} />
            </div>
            <div>
              <span>GRAPH NODES</span>
              <strong>{graph?.nodes.length ?? '—'}</strong>
              <small>Across 6 entity classes</small>
            </div>
          </div>

          <div className="metric">
            <div className="metric-icon blue">
              <ArrowDownUp size={18} />
            </div>
            <div>
              <span>RELATIONSHIPS</span>
              <strong>{graph?.edges.length ?? '—'}</strong>
              <small>Provenance attached</small>
            </div>
          </div>

          <div className="metric">
            <div className="metric-icon amber">
              <FlaskConical size={18} />
            </div>
            <div>
              <span>HYPOTHESES</span>
              <strong>{result?.candidate_paths?.length ?? '—'}</strong>
              <small>For selected pair</small>
            </div>
          </div>

          <div className="metric">
            <div className="metric-icon green">
              <Beaker size={18} />
            </div>
            <div>
              <span>MODEL STATUS</span>
              <strong className="status-text">EXPLORATORY</strong>
              <small>Not clinically validated</small>
            </div>
          </div>
        </section>

        <div className="workspace">
          <section className="panel analyze-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">01 / DEFINE QUERY</span>
                <h2>Explore a drug pair</h2>
              </div>
              <span className="round-icon">
                <Search size={17} />
              </span>
            </div>

            <p className="muted">
              Find shared biological context and indirect graph paths.
            </p>

            <label>DRUG A</label>
            <select value={a} onChange={(e) => setA(e.target.value)}>
              {drugs.map((drug) => (
                <option key={drug.id} value={drug.id}>
                  {drug.label}
                </option>
              ))}
            </select>

            <div className="swap-row">
              <span>PAIR ANALYSIS</span>
              <button
                onClick={() => {
                  setA(b);
                  setB(a);
                }}
              >
                <ArrowDownUp size={14} /> Swap pair
              </button>
            </div>

            <label>DRUG B</label>
            <select value={b} onChange={(e) => setB(e.target.value)}>
              {drugs.map((drug) => (
                <option key={drug.id} value={drug.id}>
                  {drug.label}
                </option>
              ))}
            </select>

            <button
              className="primary"
              disabled={busy || !a || !b || a === b}
              onClick={analyze}
            >
              {busy ? 'Exploring graph…' : 'Generate hypotheses'}
              <ChevronRight size={17} />
            </button>

            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search genes, pathways, diseases…"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((node) => (
                  <div key={node.id}>
                    <span
                      className="tiny-type"
                      style={{ color: typeColors[node.type] }}
                    >
                      {typeIcons[node.type]}
                    </span>
                    <span>{node.label}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <div className="method-note">
              <CircleHelp size={15} />
              <span>
                Results use transparent graph paths, not a trained clinical
                prediction model.
              </span>
            </div>
          </section>

          <section className="panel graph-panel">
            <div className="panel-head">
              <div>
                <span className="panel-kicker">02 / GRAPH CONTEXT</span>
                <h2>Relationship network</h2>
              </div>
              <span className="graph-count">
                {elements.filter((item: any) => !item.data.source).length} visible
                nodes
              </span>
            </div>

            <div className="legend">
              {Object.entries(typeColors).map(([key, value]) => (
                <span key={key}>
                  <i style={{ background: value }} />
                  {key.replace('_', ' ')}
                </span>
              ))}
            </div>

            <div id="cy" className="cyto">
              {!graph && (
                <div className="loading">Loading knowledge graph…</div>
              )}
            </div>

            <div className="graph-foot">
              <span>
                <i className="line-key" /> Relationship edge
              </span>
              <span>Drag nodes · Scroll to zoom</span>
            </div>
          </section>
        </div>

        <section className="panel results-panel">
          <div className="panel-head">
            <div>
              <span className="panel-kicker">03 / INVESTIGATE</span>
              <h2>Candidate paths</h2>
              <p className="muted">
                Each path is an explainable lead for literature review—not a finding.
              </p>
            </div>

            <button
              className="secondary"
              disabled={!result}
              onClick={exportReport}
            >
              Export JSON report
            </button>
          </div>

          {!result ? (
            <div className="empty">
              <div className="empty-icon">
                <GitBranch size={24} />
              </div>
              <b>No analysis yet</b>
              <span>
                Select two demo drugs and generate hypotheses to inspect indirect
                paths.
              </span>
            </div>
          ) : (
            <>
              {result.candidate_paths.length === 0 ? (
                <div className="empty">
                  <b>No path found within the selected hop limit.</b>
                  <span>
                    This does not establish that no interaction exists.
                  </span>
                </div>
              ) : (
                <div className="path-list">
                  {result.candidate_paths.map((path: Path, index: number) => (
                    <article className="path-card" key={index}>
                      <div className="path-title">
                        <span className="path-number">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <b>Candidate path {index + 1}</b>
                          <small>
                            {path.path_length} relationships · hypothesis only
                          </small>
                        </div>
                        <span className="hypothesis-tag">INVESTIGATE</span>
                      </div>

                      <div className="path-chain">
                        {path.nodes.map((node, nodeIndex) => (
                          <div className="chain-part" key={node.id}>
                            <div className="node-chip">
                              <i style={{ background: typeColors[node.type] }} />
                              <span>{node.label}</span>
                              <small>{node.type.replace('_', ' ')}</small>
                            </div>

                            {nodeIndex < path.nodes.length - 1 && (
                              <div className="chain-arrow">
                                <span>{path.edges[nodeIndex]?.relation}</span>
                                <ChevronRight size={16} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <p className="path-description">{path.hypothesis}</p>

                      <details>
                        <summary>Inspect provenance ({path.edges.length} edges)</summary>
                        <div className="evidence-list">
                          {path.edges.map((edge, edgeIndex) => (
                            <div key={edgeIndex}>
                              <b>{edge.relation}</b>
                              <span>
                                {edge.source_name} · {edge.evidence}
                              </span>
                              <small>
                                Confidence field: {edge.confidence.toFixed(2)} ·{' '}
                                {edge.synthetic
                                  ? 'Synthetic demo record'
                                  : 'Source-backed record'}
                              </small>
                            </div>
                          ))}
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              )}

              <div className="interpretation">
                <AlertTriangle size={18} />
                <div>
                  <b>Interpretation guardrail</b>
                  <p>{result.interpretation}</p>
                </div>
              </div>
            </>
          )}
        </section>

        <footer>
          <span>DrugGraph · Open research prototype</span>
          <span>Built for explainability, provenance, and scientific caution.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
