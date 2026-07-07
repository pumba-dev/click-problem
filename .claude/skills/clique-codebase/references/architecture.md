# Arquitetura detalhada

Referência módulo a módulo. Reflete o código em `src/`.

## Fluxo de execução (`main.ts`)

```ts
const instance = new InstanceGenerator().generate(simulationConfig);            // mede generationTimeMs
const analyzer = new ViralAnalyzer(new BruteSolver(), adoptionPerEndorsement);  // injeta solver + q (curva de adesão)
const ranked   = analyzer.analyze(instance);                                    // mede analysisTimeMs
analyzer.printResults(instance, ranked);                                        // terminal
const stats = ReportGenerator.buildStats(
  instance, ranked, simulationConfig, generationTimeMs, analysisTimeMs, adoptionPerEndorsement);
const benchmark = loadBenchmark();                                              // bench.json (opcional)
new ReportGenerator().generate(instance, ranked, stats, reportOutputPath, benchmark);  // report.html
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
| `CategoryResult` | `category`, `graphVertices`, `graphEdgeCount`, `clique`, `cliqueSize`, `aggregateReach`, `adoptionProbability` (= 1−(1−q)^cliqueSize), `cliqueMembers`, `nodes`, `edges`, `solveTime?`, `combinationsTested?` |
| `CliqueAlgorithm` | `name: string`; `solve(graph): SolveResult` — contrato comum a `BruteSolver` e `GreedySolver` |
| `GraphNodeData` / `GraphEdgeData` | dados de visualização vis.js, com flag `inClique` |
| `CategoryTimingEntry` | `category`, `solveTimeMs`, `combinationsTested` |
| `SimulationStats` | `timestamp`, `config`, tempos (`generationTimeMs`, `analysisTimeMs`, `reportTimeMs`, `totalTimeMs`), `categoryTimings[]`, densidade (`totalPossiblePairs`, `connectionsAboveThreshold`, `networkDensity`), agregados (`totalCombinationsTested`, `avgCliqueSize`, `maxCliqueSize`, `minCliqueSize`, `highestReachCategory`), `adoptionPerEndorsement` (q usado na curva de adesão) |
| `BenchmarkRun` | `n`, `seed`, `timeBruteMs`, `timeGreedyMs`, `sizeBrute`, `sizeGreedy`, `optimal` — um experimento (os 2 solvers no mesmo grafo) |
| `BenchmarkPointAgg` | agregado por `n`: `meanTime*`, `meanSize*`, `speedup`, `qualityRatio`, `optimalRate`, `suboptimalCount` |
| `BenchmarkReport` | `generatedAt`, `seeds`, `nValues`, `threshold`, `bruteCeiling`, `runs[]`, `aggregates[]` — serializado em `bench.json` |

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

## `services/solver.ts` — `class BruteSolver` (baseline) + `class GreedySolver` (heurística)

Ambos implementam a interface `CliqueAlgorithm` (`name` + `solve(graph): SolveResult`),
intercambiáveis no `ViralAnalyzer`.

**`BruteSolver`** (exato, `name` implícito do baseline):
- `static isClique(graph, subset)` — O(k²).
- `static *combinations(arr, k)` — gerador lazy (backtracking, `arr.slice(i+1)`).
- `solve(graph): SolveResult` — itera `k = n → 1`, retorna o primeiro clique
  (early exit) e conta `combinationsTested`. O(2ⁿ·n²). Ver skill **clique-theory**.

**`GreedySolver`** (heurística, `name: "greedy"`):
- `solve(graph): SolveResult` — ordena vértices por **grau decrescente** (desempate por
  id crescente → determinístico), varre uma vez incluindo cada vértice se for adjacente a
  todo o clique parcial. O(n²), espaço O(n). **Não garante o ótimo** (pode parar em clique
  maximal menor). `combinationsTested` reaproveitado como nº de vértices avaliados (= n).

## `services/analyzer.ts` — `class ViralAnalyzer`

- Construtor `(solver: CliqueAlgorithm = new BruteSolver(), adoptionPerEndorsement = 0.15)`:
  injeta o algoritmo e o q da curva de adesão.
- `buildCategoryGraph(instance, category)`: filtra usuários com `preferences[category]===true`,
  liga pares com `score >= threshold`.
- `aggregateReach(instance, clique)`: soma `reach` dos membros.
- `static adoptionProbability(q, k)`: `k<=0 ? 0 : 1 − (1−q)^k` — curva de adesão / prova social.
- `rankCategories`: `sort((a,b) => b.cliqueSize-a.cliqueSize || b.aggregateReach-a.aggregateReach)`.
- `analyze(instance)`: para cada categoria monta grafo, mede `solveTime`, resolve, calcula
  `adoptionProbability`, monta `nodes`/`edges` com `inClique`, e devolve rankeado.
- `printResults`: imprime ranking (com adesão estimada) no terminal e destaca a melhor categoria.

Para plugar outra heurística/solver, o ponto de troca é a injeção no construtor
(`this.solver.solve(graph)` em `analyze`) — ver `extending.md`.

## `bench/benchmark.ts` — harness de benchmark (atividade 7)

Sweep de `n` (6..20, `MAX_BRUTE_N` limita a força bruta) × seeds fixas. Para cada
`(n, seed)`: gera instância de categoria única com `prefProb=1` (⇒ `|V_a|=n`) e roda
`BruteSolver` **e** `GreedySolver` no **mesmo** grafo via `ViralAnalyzer.analyze` (que
mede `solveTime`). Agrega por `n` (`speedup`, `qualityRatio`, `optimalRate`) e escreve
`bench.json` (`BenchmarkReport`). Determinístico (seeds fixas); invariante
`sizeGreedy ≤ sizeBrute` verificada. `main()` roda no import → **não** importar em testes
(usar a composição direta, como `benchmark.test.ts`). Consumido por `main.ts`, que o
passa a `ReportGenerator.generate`.

## `reports/report.ts` — `class ReportGenerator`

- Helpers `private static`: `slugify`, `fmtN`, `capitalize`, `buildNetworkFn`,
  `buildCategorySection`, `buildUsersTable`, `buildStatsSection`, `buildBenchmarkSection`.
- `static buildStats(instance, ranked, config, genMs, analysisMs, adoptionPerEndorsement)`:
  centraliza o cálculo das métricas de `SimulationStats` (inclui o q da curva de adesão).
- `generate(instance, ranked, stats, outputPath?, benchmark?)`: escreve o HTML autocontido;
  o 5º parâmetro (`BenchmarkReport`, opcional) alimenta a aba **Benchmark**; se ausente,
  a aba mostra um aviso `npm run bench`.
- Usa **vis.js** (grafos, init *lazy* na 1ª exibição da aba) e **Chart.js**, via CDN:
  barras + **curva de adesão** `p×k` (Visão Geral) e 3 gráficos de benchmark (tempo×n em
  log, acerto do ótimo, trade-off speedup×qualidade). Nós/arestas do clique em laranja.

## Config (`config/config.ts`)

`simulationConfig: GeneratorOptions` (seed 42, 30 usuários, 5 categorias, prefProb 0.5,
threshold 0.6, reach 1k–500k), `adoptionPerEndorsement = 0.15` (q da curva de adesão —
constante global, não afeta a geração) e `reportOutputPath = "report.html"`. Detalhe de
cada campo em `config-reference.md`.
