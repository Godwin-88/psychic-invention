# Agentic Systems Engineer — Best Practices Checklist

> Master reference synthesised from all books in the study repository.
> Each item is tagged with its primary source book(s).

---

## PART 1: LLM Foundations

> Reference: *Building AI Agents with LLMs, RAG, and Knowledge Graphs* — Raieli & Iuculano (Packt, 2025), Chs. 1–3

### Text Representation
- [ ] Use **cosine similarity**, not dot product, for comparing embeddings (scale-invariant, bounded [-1,1])
- [ ] Choose embedding dimension ~300 for Word2Vec; larger models may not need this constraint
- [ ] Apply **TF-IDF** when retrieval precision matters over recall; it down-weights stop words
- [ ] Use the **same embedding model** for both indexing and query encoding in RAG
- [ ] Visualise embedding spaces with **UMAP** (preferred over t-SNE for global structure preservation)

### LLM Selection and Prompting
- [ ] Benchmark LLMs on both **tokens/second** and **tokens/sec/billion parameters** for efficiency
- [ ] Use a **larger judge model** (e.g., GPT-4) to evaluate quality, completeness, and truthfulness of outputs
- [ ] Prefer **Chain-of-Thought (CoT)** prompting for multi-step reasoning tasks
- [ ] Apply **self-consistency** (sample N reasoning paths, majority vote) to improve accuracy on hard problems
- [ ] Use **DSPy** or similar when prompt engineering needs to be automated and reproducible
- [ ] Use **instruction-tuned** models for task-following; **base models** only for research/fine-tuning
- [ ] Account for the **knowledge cutoff** — never trust LLM responses about recent or fast-changing facts without RAG

---

## PART 2: Agent Architecture

> Reference: *Building AI Agents with LLMs, RAG, and Knowledge Graphs* — Raieli & Iuculano (Packt, 2025), Chs. 4, 9

### Core Design
- [ ] Design every agent around the **Brain-Perception-Action** triad
- [ ] Ensure your agent has all four properties: **autonomy, reactivity, pro-activeness, social ability**
- [ ] Choose **decomposition-first planning** for well-defined tasks; **interleaved planning** for dynamic tasks
- [ ] Always implement **plan reflection** — evaluate the plan before executing it
- [ ] Use **memory-augmented planning** (external DB) when tasks exceed context window capacity

### Tool Use
- [ ] Provide LLM with a clear **tool schema** (name, description, input/output spec)
- [ ] Validate all **tool outputs** before passing them back to the agent
- [ ] Sandbox all **code execution** tools (Docker, E2B) to prevent system compromise
- [ ] Log every tool call with input, output, duration, and success/failure status

### Framework Selection
- [ ] Use **LangChain** for general-purpose agents with broad tool ecosystems
- [ ] Use **LlamaIndex** for data-heavy retrieval agents
- [ ] Use **AutoGen** for multi-agent conversation patterns
- [ ] Use **Semantic Kernel** when integrating with Microsoft/.NET ecosystems

---

## PART 3: RAG Systems

> Reference: *Building AI Agents with LLMs, RAG, and Knowledge Graphs* — Raieli & Iuculano (Packt, 2025), Chs. 5–6

### Indexing
- [ ] Choose chunk size based on task: ~512 tokens with 10% overlap for general QA
- [ ] Use **semantic chunking** (split on topic shifts) for long narrative documents
- [ ] Use **hierarchical indexing** for documents with clear structure (chapters, sections)
- [ ] Store **metadata** with each chunk (source, date, author) to enable filtered retrieval
- [ ] Re-index when source documents are updated — stale indexes degrade quality silently

### Retrieval
- [ ] Start with **hybrid search** (dense + BM25) as the default — it consistently outperforms either alone
- [ ] Add a **reranking step** (cross-encoder) after initial retrieval to improve precision
- [ ] Use **HyDE** when queries are vague or short — generate hypothetical answer, embed that instead
- [ ] Implement **query routing** for multi-domain systems — direct to the right index

### Evaluation
- [ ] Evaluate every RAG system with the **RAG Triad**: context relevance + answer faithfulness + answer relevance
- [ ] Track **retrieval quality** metrics (Precision@K, Recall@K) separately from generation quality
- [ ] Use **LLM-as-judge** patterns for evaluation at scale

---

## PART 4: Knowledge Graphs

