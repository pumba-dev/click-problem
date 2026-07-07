import { describe, it, expect } from "vitest";
import { Graph } from "../models/graph.js";
import { BruteSolver } from "../services/solver.js";

function makeCompleteGraph(vertices: number[]): Graph {
  const g = new Graph(vertices);
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      g.addEdge(vertices[i], vertices[j]);
    }
  }
  return g;
}

describe("BruteSolver", () => {
  const solver = new BruteSolver();

  describe("isClique", () => {
    it("subconjunto vazio é clique", () => {
      const g = new Graph([0, 1]);
      expect(BruteSolver.isClique(g, [])).toBe(true);
    });

    it("vértice único é clique", () => {
      const g = new Graph([0]);
      expect(BruteSolver.isClique(g, [0])).toBe(true);
    });

    it("par de vértices conectados é clique", () => {
      const g = new Graph([0, 1]);
      g.addEdge(0, 1);
      expect(BruteSolver.isClique(g, [0, 1])).toBe(true);
    });

    it("par de vértices não conectados não é clique", () => {
      const g = new Graph([0, 1]);
      expect(BruteSolver.isClique(g, [0, 1])).toBe(false);
    });

    it("K3 completo é clique", () => {
      const g = makeCompleteGraph([0, 1, 2]);
      expect(BruteSolver.isClique(g, [0, 1, 2])).toBe(true);
    });

    it("triângulo com uma aresta faltando não é clique", () => {
      const g = new Graph([0, 1, 2]);
      g.addEdge(0, 1);
      g.addEdge(0, 2);
      // aresta 1-2 ausente
      expect(BruteSolver.isClique(g, [0, 1, 2])).toBe(false);
    });
  });

  describe("combinations", () => {
    it("k=0 gera exatamente uma combinação vazia", () => {
      const result = [...BruteSolver.combinations([1, 2, 3], 0)];
      expect(result).toEqual([[]]);
    });

    it("k=1 gera um subarray singleton por elemento", () => {
      const result = [...BruteSolver.combinations([1, 2, 3], 1)];
      expect(result).toEqual([[1], [2], [3]]);
    });

    it("k=2 gera C(3,2)=3 pares", () => {
      const result = [...BruteSolver.combinations([0, 1, 2], 2)];
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          [0, 1],
          [0, 2],
          [1, 2],
        ]),
      );
    });

    it("k igual ao tamanho do array gera um único subconjunto completo", () => {
      const result = [...BruteSolver.combinations([4, 5, 6], 3)];
      expect(result).toEqual([[4, 5, 6]]);
    });

    it("k maior que o tamanho do array não gera nenhuma combinação", () => {
      const result = [...BruteSolver.combinations([1, 2], 3)];
      expect(result).toHaveLength(0);
    });

    it("gera C(5,3)=10 combinações", () => {
      const k = 3;
      const result = [...BruteSolver.combinations([0, 1, 2, 3, 4], k)];
      expect(result).toHaveLength(10);
    });

    it("cada combinação tem exatamente k elementos", () => {
      for (const combo of BruteSolver.combinations([0, 1, 2, 3], 2)) {
        expect(combo).toHaveLength(2);
      }
    });

    it("elementos dentro de cada combinação mantêm a ordem relativa do array original", () => {
      for (const combo of BruteSolver.combinations([0, 1, 2, 3], 3)) {
        for (let i = 0; i < combo.length - 1; i++) {
          expect(combo[i]).toBeLessThan(combo[i + 1]);
        }
      }
    });
  });

  describe("solve", () => {
    it("retorna array vazio para grafo sem vértices", () => {
      expect(solver.solve(new Graph([])).clique).toEqual([]);
    });

    it("retorna o único vértice para grafo com um vértice", () => {
      const g = new Graph([5]);
      expect(solver.solve(g).clique).toEqual([5]);
    });

    it("retorna um vértice para grafo sem arestas", () => {
      const g = new Graph([1, 2, 3]);
      const { clique } = solver.solve(g);
      expect(clique).toHaveLength(1);
      expect([1, 2, 3]).toContain(clique[0]);
    });

    it("encontra clique de tamanho 2 para grafo com uma aresta", () => {
      const g = new Graph([1, 2, 3]);
      g.addEdge(1, 2);
      const { clique } = solver.solve(g);
      expect(clique).toHaveLength(2);
      expect(clique).toEqual(expect.arrayContaining([1, 2]));
    });

    it("encontra K3 completo", () => {
      const g = makeCompleteGraph([0, 1, 2]);
      const { clique } = solver.solve(g);
      expect(clique).toHaveLength(3);
      expect(clique).toEqual(expect.arrayContaining([0, 1, 2]));
    });

    it("encontra todos os 4 vértices em K4", () => {
      const g = makeCompleteGraph([0, 1, 2, 3]);
      expect(solver.solve(g).clique).toHaveLength(4);
    });

    it("encontra todos os 5 vértices em K5", () => {
      const g = makeCompleteGraph([0, 1, 2, 3, 4]);
      expect(solver.solve(g).clique).toHaveLength(5);
    });

    it("escolhe o maior clique quando há múltiplos cliques", () => {
      // Triângulo 0-1-2 (clique 3) + vértice pendente 3 conectado só a 0
      const g = new Graph([0, 1, 2, 3]);
      g.addEdge(0, 1);
      g.addEdge(1, 2);
      g.addEdge(0, 2);
      g.addEdge(0, 3);
      const { clique } = solver.solve(g);
      expect(clique).toHaveLength(3);
      expect(clique).toEqual(expect.arrayContaining([0, 1, 2]));
    });

    it("escolhe o maior entre dois cliques disjuntos", () => {
      // Clique A: {0,1,2} (tamanho 3), Clique B: {3,4} (tamanho 2)
      const g = new Graph([0, 1, 2, 3, 4]);
      g.addEdge(0, 1);
      g.addEdge(1, 2);
      g.addEdge(0, 2);
      g.addEdge(3, 4);
      const { clique } = solver.solve(g);
      expect(clique).toHaveLength(3);
      expect(clique).toEqual(expect.arrayContaining([0, 1, 2]));
    });

    it("resultado é sempre um clique válido — verificado via BruteSolver.isClique", () => {
      const g = new Graph([0, 1, 2, 3, 4]);
      g.addEdge(0, 1);
      g.addEdge(0, 2);
      g.addEdge(1, 2);
      g.addEdge(2, 3);
      g.addEdge(3, 4);
      const { clique } = solver.solve(g);
      expect(BruteSolver.isClique(g, clique)).toBe(true);
    });

    it("grafo estrela: clique máximo tem tamanho 2", () => {
      // 0 conectado a 1,2,3 mas 1,2,3 não conectados entre si
      const g = new Graph([0, 1, 2, 3]);
      g.addEdge(0, 1);
      g.addEdge(0, 2);
      g.addEdge(0, 3);
      expect(solver.solve(g).clique).toHaveLength(2);
    });

    it("lida corretamente com IDs de vértices não contíguos", () => {
      const g = makeCompleteGraph([10, 20, 30]);
      const { clique } = solver.solve(g);
      expect(clique).toHaveLength(3);
      expect(clique).toEqual(expect.arrayContaining([10, 20, 30]));
    });

    it("combinationsTested é 0 para grafo sem vértices", () => {
      expect(solver.solve(new Graph([])).combinationsTested).toBe(0);
    });

    it("combinationsTested >= 1 para grafo não-vazio", () => {
      const { combinationsTested } = solver.solve(makeCompleteGraph([0, 1, 2]));
      expect(combinationsTested).toBeGreaterThanOrEqual(1);
    });
  });
});
