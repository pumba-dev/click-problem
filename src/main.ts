import { InstanceGenerator } from "./generator.js";
import { ViralAnalyzer } from "./analyzer.js";
import { ReportGenerator } from "./report.js";
import { simulationConfig, reportOutputPath } from "./config.js";

function main(): void {
  const instance = new InstanceGenerator().generate(simulationConfig);
  const analyzer = new ViralAnalyzer();
  const ranked = analyzer.analyze(instance);
  analyzer.printResults(instance, ranked);
  new ReportGenerator().generate(instance, ranked, reportOutputPath);
}

main();
