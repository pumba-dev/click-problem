import type { Graph } from "../models/graph.js";
import type { SolveResult } from "../models/models.js";

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
   *
   * Complexidade: O(k²), onde k = |subset|.
   *   - Loop externo: k iterações.
   *   - Loop interno: até (k-1) iterações por passo; total k·(k-1)/2 = C(k,2) pares.
   *   - hasEdge: O(1) por chamada; invocado C(k,2) vezes no pior caso.
   *   - Total de comparações de arestas: C(k,2) = k·(k-1)/2 ≈ O(k²).
   */
  static isClique(graph: Graph, subset: number[]): boolean {
    // k iterações
    for (let i = 0; i < subset.length; i++) {
      // (k-i-1) iterações; acumulado: C(k,2)
      for (let j = i + 1; j < subset.length; j++) {
        // 1 chamada O(1); até C(k,2) chamadas no pior caso
        if (!graph.hasEdge(subset[i], subset[j])) return false;
      }
    }
    return true;
  }

  /**
   * Gerador lazy de todas as combinações de tamanho k do array arr.
   * Usa backtracking recursivo; aloca apenas o caminho atual na pilha.
   *
   * Complexidade: O(C(n,k) · k) para gerar todas as combinações.
   *   - Loop externo: (n-k+1) iterações no nível atual de recursão.
   *   - Chamada recursiva: produz C(n-i-1, k-1) valores para cada i;
   *     somando sobre todos os i, o total de yields é C(n,k).
   *   - Cada yield aloca um array de tamanho k: O(k) por combinação gerada.
   *   - Espaço na pilha de recursão: O(k) (profundidade máxima = k).
   */
  static *combinations(arr: number[], k: number): Generator<number[]> {
    if (k === 0) {
      yield [];
      return;
    }
    // (n-k+1) iterações no nível atual
    for (let i = 0; i <= arr.length - k; i++) {
      // C(n-i-1, k-1) valores por i; total C(n,k) yields
      for (const rest of CliqueSolver.combinations(arr.slice(i + 1), k - 1)) {
        // 1 alocação O(k) por yield
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
   * Complexidade: O(2^n · n²) no pior caso (grafo sem clique ≥ 2).
   *   - Loop externo: n iterações (k de n até 1).
   *   - combinations: gera C(n,k) subconjuntos por k; somando sobre k=1..n: Σ C(n,k) = 2^n - 1 subconjuntos.
   *   - isClique: O(k²) por subconjunto; dominado por k=n → O(n²) no pior caso por chamada.
   *   - Total: O(2^n · n²).
   *
   * @returns clique máximo encontrado e total de subconjuntos testados
   */
  solve(graph: Graph): SolveResult {
    const verts = graph.vertices;
    const n = verts.length;
    let combinationsTested = 0;
    // n iterações no pior caso
    for (let k = n; k >= 1; k--) {
      // C(n,k) subconjuntos por k; ≤ 2^n-1 total
      for (const subset of CliqueSolver.combinations(verts, k)) {
        // O(k²) por chamada; ≤ 2^n-1 chamadas no pior caso
        combinationsTested++;
        if (CliqueSolver.isClique(graph, subset)) {
          return { clique: subset, combinationsTested };
        }
      }
    }
    return { clique: [], combinationsTested };
  }
}
