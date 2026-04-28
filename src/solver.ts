import type { Graph } from "./graph.js";

/**
 * Solver de clique máximo por força bruta (algoritmo exato).
 *
 * Uso: `new CliqueSolver().solve(graph)`.
 * Complexidade: O(2^n · n²) — adequado para instâncias com n ≤ ~25.
 */
export class CliqueSolver {
  /**
   * Verifica se um subconjunto de vértices forma um clique no grafo.
   * Um clique é um subgrafo completo: todo par deve estar conectado.
   * Complexidade: O(k²) onde k = |subset|.
   */
  private static isClique(graph: Graph, subset: number[]): boolean {
    for (let i = 0; i < subset.length; i++) {
      for (let j = i + 1; j < subset.length; j++) {
        if (!graph.hasEdge(subset[i], subset[j])) return false;
      }
    }
    return true;
  }

  /**
   * Gerador lazy de todas as combinações de tamanho k do array arr.
   * Usa backtracking recursivo; aloca apenas o caminho atual na pilha — O(k) de espaço.
   */
  private static *combinations(arr: number[], k: number): Generator<number[]> {
    if (k === 0) { yield []; return; }
    for (let i = 0; i <= arr.length - k; i++) {
      for (const rest of CliqueSolver.combinations(arr.slice(i + 1), k - 1)) {
        yield [arr[i], ...rest];
      }
    }
  }

  /**
   * Encontra o maior clique no grafo por força bruta.
   *
   * Estratégia: itera subconjuntos em ordem decrescente de tamanho (k = n → 1)
   * e retorna o primeiro que é clique — early exit garante otimalidade.
   *
   * @returns array de IDs dos vértices do maior clique (vazio se grafo sem arestas)
   */
  solve(graph: Graph): number[] {
    const verts = graph.vertices;
    const n = verts.length;
    for (let k = n; k >= 1; k--) {
      for (const subset of CliqueSolver.combinations(verts, k)) {
        if (CliqueSolver.isClique(graph, subset)) return subset;
      }
    }
    return [];
  }
}
