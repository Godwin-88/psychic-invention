# OpenCLAW Integration for Functional Agency System

## Executive Summary

**OpenCLAW** is the orchestration layer that transforms the Neo4j knowledge graph into an **interactive, conversational financial engineering assistant**. It routes user queries to appropriate skills, fetches context from Neo4j, prompts Ollama (Llama 3 8B), and returns structured explanations.

| Component | Technology | Role |
|-----------|-----------|------|
| **Orchestration** | OpenCLAW | Skill routing, multi-channel support, persistent memory |
| **Knowledge Storage** | Neo4j 5.15 | 43 formulas, 89 concepts, 97 interpretations, 85 relationships |
| **Inference** | Ollama (Llama 3 8B) | Natural language generation with RAG |
| **Interface** | React + Slack/Telegram | End-user interaction |

---

## 🏗️ System Architecture

### Complete Stack Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACES                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ React Web   │  │ Slack       │  │ Telegram    │  │ FastAPI REST Endpoints  │ │
│  │ (port 3000) │  │ Bot         │  │ Bot         │  │ (port 8000)             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                │                     │
          └────────────────┴────────────────┴─────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OpenCLAW Gateway                                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  SKILLS (Natural Language API Contracts)                                  │ │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐  │ │
│  │  │ explain_formula  │ │ interpret_metric │ │ explain_concept          │  │ │
│  │  │ - BS Call        │ │ - Sharpe Ratio   │ │ - Volatility Smile       │  │ │
│  │  │ - Heston Call    │ │ - VaR 95%        │ │ - Black-Litterman        │  │ │
│  │  │ - FFT Pricing    │ │ - Sortino        │ │ - Kelly Criterion        │  │ │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────────────┘  │ │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐  │ │
│  │  │ get_related      │ │ compare_formulas │ │ check_assumptions        │  │ │
│  │  │ - Concept graph  │ │ - BS vs Heston   │ │ - Feller condition       │  │ │
│  │  │ - 2-hop traversal│ │ - VaR vs ES      │ │ - Normal distribution    │  │ │
│  │  └──────────────────┘ └──────────────────┘ └──────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │  PLUGINS (TypeScript Runtime Extensions)                                  │ │
│  │  ┌─────────────────────────────┐ ┌─────────────────────────────────────┐ │ │
│  │  │ neo4j-connector             │ │ response-validator                  │ │ │
│  │  │ - Bolt protocol (7687)      │ │ - JSON schema check                 │ │ │
│  │  │ - Connection pooling        │ │ - Hallucination detection           │ │ │
│  │  │ - Query templating          │ │ - Confidence scoring                │ │ │
│  │  └─────────────────────────────┘ └─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                              │
          │                              └──────────────────────────────────────┐
          │                                                                     │
          ▼                                                                     ▼
┌──────────────────────────┐                                  ┌─────────────────────────────────────────┐
│  Neo4j 5.15 (KB)         │                                  │  Ollama (Llama 3 8B)                    │
│  docker-compose.kb.yml   │                                  │  ollama:latest container                │
│                          │                                  │                                         │
│  ┌────────────────────┐  │    ┌──────────────────────┐      │  ┌───────────────────────────────────┐  │
│  │ Formulas (43)      │  │    │  Cypher Queries      │      │  │ RAG Prompt Assembly               │  │
│  │ - Black-Scholes    │──┼────│  - MATCH (f:Formula) │──────┼─►│  │ - System: Financial Engineer    │  │
│  │ - Heston           │  │    │  - MATCH (i:Interp)  │      │  │  │ - Context: Neo4j results        │  │
│  │ - FFT              │  │    │  - MATCH (c:Concept) │      │  │  │ - Question: User query          │  │
│  │ - Monte Carlo      │  │    │  - [:RELATED_TO*1..2]│      │  │  │ - Temperature: 0.3              │  │
│  │ - Kelly            │  │    └──────────────────────┘      │  │  └───────────────────────────────────┘  │
│  │ - VaR/ES           │  │                                  │  │  ┌───────────────────────────────────┐  │
│  │ - MVO/BLM          │  │                                  │  │  │ Response Generation               │  │
│  └────────────────────┘  │                                  │  │  │ - Grounded in KB                │  │
│                          │                                  │  │  │ - Cites formulas/concepts       │  │
│  ┌────────────────────┐  │                                  │  │  │ - Confidence: 0.85-0.95         │  │
│  │ Concepts (89)      │  │                                  │  │  └───────────────────────────────────┘  │
│  │ - Pricer: 29       │  │                                  │  └─────────────────────────────────────────┘
│  │ - Portfolio: 30    │  │
│  │ - Risk: 30         │  │
│  │ - Optimizer: 35    │  │
│  │ - Volatility: 28   │  │
│  │ - Factor: 35       │  │
│  │ - Scenarios: 32    │  │
│  │ - Blotter: 35      │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ Interpretations    │  │
│  │ - Sharpe: 6 levels │  │
│  │ - VaR: 5 levels    │  │
│  │ - Beta: 5 levels   │  │
│  │ - Kelly: 4 levels  │  │
│  └────────────────────┘  │
│                          │
│  ┌────────────────────┐  │
│  │ Relationships (85) │  │
│  │ - USES (42)        │  │
│  │ - DERIVES_FROM (8) │  │
│  │ - HAS_ASSUMPTION   │  │
│  │ - BELONGS_TO (89)  │  │
│  │ - RELATED_TO (23)  │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### Infrastructure Deployment (docker-compose.kb.yml)

