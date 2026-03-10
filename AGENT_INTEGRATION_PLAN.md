# Functional Agency Integration Plan

## Executive Summary

**Goal:** Add context-aware AI agents to each menu item that explain financial/mathematical inferences using:
- **Neo4j** — Knowledge graph for financial formulas, concepts, interpretations
- **Ollama** — Local LLM inference (Llama 3 8B)
- **OpenCLAW** — Agent orchestration with human-in-loop
- **LangChain** — RAG integration with Neo4j

**Timeline:** 3 weeks
**Priority:** High (key differentiator for portfolio platform)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Frontend (port 3000)                  │
│  ┌─────────┐ ┌──────────┐ ┌───────┐ ┌──────────┐ ┌──────────┐ │
│  │ Pricer  │ │ Portfolio│ │ Risk  │ │ Optimizer│ │ Scenarios│ │
│  │  Agent  │ │  Agent   │ │ Agent │ │  Agent   │ │  Agent   │ │
│  └────┬────┘ └────┬─────┘ └───┬───┘ └────┬─────┘ └────┬─────┘ │
└───────┼──────────┼─────────────┼─────────┼───────────┼────────┘
        │          │             │         │           │
        └──────────┴─────────────┴─────────┴───────────┴────────┐
                              │                                 │
                              ▼                                 ▼
                    ┌─────────────────┐              ┌──────────────────┐
                    │   OpenCLAW      │              │   Ollama         │
                    │   (Orchestration)│              │   (Llama 3 8B)   │
                    │   - Skills      │              │   - Local LLM    │
                    │   - Plugins     │◄────────────►│   - RAG          │
                    │   - Agents      │              │   - Inference    │
                    └────────┬────────┘              └──────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Neo4j 5.15    │
                    │   (Knowledge    │
                    │    Graph)       │
                    │   - Formulas    │
                    │   - Concepts    │
                    │   - Interpret-  │
                    │     ations      │
                    └─────────────────┘
```

---

## 📊 Knowledge Graph Schema

### Node Labels

```cypher
// Financial Formulas
(:Formula {
  name: "Black-Scholes",
  equation: "C = S·N(d₁) - K·e^(-rτ)·N(d₂)",
  description: "Analytical pricing for European options",
  variables: ["S", "K", "τ", "r", "σ"],
  assumptions: ["constant volatility", "no dividends", "European exercise"]
})

// Financial Concepts
(:Concept {
  name: "Implied Volatility",
  definition: "Market's expectation of future volatility",
  category: "volatility",
  difficulty: "intermediate"
})

// Output Metrics
(:Metric {
  name: "Sharpe Ratio",
  formula: "(r_p - r_f) / σ_p",
  interpretation: "Risk-adjusted return per unit of volatility",
  range: {"min": -5, "max": 5},
  unit: "dimensionless"
})

// Interpretations (context-aware explanations)
(:Interpretation {
  condition: "sharpe > 1.5",
  interpretation: "Excellent risk-adjusted returns. The portfolio generates 1.5 units of excess return per unit of volatility.",
  action: "Consider increasing allocation if risk tolerance permits",
  confidence: 0.95
})

// Menu Items
(:Menu {
  name: "Pricer",
  route: "/transact/pricer",
  description: "Multi-model derivatives pricing"
})

// Relationships
(:Formula)-[:USES]->(:Concept)
(:Formula)-[:HAS_ASSUMPTION]->(:Assumption)
(:Metric)-[:INTERPRETS]->(:Interpretation)
(:Concept)-[:BELONGS_TO]->(:Menu)
(:Concept)-[:RELATED_TO]->(:Concept)
(:Interpretation)-[:IMPLIES]->(:Interpretation)
```

### Cypher Query Examples

```cypher
// Get formula explanation with context
MATCH (f:Formula {name: 'Black-Scholes'})
RETURN f.equation, f.description, f.variables, f.assumptions

// Get interpretation for a metric value
MATCH (m:Metric {name: 'Sharpe Ratio'})-[:INTERPRETS]->(i:Interpretation)
WHERE $value >= i.min AND $value <= i.max
RETURN i.interpretation, i.confidence, i.action
ORDER BY i.confidence DESC
LIMIT 1

