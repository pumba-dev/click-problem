import { existsSync, readFileSync } from "node:fs";
import { InstanceGenerator } from "./services/generator.js";
import { ViralAnalyzer } from "./services/analyzer.js";
import { BruteSolver } from "./services/solver.js";
import { ReportGenerator } from "./reports/report.js";
import {
  simulationConfig,
  reportOutputPath,
  adoptionPerEndorsement,
} from "./config/config.js";
import type { BenchmarkReport } from "./models/models.js";

/**
 * Carrega o relatório de benchmark (`bench.json`, gerado por `npm run bench`),
 * se existir. O relatório HTML degrada de forma graciosa quando ausente.
 */
function loadBenchmark(path = "bench.json"): BenchmarkReport | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as BenchmarkReport;
  } catch {
    console.warn(`Aviso: ${path} inválido — aba Benchmark ficará vazia.`);
    return undefined;
  }
}

function main(): void {
  const genStart = performance.now();
  const instance = new InstanceGenerator().generate(simulationConfig);
  const generationTimeMs = performance.now() - genStart;

  const analyzeStart = performance.now();
  const analyzer = new ViralAnalyzer(new BruteSolver(), adoptionPerEndorsement);
  const ranked = analyzer.analyze(instance);
  const analysisTimeMs = performance.now() - analyzeStart;

  analyzer.printResults(instance, ranked);

  const stats = ReportGenerator.buildStats(
    instance,
    ranked,
    simulationConfig,
    generationTimeMs,
    analysisTimeMs,
    adoptionPerEndorsement,
  );

  const benchmark = loadBenchmark();

  new ReportGenerator().generate(
    instance,
    ranked,
    stats,
    reportOutputPath,
    benchmark,
  );
}

main();
