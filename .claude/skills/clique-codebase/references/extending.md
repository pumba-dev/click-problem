# Estendendo o sistema: heurística (atividade 6) e experimentos (atividade 7)

Passo a passo para fechar as duas lacunas do trabalho, seguindo as convenções do
código. Depois de gerar os dados, redija com a skill **sbc-article** e fundamente a
complexidade com **clique-theory**.

## 1. Definir uma interface comum de solver

Para tornar baseline e heurística intercambiáveis em `ViralAnalyzer`, declare em
`models/models.ts`:

```ts
/** Contrato comum a qualquer algoritmo de clique máximo (exato ou heurístico). */
export interface CliqueAlgorithm {
  /** Nome legível para relatórios/gráficos (ex.: "brute-force", "bron-kerbosch"). */
  readonly name: string;
  solve(graph: Graph): SolveResult;
}
```

`CliqueSolver` já satisfaz `solve(graph): SolveResult`; basta adicionar
`readonly name = "brute-force";`.

## 2. Implementar uma heurística

### Opção A — Bron-Kerbosch com pivoteamento (exato, mais rápido na prática)

Enumera cliques maximais por backtracking; o pivoteamento poda ramos. Retorna a maior
clique maximal encontrada. Ainda exponencial no pior caso (limite de Moon–Moser
$3^{n/3}$), mas muito mais rápido que a força bruta na média. Serve como **baseline
exato acelerado** ou como referência de qualidade.

```ts
// src/services/bronKerbosch.ts
import type { Graph } from "../models/graph.js";
import type { CliqueAlgorithm, SolveResult } from "../models/models.js";

export class BronKerboschSolver implements CliqueAlgorithm {
  readonly name = "bron-kerbosch";

  solve(graph: Graph): SolveResult {
    let best: number[] = [];
    let calls = 0;
    const verts = graph.vertices;

    const expand = (R: number[], P: Set<number>, X: Set<number>): void => {
      calls++;
      if (P.size === 0 && X.size === 0) {
        if (R.length > best.length) best = [...R];
        return;
      }
      // pivô: vértice de P∪X com mais vizinhos em P (poda de Tomita)
      const pool = [...P, ...X];
      let pivot = pool[0], maxDeg = -1;
      for (const u of pool) {
        let d = 0;
        for (const w of graph.neighbors(u)) if (P.has(w)) d++;
        if (d > maxDeg) { maxDeg = d; pivot = u; }
      }
      const candidates = [...P].filter((v) => !graph.neighbors(pivot).has(v));
      for (const v of candidates) {
        const Nv = graph.neighbors(v);
        expand(
          [...R, v],
          new Set([...P].filter((w) => Nv.has(w))),
          new Set([...X].filter((w) => Nv.has(w))),
        );
        P.delete(v); X.add(v);
      }
    };

    expand([], new Set(verts), new Set());
    return { clique: best, combinationsTested: calls };
  }
}
```

### Opção B — Guloso (heurístico, tempo polinomial, sem garantia de ótimo)

Constrói um clique adicionando repetidamente o vértice de maior grau que seja adjacente
a todos os já escolhidos. Ótimo para demonstrar o **trade-off qualidade × tempo** no
artigo, pois é rápido mas pode errar o máximo.

```ts
// src/services/greedy.ts
import type { Graph } from "../models/graph.js";
import type { CliqueAlgorithm, SolveResult } from "../models/models.js";

export class GreedySolver implements CliqueAlgorithm {
  readonly name = "greedy";

  solve(graph: Graph): SolveResult {
    const verts = [...graph.vertices].sort(
      (a, b) => graph.neighbors(b).size - graph.neighbors(a).size,
    );
    let steps = 0;
    const clique: number[] = [];
    for (const v of verts) {
      steps++;
      if (clique.every((u) => graph.hasEdge(u, v))) clique.push(v);
    }
    return { clique, combinationsTested: steps };
  }
}
```

> `combinationsTested` vira "esforço" no sentido de cada algoritmo (chamadas
> recursivas / vértices testados). Documente essa semântica no artigo — não é
> comparável 1:1 entre algoritmos, mas o **tempo (ms)** é.

## 3. Plugar em `ViralAnalyzer`

Injete o algoritmo por construtor, mantendo o baseline como padrão:

