import { writeFileSync } from "node:fs";
import { InstanceGenerator } from "../services/generator.js";
import { ViralAnalyzer } from "../services/analyzer.js";
import { BruteSolver, GreedySolver } from "../services/solver.js";
import type {
  BenchmarkRun,
  BenchmarkPointAgg,
  BenchmarkReport,
} from "../models/models.js";

/**
 * Harness de benchmark baseline × heurística (atividade 7).
 *
 * Para cada tamanho de entrada `n` e cada `seed`, gera UMA instância de categoria
 * única com `prefProb = 1` (⇒ |V_a| = n exato) e roda os DOIS solvers no MESMO
 * grafo, medindo tempo (ms) e cardinalidade do clique. Agrega por `n` e escreve
 * `bench.json`, consumido pelo `ReportGenerator` (aba Benchmark).
 *
 * A força bruta é O(2ⁿ·n²): `MAX_BRUTE_N` limita `n` para manter o benchmark
 * viável. O guloso (O(n²)) rodaria muito além, mas o comparativo exige o par no
 * mesmo grafo. O teto é registrado no relatório (nada é silenciosamente cortado).
 *
 * Reprodutível: seeds fixas + PRNG Mulberry32 semeado. Rode com `npm run bench`.
 */

// ── Parâmetros do experimento (ajuste aqui) ─────────────────────────────────
/** Tamanhos de entrada varridos. Passo 2 mantém a curva legível. */
const N_VALUES = [6, 8, 10, 12, 14, 16, 18, 20];
/** Seeds fixas — mais seeds ⇒ estimativas mais estáveis e mais chance de casos subótimos. */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** Limiar τ (mesmo da instância padrão). p = 1 − τ = 0.4 (densidade moderada). */
const THRESHOLD = 0.6;
/** Teto de viabilidade da força bruta O(2ⁿ). n acima disto não é medido. */
const MAX_BRUTE_N = 20;
/** Caminho de saída, relativo à raiz do projeto (lido por main.ts). */
const OUTPUT_PATH = "bench.json";
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Roda os dois solvers no mesmo grafo de uma instância (n, seed) e devolve as
 * medições. `prefProb = 1` garante que todos os `n` usuários entrem no único
 * grafo, então o tamanho de entrada é exatamente `n`.
 */
function runOne(n: number, seed: number): BenchmarkRun {
  const instance = new InstanceGenerator().generate({
    seed,
    numUsers: n,
    categories: ["bench"],
    prefProb: 1,
    threshold: THRESHOLD,
    reachLow: 1_000,
    reachHigh: 500_000,
  });

  // `analyze` reconstrói G_a de forma determinística a partir da MESMA instância,
  // então os dois solvers enxergam o grafo idêntico. `solveTime` mede só o solve.
  const [bf] = new ViralAnalyzer(new BruteSolver()).analyze(instance);
  const [gr] = new ViralAnalyzer(new GreedySolver()).analyze(instance);

  return {
    n,
    seed,
    timeBruteMs: bf.solveTime ?? 0,
    timeGreedyMs: gr.solveTime ?? 0,
    sizeBrute: bf.cliqueSize,
    sizeGreedy: gr.cliqueSize,
    optimal: gr.cliqueSize === bf.cliqueSize,
  };
}

/** Agrega todos os runs de um dado `n` (média sobre as seeds). */
function aggregate(n: number, runs: BenchmarkRun[]): BenchmarkPointAgg {
  const at = runs.filter((r) => r.n === n);
  const k = at.length;
  const mean = (f: (r: BenchmarkRun) => number): number =>
    k > 0 ? at.reduce((s, r) => s + f(r), 0) / k : 0;

  const meanTimeBruteMs = mean((r) => r.timeBruteMs);
  const meanTimeGreedyMs = mean((r) => r.timeGreedyMs);
  const meanSizeBrute = mean((r) => r.sizeBrute);
  const meanSizeGreedy = mean((r) => r.sizeGreedy);
  const optimalCount = at.filter((r) => r.optimal).length;

  return {
    n,
    samples: k,
    meanTimeBruteMs,
    meanTimeGreedyMs,
    speedup: meanTimeGreedyMs > 0 ? meanTimeBruteMs / meanTimeGreedyMs : 0,
    meanSizeBrute,
    meanSizeGreedy,
    qualityRatio: meanSizeBrute > 0 ? meanSizeGreedy / meanSizeBrute : 1,
    optimalRate: k > 0 ? optimalCount / k : 1,
    suboptimalCount: k - optimalCount,
  };
}

function main(): void {
  const nValues = N_VALUES.filter((n) => n <= MAX_BRUTE_N);
  const runs: BenchmarkRun[] = [];

  console.log(
    `\n=== Benchmark baseline (força bruta) × heurística (guloso) ===\n` +
      `n ∈ {${nValues.join(", ")}} · ${SEEDS.length} seeds · τ=${THRESHOLD} · ` +
      `teto força bruta n≤${MAX_BRUTE_N}\n`,
  );

  if (nValues.length === 0 || SEEDS.length === 0) {
    console.warn(
      "Nenhum run gerado — verifique N_VALUES/SEEDS/MAX_BRUTE_N. Nada foi escrito.",
    );
    return;
  }

  for (const n of nValues) {
    const start = performance.now();
    for (const seed of SEEDS) runs.push(runOne(n, seed));
    const at = runs.filter((r) => r.n === n);
    const sub = at.filter((r) => !r.optimal).length;
    console.log(
      `n=${String(n).padStart(2)} | ${(performance.now() - start).toFixed(0).padStart(6)} ms | ` +
        `subótimos ${sub}/${at.length}`,
    );
  }

  // Invariante crítica: a heurística NUNCA supera o ótimo exato. Se violar, há bug.
  const violations = runs.filter((r) => r.sizeGreedy > r.sizeBrute);
  if (violations.length > 0) {
    throw new Error(
      `Invariante violada: guloso > força bruta em ${violations.length} run(s) — bug no solver.`,
    );
  }

  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    seeds: SEEDS,
    nValues,
    threshold: THRESHOLD,
    bruteCeiling: MAX_BRUTE_N,
    runs,
    aggregates: nValues.map((n) => aggregate(n, runs)),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf-8");

  const totalSub = runs.filter((r) => !r.optimal).length;
  console.log(
    `\nGerado ${OUTPUT_PATH}: ${runs.length} runs, ${totalSub} subótimos ` +
      `(${((totalSub / runs.length) * 100).toFixed(1)}%). Rode \`npm start\` para embutir no relatório.\n`,
  );
}

main();