> References:
> - *Building AI Agents with LLMs, RAG, and Knowledge Graphs* — Raieli & Iuculano (Packt, 2025), Ch. 7
> - *Graph Data Science with Python and Neo4j* — Eastridge (AVA, 2024)
> - *Graph Algorithms for Data Science* — Bratanič (Manning, 2024)

### Graph Modelling
- [ ] Use the **Labeled-Property Graph (LPG)** model for most enterprise KGs — flexible and queryable
- [ ] Design schema first — define node labels, relationship types, and properties before importing data
- [ ] Use `MERGE` (not `CREATE`) to avoid duplicate nodes when building KGs incrementally
- [ ] Use **unique constraints** in Neo4j to enforce entity deduplication
- [ ] Model **bidirectional relationships** as two directed edges when traversal in both directions is needed

### Cypher Query Best Practices
- [ ] Always use **parameterised queries** — never string-interpolate user input into Cypher
- [ ] Use `EXPLAIN` / `PROFILE` to diagnose slow queries before optimising
- [ ] Add **indexes** on frequently queried properties (`CREATE INDEX ON :Person(name)`)
- [ ] Use `WITH` to chain aggregation stages instead of nested subqueries
- [ ] Use `COLLECT` and `UNWIND` for efficient list processing in Cypher

### GraphRAG
- [ ] Extract entities from user queries before graph retrieval
- [ ] Generate **Cypher queries from natural language** using an LLM; validate before execution
- [ ] Retrieve **subgraphs** (not just nodes) for richer context — 1–2 hop neighbourhoods
- [ ] Combine graph-retrieved structured context with vector-retrieved text chunks for best results

---

## PART 5: Graph Algorithms

> References:
> - *Graph Algorithms for Data Science* — Bratanič (Manning, 2024)
> - *Graph Data Science with Python and Neo4j* — Eastridge (AVA, 2024)
> - See also: `SKILL_graph_algorithms_no_gds.md` for full GDS-free Python implementations

### GDS Availability — Know Before You Build
- [ ] **Neo4j GDS Community plugin is free** — install on local/self-hosted Neo4j; it is not available on AuraDB Free tier
- [ ] When GDS is unavailable: pull graph into Python via Cypher → run algorithms with **NetworkX / igraph / PyG**
- [ ] Use **igraph** (C backend) instead of NetworkX for graphs >100K nodes — 10–100x faster
- [ ] Use **python-louvain** or **leidenalg** for community detection without GDS
- [ ] Use the **`node2vec` pip package** for node embeddings without GDS
- [ ] Neo4j stays as **storage + Cypher query engine**; Python handles all analytics when GDS is absent
- [ ] Write computed scores (PageRank, community ID) **back to Neo4j** via parameterised Cypher `SET` after computing in Python

### Workflow Pattern (GDS)
- [ ] Always follow the GDS workflow: **project** → **algorithm** → **write** → **drop**
- [ ] Use **native projection** for performance; **Cypher projection** for flexible filtering
- [ ] Use **stream mode** to explore results before committing; **write mode** to persist to graph
- [ ] Drop in-memory graphs after use (`gds.graph.drop`) to free memory

### Algorithm Selection Guide
| Goal | GDS (when available) | Python fallback |
|------|---------------------|-----------------|
| Find most important nodes | `gds.pageRank` | `nx.pagerank()` / `igraph.pagerank()` |
| Find disconnected components | `gds.wcc` | `nx.weakly_connected_components()` |
| Group nodes into communities | `gds.louvain` | `community.best_partition()` / `leidenalg` |
| Find similar nodes | `gds.nodeSimilarity` | `nx.jaccard_coefficient()` / cosine on adj. matrix |
| Node embeddings | `gds.node2vec` | `node2vec` pip package / PyG `Node2Vec` |
| Node classification | `gds` + downstream ML | GCN / GraphSAGE (PyG) |
| Link prediction | `gds` features + ML | PyG + structural features |
| Betweenness / closeness | `gds.betweenness` | `nx.betweenness_centrality(k=500)` for approx |

- [ ] Use **WCC** as a data quality check first — unexpected components indicate broken relationships
- [ ] Use **Louvain** for large-scale community detection (O(n log n))
- [ ] Prefer **Leiden** over Louvain when quality matters — it avoids disconnected communities
- [ ] Use **Personalized PageRank** when you need importance relative to a specific seed node
- [ ] For GNN-based centrality prediction: train on exact labels → inference is O(n) vs O(VE)

---

## PART 6: Graph Machine Learning

