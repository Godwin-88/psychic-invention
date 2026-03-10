# SKILL: Graph Algorithms for Data Science

> Sources:
> - *Graph Algorithms for Data Science* — Tomaž Bratanič (Manning, 2024)
> - *Graph Data Science with Python and Neo4j* — Timothy Eastridge (AVA, 2024)

---

## 1. Graph Fundamentals

### Taxonomy of Graph Types
| Type | Description | Example |
|------|-------------|---------|
| **Directed** | Edges have direction (A→B ≠ B→A) | Twitter follows |
| **Undirected** | Edges are symmetric | Facebook friends |
| **Weighted** | Edges carry a numeric value | Road distances |
| **Bipartite** | Two disjoint node sets; edges only cross | Users ↔ Products |
| **Monopartite** | Single node type | Person ↔ Person |
| **Multigraph** | Multiple edges between same node pair | Multi-relationship KGs |

### When to Use a Graph Model
Look for these patterns in data:
- **Self-referencing relationships**: Entities relate to same-type entities
- **Pathfinding networks**: Routing, supply chains, knowledge traversal
- **Bipartite structures**: User–item, author–paper, patient–diagnosis
- **Complex networks**: Social networks, biological networks, transaction graphs

---

## 2. Centrality Algorithms — Finding Important Nodes

| Algorithm | What It Measures | Formula/Idea |
|-----------|-----------------|--------------|
| **Degree centrality** | Number of direct connections | `degree(v) / (n-1)` |
| **PageRank** | Recursive importance via link structure | `PR(v) = (1-d)/N + d * Σ PR(u)/deg(u)` |
| **Personalized PageRank** | PageRank biased toward specific nodes | Start random walk from seed nodes |
| **Betweenness centrality** | How often node lies on shortest paths | `Σ σ(s,t|v) / σ(s,t)` |
| **Closeness centrality** | Average distance to all other nodes | `(n-1) / Σ d(v,u)` |

### Neo4j GDS Usage
```cypher
-- PageRank
CALL gds.pageRank.stream('myGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name AS name, score
ORDER BY score DESC LIMIT 10

-- Degree centrality
CALL gds.degree.stream('myGraph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).name, score
ORDER BY score DESC
```

---

## 3. Community Detection — Grouping Nodes

| Algorithm | Approach | Best For |
|-----------|----------|----------|
| **Weakly Connected Components (WCC)** | Find disconnected subgraphs (ignore edge direction) | Data quality, fragmentation |
| **Strongly Connected Components (SCC)** | Directed paths between all nodes | Dependency cycles |
| **Louvain** | Modularity optimisation, hierarchical | Large-scale community detection |
| **Label Propagation** | Nodes adopt majority label of neighbours | Fast, approximate communities |
| **Local Clustering Coefficient** | Triangle density around a node | Measure of local cohesion |

```cypher
-- Weakly Connected Components
CALL gds.wcc.stream('myGraph')
YIELD nodeId, componentId
RETURN componentId, COUNT(*) AS size
ORDER BY size DESC

-- Louvain community detection
CALL gds.louvain.stream('myGraph')
YIELD nodeId, communityId
RETURN communityId, COLLECT(gds.util.asNode(nodeId).name) AS members
```

---

## 4. Similarity Algorithms — Finding Similar Nodes

| Algorithm | Description |
|-----------|-------------|
| **Jaccard similarity** | `|A ∩ B| / |A ∪ B|` — shared neighbours over total neighbours |
| **Node Similarity** | GDS implementation of Jaccard for graph patterns |
| **Cosine similarity** | Dot product of normalised feature vectors |
| **Pearson correlation** | Linear correlation of node feature vectors |

### Nearest Neighbour Similarity Network
```
1. Extract structural features (degree, betweenness, motifs, graphlets)
2. Compute pairwise similarity (Jaccard / cosine)
3. Build k-NN graph: connect each node to its k most similar nodes
4. Run community detection on similarity network → user segments
```

---

## 5. Pathfinding Algorithms

| Algorithm | Description | Use Case |
|-----------|-------------|----------|
| **Shortest path (BFS/Dijkstra)** | Minimum hops or minimum weight path | Navigation, routing |
| **All-pairs shortest path** | Distances between all node pairs | Network diameter, closeness |
| **A* search** | Heuristic-guided shortest path | Geospatial routing |
| **Random walk** | Stochastic traversal of graph | Graph embeddings, sampling |

---

## 6. Bipartite Graph Analysis

**Projection**: Convert bipartite graph to monopartite by inferring shared connections.

```
Bipartite: User ──bought──► Product
                                 │
Monopartite (projected):   Product ──co-bought──► Product
```

```cypher
-- Project bipartite to monopartite in GDS
CALL gds.graph.project.cypher(
  'productGraph',
  'MATCH (p:Product) RETURN id(p) AS id',
  'MATCH (u:User)-[:BOUGHT]->(p1:Product), (u)-[:BOUGHT]->(p2:Product)
   WHERE p1 <> p2
   RETURN id(p1) AS source, id(p2) AS target, COUNT(u) AS weight'
)
```

---

## 7. Graph Data Science (GDS) Library — Workflow

```
1. Graph Projection → in-memory native projection
   CALL gds.graph.project('myGraph', ['Node'], ['REL'])

2. Algorithm execution → stream / stats / mutate / write modes
   CALL gds.pageRank.stream('myGraph') → iterate results
   CALL gds.pageRank.write('myGraph', {writeProperty: 'pagerank'}) → persist

3. Drop graph → free memory
   CALL gds.graph.drop('myGraph')
```

**Projection types:**
- **Native projection**: Fastest, uses stored graph topology
- **Cypher projection**: Flexible, filter nodes/edges via Cypher

---

## 8. Constructing Graphs from NLP (Text → Graph)

| Step | Tool / Technique |
|------|-----------------|
| **Coreference resolution** | spaCy `neuralcoref`, resolve pronouns to entities |
| **Named Entity Recognition (NER)** | spaCy `en_core_web_lg` → extract entities |
| **Entity linking** | Link surface forms to canonical KB entries |
| **Relation extraction** | spaCy, REBEL, OpenIE → extract typed relations |
| **External enrichment** | Wikidata, DBpedia → add properties |

---

## 9. Practice Tasks
- [ ] Set up Neo4j + GDS plugin, import Twitter dataset from book
- [ ] Run PageRank and identify top influencers
- [ ] Build a co-occurrence network from hashtags using bipartite projection
- [ ] Apply Louvain community detection to find topic clusters
- [ ] Construct a nearest-neighbour similarity network and segment users
- [ ] Build an NLP pipeline with spaCy: NER → relation extraction → Neo4j ingestion
