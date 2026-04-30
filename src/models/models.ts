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

/** Retorno de CliqueSolver.solve(): clique encontrado + esforço computacional. */
export interface SolveResult {
  /** IDs dos vértices do clique máximo (vazio se grafo sem arestas). */
  clique: number[];
  /** Total de subconjuntos avaliados antes de encontrar o clique. */
  combinationsTested: number;
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
}