```yaml
services:
  neo4j:
    image: neo4j:5.15-community
    container_name: pricing-engine-neo4j
    ports:
      - "7474:7474"   # Browser UI
      - "7687:7687"   # Bolt protocol
    volumes:
      - ./knowledge_base/import:/var/lib/neo4j/import  # Cypher files mounted here
    environment:
      - NEO4J_AUTH=neo4j/pricing-engine-kb
      - NEO4J_PLUGINS=["apoc"]

  redis:
    image: redis:7-alpine
    container_name: pricing-engine-redis
    ports:
      - "6379:6379"

  ollama:
    image: ollama/ollama:latest
    container_name: pricing-engine-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama

volumes:
  neo4j_data:
  ollama_models:
```

---

## 📊 Knowledge Graph Schema (Implemented)

### Node Labels with Counts

```cypher
// Formula nodes (43 total)
(:Formula {
  name: "Black-Scholes Call",
  equation: "C = S·N(d₁) - K·e^(-rτ)·N(d₂)",
  description: "Analytical pricing for European call options",
  variables: ["S", "K", "τ", "r", "σ", "d₁", "d₂"],
  assumptions: ["constant volatility", "no dividends", "European exercise"],
  source_file: "src/black_scholes.rs",
  inference_reasoning: "Inferred from price_call_internal()..."
})

// Concept nodes (89 total across 8 menus)
(:Concept {
  name: "Implied Volatility",
  definition: "Volatility parameter σ that equates model price to market price",
  category: "volatility",
  difficulty: "intermediate",
  menu_context: "Pricer"
})

// Interpretation nodes (97 total)
(:Interpretation {
  metric_name: "Sharpe Ratio",
  condition: "sharpe >= 1.5 AND sharpe < 2.5",
  min: 1.5,
  max: 2.5,
  interpretation: "Excellent risk-adjusted returns...",
  action: "Consider increasing allocation...",
  confidence: 0.90,
  menu_context: "Portfolio"
})

// Menu nodes (8 total)
(:Menu {
  name: "Pricer",
  route: "/transact/pricer",
  description: "Multi-model derivatives pricing"
})
```

### Relationship Types with Counts

```cypher
// USES (42 relationships)
(:Formula)-[:USES]->(:Concept)
// Example: (Black-Scholes Call)-[:USES]->(European Option)

// DERIVES_FROM (8 relationships)
(:Formula)-[:DERIVES_FROM]->(:Formula)
// Example: (Black-Scholes Put)-[:DERIVES_FROM]->(Black-Scholes Call)

// HAS_ASSUMPTION (15 relationships)
(:Formula)-[:HAS_ASSUMPTION]->(:Assumption)
// Example: (Heston Call)-[:HAS_ASSUMPTION]->(Feller Condition)

// BELONGS_TO (89 relationships)
(:Concept)-[:BELONGS_TO]->(:Menu)
// Example: (Black-Scholes Model)-[:BELONGS_TO]->(Pricer)

// RELATED_TO (23 relationships)
(:Concept)-[:RELATED_TO]->(:Concept)
// Example: (Value at Risk)-[:RELATED_TO]->(Expected Shortfall)

// INTERPRETS (97 relationships)
(:Metric)-[:INTERPRETS]->(:Interpretation)
// Example: (Sharpe Ratio)-[:INTERPRETS]->(Sharpe > 1.5 interpretation)
```

---

## 🔧 OpenCLAW Skills (8 Core Skills for Knowledge Graph)

### Skill 1-8 Summary Table

| Skill | Purpose | Example Trigger |
|-------|---------|-----------------|
| explain_formula | Explain pricing/risk formulas | "Explain Black-Scholes" |
| interpret_metric | Interpret metric values | "My Sharpe is 0.3, is this good?" |
| explain_concept | Define financial concepts | "What is implied volatility?" |
| get_related_concepts | Find related ideas | "What's related to VaR?" |
| compare_formulas | Contrast two models | "BS vs Heston" |
| check_assumptions | Validate assumptions | "Are BS assumptions valid now?" |
| list_menu_concepts | List concepts per menu | "Show Risk module concepts" |
| trace_derivation | Show formula lineage | "Derive Black-Litterman" |

*(Full skill definitions with Neo4j queries and prompts available in original specification)*

---

# ═══════════════════════════════════════════════════════════════════════════════
# PART II: SOCIAL MEDIA & CONTENT DISTRIBUTION SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════

## Overview for Kenyan Finance/Quant Content

This section extends OpenCLAW to handle **multi-channel content distribution** targeting:

| Audience Segment | Size (Kenya) | Content Preferences |
|-----------------|--------------|---------------------|
| **Investment Bankers** | ~500 (Nairobi) | M&A analysis, valuation models, market updates |
| **Actuaries** | ~300 (ASK members) | Risk models, insurance mathematics, ALM |
| **Portfolio/Asset Managers** | ~200 (NSE members) | Asset allocation, performance analysis, NSE research |
| **Financial Analysts** | ~800 (CFA Kenya) | Equity research, financial modeling, industry reports |

### Target Channels

| Channel | Purpose | Audience | Content Type | Posting Frequency |
|---------|---------|----------|--------------|-------------------|
| **Telegram** | Daily insights, quick analysis | All segments | Short-form quant commentary | 3-5x/week |
| **WhatsApp** | Premium subscriber updates | HNIs, fund managers | Exclusive analysis, alerts | 1-2x/week |
| **Twitter/X** | Thought leadership | Broader finance community | Threads, hot takes | Daily |
| **Blog** | Deep-dive educational | All segments, SEO | Long-form tutorials | 2x/month |
| **LinkedIn** | Professional networking | Corporate decision-makers | Case studies, whitepapers | 2-3x/week |