> References:
> - *Graph Machine Learning, 2nd Ed.* — Marzullo, Deusebio, Stamile (Packt, 2025)
> - *Graph Neural Networks* — Wu, Cui, Pei, Zhao (Springer, 2022)
> - *Graph Algorithms for Data Science* — Bratanič (Manning, 2024), Chs. 9–12

### Embeddings
- [ ] Choose node2vec `q < 1` (BFS-like) to capture **community structure / homophily**
- [ ] Choose node2vec `q > 1` (DFS-like) to capture **structural roles**
- [ ] Use **inductive models** (GraphSAGE, GAT) when new nodes appear at inference time
- [ ] Use **transductive models** (GCN) only when the full graph is known at training time

### GNN Design
- [ ] Start simple: **GCN** or **GraphSAGE** before moving to complex architectures
- [ ] Use **GAT** when not all neighbours should contribute equally
- [ ] Use **GIN** for graph-level classification — it is the most expressive (WL test equivalent)
- [ ] Apply **dropout** between GNN layers to prevent over-smoothing
- [ ] Limit depth to 2–3 layers — deeper GNNs suffer from over-smoothing (node representations converge)

### Link Prediction
- [ ] Always use **time-based splits** for graph datasets — random splits cause data leakage
- [ ] Include **negative sampling** in training — ratio of ~1:5 (positive:negative) is common
- [ ] Engineer structural features: common neighbours, Adamic-Adar, preferential attachment
- [ ] Evaluate with **AUC-ROC** and **hits@K** — not accuracy (class imbalance in link prediction)

### Knowledge Graph Completion
- [ ] Use **TransE** as baseline for KG completion — simple, fast, good for non-complex relations
- [ ] Evaluate with **MRR** (Mean Reciprocal Rank) and **hits@1/3/10**
- [ ] Validate triples against known ontology before training

---

## PART 7: Multi-Agent Systems

> Reference: *Building AI Agents with LLMs, RAG, and Knowledge Graphs* — Raieli & Iuculano (Packt, 2025), Chs. 4, 9

- [ ] Assign **clear, non-overlapping roles** to each agent — ambiguity causes redundant work
- [ ] Use **majority voting** (3+ agents) for high-stakes decisions
- [ ] Implement **max iteration limits** on all agent loops to prevent infinite cycles
- [ ] Summarise intermediate results between agents — never pass full conversation history
- [ ] Build a **capability registry**: what each agent can and cannot do
- [ ] Log all inter-agent messages with structured metadata (sender, recipient, task_id, timestamp)
- [ ] Validate each agent's output before passing to the next agent in pipeline architectures
- [ ] Use **adversarial/debate patterns** for fact-checking and decision robustness
- [ ] Test MAS with **chaos engineering**: disable one agent and verify graceful degradation

---

## PART 8: Production Deployment

> Reference: *Building AI Agents with LLMs, RAG, and Knowledge Graphs* — Raieli & Iuculano (Packt, 2025), Ch. 10

### API Design
- [ ] Use **async** endpoints (FastAPI + asyncio) — never block on LLM calls
- [ ] Implement **retry with exponential backoff** for all LLM API calls
- [ ] Set **request timeouts** — prevent hanging connections from degrading the whole service
- [ ] Version your API (`/v1/query`) from day one — enables non-breaking upgrades

### Infrastructure
- [ ] Use **Docker Compose** for local development; **Kubernetes** for production scale
- [ ] Cache embedding models and DB connections with `@st.cache_resource` (Streamlit) or startup lifespan (FastAPI)
- [ ] Store all secrets in environment variables or a secrets manager — never hardcode API keys
- [ ] Use **volume mounts** for persistent data (Neo4j, vector stores) in Docker

### Security
- [ ] **Sanitise all user inputs** before injecting into prompts or Cypher queries
- [ ] Restrict agent tool permissions to the minimum required (principle of least privilege)
- [ ] Sandbox code-executing agents in isolated containers
- [ ] Scrub PII from logs before writing to any persistent storage
- [ ] Rate-limit all public-facing endpoints

### Observability
- [ ] Log every LLM call: prompt (hashed), model, tokens in/out, latency, success/failure
- [ ] Track the **P95/P99 latency** — averages hide tail latency problems
- [ ] Alert on **token cost anomalies** — runaway agents can generate unexpected bills
- [ ] Monitor **RAG quality** in production with a sample of queries judged by LLM

---

## Quick Reference: Book Registry

