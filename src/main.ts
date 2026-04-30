import { InstanceGenerator } from "./services/generator.js";
import { ViralAnalyzer } from "./services/analyzer.js";
import { ReportGenerator } from "./reports/report.js";
import { simulationConfig, reportOutputPath } from "./config/config.js";

function main(): void {
  const instance = new InstanceGenerator().generate(simulationConfig);
  const analyzer = new ViralAnalyzer();
  const ranked = analyzer.analyze(instance);
  analyzer.printResults(instance, ranked);
  new ReportGenerator().generate(instance, ranked, reportOutputPath);
}

main();