---

## 🏗️ Content Distribution Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    KENYAN FINANCE CONTENT WORKFLOW                              │
│                                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Topic      │────►│  Generate   │────►│  Localize   │────►│  Review     │   │
│  │  Input      │     │  Draft      │     │  for Kenya  │     │  (Human)    │   │
│  │  (Neo4j KB) │     │  (LLM)      │     │  Context    │     │             │   │
│  └─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘   │
│                                                                      │          │
└──────────────────────────────────────────────────────────────────────┼──────────┘
                                                                       │
         ┌─────────────────────────────────────────────────────────────┼──────────┐
         │                     OpenCLAW Gateway                        │          │
         │  ┌───────────────────────────────────────────────────────┐  │          │
         │  │  CONTENT SKILLS (Finance-Specific)                    │  │          │
         │  │  ┌──────────────────┐ ┌──────────────────┐           │  │          │
         │  │  │ generate_        │ │ draft_blog_post  │           │  │          │
         │  │  │ topic_ideas      │ │ (WordPress)      │           │  │          │
         │  │  └──────────────────┘ └──────────────────┘           │  │          │
         │  │  ┌──────────────────┐ ┌──────────────────┐           │  │          │
         │  │  │ rewrite_for_     │ │ schedule_        │           │  │          │
         │  │  │ platform         │ │ content          │           │  │          │
         │  │  └──────────────────┘ └──────────────────┘           │  │          │
         │  │  ┌──────────────────┐ ┌──────────────────┐           │  │          │
         │  │  │ generate_        │ │ track_           │           │  │          │
         │  │  │ hashtags         │ │ analytics        │           │  │          │
         │  │  └──────────────────┘ └──────────────────┘           │  │          │
         │  └───────────────────────────────────────────────────────┘  │          │
         │  ┌───────────────────────────────────────────────────────┐  │          │
         │  │  CHANNEL PLUGINS                                      │  │          │
         │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │          │
         │  │  │ telegram-    │ │ twitter-     │ │ wordpress-   │  │  │          │
         │  │  │ connector    │ │ connector    │ │ connector    │  │  │          │
         │  │  └──────────────┘ └──────────────┘ └──────────────┘  │  │          │
         │  │  ┌──────────────┐ ┌──────────────┐                   │  │          │
         │  │  │ whatsapp-    │ │ linkedin-    │                   │  │          │
         │  │  │ connector    │ │ connector    │                   │  │          │
         │  │  └──────────────┘ └──────────────┘                   │  │          │
         │  └───────────────────────────────────────────────────────┘  │          │
         └─────────────────────────────────────────────────────────────┼──────────┘
                                                                       │
         ┌─────────────────────────────────────────────────────────────┼──────────┐
         ▼                         ▼                ▼                  ▼          ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Telegram      │   │   WhatsApp      │   │   Twitter/X     │   │   Blog          │
│   Channel       │   │   Channel       │   │   Threads       │   │   (WordPress)   │
│   @QuantFinKE   │   │   Premium       │   │   @YourHandle   │   │   yoursite.co.ke│
│   (Broadcast)   │   │   Subscribers   │   │   (Engagement)  │   │   (SEO)         │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 🔧 Content Skills (6 Additional Skills)

### Skill 9: generate_topic_ideas

**Purpose:** Brainstorm finance content topics relevant to Kenyan market

**Trigger Phrases:**
- "Give me content ideas about VaR for Kenyan pension funds"
- "What should I write about Black-Litterman for NSE traders?"
- "Generate topics about option pricing for Kenyan bankers"

**SKILL.md Specification:**

```markdown
---
name: generate_topic_ideas
description: Generate finance content topics for Kenyan audience
requires:
  env:
    - OLLAMA_HOST
    - NEO4J_URI
    - NEO4J_USER
    - NEO4J_PASSWORD
  bins:
    - python3
---

# Kenyan Finance Content Topic Generator

## Context
Target audience: Bankers, actuaries, portfolio managers in Kenya
Markets: Nairobi Securities Exchange (NSE), CMA Kenya, Retirement Benefits Authority
Local Companies: Safaricom, KCB, Equity Bank, EABL, Britam, Jubilee

## Generate Topics
```python
import requests
import json

audience = "{audience}"  # bankers, actuaries, portfolio_managers, analysts
theme = "{theme}"  # risk, derivatives, portfolio_optimization, valuation
knowledge_level = "{level}"  # beginner, intermediate, advanced

prompt = f"""
Generate 10 engaging content topics for {audience} in KENYA interested in {theme}.

Consider:
- Nairobi Securities Exchange (NSE) context
- CMA Kenya regulations
- Retirement Benefits Authority (RBA) guidelines
- Local examples (Safaricom, KCB, Equity Bank, EABL, Britam)
- East African market dynamics
- {knowledge_level} difficulty level
- Current trends (KES/USD rates, CBK policy, inflation, NSE performance)

Format as JSON:
[{{"topic": "...", "angle": "...", "kenyan_context": "...", "estimated_engagement": "high/medium/low"}}]
"""

