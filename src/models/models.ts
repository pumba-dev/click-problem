import type { Graph } from "./graph.js";

/** Representa um usuário da rede social com suas preferências e métricas de alcance. */
export interface User {
  /** Identificador único (inteiro sequencial a partir de 0). */
  id: number;
  /** Nome de exibição do usuário. */
  name: string;
  /** Número de seguidores / tamanho da audiência orgânica. */
  reach: number;
  /** Mapa de categorias para interesse binário (true = gosta). */
  preferences: Record<string, boolean>;
}

/**
 * Instância completa do problema do clique para análise de propagação viral.
 *
 * Modela o conjunto de usuários, as categorias de interesse e a matriz de
 * interações entre pares de usuários, usada para construir os grafos G_a.
 */
export interface ProblemInstance {
  /** Lista de todos os usuários da rede. */
  users: User[];
  /** Lista de categorias avaliadas (ex.: "animals", "sports"). */
  categories: string[];
  /**
   * Scores de interação entre pares de usuários.
   * Chave no formato `"min_id,max_id"` → score em [0, 1].
   */
  interactions: Map<string, number>;
  /** Limiar mínimo de interação para que uma aresta seja criada em G_a. */
  threshold: number;
}

/** Dado de um nó para visualização no grafo (vis.js). */
export interface GraphNodeData {
  /** ID do vértice — coincide com o User.id correspondente. */
  id: number;
  /** Rótulo exibido no nó (nome + alcance formatado). */
  label: string;
  /** Indica se o nó faz parte do clique máximo encontrado. */
  inClique: boolean;
}

/** Dado de uma aresta para visualização no grafo (vis.js). */
export interface GraphEdgeData {
  from: number;
  to: number;
  /** Indica se ambos os extremos pertencem ao clique máximo. */
  inClique: boolean;
}

/** Retorno de BruteSolver.solve(): clique encontrado + esforço computacional. */
export interface SolveResult {
  /** IDs dos vértices do clique máximo (vazio se grafo sem arestas). */
  clique: number[];
  /** Total de subconjuntos avaliados antes de encontrar o clique. */
  combinationsTested: number;
}

/**
 * Contrato comum a qualquer algoritmo de clique máximo — exato (força bruta,
 * Bron-Kerbosch) ou heurístico (guloso por grau). Permite que `ViralAnalyzer`
 * receba o algoritmo por injeção de dependência e torna baseline e heurística
 * intercambiáveis no harness de experimentos comparativos (atividade 7).
 */
export interface CliqueAlgorithm {
  /** Nome legível para relatórios/gráficos (ex.: "brute-force", "greedy"). */
  readonly name: string;
  /** Encontra um clique — máximo se exato, aproximado se heurístico — em `graph`. */
  solve(graph: Graph): SolveResult;
}

/** Parâmetros opcionais para controlar a geração de instâncias aleatórias. */
export interface GeneratorOptions {
  /** Número de usuários a gerar. Padrão: 30. */
  numUsers: number;
  /** Lista de categorias de interesse. Padrão: ["animals", "sports", "technology", "music", "food"]. */
  categories: string[];
  /** Probabilidade de um usuário gostar de cada categoria. Padrão: 0.5. */
  prefProb: number;
  /** Limiar mínimo de score de interação para criar uma aresta em G_a. Padrão: 0.6. */
  threshold: number;
  /** Alcance mínimo (seguidores) de um usuário. Padrão: 1.000. */
  reachLow: number;
  /** Alcance máximo (seguidores) de um usuário. Padrão: 500.000. */
  reachHigh: number;
  /**
   * Semente do PRNG para reprodutibilidade.
   * A mesma seed sempre produz a mesma instância, independente da ordem de chamadas.
   * Padrão: 42.
   */
  seed: number;
}

/**
 * Resultado completo de uma categoria após aplicação do algoritmo de clique máximo.
 * Contém tanto as métricas de análise quanto os dados de visualização (vis.js).
 */
export interface CategoryResult {
  category: string;
  graphVertices: number;
  graphEdgeCount: number;
  /** IDs brutos dos vértices do maior clique (usados internamente). */
  clique: number[];
  cliqueSize: number;
  aggregateReach: number;
  /**
   * Probabilidade estimada de adesão do público sob prova social:
   * `p = 1 − (1 − q)^cliqueSize`, com q = `adoptionPerEndorsement`. Em [0, 1];
   * vale 0 para clique vazio. Cresce com o tamanho do clique (nº de endossos).
   */
  adoptionProbability: number;
  cliqueMembers: Array<{ name: string; reach: number }>;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  /** Tempo de wall-clock (ms) gasto pelo solver nesta categoria. */
  solveTime?: number;
  /** Total de subconjuntos testados pelo solver nesta categoria. */
  combinationsTested?: number;
}

