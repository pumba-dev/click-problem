/** Grafo não-direcionado representado por listas de adjacência (sets). */
export class Graph {
  private adjacency: Map<number, Set<number>>;
  private _edgeCount = 0;

  /**
   * Cria um grafo com os vértices fornecidos e sem arestas.
   * @param vertices - IDs dos vértices a incluir no grafo
   */
  constructor(vertices: number[]) {
    this.adjacency = new Map(vertices.map(v => [v, new Set<number>()]));
  }

  /**
   * Adiciona uma aresta não-direcionada entre u e v.
   * Idempotente: adicionar a mesma aresta duas vezes não tem efeito.
   * Vértices inexistentes são ignorados silenciosamente.
   */
  addEdge(u: number, v: number): void {
    if (!this.adjacency.has(u) || !this.adjacency.has(v)) return;
    if (!this.adjacency.get(u)!.has(v)) {
      this.adjacency.get(u)!.add(v);
      this.adjacency.get(v)!.add(u);
      this._edgeCount++;
    }
  }

  /** Retorna `true` se existe aresta entre u e v. Complexidade: O(1) amortizado. */
  hasEdge(u: number, v: number): boolean {
    return this.adjacency.get(u)?.has(v) ?? false;
  }

  /** Retorna o conjunto de vizinhos do vértice u. */
  neighbors(u: number): Set<number> {
    return this.adjacency.get(u) ?? new Set();
  }

  /** Número de vértices no grafo. */
  get vertexCount(): number {
    return this.adjacency.size;
  }

  /** Número de arestas (cada aresta contada uma única vez). */
  get edgeCount(): number {
    return this._edgeCount;
  }

  /** Lista de IDs de todos os vértices. */
  get vertices(): number[] {
    return [...this.adjacency.keys()];
  }

  /**
   * Retorna todas as arestas como pares `[u, v]` com `u < v`.
   * Cada aresta é retornada exatamente uma vez.
   */
  getEdges(): Array<[number, number]> {
    const edges: Array<[number, number]> = [];
    for (const [u, neighbors] of this.adjacency) {
      for (const v of neighbors) {
        if (u < v) edges.push([u, v]);
      }
    }
    return edges;
  }
}