response = requests.post("http://ollama:11434/api/generate", json={
    "model": "llama3:8b",
    "prompt": prompt,
    "stream": False
})
topics = json.loads(response.json()["response"])
print(json.dumps(topics, indent=2))
```

## Example Output
```json
[
  {
    "topic": "Value at Risk for Pension Fund Regulation",
    "angle": "How RBA can use VaR for pension fund oversight",
    "kenyan_context": "Reference to NSSF, Jubilee, Britam portfolios; RBA guidelines",
    "estimated_engagement": "high"
  },
  {
    "topic": "FX Hedging for Kenyan Importers",
    "angle": "Using options to hedge KES/USD exposure",
    "kenyan_context": "Shilling volatility (KES/USD 130-160 range), import-dependent economy",
    "estimated_engagement": "high"
  },
  {
    "topic": "Black-Litterman for NSE Sector Rotation",
    "angle": "Incorporating views on banking vs telecom vs consumer goods",
    "kenyan_context": "Safaricom vs KCB vs EABL allocation; NSE 20 composition",
    "estimated_engagement": "medium"
  },
  {
    "topic": "Implied Volatility in Illiquid Markets",
    "angle": "Challenges of option pricing on NSE",
    "kenyan_context": "Limited derivatives market, SAFEX constraints, workarounds",
    "estimated_engagement": "medium"
  },
  {
    "topic": "Kelly Criterion for Concentrated Portfolios",
    "angle": "Optimal position sizing for Kenyan equities",
    "kenyan_context": "NSE 20 concentration, top 5 stocks = 60% of index",
    "estimated_engagement": "high"
  }
]
```
```

---

### Skill 10: draft_blog_post

**Purpose:** Write SEO-optimized blog posts with Kenyan finance context

**SKILL.md Specification:**

```markdown
---
name: draft_blog_post
description: Write SEO-optimized finance blog posts for Kenyan audience
requires:
  env:
    - OLLAMA_HOST
    - WORDPRESS_API_URL
    - WORDPRESS_USERNAME
    - WORDPRESS_APP_PASSWORD
  bins:
    - python3
---

# Blog Post Drafter (Kenyan Finance Context)

## Generate Full Post
```python
import requests
import json

topic = "{topic}"
outline = "{outline}"
target_audience = "{audience}"
target_length = "{length}"  # short (500), medium (1000), long (2000+)

prompt = f"""
Write a comprehensive blog post for KENYAN FINANCE PROFESSIONALS:

Topic: {topic}
Outline: {outline}
Target Audience: {target_audience}
Target Length: {target_length} words

Requirements:
1. Engaging headline with 5 options (include numbers, questions, power words)
2. Introduction with hook relevant to Kenyan market
3. Well-structured sections with H2/H3 headings
4. Include LOCAL examples (NSE stocks, Kenyan banks, insurance firms, pension funds)
5. Mathematical formulas where relevant (use knowledge graph)
6. Practical application for Kenyan context
7. Call-to-action at end (subscribe, contact, download)
8. SEO keywords for Kenyan finance audience
9. Meta description (155 characters)

Output as JSON:
{{
  "headlines": ["...", "...", "..."],
  "meta_desc": "...",
  "content_html": "<h1>...</h1><p>...</p>...",
  "tags": ["VaR", "Risk Management", "NSE", "CMA Kenya"],
  "category": "Risk Management",
  "featured_image_prompt": "..."
}}
"""

response = requests.post("http://ollama:11434/api/generate", json={
    "model": "llama3:8b",
    "prompt": prompt,
    "stream": False
})
content = json.loads(response.json()["response"])

# Publish to WordPress
import base64
credentials = f"{WORDPRESS_USERNAME}:{WORDPRESS_APP_PASSWORD}"
token = base64.b64encode(credentials.encode()).decode()

headers = {
    "Authorization": f"Basic {token}",
    "Content-Type": "application/json"
}

post_data = {
    "title": content["headlines"][0],
    "content": content["content_html"],
    "status": "draft",
    "categories": [1],
    "tags": content["tags"]
}

wp_response = requests.post(
    f"{WORDPRESS_API_URL}/wp-json/wp/v2/posts",
    headers=headers,
    json=post_data
)

print(f"Draft created: {wp_response.json()['link']}")
```

## Example Blog Post Structure
```html
<h1>Value at Risk: A Practical Guide for Kenyan Pension Fund Managers</h1>

<p><strong>By [Your Name]</strong> | Published: [Date] | Reading Time: 8 minutes</p>

<h2>Executive Summary</h2>
<p>The Retirement Benefits Authority (RBA) requires pension funds to maintain 
adequate risk management frameworks. This guide shows how Value at Risk (VaR) 
can help trustees monitor portfolio risk... [continues with Kenyan context]</p>

<h2>What is Value at Risk?</h2>
<p>VaR answers: "What is the maximum loss I could face over X days with Y% confidence?"</p>
<p>Formula: VaR_α = -μ + σ·Φ⁻¹(α)</p>

<h2>RBA Guidelines on Risk Measurement</h2>
<p>According to RBA guidelines, pension fund managers must... [specific requirements]</p>

<h2>Case Study: NSE Portfolio VaR Calculation</h2>
<p>Consider a portfolio with 40% Safaricom, 30% KCB, 20% Equity Bank, 10% EABL...</p>

<h2>Implementation Steps for Kenyan Funds</h2>
<ol>
  <li>Data collection from NSE</li>
  <li>Choosing confidence level (95% vs 99%)</li>
  <li>Historical vs Parametric VaR</li>
  <li>Reporting to trustees</li>
</ol>