/** Resumo de timing e esforço por categoria, usado em SimulationStats. */
export interface CategoryTimingEntry {
  category: string;
  solveTimeMs: number;
  combinationsTested: number;
}

/** Estatísticas completas de uma execução, passadas de main.ts → ReportGenerator. */
export interface SimulationStats {
  /** Timestamp ISO-8601 capturado antes da geração da instância. */
  timestamp: string;
  /** Snapshot da configuração usada nesta execução. */
  config: GeneratorOptions;

  /** Ms de wall-clock para InstanceGenerator.generate(). */
  generationTimeMs: number;
  /** Ms de wall-clock para ViralAnalyzer.analyze() (todas as categorias). */
  analysisTimeMs: number;
  /** Ms de wall-clock para ReportGenerator.generate() (preenchido internamente). */
  reportTimeMs: number;
  /** Ms totais de wall-clock do início ao fim de main() (preenchido após generate()). */
  totalTimeMs: number;

  /** Uma entrada por categoria na ordem rankeada. */
  categoryTimings: CategoryTimingEntry[];

  /** Total de pares possíveis C(numUsers, 2). */
  totalPossiblePairs: number;
  /** Pares com score >= threshold (potenciais arestas). */
  connectionsAboveThreshold: number;
  /** Densidade da rede: connectionsAboveThreshold / totalPossiblePairs ∈ [0,1]. */
  networkDensity: number;

  /** Soma de combinationsTested em todas as categorias. */
  totalCombinationsTested: number;
  /** Média de cliqueSize entre todas as categorias. */
  avgCliqueSize: number;
  /** Maior cliqueSize encontrado. */
  maxCliqueSize: number;
  /** Menor cliqueSize encontrado. */
  minCliqueSize: number;
  /** Nome da categoria com maior aggregateReach. */
  highestReachCategory: string;

  /**
   * Probabilidade de adesão por endosso único (q) usada na curva de adesão
   * `p = 1 − (1 − q)^k`. Reproduzida aqui para o relatório desenhar a curva e
   * exibir o parâmetro. Espelha `adoptionPerEndorsement` de config.ts.
   */
  adoptionPerEndorsement: number;
}

/**
 * Um experimento do benchmark (atividade 7): os dois solvers rodados no MESMO
 * grafo, para um dado tamanho de entrada `n` e uma dada `seed`.
 */
export interface BenchmarkRun {
  /** Tamanho da entrada = nº de vértices do grafo (|V_a|). */
  n: number;
  /** Seed do PRNG que gerou a instância deste run. */
  seed: number;
  /** Tempo de wall-clock (ms) do `BruteSolver.solve` neste grafo. */
  timeBruteMs: number;
  /** Tempo de wall-clock (ms) do `GreedySolver.solve` no MESMO grafo. */
  timeGreedyMs: number;
  /** Cardinalidade do clique do baseline exato (= clique máximo). */
  sizeBrute: number;
  /** Cardinalidade do clique da heurística gulosa. */
  sizeGreedy: number;
  /** `true` se a heurística atingiu o ótimo (`sizeGreedy === sizeBrute`). */
  optimal: boolean;
}

/** Agregado por tamanho de entrada `n` (média sobre as seeds). */
export interface BenchmarkPointAgg {
  n: number;
  /** Nº de runs (seeds) agregados neste `n`. */
  samples: number;
  meanTimeBruteMs: number;
  meanTimeGreedyMs: number;
  /** `meanTimeBruteMs / meanTimeGreedyMs` — quantas vezes o guloso é mais rápido. */
  speedup: number;
  meanSizeBrute: number;
  meanSizeGreedy: number;
  /** Razão média de qualidade `|C|_greedy / |C|_brute` ∈ (0, 1]. */
  qualityRatio: number;
  /** Fração de runs em que o guloso atingiu o ótimo ∈ [0, 1]. */
  optimalRate: number;
  /** Nº de runs subótimos (`sizeGreedy < sizeBrute`) neste `n`. */
  suboptimalCount: number;
}

/** Relatório completo do benchmark baseline × heurística (atividade 7). */
export interface BenchmarkReport {
  /** Timestamp ISO-8601 de quando o benchmark foi gerado. */
  generatedAt: string;
  /** Seeds usadas (fixas → reprodutível). */
  seeds: number[];
  /** Valores de `n` varridos (crescente). */
  nValues: number[];
  /** Limiar τ usado na construção dos grafos. */
  threshold: number;
  /** Maior `n` executado pela força bruta (teto de viabilidade). */
  bruteCeiling: number;
  /** Todos os runs individuais. */
  runs: BenchmarkRun[];
  /** Agregados por `n`, na ordem crescente de `n`. */
  aggregates: BenchmarkPointAgg[];
}
