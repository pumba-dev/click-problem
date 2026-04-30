import { InstanceGenerator } from "./services/generator.js";
import { ViralAnalyzer } from "./services/analyzer.js";
import { ReportGenerator } from "./reports/report.js";
import { simulationConfig, reportOutputPath } from "./config/config.js";

function main(): void {
  const genStart = performance.now();
  const instance = new InstanceGenerator().generate(simulationConfig);
  const generationTimeMs = performance.now() - genStart;

  const analyzeStart = performance.now();
  const analyzer = new ViralAnalyzer();
  const ranked = analyzer.analyze(instance);
  const analysisTimeMs = performance.now() - analyzeStart;

  analyzer.printResults(instance, ranked);

  const stats = ReportGenerator.buildStats(
    instance,
    ranked,
    simulationConfig,
    generationTimeMs,
    analysisTimeMs,
  );

  new ReportGenerator().generate(instance, ranked, stats, reportOutputPath);
}

main();