<h2>Conclusion</h2>
<p>VaR provides a single, interpretable number for risk communication...</p>

<h2>Call to Action</h2>
<p>Download our free VaR Excel template for Kenyan pension funds →</p>
```
```

---

### Skill 11: rewrite_for_platform

**Purpose:** Adapt content for each platform with Kenyan context

**Platform Guidelines:**

| Platform | Format | Tone | Best Practices |
|----------|--------|------|----------------|
| Twitter | 280 chars/tweet, threads OK | Professional but engaging | 2-3 hashtags, tag @NSE_Kenya @CMA_Kenya |
| Telegram | Long-form OK, markdown | Educational, detailed | Links, charts, PDFs welcome |
| WhatsApp | Short, conversational | Friendly, direct | Emojis OK, clear CTAs |
| LinkedIn | 1300 chars optimal | Professional, thought leadership | 3-5 hashtags, tag companies |

**SKILL.md Specification:**

```markdown
---
name: rewrite_for_platform
description: Adapt finance content for specific social media platforms
requires:
  env:
    - OLLAMA_HOST
  bins:
    - python3
---

# Platform-Specific Content Adapter (Kenyan Finance)

## Rewrite Logic
```python
import requests
import json

original_content = "{content}"
target_platform = "{platform}"

platform_instructions = {
    "twitter": """
    Convert to Twitter thread (2-5 tweets).
    - Each tweet ≤280 characters
    - Add 2-3 relevant hashtags (#NSE, #KenyaFinance, #RiskManagement)
    - Include engagement hook (question or controversial take)
    - Tag relevant accounts (@NSE_Kenya, @CMA_Kenya if relevant)
    - First tweet must hook readers
    - Last tweet should have CTA (read more, subscribe)
    """,
    "telegram": """
    Format for Telegram channel (Kenyan finance professionals).
    - Use markdown (bold, italic, links)
    - Can be long-form (up to 4000 characters)
    - Include charts/images if referenced
    - Add links to full blog post
    - End with discussion question
    - Reference Kenyan market context
    """,
    "whatsapp": """
    Conversational tone for WhatsApp broadcast.
    - Short paragraphs (2-3 sentences each)
    - Use emojis appropriately (📈 💰 🇰🇪)
    - Clear call-to-action
    - Include contact info for inquiries
    - Keep under 500 characters
    """,
    "linkedin": """
    Professional tone for LinkedIn audience (bankers, fund managers).
    - Start with strong hook (first 150 chars critical)
    - 1000-1300 characters optimal
    - 3-5 hashtags (#PortfolioManagement, #Kenya, #NSE)
    - End with question for engagement
    - Tag relevant companies if mentioned
    - Professional but personable
    """
}

prompt = f"""
Original content:
{original_content}

Rewrite for {target_platform}:
{platform_instructions[target_platform]}

Kenyan Context: Include references to NSE, local companies, regulations where relevant.

Output as JSON:
{{
  "content": "...",
  "hashtags": ["...", "..."],
  "media_suggestions": ["chart", "infographic"],
  "best_posting_time": "09:00 EAT",
  "character_count": 280
}}
"""

response = requests.post("http://ollama:11434/api/generate", json={
    "model": "llama3:8b",
    "prompt": prompt,
    "stream": False
})
result = json.loads(response.json()["response"])
print(json.dumps(result, indent=2))
```

## Example Output (Twitter Thread)
```json
{
  "content": "🧵 1/4: Did you know most Kenyan pension funds are OVEREXPOSED to domestic equities? Here's how VaR can help regulators set smarter limits... #NSE #PensionFunds #RiskManagement",
  "hashtags": ["#NSE", "#KenyaFinance", "#RiskManagement"],
  "media_suggestions": ["pie_chart_of_allocation"],
  "best_posting_time": "09:00 EAT",
  "character_count": 275
}
```

## Example Output (Telegram)
```markdown
📊 **VaR for Kenyan Pension Funds: A Practical Guide**

The Retirement Benefits Authority (RBA) requires all pension fund managers to maintain robust risk measurement frameworks. Yet many trustees struggle to interpret complex risk metrics.

**Value at Risk (VaR)** offers a solution: a single number that answers "What's the worst loss I could face over X days with Y% confidence?"

For a typical NSE portfolio (40% Safaricom, 30% KCB, 20% Equity, 10% EABL), a 95% daily VaR of -2.5% means:
→ On 95 out of 100 days, losses won't exceed 2.5%
→ On 5 out of 100 days, losses COULD exceed 2.5%

**RBA Guidelines**: Fund managers must report risk metrics quarterly. VaR provides trustees with an intuitive measure they can actually understand.

📥 Download our free VaR Excel template: [link to blog]

💬 Question for fund managers: What risk metrics do you currently report to trustees?
```

## Example Output (WhatsApp)
```
📈 Quick Risk Tip for Fund Managers

Most Kenyan pension funds are overexposed to local equities. A simple VaR calculation could show you're taking more risk than you think! 🇰🇪

95% VaR = "On 95 out of 100 days, I won't lose more than X%"

Want the full guide with Excel template? 

👉 Read here: [link]

Reply STOP to unsubscribe
```
```

---

### Skill 12: generate_hashtags

**Purpose:** Create relevant hashtags for Kenyan finance audience

**SKILL.md Specification:**

```markdown
---
name: generate_hashtags
description: Generate hashtags for Kenyan finance content
requires:
  env:
    - OLLAMA_HOST
  bins:
    - python3
---

# Hashtag Generator (Kenyan Finance)

```python
import requests
import json