| Book | Author(s) | Publisher | Year | Primary Skills |
|------|-----------|-----------|------|---------------|
| *Building AI Agents with LLMs, RAG, and Knowledge Graphs* | Raieli & Iuculano | Packt | 2025 | Agents, RAG, KGs, MAS, Deployment |
| *Graph Algorithms for Data Science* | Tomaž Bratanič | Manning | 2024 | Neo4j, Cypher, GDS algorithms, NLP→Graph |
| *Graph Machine Learning, 2nd Ed.* | Marzullo, Deusebio, Stamile | Packt | 2025 | GNNs, node2vec, PyG, DGL |
| *Graph Data Science with Python and Neo4j* | Timothy Eastridge | AVA | 2024 | Python-Neo4j integration, GDS, LLM enrichment |
| *Graph Neural Networks: Foundations, Frontiers, and Applications* | Wu, Cui, Pei, Zhao | Springer | 2022 | GNN theory, research frontiers, applications |

## Skill File Registry

| File | Topics |
|------|--------|
| `SKILL_llm_fundamentals.md` | Embeddings, Transformer, prompting, LLM selection |
| `SKILL_agent_architecture.md` | Brain-Perception-Action, planning, memory, frameworks |
| `SKILL_rag_systems.md` | Naive & advanced RAG, vector DBs, evaluation |
| `SKILL_knowledge_graphs.md` | KG construction, Neo4j, Cypher, GraphRAG, KG embeddings |
| `SKILL_graph_algorithms.md` | GDS workflows, centrality, community, similarity |
| `SKILL_graph_algorithms_no_gds.md` | **GDS-free**: NetworkX, igraph, python-louvain, node2vec, PyG equivalents |
| `SKILL_graph_ml_gnn.md` | node2vec, GCN/GAT/GraphSAGE/GIN, link prediction, KG completion |
| `SKILL_multi_agent_systems.md` | MAS patterns, AutoGen, coordination, failure modes |
| `SKILL_production_deployment.md` | Streamlit, FastAPI async, Docker, MLOps, security |

---

## Assessment Preparation Priorities

For the **Agentic Systems Engineer** trial assessment, focus on:

1. **Agent loop implementation** — ReAct pattern, tool calling, memory management
2. **RAG pipeline** — end-to-end: ingestion → chunking → embedding → retrieval → generation
3. **GraphRAG** — KG construction from text, Cypher generation, graph-guided retrieval
4. **Multi-agent orchestration** — coordinator-worker pattern, inter-agent communication
5. **Production patterns** — async, Docker, error handling, structured logging
6. **Neo4j / Cypher** — MATCH, MERGE, GDS algorithms (PageRank, Louvain, WCC)
7. **Evaluation** — RAG triad, LLM-as-judge, latency/cost metrics


---

# Agentic Systems Engineer (AI Automation) — Role Breakdown & Personal Mantra

---

## Context — The Environment You're Working In

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI VENTURE STUDIO                          │
│                                                                 │
│   Startup A ──┐                                                 │
│   Startup B ──┼──► SHARED ORCHESTRATION PLATFORM  ◄── YOU      │
│   Startup C ──┘    (agents + pipelines + modules)               │
│                                                                 │
│   New venture spun up → plug into platform → ship in days       │
└─────────────────────────────────────────────────────────────────┘
```

1. **AI Venture Studio setting** — the company launches multiple lean startups in sequence; you are building the shared execution infrastructure that powers all of them, not a single product
2. **Speed is the primary constraint** — startups need to be spun up "fast and reliably"; your system must reduce time-to-automation to near-zero for each new venture
3. **LLMs are a tool, not the product** — the spec explicitly states "LLMs where they help, code where reliability matters"; this is an engineering role, not a prompt-engineering role
4. **Proof of shipping outweighs credentials** — "credentials matter less than proof of shipping" — a portfolio of real, production-used automations is the de facto hiring filter
5. **The stack is flexible but practical** — Python/TypeScript, APIs/webhooks, queues, LLM providers, basic monitoring — no exotic stack, but everything must be production-grade from day one

---

## Purpose — What This Role Exists to Achieve

```
                    THE CORE DELIVERABLE

  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  INTAKE  │───►│DECISION  │───►│  ACTION  │───►│  AUDIT   │
  │          │    │          │    │          │    │  TRAIL   │
  │ User req │    │ LLM/rule │    │ API call │    │ Log/DB   │
  │ Webhook  │    │ Agent    │    │ Write    │    │ Metrics  │
  └──────────┘    └──────────┘    └──────────┘    └──────────┘
        │                │               │               │
        └────────────────┴───────────────┴───────────────┘
                    Every workflow must complete this chain
