---
name: clique-codebase
description: >
  Guia de engenharia do código TypeScript do projeto click-problem. Use SEMPRE
  que a tarefa envolver o código-fonte — arquitetura e módulos (config, models,
  graph, generator, solver, analyzer, report, main), rodar/testar/compilar
  (npm start, npm test, npm run build), convenções (TS estrito, classes com
  helpers private static, PRNG Mulberry32, chave canônica de interação), estender
  o sistema (adicionar um solver plugável via interface CliqueAlgorithm — o baseline
  BruteSolver e a heurística GreedySolver já existem; um próximo poderia ser
  Bron-Kerbosch/metaheurística), a curva de adesão (q, p = 1−(1−q)^k), ou RODAR
  EXPERIMENTOS por tamanho de entrada comparando baseline × heurística (atividade 7,
  já implementada: `npm run bench` → bench.json → aba Benchmark do report). Dispare
  em pedidos como "adicione um solver", "implemente
  Bron-Kerbosch", "como rodo o projeto", "escreva um teste", "meça o tempo por n",
  "gere um benchmark", "compare a heurística com a força bruta" ou "onde fica a classe X".
---

# Codebase do Click Problem

Referência de engenharia. A arquitetura por módulo e os tipos estão em
[references/architecture.md](references/architecture.md); como estender (heurísticas,
experimentos) em [references/extending.md](references/extending.md); todos os
parâmetros e comandos em [references/config-reference.md](references/config-reference.md).

## Mapa rápido

```
src/
├── main.ts                 main() — mede tempos, encadeia as classes
├── config/config.ts        simulationConfig (GeneratorOptions) + reportOutputPath
├── models/
│   ├── models.ts           interfaces: User, ProblemInstance, GeneratorOptions,
│   │                       CategoryResult, SolveResult, SimulationStats, ...
│   └── graph.ts            class Graph — lista de adjacência Map<number,Set<number>>
├── services/
│   ├── generator.ts        class InstanceGenerator — geração reprodutível (Mulberry32)
│   ├── solver.ts           BruteSolver (exato, O(2ⁿ·n²)) + GreedySolver (guloso, O(n²)) — CliqueAlgorithm
│   └── analyzer.ts         class ViralAnalyzer — G_a, solve, ranking, curva de adesão, terminal
├── bench/benchmark.ts      harness atividade 7 — sweep n×seeds, 2 solvers, escreve bench.json
├── reports/report.ts       class ReportGenerator — HTML + buildStats() + aba Benchmark
└── __tests__/*.test.ts     vitest (graph, solver, greedy, generator, analyzer, benchmark)
```

Dependências (sem ciclos): `models ← graph ← solver`; `generator, analyzer(→solver,graph), report → models`; `main → tudo`.

## Comandos

```bash
npm install       # tsx, typescript, vitest, @types/node
npm start         # tsx src/main.ts → ranking + gera report.html (embute bench.json se existir)
npm run bench     # tsx src/bench/benchmark.ts → gera bench.json (baseline × heurística por n)
npm test          # vitest run (suíte completa)
npm run test:watch
npm run build     # tsc → dist/
npm run build:latex   # compila o artigo (latexmk); clean:latex limpa os intermediários
```

- `"type": "module"` + `module/moduleResolution: NodeNext` → **imports usam extensão
  `.js`** mesmo apontando para arquivos `.ts` (ex.: `import { Graph } from "../models/graph.js"`).
- `strict: true`, `target ES2022`. Não introduza `any` implícito.

## Convenções que o código segue

- Cada módulo exporta **uma classe**; helpers são `private static` (ex.: `key`,
  `formatReach`, `rand`, `slugify`). O único ponto de entrada público costuma ser um
  método de instância (`generate`, `analyze`, `solve`, `generate` do report).
- **PRNG Mulberry32** em `InstanceGenerator.rand(seed)` — closure com estado próprio,
  **não** toca `Math.random`. Mesma `seed` ⇒ instância idêntica byte-a-byte.
  Nunca use `Math.random` em lógica de simulação: quebra a reprodutibilidade (RNF-02).