content = "{content}"
platform = "{platform}"

prompt = f"""
Generate 20 relevant hashtags for this Kenyan finance content:
{content}

Platform: {platform}

Categorize as:
- High volume (100K+ posts): 3-5 tags
- Medium volume (10K-100K): 5-7 tags  
- Niche/Kenya-specific (<10K): 5-7 tags

Include:
- Global finance tags (#RiskManagement, #PortfolioManagement)
- African finance tags (#AfricanFinance, #EmergingMarkets)
- Kenya-specific tags (#NSE, #KenyaFinance, #Nairobi)
- Regulatory tags (#CMAKenya, #RBAGuidelines)

Output as JSON:
{{
  "high_volume": ["#Finance", "#Investing", ...],
  "medium_volume": ["#RiskManagement", "#PortfolioManagement", ...],
  "niche": ["#NSE", "#KenyaFinance", "#CMAKenya", ...],
  "recommended_mix": ["#NSE", "#RiskManagement", "#KenyaFinance"]
}}
"""

response = requests.post("http://ollama:11434/api/generate", json={
    "model": "llama3:8b",
    "prompt": prompt,
    "stream": False
})
hashtags = json.loads(response.json()["response"])
print(json.dumps(hashtags, indent=2))
```

## Example Output
```json
{
  "high_volume": ["#Finance", "#Investing", "#StockMarket", "#Wealth", "#Money"],
  "medium_volume": ["#RiskManagement", "#PortfolioManagement", "#QuantitativeFinance", "#AssetManagement", "#FinancialAnalysis"],
  "niche": ["#NSE", "#KenyaFinance", "#CMAKenya", "#NairobiBusiness", "#EastAfricaInvest", "#RBAGuidelines", "#KenyanBanker"],
  "recommended_mix": ["#NSE", "#RiskManagement", "#KenyaFinance", "#PortfolioManagement", "#Nairobi"]
}
```
```

---

### Skill 13: schedule_content

**Purpose:** Schedule content at optimal times for Kenyan audience (EAT timezone)

**Optimal Posting Times (East Africa Time):**

```python
optimal_times = {
    "twitter": {
        "weekdays": ["07:00", "12:00", "18:00"],  # Commute, lunch, evening
        "weekend": ["09:00", "15:00"]
    },
    "telegram": {
        "weekdays": ["08:00", "13:00", "20:00"],  # Morning briefing, lunch, evening reading
        "weekend": ["10:00", "16:00"]
    },
    "whatsapp": {
        "weekdays": ["07:30", "17:30"],  # Morning/evening commute
        "weekend": ["11:00"]
    },
    "linkedin": {
        "weekdays": ["08:00", "12:00", "17:00"],  # Business hours
        "best_days": ["Tuesday", "Wednesday", "Thursday"]
    }
}

# Content calendar by day
content_calendar = {
    "Monday": ["Market outlook", "Week ahead preview"],
    "Tuesday": ["Deep dive technical", "Model explanation"],
    "Wednesday": ["Case study", "Kenyan market analysis"],
    "Thursday": ["Educational content", "Formula/tutorial"],
    "Friday": ["Week wrap-up", "Lighter content", "Weekend reading"],
    "Saturday": ["Long-form blog posts", "Whitepapers"],
    "Sunday": ["Inspirational/thought leadership", "Week preview"]
}
```

---

### Skill 14: track_analytics

**Purpose:** Monitor engagement across all channels

**Metrics by Platform:**

| Platform | Key Metrics | Target |
|----------|-------------|--------|
| Telegram | Views, Forwards, New Subscribers | 1,000+ views/post |
| WhatsApp | Read Rate, Reply Rate | 80%+ read rate |
| Twitter | Impressions, Engagement Rate | 4%+ engagement |
| Blog | Page Views, Time on Page | 500+ views/post |
| LinkedIn | Impressions, Comments, Shares | 2%+ engagement |

**Weekly Report Template:**

```
📊 WEEKLY ANALYTICS REPORT (Kenyan Finance Content)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: [Date Range]

📈 TELEGRAM (@QuantFinKE)
   Views: 1,250 (+12% vs last week)
   Forwards: 45
   New Subscribers: 23
   Top Post: "Black-Litterman for NSE Allocation"

🐦 TWITTER (@YourHandle)
   Impressions: 15,400
   Engagement Rate: 4.2% (industry avg: 2.1%)
   Top Tweet: "VaR thread for pension funds" (3,200 impressions)

📝 BLOG (yoursite.co.ke)
   Page Views: 890
   Avg Time on Page: 3:45
   Top Post: "Option Pricing for Kenyan Bankers"

💡 RECOMMENDATIONS
   1. More Kenya-specific examples (3x engagement)
   2. Twitter threads outperform single tweets by 2.5x
   3. Best posting time: 09:00 EAT on Tuesdays

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔌 Channel Plugins (TypeScript)

### Telegram Connector

```typescript
// plugins/telegram-connector/src/index.ts
import { registerTool } from "@openclaw/plugin-sdk";
import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