// Get all concepts for a menu item
MATCH (m:Menu {name: 'Pricer'})<-[:BELONGS_TO]-(c:Concept)
RETURN c.name, c.definition
ORDER BY c.difficulty

// Get related concepts for deeper understanding
MATCH (c:Concept {name: 'Volatility'})-[:RELATED_TO*1..2]-(related:Concept)
RETURN c, collect(DISTINCT related)
```

---

## 🛠️ Implementation Phases

### Phase 1: Knowledge Graph Setup (Week 1)

#### 1.1 Docker Compose Setup
- [ ] Create `docker-compose.kb.yml` with Neo4j + Ollama
- [ ] Configure Neo4j with APOC plugin
- [ ] Set up persistent volumes
- [ ] Test Neo4j Browser access

#### 1.2 Knowledge Base Population
- [ ] Create Cypher scripts for each menu:
  - [ ] `pricer.cypher` — BS, FFT, Heston formulas
  - [ ] `portfolio.cypher` — Moments, performance metrics
  - [ ] `risk.cypher` — VaR, CVaR formulas
  - [ ] `optimizer.cypher` — MVO, BLM, Kelly formulas
  - [ ] `scenarios.cypher` — Scenario formulas
  - [ ] `factors.cypher` — Factor model formulas
  - [ ] `blotter.cypher` — Attribution formulas
- [ ] Create interpretation templates for each metric
- [ ] Load sample data

#### 1.3 Neo4j API Integration
- [ ] Create `app/knowledge_base/neo4j_client.py`
- [ ] Implement query functions:
  - `get_formula_explanation(name)`
  - `get_metric_interpretation(name, value)`
  - `get_menu_concepts(menu_name)`
  - `get_related_concepts(concept_name)`
- [ ] Add connection pooling
- [ ] Add error handling

---

### Phase 2: Ollama Integration (Week 2)

#### 2.1 Ollama Setup
- [ ] Install Ollama (Docker or native)
- [ ] Pull Llama 3 8B model: `ollama pull llama3:8b`
- [ ] Configure model parameters (temperature, context window)
- [ ] Test inference endpoint

#### 2.2 LangChain Integration
- [ ] Install LangChain + Neo4j integration
- [ ] Create `app/agents/llm_client.py`
- [ ] Implement RAG pipeline:
  - Query Neo4j for context
  - Format prompt with context
  - Call Ollama API
  - Parse response
- [ ] Add prompt templates per menu item
- [ ] Add response validation

#### 2.3 Agent Skills (OpenCLAW)
- [ ] Create skill definitions:
  - [ ] `explain_formula` — Explain a formula
  - [ ] `interpret_metric` — Interpret metric value
  - [ ] `explain_concept` — Explain financial concept
  - [ ] `get_related_concepts` — Get related concepts
- [ ] Create OpenCLAW plugin for Neo4j queries
- [ ] Test skills via OpenCLAW CLI

---

### Phase 3: Frontend Integration (Week 3)

#### 3.1 Agent Popup Component
- [ ] Create `components/Agent/AgentPopup.tsx`
- [ ] Add floating action button per menu item
- [ ] Implement chat interface
- [ ] Add loading states
- [ ] Add error handling

#### 3.2 API Endpoints
- [ ] Create `app/agents/routes.py`
- [ ] Endpoints:
  - `POST /agents/{menu}/explain` — Explain output
  - `POST /agents/{menu}/concept` — Explain concept
  - `GET /agents/{menu}/concepts` — List concepts
- [ ] Add streaming responses
- [ ] Add conversation history

#### 3.3 Integration per Menu
- [ ] Pricer agent integration
- [ ] Portfolio agent integration
- [ ] Risk agent integration
- [ ] Optimizer agent integration
- [ ] Scenarios agent integration
- [ ] Factors agent integration
- [ ] Blotter agent integration

---

## 📁 File Structure

```
app/
├── knowledge_base/
│   ├── __init__.py
│   ├── neo4j_client.py         # Neo4j connection + queries
│   └── import/
│       ├── formulas.cypher
│       ├── concepts.cypher
│       ├── relationships.cypher
│       └── interpretations.cypher
├── agents/
│   ├── __init__.py
│   ├── llm_client.py           # Ollama + LangChain
│   ├── routes.py               # Agent API endpoints
│   └── prompts/
│       ├── pricer.py
│       ├── portfolio.py
│       ├── risk.py
│       └── ...
frontend/src/
├── components/
│   └── Agent/
│       ├── AgentPopup.tsx      # Popup component
│       ├── AgentButton.tsx     # Floating button
│       └── ChatInterface.tsx   # Chat UI
└── config/
    └── agents.ts               # Agent config