```ts
export class ViralAnalyzer {
  constructor(private readonly solver: CliqueAlgorithm = new CliqueSolver()) {}
  // ... analyze() usa this.solver.solve(graph) — sem outras mudanças
}
```

Uso: `new ViralAnalyzer(new BronKerboschSolver()).analyze(instance)`.

## 4. Testes obrigatórios do novo solver

Em `src/__tests__/<solver>.test.ts` (vitest), replique os casos de `solver.test.ts` e
some duas invariantes:

- **Validade:** `CliqueSolver.isClique(g, result.clique) === true` para grafos aleatórios.
- **Qualidade vs baseline:** em instâncias pequenas ($n \le 12$), compare com o
  baseline. Bron-Kerbosch deve **empatar** em cardinalidade (é exato); o guloso pode
  ser `<=` — registre a razão de acerto.

## 5. Harness de experimentos (atividade 7)

O enunciado exige testes em **diferentes tamanhos de entrada gerados automaticamente**,
comparando **tempo** e **qualidade**. Crie um script standalone (não faz parte do
pipeline de produção):

```ts
// src/experiments/benchmark.ts   →  rode com:  npx tsx src/experiments/benchmark.ts
import { InstanceGenerator } from "../services/generator.js";
import { Graph } from "../models/graph.js";
import { CliqueSolver } from "../services/solver.js";
import { GreedySolver } from "../services/greedy.js";
import type { CliqueAlgorithm } from "../models/models.js";

const SIZES = [8, 10, 12, 14, 16, 18, 20, 22];
const SEEDS = [1, 2, 3, 4, 5];               // médias sobre várias instâncias
const algos: CliqueAlgorithm[] = [new CliqueSolver(), new GreedySolver()];

function buildGraph(instance: ReturnType<InstanceGenerator["generate"]>, cat: string): Graph {
  const ids = instance.users.filter(u => u.preferences[cat]).map(u => u.id);
  const g = new Graph(ids);
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const s = instance.interactions.get(`${Math.min(ids[i],ids[j])},${Math.max(ids[i],ids[j])}`) ?? 0;
      if (s >= instance.threshold) g.addEdge(ids[i], ids[j]);
    }
  return g;
}

console.log("n,seed,algo,cliqueSize,timeMs,effort");
for (const n of SIZES) {
  for (const seed of SEEDS) {
    const inst = new InstanceGenerator().generate({
      seed, numUsers: n, categories: ["c"], prefProb: 1, threshold: 0.6,
      reachLow: 1000, reachHigh: 500000,
    });
    const g = buildGraph(inst, "c");
    for (const algo of algos) {
      const t0 = performance.now();
      const { clique, combinationsTested } = algo.solve(g);
      const ms = performance.now() - t0;
      console.log(`${n},${seed},${algo.name},${clique.length},${ms.toFixed(3)},${combinationsTested}`);
    }
  }
}
```

Rodar e salvar CSV: `npx tsx src/experiments/benchmark.ts > bench.csv`.

### Métricas a extrair para o artigo

- **Desempenho:** tempo médio (ms) por $n$, por algoritmo. Espera-se crescimento
  exponencial no baseline e sub-exponencial na heurística → gráfico tempo × $n$
  (eixo y em escala log é revelador).
- **Qualidade:** razão `cliqueSize_heurística / cliqueSize_baseline` (proximidade do
  ótimo); % de instâncias em que a heurística acerta o máximo.
- **Ponto de virada:** o maior $n$ em que o baseline ainda termina em tempo aceitável.

Use `prefProb: 1` para que todos os `numUsers` entrem no único grafo — assim $n$ do
experimento é exatamente `numUsers`, controlando o eixo x. Fixar os `SEEDS` mantém tudo
reprodutível.

## 6. Outras extensões

- **Novos parâmetros de geração:** expanda `GeneratorOptions` em `models.ts` e trate em
  `generate()`. Cuidado com a ordem de consumo do PRNG (ver `architecture.md`).
- **Nova visualização:** adicione um helper `private static` em `ReportGenerator` e
  chame-o em `generate()`.
- **Grafo ponderado (trabalho futuro do artigo):** guarde `s_uv` como peso da aresta e
  faça o ranking considerar o peso, não só a existência.