export function register(api: PluginAPI) {
  api.registerTool({
    name: "telegram_post",
    description: "Publish content to Telegram channel (@QuantFinKE)",
    handler: async (args: { content: string; parse_mode?: string }) => {
      await bot.telegram.sendMessage(
        process.env.TELEGRAM_CHANNEL_ID!,
        args.content,
        { parse_mode: args.parse_mode || "Markdown" }
      );
      return { success: true, platform: "telegram" };
    }
  });

  api.registerTool({
    name: "telegram_get_stats",
    description: "Get Telegram channel analytics",
    handler: async () => {
      return await fetchChannelStats();
    }
  });
}
```

### Twitter Connector

```typescript
// plugins/twitter-connector/src/index.ts
import { registerTool } from "@openclaw/plugin-sdk";
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

export function register(api: PluginAPI) {
  api.registerTool({
    name: "twitter_post",
    description: "Post tweet or thread to Twitter",
    handler: async (args: { content: string | string[] }) => {
      if (Array.isArray(args.content)) {
        const thread = await client.v2.tweetThread(args.content);
        return { success: true, thread_id: thread.tweet_ids };
      }
      const tweet = await client.v2.tweet(args.content);
      return { success: true, tweet_id: tweet.data.id };
    }
  });
}
```

### WhatsApp Connector (via Twilio)

```typescript
// plugins/whatsapp-connector/src/index.ts
import { registerTool } from "@openclaw/plugin-sdk";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export function register(api: PluginAPI) {
  api.registerTool({
    name: "whatsapp_broadcast",
    description: "Send WhatsApp to premium subscribers (+254 numbers)",
    handler: async (args: { content: string; recipient_list: string[] }) => {
      const results = [];
      for (const recipient of args.recipient_list) {
        const message = await client.messages.create({
          from: "whatsapp:+14155238886",
          to: `whatsapp:+254${recipient}`,
          body: args.content
        });
        results.push({ recipient: `+254${recipient}`, status: message.status });
      }
      return { success: true, results };
    }
  });
}
```

### WordPress Connector

```typescript
// plugins/wordpress-connector/src/index.ts
import { registerTool } from "@openclaw/plugin-sdk";
import axios from "axios";

export function register(api: PluginAPI) {
  api.registerTool({
    name: "wordpress_publish",
    description: "Publish blog post to WordPress",
    handler: async (args: { title: string; content: string; status?: string }) => {
      const credentials = Buffer.from(
        `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`
      ).toString("base64");

      const response = await axios.post(
        `${process.env.WORDPRESS_API_URL}/wp-json/wp/v2/posts`,
        { title: args.title, content: args.content, status: args.status || "draft" },
        { headers: { "Authorization": `Basic ${credentials}` } }
      );

      return { success: true, post_id: response.data.id, url: response.data.link };
    }
  });
}
```

---

## ⚠️ Compliance Considerations (Kenya)

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **CMA Kenya** | No market manipulation, accurate disclosures | All content reviewed before publishing; disclaimers mandatory |
| **RBA Guidelines** | Pension fund communication standards | Specific compliance check for pension-related content |
| **Data Protection Act (2019)** | Subscriber consent for broadcasts | Opt-in required for WhatsApp/Telegram; unsubscribe option |
| **Central Bank** | Financial advice disclaimers | "Not investment advice" on ALL content |

### Required Disclaimer (All Posts)

```
📌 DISCLAIMER: This content is for educational purposes only and does not constitute 
investment advice, research, or a recommendation to buy/sell securities. Past performance 
is not indicative of future results. Always consult a licensed financial advisor before 
making investment decisions. Author may hold positions in mentioned securities.
```

---

## 📅 Content Workflow Example

```
User: "Create a week's worth of content about VaR for Kenyan pension fund managers"

OpenCLAW Processing:
1. generate_topic_ideas → 10 topics with Kenyan context
2. User selects 5 topics
3. draft_blog_post → 5 full blog posts (WordPress drafts)
4. rewrite_for_platform → Twitter + Telegram + WhatsApp + LinkedIn versions
5. generate_hashtags → Platform-specific hashtag sets
6. schedule_content → Optimal EAT posting times
7. Human Review → Compliance check (CMA/RBA)
8. Auto-Publish → Posts go live at scheduled times
9. track_analytics → Weekly engagement report
```

---

## 📈 Platform Setup Checklist

### Telegram Channel
- [ ] Create channel @QuantFinKE
- [ ] Design logo (Kenyan flag colors + finance icon)
- [ ] Write description targeting Kenyan finance professionals
- [ ] Set up bot via @BotFather
- [ ] Add bot as channel admin
- [ ] Create welcome message
- [ ] Share invite link: t.me/QuantFinKE

### WhatsApp Channel
- [ ] Apply for WhatsApp Business API (via Twilio)
- [ ] Complete Meta business verification
- [ ] Set up subscriber list (opt-in only)
- [ ] Create welcome message template
- [ ] Test broadcast to small group

### Twitter/X
- [ ] Apply for Twitter Developer Account
- [ ] Create @YourHandle account
- [ ] Design professional profile
- [ ] Write bio: "Quant Finance | Kenya | NSE Analysis"
- [ ] Follow: @NSE_Kenya, @CMA_Kenya, @CentralBankKE

### WordPress Blog
- [ ] Set up WordPress (self-hosted recommended)
- [ ] Install SEO plugin (Yoast/RankMath)
- [ ] Install analytics (Google Analytics)
- [ ] Create About page with credentials
- [ ] Set up categories: Risk, Derivatives, Portfolio, Kenya

### LinkedIn
- [ ] Optimize profile: "Quant | Finance Educator | Kenya"
- [ ] Create LinkedIn Page for brand
- [ ] Connect with Kenyan finance professionals
- [ ] Join: CFA Society Kenya, Actuarial Society of Kenya

---

## ✅ Next Steps (4 Priority Actions)

### 1. Create Full SKILL.md Files
**Action:** Generate production-ready SKILL.md files for all 6 content skills

| Skill | File Location | Estimated Time |
|-------|--------------|----------------|
| generate_topic_ideas | `~/.openclaw/skills/generate-topic-ideas/SKILL.md` | 2 hours |
| draft_blog_post | `~/.openclaw/skills/draft-blog-post/SKILL.md` | 3 hours |
| rewrite_for_platform | `~/.openclaw/skills/rewrite-for-platform/SKILL.md` | 3 hours |
| generate_hashtags | `~/.openclaw/skills/generate-hashtags/SKILL.md` | 1 hour |
| schedule_content | `~/.openclaw/skills/schedule-content/SKILL.md` | 2 hours |
| track_analytics | `~/.openclaw/skills/track-analytics/SKILL.md` | 3 hours |

**Total Time:** 14 hours (~2 days)
**Priority:** HIGH

---

### 2. Set Up Telegram Connector (Quickest Win)
**Action:** Implement and test Telegram channel integration

**Steps:**
```bash
# 1. Create Telegram bot via @BotFather
# Get token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# 2. Create channel @QuantFinKE
# Add bot as administrator