docker-compose.kb.yml           # Neo4j + Ollama
```

---

## 🔧 Commands

### Development
```bash
# Start knowledge graph stack
docker-compose -f docker-compose.kb.yml up -d

# Load knowledge base
python scripts/load_knowledge_base.py

# Test Neo4j queries
python scripts/test_neo4j_queries.py

# Test LLM inference
ollama run llama3:8b "Explain Black-Scholes formula"

# Run backend with agents
uvicorn app.main:app --reload --port 8000

# Run frontend
cd frontend && npm run dev
```

### Production
```bash
# Deploy to Render (update render.yaml)
# Neo4j: Use Neo4j Aura (free tier)
# Ollama: Use Ollama Cloud or self-host
```

---

## 📊 Metrics & Monitoring

| Metric | Target | Monitoring |
|--------|--------|------------|
| LLM Response Time | < 2s | Prometheus + Grafana |
| Neo4j Query Time | < 100ms | Neo4j Browser |
| Agent Accuracy | > 90% | User feedback |
| Uptime | > 99% | Render dashboard |

---

## 🔒 Security Considerations

1. **Data Privacy:**
   - Run Ollama locally (no data leaves infrastructure)
   - Neo4j authentication required
   - No sensitive data in prompts

2. **Access Control:**
   - Rate limiting on agent endpoints
   - Authentication required (JWT)
   - Audit logging of all queries

3. **Validation:**
   - Validate all LLM responses
   - Sanitize user input
   - Rate limit queries per user

---

## 🚀 Deployment Options

### Option 1: Render + Neo4j Aura + Ollama Cloud
- **Backend:** Render (existing)
- **Neo4j:** Neo4j Aura (free tier, 500MB)
- **Ollama:** Ollama Cloud (beta) or self-host on Render
- **Cost:** Free tier sufficient for demos

### Option 2: Oracle Cloud (All-in-One)
- **VM:** Oracle Cloud Free (6GB RAM)
- **Neo4j:** Docker container
- **Ollama:** Docker container
- **Backend:** Docker container
- **Cost:** Always free

### Option 3: Hugging Face Spaces + Upstash
- **Backend:** Hugging Face Spaces
- **Neo4j:** Neo4j Aura
- **Ollama:** Hugging Face Inference API
- **Cost:** Free tier

---

## ✅ Next Steps (Immediate)

1. **Today:**
   - [ ] Review and approve this plan
   - [ ] Create `docker-compose.kb.yml`
   - [ ] Test Neo4j Docker setup

2. **This Week:**
   - [ ] Create Neo4j schema (formulas, concepts, interpretations)
   - [ ] Populate knowledge base for Pricer menu
   - [ ] Test Cypher queries

3. **Next Week:**
   - [ ] Set up Ollama with Llama 3 8B
   - [ ] Create LangChain RAG pipeline
   - [ ] Test LLM inference with Neo4j context

4. **Week 3:**
   - [ ] Create frontend agent popup component
   - [ ] Integrate with Pricer menu
   - [ ] Test end-to-end

---

## 📚 Resources

- **Neo4j Documentation:** https://neo4j.com/docs/
- **Neo4j GraphRAG:** https://neo4j.com/labs/genai-ecosystem/
- **Ollama Documentation:** https://ollama.ai/
- **OpenCLAW Documentation:** https://openclaw.ai/docs
- **LangChain Neo4j:** https://python.langchain.com/docs/integrations/graphs/neo4j_graph

---

**Last Updated:** 2026-03-04
**Status:** Ready for implementation