- **Chave de interação canônica** `"min,max"` — a mesma em `generator.ts` e
  `analyzer.ts`. Ao ler score de um par, sempre monte a chave com `Math.min/Math.max`.
- Aresta em G_a criada sse `score >= threshold` (empate no limiar conecta).
- Interfaces de domínio **só** em `models/models.ts`.
- Formatação numérica pt-BR via `toLocaleString("pt-BR")`.

## Contratos-chave

- Dois solvers implementam `CliqueAlgorithm` (`solve(graph): SolveResult` →
  `{ clique, combinationsTested }`), plugáveis no `ViralAnalyzer`: **`BruteSolver`**
  (exato, O(2ⁿ·n²)) e **`GreedySolver`** (guloso por grau, O(n²), `name: "greedy"`,
  determinístico, sem garantia de ótimo). Grafo **sem vértices** → `clique: []`; com
  vértices mas **sem arestas** → clique de **tamanho 1**.
- `new ViralAnalyzer(solver?, q?)`; `analyze(instance): CategoryResult[]` já **rankeado**,
  mede `solveTime` por categoria (`performance.now()`) e calcula
  `adoptionProbability = 1 − (1−q)^cliqueSize` (curva de adesão / prova social; q =
  `adoptionPerEndorsement` de config.ts, default 0.15).
- `ReportGenerator.buildStats(instance, ranked, config, genMs, analysisMs, q)` (estático)
  → `SimulationStats`; `new ReportGenerator().generate(instance, ranked, stats, path, benchmark?)`
  — o 5º parâmetro (`BenchmarkReport` de `bench.json`, opcional) alimenta a aba Benchmark.
- `src/bench/benchmark.ts`: harness da atividade 7. Roda os dois solvers no **mesmo grafo**
  por (n, seed), agrega e escreve `bench.json` (`BenchmarkReport`: runs + aggregates por n).
  `main.ts` lê `bench.json` se existir (degrada gracioso se ausente).

## Estado das atividades 6, 7 e 8 (FEITAS)

1. **Atividade 6 — heurística: FEITA.** `GreedySolver` (guloso por grau decrescente,
   desempate por id, sem retrocesso, O(n²), determinístico) em `src/services/solver.ts`
   ao lado do `BruteSolver`; ambos sob `CliqueAlgorithm`. Coberto por `greedy.test.ts`.
2. **Atividade 7 — avaliação: FEITA.** Harness `src/bench/benchmark.ts` (`npm run bench`)
   roda o comparativo **baseline × heurística** por tamanho de entrada (n=6..20, 10 seeds,
   mesmo grafo) → `bench.json`, e o `report.html` o exibe na aba **Benchmark** (tempo×n em
   log, acerto do ótimo, trade-off aceleração×qualidade). Coberto por `benchmark.test.ts`.
   Resultado padrão: guloso até ~45.751× mais rápido, ótimo em 68,8% dos casos.
3. **Atividade 8 — artigo: FEITO.** A skill **sbc-article** cobre a redação; o `.tex` já
   tem a tabela comparativa, o ambiente de execução e a Conclusão atualizada (10 páginas).

Para gerar dados frescos: `npm run bench` (determinístico, seeds fixas). Detalhes de como
o harness foi construído em [references/extending.md](references/extending.md).

## Testes

vitest, um arquivo por classe em `src/__tests__/`. Padrão: casos normais, limítrofes
(grafo vazio, sem arestas, IDs não contíguos) e a invariante **"o resultado é sempre
um clique válido"** verificada via `BruteSolver.isClique`. Novo solver **exato** deve
ganhar teste de **otimalidade** (mesma cardinalidade do baseline em instâncias pequenas);
solver **heurístico** deve ganhar teste de **validade** do clique — ele pode ficar
**abaixo do ótimo** (o `GreedySolver` é coberto por `greedy.test.ts`, incluindo esse
caso). Métricas derivadas como `adoptionProbability` têm teste próprio em
`analyzer.test.ts`, e a composição do benchmark (invariante `sizeGreedy ≤ sizeBrute`,
`|V_a|=n`, reprodutibilidade) em `benchmark.test.ts` — sem importar o harness, que roda
`main()` no import.