# 3. Install telegraf
npm install telegraf

# 4. Deploy plugin
openclaw plugin install telegram-connector

# 5. Test post
openclaw exec "telegram_post: {content: 'Test from OpenCLAW 🇰🇪 #NSE'}"
```

**Timeline:** 1 day
**Priority:** HIGH (fastest path to live content)

---

### 3. Design Content Workflow for Kenyan Finance Niche
**Action:** Create content calendar and templates

**Content Pillars by Day:**

| Day | Theme | Example Topics |
|-----|-------|----------------|
| Monday | Market Outlook | "NSE Weekly Preview", "Shilling Watch", "CBK Policy Watch" |
| Tuesday | Technical Deep-Dive | "Heston for NSE Options", "VaR Backtesting" |
| Wednesday | Kenyan Case Study | "Britam Portfolio Analysis", "KCB Hedging Strategy" |
| Thursday | Educational | "Black-Litterman Tutorial", "Kelly for Pension Funds" |
| Friday | Week Wrap-Up | "Best Reads", "Market Movers", "Weekend Homework" |
| Saturday | Long-Form Blog | "Complete Guide to FX Hedging in Kenya" |
| Sunday | Thought Leadership | "Future of Quant Finance in Africa" |

**Template Library to Create:**
- Blog post templates (5 structures)
- Twitter thread templates (hook → body → CTA)
- Telegram post templates (analysis + charts + links)
- WhatsApp message templates (short + emoji + CTA)

**Timeline:** 2 days
**Priority:** MEDIUM

---

### 4. Create Analytics Dashboard
**Action:** Build cross-platform analytics dashboard

**Dashboard Features:**
- Weekly automated report (posted to Slack/email)
- Top-performing content identification
- Best posting time recommendations (EAT)
- Audience growth tracking
- Content type performance comparison

**Metrics to Track:**

| Platform | Key Metrics | Target (3 months) |
|----------|-------------|-------------------|
| Telegram | Views, Forwards, Subscribers | 2,000+ subscribers |
| WhatsApp | Read Rate, Reply Rate | 85%+ read rate |
| Twitter | Impressions, Engagement | 5%+ engagement |
| Blog | Page Views, Time on Page | 1,000+ views/post |
| LinkedIn | Impressions, Comments | 3%+ engagement |

**Timeline:** 3-4 days
**Priority:** MEDIUM

---

## 📝 Complete System Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE OPENCLAW SYSTEM FOR KENYA                           │
│                                                                                 │
│  PART I: Knowledge Graph Assistant (8 Skills)                                   │
│  ├── explain_formula, interpret_metric, explain_concept                        │
│  ├── get_related_concepts, compare_formulas, check_assumptions                 │
│  ├── list_menu_concepts, trace_derivation                                      │
│  └── Target: Interactive financial engineering education                        │
│                                                                                 │
│  PART II: Content Distribution System (6 Skills + 5 Plugins)                   │
│  ├── generate_topic_ideas, draft_blog_post, rewrite_for_platform               │
│  ├── generate_hashtags, schedule_content, track_analytics                      │
│  ├── telegram-connector, twitter-connector, whatsapp-connector                 │
│  ├── wordpress-connector, linkedin-connector                                   │
│  └── Target: Multi-channel finance content for Kenyan professionals            │
│                                                                                 │
│  UNIFIED INFRASTRUCTURE                                                         │
│  ├── OpenCLAW Gateway (orchestration)                                          │
│  ├── Ollama + Llama 3 8B (inference)                                           │
│  ├── Neo4j 5.15 (knowledge graph: 43 formulas, 89 concepts, 97 interpretations)│
│  ├── Redis 7 (caching)                                                         │
│  └── PostgreSQL (analytics, scheduling)                                        │
│                                                                                 │
│  DEPLOYMENT                                                                     │
│  ├── Oracle Cloud Free Tier (6GB RAM VM, Ubuntu)                               │
│  ├── All containers on private network                                         │
│  ├── Secure webhook access for channels                                        │
│  └── Audit logging for CMA/RBA compliance                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2026-03-04
**Status:** Complete system design for Kenyan finance content distribution
**Recommended First Action:** Step 2 (Telegram Connector) - fastest time-to-value with live channel in 1 day
