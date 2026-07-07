import { describe, it, expect } from "vitest";
import { InstanceGenerator } from "../services/generator.js";
import { ViralAnalyzer } from "../services/analyzer.js";
import { BruteSolver, GreedySolver } from "../services/solver.js";
import type { ProblemInstance } from "../models/models.js";

// Valida a lógica central do benchmark (atividade 7) sem importar o harness
// src/bench/benchmark.ts — ele executa main() no import e escreveria bench.json.
// A composição testada aqui é exatamente a que o harness usa em runOne().

function benchInstance(seed: number, n: number): ProblemInstance {
  return new InstanceGenerator().generate({
    seed,
    numUsers: n,
    categories: ["bench"],
    prefProb: 1, // todos entram no único grafo ⇒ |V_a| = n
    threshold: 0.6,
    reachLow: 1_000,
    reachHigh: 500_000,
  });
}

describe("benchmark baseline × heurística", () => {
  it("guloso nunca supera a força bruta (sizeGreedy ≤ sizeBrute) em várias seeds/n", () => {
    for (const n of [6, 8, 10, 12]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const inst = benchInstance(seed, n);
        const [bf] = new ViralAnalyzer(new BruteSolver()).analyze(inst);
        const [gr] = new ViralAnalyzer(new GreedySolver()).analyze(inst);
        expect(gr.cliqueSize).toBeLessThanOrEqual(bf.cliqueSize);
        expect(gr.cliqueSize).toBeGreaterThan(0);
      }
    }
  });

  it("prefProb=1 ⇒ |V_a| = n (tamanho de entrada controlado)", () => {
    const [r] = new ViralAnalyzer().analyze(benchInstance(1, 12));
    expect(r.graphVertices).toBe(12);
  });

  it("mesma seed ⇒ mesmos tamanhos (reprodutível)", () => {
    const a = new ViralAnalyzer(new BruteSolver()).analyze(benchInstance(7, 10))[0];
    const b = new ViralAnalyzer(new BruteSolver()).analyze(benchInstance(7, 10))[0];
    expect(a.cliqueSize).toBe(b.cliqueSize);
    expect(a.aggregateReach).toBe(b.aggregateReach);
  });

  it("mede solveTime não-negativo para ambos os solvers", () => {
    const inst = benchInstance(3, 10);
    const [bf] = new ViralAnalyzer(new BruteSolver()).analyze(inst);
    const [gr] = new ViralAnalyzer(new GreedySolver()).analyze(inst);
    expect(bf.solveTime).toBeGreaterThanOrEqual(0);
    expect(gr.solveTime).toBeGreaterThanOrEqual(0);
  });
});