```

1. **Build a reusable orchestration platform** — the core deliverable is a control layer (agents + tools + deterministic pipelines) that any new startup venture can plug into immediately
2. **Turn business workflows into auditable software** — every process follows `intake → decision → action → audit trail`; nothing runs without a traceable record
3. **Eliminate silent failures** — implement checks, retries, timeouts, and observability so the system self-heals and alerts rather than failing invisibly
4. **Create reusable modules** — every automation built must be packageable and redeployable across different startups with minimal rework; the studio's competitive edge is reuse velocity
5. **Enable non-engineers to trigger automated workflows** — via n8n/Make/Zapier or custom tooling, business operators should launch automations without writing code

---

## Approach — How to Execute in This Role

```
         DECISION TREE: LLM or Deterministic Code?

              Can a rule/regex/API solve this?
                        │
              ┌─────────┴─────────┐
             YES                  NO
              │                   │
     Use deterministic        Is the output
         code ✓             format critical?
                                  │
                       ┌──────────┴──────────┐
                      YES                    NO
                       │                     │
              Use LLM + schema         Use LLM + eval
              validation + retry       golden cases ✓
```

1. **Design for determinism first, then intelligence** — start every workflow as a deterministic pipeline; only inject an LLM where a rule-based approach genuinely fails, never by default
2. **Build the reliability layer before the feature layer** — every component ships with logging, retry logic, timeout guards, and a health check before any new capability is added
3. **Think in failure modes, not happy paths** — for every workflow, explicitly map: what breaks, what the retry strategy is, what the fallback is, and what the alert threshold is
4. **Package as modules from commit one** — structure every automation as a standalone, configurable module with clear inputs/outputs/config; never build one-off scripts
5. **Use LLM eval/QA from the start** — maintain golden test cases for every LLM-powered step; run them on every deployment to catch regressions before production

---

## Daily Atomic & Repeatable Checklist

> These are actions to execute every single working day — short enough to complete, high enough leverage to compound over time.

```
DAILY LOOP:
  Morning                    Midday                    End of Day
  ───────                    ──────                    ──────────
  [ ] Check logs/dashboard   [ ] Build/extend module   [ ] Commit shippable unit
  [ ] Review one failure     [ ] Write golden test     [ ] Document one interface
  [ ] Validate one API       [ ] Trace one workflow    [ ] Refactor LLM → code
                             [ ] Add/verify logging
```

| # | Task | Why It Matters |
|---|------|----------------|
| 1 | **Build or extend one automation module** — even a stub with typed inputs/outputs/config | Compounds the reusable module library; daily shipping habit |
| 2 | **Add or verify logging** on every function that calls an LLM or external API | Silent failures are the #1 enemy; logging is non-negotiable per the spec |
| 3 | **Write one golden test case** for an LLM-powered step — input + expected output format | Builds the eval suite; catches model/prompt regressions early |
| 4 | **Review one failed or timed-out workflow run** — identify root cause, add a guard | Converts failures into hardened reliability; builds intuition for failure modes |
| 5 | **Validate one API/webhook integration** — auth, error response handling, edge cases | APIs change; proactive validation prevents downstream silent breakage |
| 6 | **Document one module's interface** — inputs, outputs, config params, failure behaviour | Enables reuse across startups without tribal knowledge; enforces spec discipline |
| 7 | **Trace one end-to-end workflow** — `intake → decision → action → audit trail` manually | Ensures the full chain works together, not just individual components |
| 8 | **Check monitoring dashboard / logs for anomalies** — token costs, error rates, latency spikes | Cost and reliability visibility; catches runaway agents before they become incidents |
| 9 | **Refactor one piece of workflow logic from LLM → deterministic code** if it's stable enough | The spec explicitly values code over LLM where reliability matters; reduces fragility over time |
| 10 | **Commit and push one shippable unit of work** — working, tested, documented | "Proof of shipping" is the culture; daily commits demonstrate output over activity |

---

## The Mantra

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "Not the most sophisticated agent.                            │
│    The most DEPENDABLE one."                                    │
│                                                                 │
│   Deterministic first. LLM only where it earns its place.       │
│   Reliability layer before feature layer.                       │
│   Failure modes before happy paths.                             │
│   Ship modules, not scripts.                                    │
│   Proof of shipping is the credential.                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

> Every skill file in this repo feeds directly into this mission:
> RAG for grounded decision-making — GraphRAG for structured knowledge —
> GNNs for relational intelligence — Production skills for the control/observability layer.