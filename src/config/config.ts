import type { GeneratorOptions } from "../models/models.js";

/**
 * Simulation configuration for the Click Problem analysis.
 *
 * Edit the values below to customize the generated instance.
 * All fields are optional — defaults match the values shown in comments.
 *
 * After changing settings, run `npm start` to regenerate the report.
 */
export const simulationConfig: GeneratorOptions = {
  // ── Reproducibility ──────────────────────────────────────────────────────
  /**
   * Seed for the PRNG (Mulberry32).
   * The same seed always produces the exact same instance.
   * Change this to explore different random scenarios.
   * Default: 42
   */
  seed: 42,

  // ── Network size ─────────────────────────────────────────────────────────
  /**
   * Total number of users in the simulated social network.
   * Keep below ~30 for fast results; the brute-force solver is O(2^n · n²).
   * Default: 30
   */
  numUsers: 30,

  // ── Categories ───────────────────────────────────────────────────────────
  /**
   * Content categories to evaluate.
   * Each category produces its own graph and maximum-clique result.
   * Add, remove, or rename entries freely — use lowercase, no spaces.
   * Default: ["animals", "sports", "technology", "music", "food"]
   */
  categories: ["animals", "sports", "technology", "music", "food"],

  // ── User preferences ─────────────────────────────────────────────────────
  /**
   * Probability that a user is interested in each category (0–1).
   * Higher values → more users per graph → potentially larger cliques,
   * but the brute-force runtime grows accordingly.
   * Default: 0.5
   */
  prefProb: 0.5,

  // ── Edge creation threshold ───────────────────────────────────────────────
  /**
   * Minimum interaction score required to connect two users with an edge.
   * Scores are uniform in [0, 1]; only pairs with score ≥ threshold get an edge.
   *
   * Effect on graph density:
   *   threshold = 0.3 → ~70 % of eligible pairs connected (dense)
   *   threshold = 0.6 → ~40 % of eligible pairs connected (moderate)
   *   threshold = 0.8 → ~20 % of eligible pairs connected (sparse)
   *
   * Default: 0.6
   */
  threshold: 0.6,

  // ── Follower reach range ──────────────────────────────────────────────────
  /**
   * Minimum number of followers a user can have.
   * Used to simulate organic reach potential.
   * Default: 1_000
   */
  reachLow: 1_000,

  /**
   * Maximum number of followers a user can have.
   * Default: 500_000
   */
  reachHigh: 500_000,
};

/**
 * Probabilidade de adesão por endosso único (q), usada na curva de adesão
 * `p(adesão) = 1 − (1 − q)^k`, onde k é o tamanho do clique (nº de endossos
 * simultâneos sobre o público compartilhado). Modela o efeito de prova social /
 * manada (bandwagon): cada criador a mais no clique é mais um endosso, elevando p.
 *
 * Constante GLOBAL do modelo (mesma para todas as categorias). NÃO afeta a geração
 * da instância nem o clique encontrado — só a métrica de adesão derivada, logo não
 * interfere na reprodutibilidade (RNF-02).
 *
 * Valor em [0, 1]. Ex.: 0.15 ⇒ k=1 → 15%, k=3 → ~39%, k=4 → ~48%.
 * Default: 0.15
 */
export const adoptionPerEndorsement = 0.15;

/**
 * Path where the HTML report will be saved.
 * Relative to the project root (where `npm start` is executed).
 * Default: "report.html"
 */
export const reportOutputPath = "report.html";
