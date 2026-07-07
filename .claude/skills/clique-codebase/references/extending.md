# Estendendo o sistema: solvers e experimentos

As atividades 6 (heurística `GreedySolver`) e 7 (harness de benchmark) **já estão
implementadas** — este guia documenta como foram construídas e como adicionar novos
solvers. Depois de gerar/atualizar os dados, redija com a skill **sbc-article** e
fundamente a complexidade com **clique-theory**.

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

`BruteSolver` já satisfaz `solve(graph): SolveResult`; basta adicionar
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
// IMPLEMENTADO: vive em src/services/solver.ts, ao lado de BruteSolver
// (os algoritmos de solução ficam concentrados no mesmo módulo).
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
  constructor(
    private readonly solver: CliqueAlgorithm = new BruteSolver(),
    private readonly adoptionPerEndorsement: number = 0.15, // q da curva de adesão
  ) {}
  // ... analyze() usa this.solver.solve(graph) — sem outras mudanças no fluxo do solver
}
```

Uso: `new ViralAnalyzer(new BronKerboschSolver()).analyze(instance)` (o 2º parâmetro `q`
é opcional; `main.ts` passa `adoptionPerEndorsement` de `config.ts`).

## 4. Testes obrigatórios do novo solver

Em `src/__tests__/<solver>.test.ts` (vitest), replique os casos de `solver.test.ts` e
some duas invariantes:

- **Validade:** `BruteSolver.isClique(g, result.clique) === true` para grafos aleatórios.
- **Qualidade vs baseline:** em instâncias pequenas ($n \le 12$), compare com o
  baseline. Bron-Kerbosch deve **empatar** em cardinalidade (é exato); o guloso pode
  ser `<=` — registre a razão de acerto.

## 5. Harness de experimentos (atividade 7) — já implementado

O harness vive em `src/bench/benchmark.ts` e roda com **`npm run bench`**, escrevendo
`bench.json` (consumido por `main.ts` → aba **Benchmark** do relatório). Ele varre
tamanhos de entrada e compara os dois solvers no **mesmo** grafo. Constantes no topo:

```ts
// src/bench/benchmark.ts   →  rode com:  npm run bench
const N_VALUES = [6, 8, 10, 12, 14, 16, 18, 20];   // tamanhos de entrada (|V_a| = n)
const SEEDS    = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];  // 10 seeds → médias estáveis
const THRESHOLD = 0.6;
const MAX_BRUTE_N = 20;                            // teto de viabilidade da força bruta
```

Para cada `(n, seed)`: gera uma instância de **categoria única** com `prefProb = 1`
(⇒ `|V_a| = n` exato) e roda `BruteSolver` **e** `GreedySolver` no mesmo grafo via
`new ViralAnalyzer(solver).analyze(instance)` (que já mede `solveTime` e devolve
`cliqueSize`). Agrega por `n` (`speedup`, `qualityRatio`, `optimalRate`) e serializa um
`BenchmarkReport` (`runs` + `aggregates`) em `bench.json`. É determinístico (seeds fixas)
e valida a invariante `sizeGreedy ≤ sizeBrute`. `main()` roda no import → **não** importe
o módulo em testes (use a composição direta, como `benchmark.test.ts`).

Para regenerar com outra faixa/seeds, edite as constantes no topo de `benchmark.ts` e
rode `npm run bench` de novo.

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
