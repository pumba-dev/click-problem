import { Graph } from "./graph.js";
import { CliqueSolver } from "./solver.js";
import type { ProblemInstance, GraphNodeData, GraphEdgeData, CategoryResult } from "./models.js";

export type { CategoryResult };

/**
 * Orquestrador da análise de propagação viral por clique máximo.
 *
 * Responsável por:
 * - Construir o grafo G_a para cada categoria a partir da instância
 * - Aplicar `CliqueSolver` em cada grafo
 * - Rankear categorias por (cliqueSize DESC, aggregateReach DESC)
 * - Montar os dados de visualização (nós/arestas com flags de clique)
 * - Exibir o ranking no terminal
 *
 * Uso: `new ViralAnalyzer().analyze(instance)`.
 */
export class ViralAnalyzer {
  private readonly solver = new CliqueSolver();

  /**
   * Chave canônica de acesso ao score de interação entre os usuários a e b.
   * Mesma convenção usada por `InstanceGenerator` ao construir o mapa.
   */
  private static key(a: number, b: number): string {
    return `${Math.min(a, b)},${Math.max(a, b)}`;
  }

  /** Formata um inteiro com separador de milhar no padrão pt-BR. */
  private static formatReach(n: number): string {
    return n.toLocaleString("pt-BR");
  }

  /**
   * Constrói o grafo G_a de uma categoria a partir da instância do problema.
   *
   * Vértices: usuários com `preferences[category] === true`.
   * Arestas: pares cujo score de interação supera o limiar da instância.
   */
  private buildCategoryGraph(instance: ProblemInstance, category: string): Graph {
    const eligible = instance.users
      .filter((u) => u.preferences[category] === true)
      .map((u) => u.id);

    const graph = new Graph(eligible);

    for (let i = 0; i < eligible.length; i++) {
      for (let j = i + 1; j < eligible.length; j++) {
        const score = instance.interactions.get(ViralAnalyzer.key(eligible[i], eligible[j])) ?? 0;
        if (score >= instance.threshold) {
          graph.addEdge(eligible[i], eligible[j]);
        }
      }
    }

    return graph;
  }

  /**
   * Calcula a soma do alcance (followers) de todos os usuários do clique.
   * Representa o alcance orgânico potencial do seed viral na categoria.
   */
  private aggregateReach(instance: ProblemInstance, clique: number[]): number {
    const userMap = new Map(instance.users.map((u) => [u.id, u]));
    return clique.reduce((sum, id) => sum + (userMap.get(id)?.reach ?? 0), 0);
  }

  /**
   * Ordena os resultados por (cliqueSize DESC, aggregateReach DESC).
   * Em empate de tamanho de clique, vence a categoria com maior alcance agregado.
   */
  private rankCategories(results: CategoryResult[]): CategoryResult[] {
    return [...results].sort(
      (a, b) => b.cliqueSize - a.cliqueSize || b.aggregateReach - a.aggregateReach,
    );
  }

  /**
   * Executa a análise completa para todas as categorias da instância.
   *
   * Para cada categoria:
   * 1. Constrói G_a
   * 2. Aplica força bruta para encontrar o clique máximo
   * 3. Monta os dados de nós e arestas com flags de visualização
   *
   * @returns resultados rankeados por (cliqueSize DESC, aggregateReach DESC)
   */
  analyze(instance: ProblemInstance): CategoryResult[] {
    const userMap = new Map(instance.users.map((u) => [u.id, u]));

    const results = instance.categories.map((category) => {
      const graph = this.buildCategoryGraph(instance, category);
      const clique = this.solver.solve(graph);
      const cliqueSet = new Set(clique);

      const nodes: GraphNodeData[] = graph.vertices.map((id) => {
        const user = userMap.get(id)!;
        return {
          id,
          label: `${user.name}\n${ViralAnalyzer.formatReach(user.reach)}`,
          inClique: cliqueSet.has(id),
        };
      });

      const edges: GraphEdgeData[] = graph.getEdges().map(([from, to]) => ({
        from,
        to,
        inClique: cliqueSet.has(from) && cliqueSet.has(to),
      }));

      const cliqueMembers = clique.map((id) => {
        const user = userMap.get(id)!;
        return { name: user.name, reach: user.reach };
      });

      return {
        category,
        graphVertices: graph.vertexCount,
        graphEdgeCount: graph.edgeCount,
        clique,
        cliqueSize: clique.length,
        aggregateReach: this.aggregateReach(instance, clique),
        cliqueMembers,
        nodes,
        edges,
      };
    });

    return this.rankCategories(results);
  }

  /**
   * Imprime o ranking completo no terminal com formatação legível.
   * Exibe: vértices, arestas, membros do clique, alcance total e destaque da melhor categoria.
   */
  printResults(instance: ProblemInstance, ranked: CategoryResult[]): void {
    const userMap = new Map(instance.users.map((u) => [u.id, u]));

    console.log("\n=== Análise de Cliques por Categoria ===");
    console.log(
      `Instância: ${instance.users.length} usuários, ${instance.categories.length} categorias, limiar=${instance.threshold.toFixed(2)}\n`,
    );

    for (let i = 0; i < ranked.length; i++) {
      const r = ranked[i];
      const members = r.clique
        .map((id) => {
          const u = userMap.get(id)!;
          return `${u.name} (${ViralAnalyzer.formatReach(u.reach)})`;
        })
        .join(", ");

      console.log(`Rank ${i + 1} | ${r.category}`);
      console.log(`  Grafo         : ${r.graphVertices} vértices, ${r.graphEdgeCount} arestas`);
      console.log(`  Clique máximo : ${r.cliqueSize} membro(s)`);
      console.log(`  Membros       : ${members || "—"}`);
      console.log(`  Alcance total : ${ViralAnalyzer.formatReach(r.aggregateReach)}`);
      console.log();
    }

    const best = ranked[0];
    if (best && best.cliqueSize > 0) {
      console.log(
        `=== Melhor categoria para seed viral: ${best.category} (clique=${best.cliqueSize}, alcance=${ViralAnalyzer.formatReach(best.aggregateReach)}) ===\n`,
      );
    }
  }
}
