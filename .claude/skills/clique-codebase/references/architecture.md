# Arquitetura detalhada

Referência módulo a módulo. Reflete o código em `src/`.

## Fluxo de execução (`main.ts`)

```ts
const instance = new InstanceGenerator().generate(simulationConfig);   // mede generationTimeMs
const ranked   = new ViralAnalyzer().analyze(instance);                // mede analysisTimeMs
analyzer.printResults(instance, ranked);                               // terminal
const stats = ReportGenerator.buildStats(instance, ranked, simulationConfig, generationTimeMs, analysisTimeMs);
new ReportGenerator().generate(instance, ranked, stats, reportOutputPath);  // report.html
```

`main.ts` é fino de propósito: só instancia, mede tempos com `performance.now()` e
encadeia. Toda lógica vive nas classes de serviço.

## `models/models.ts` — contratos

| Interface | Campos-chave |
|---|---|
| `User` | `id`, `name`, `reach`, `preferences: Record<string, boolean>` |
| `ProblemInstance` | `users`, `categories`, `interactions: Map<string, number>` (chave `"min,max"`), `threshold` |
| `GeneratorOptions` | `numUsers`, `categories`, `prefProb`, `threshold`, `reachLow`, `reachHigh`, `seed` |
| `SolveResult` | `clique: number[]`, `combinationsTested: number` |
| `CategoryResult` | `category`, `graphVertices`, `graphEdgeCount`, `clique`, `cliqueSize`, `aggregateReach`, `cliqueMembers`, `nodes`, `edges`, `solveTime?`, `combinationsTested?` |
| `GraphNodeData` / `GraphEdgeData` | dados de visualização vis.js, com flag `inClique` |
| `CategoryTimingEntry` | `category`, `solveTimeMs`, `combinationsTested` |
| `SimulationStats` | `timestamp`, `config`, tempos (`generationTimeMs`, `analysisTimeMs`, `reportTimeMs`, `totalTimeMs`), `categoryTimings[]`, densidade (`totalPossiblePairs`, `connectionsAboveThreshold`, `networkDensity`), agregados (`totalCombinationsTested`, `avgCliqueSize`, `maxCliqueSize`, `minCliqueSize`, `highestReachCategory`) |

## `models/graph.ts` — `class Graph`

Lista de adjacência `Map<number, Set<number>>` + contador `_edgeCount`.

| Membro | Complexidade | Notas |
|---|---|---|
| `constructor(vertices: number[])` | O(V) | cria vértices sem arestas |
| `addEdge(u, v)` | O(1) amortizado | idempotente; ignora vértices inexistentes; insere ambas as direções e incrementa `_edgeCount` |
| `hasEdge(u, v)` | O(1) amortizado | lookup em Set |
| `neighbors(u)` | O(1) | retorna o `Set` de vizinhos (ou vazio) |
| `getEdges()` | O(V+E) | pares `[u,v]` com `u < v`, cada aresta uma vez |
| `get vertices` / `vertexCount` / `edgeCount` | — | acessos diretos |

Lista de adjacência (não matriz) por economia de memória em grafos esparsos.

## `services/generator.ts` — `class InstanceGenerator`

- `private static rand(seed)`: **Mulberry32**, closure em `[0,1)`.
- `private static key(a,b)`: `"min,max"`.
- `generate(options)`:
  1. `numUsers` usuários; `reach = floor(rand()*(reachHigh-reachLow))+reachLow`;
     `preferences[c] = rand() < prefProb`.
  2. Para todo par `i<j`: `interactions[key(i,j)] = rand()`.
  
  **Ordem de consumo do PRNG importa** para a reprodutibilidade: usuários primeiro
  (reach e preferências intercalados por usuário), depois todos os pares. Não reordene.

## `services/solver.ts` — `class CliqueSolver` (baseline)

- `static isClique(graph, subset)` — O(k²).
- `static *combinations(arr, k)` — gerador lazy (backtracking, `arr.slice(i+1)`).
- `solve(graph): SolveResult` — itera `k = n → 1`, retorna o primeiro clique
  (early exit) e conta `combinationsTested`. O(2ⁿ·n²). Ver skill **clique-theory**.

## `services/analyzer.ts` — `class ViralAnalyzer`

- `buildCategoryGraph(instance, category)`: filtra usuários com `preferences[category]===true`,
  liga pares com `score >= threshold`.
- `aggregateReach(instance, clique)`: soma `reach` dos membros.
- `rankCategories`: `sort((a,b) => b.cliqueSize-a.cliqueSize || b.aggregateReach-a.aggregateReach)`.
- `analyze(instance)`: para cada categoria monta grafo, mede `solveTime`, resolve, monta
  `nodes`/`edges` com `inClique`, e devolve rankeado.
- `printResults`: imprime ranking no terminal e destaca a melhor categoria.

Para plugar uma heurística, o ponto de troca é a linha
`this.solver.solve(graph)` em `analyze` — ver `extending.md`.

## `reports/report.ts` — `class ReportGenerator`

- Helpers `private static`: `slugify`, `fmtN`, `capitalize`, `buildNetworkFn`,
  `buildCategorySection`, `buildUsersTable`.
- `static buildStats(...)`: centraliza o cálculo das métricas de `SimulationStats`.
- `generate(instance, ranked, stats, outputPath?)`: escreve o HTML autocontido.
- Usa **vis.js** (grafos, init *lazy* na 1ª exibição da aba) e **Chart.js** (barras),
  ambos via CDN. Nós/arestas do clique em laranja; demais em azul/cinza.

## Config (`config/config.ts`)

`simulationConfig: GeneratorOptions` (seed 42, 30 usuários, 5 categorias, prefProb 0.5,
threshold 0.6, reach 1k–500k) e `reportOutputPath = "report.html"`. Detalhe de cada
campo em `config-reference.md`.
