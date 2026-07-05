---
name: clique-codebase
description: >
  Guia de engenharia do código TypeScript do projeto click-problem. Use SEMPRE
  que a tarefa envolver o código-fonte — arquitetura e módulos (config, models,
  graph, generator, solver, analyzer, report, main), rodar/testar/compilar
  (npm start, npm test, npm run build), convenções (TS estrito, classes com
  helpers private static, PRNG Mulberry32, chave canônica de interação), estender
  o sistema, e especialmente IMPLEMENTAR UMA HEURÍSTICA (Bron-Kerbosch, guloso,
  simulated annealing — atividade 6) ou RODAR EXPERIMENTOS por tamanho de entrada
  comparando baseline × heurística (atividade 7). Dispare em pedidos como
  "adicione um solver", "implemente Bron-Kerbosch", "como rodo o projeto",
  "escreva um teste", "meça o tempo por n", "gere um benchmark", "compare a
  heurística com a força bruta" ou "onde fica a classe X".
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
│   ├── solver.ts           class CliqueSolver — baseline força bruta, O(2ⁿ·n²)
│   └── analyzer.ts         class ViralAnalyzer — G_a, solve, ranking, terminal
├── reports/report.ts       class ReportGenerator — HTML + buildStats() (SimulationStats)
└── __tests__/*.test.ts     vitest (graph, solver, generator, analyzer)
```

Dependências (sem ciclos): `models ← graph ← solver`; `generator, analyzer(→solver,graph), report → models`; `main → tudo`.

## Comandos

```bash
npm install       # tsx, typescript, vitest, @types/node
npm start         # tsx src/main.ts → imprime ranking + gera report.html
npm test          # vitest run (suíte completa)
npm run test:watch
npm run build     # tsc → dist/
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

- `CliqueSolver.solve(graph): SolveResult` → `{ clique: number[], combinationsTested: number }`.
  Para grafo **sem vértices** retorna `clique: []`; para grafo com vértices mas **sem
  arestas** retorna um clique de **tamanho 1** (um vértice qualquer).
- `ViralAnalyzer.analyze(instance): CategoryResult[]` já **rankeado**; mede `solveTime`
  por categoria com `performance.now()`.
- `ReportGenerator.buildStats(instance, ranked, config, genMs, analysisMs)` (estático)
  → `SimulationStats`; `new ReportGenerator().generate(instance, ranked, stats, path)`.

## Lacunas do trabalho a fechar aqui (atividades 6 e 7)

O enunciado da disciplina exige, além do baseline:

1. **Atividade 6 — heurística.** O código só tem o solver exato. Falta uma heurística
   (Bron-Kerbosch com pivoteamento, guloso, ou metaheurística). Ela deve expor a mesma
   assinatura do baseline para ser plugável em `ViralAnalyzer`.
2. **Atividade 7 — avaliação.** Falta o comparativo **baseline × heurística**:
   desempenho (tempo) e qualidade da solução (proximidade do ótimo), com **testes em
   diferentes tamanhos de entrada gerados automaticamente**, em tabelas e gráficos.

O passo a passo de implementação e de experimentação está em
[references/extending.md](references/extending.md). Depois de gerar os dados, use a
skill **sbc-article** para redigir a seção de resultados, e a **clique-theory** para a
complexidade da heurística.

## Testes

vitest, um arquivo por classe em `src/__tests__/`. Padrão: casos normais, limítrofes
(grafo vazio, sem arestas, IDs não contíguos) e a invariante **"o resultado é sempre
um clique válido"** verificada via `CliqueSolver.isClique`. Qualquer novo solver deve
ganhar um teste que confirme essa invariante e, contra o baseline, a **otimalidade**
(mesma cardinalidade) em instâncias pequenas.
