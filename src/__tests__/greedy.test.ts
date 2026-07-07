import { describe, it, expect } from "vitest";
import { Graph } from "../models/graph.js";
import { BruteSolver, GreedySolver } from "../services/solver.js";

function makeCompleteGraph(vertices: number[]): Graph {
  const g = new Graph(vertices);
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      g.addEdge(vertices[i], vertices[j]);
    }
  }
  return g;
}

function makeGraph(vertices: number[], edges: Array<[number, number]>): Graph {
  const g = new Graph(vertices);
  for (const [u, v] of edges) g.addEdge(u, v);
  return g;
}

describe("GreedySolver", () => {
  const greedy = new GreedySolver();
  const baseline = new BruteSolver();

  it("expõe name = 'greedy' (contrato CliqueAlgorithm)", () => {
    expect(greedy.name).toBe("greedy");
  });

  describe("solve — casos-base", () => {
    it("grafo sem vértices → clique vazio, esforço 0", () => {
      const { clique, combinationsTested } = greedy.solve(new Graph([]));
      expect(clique).toEqual([]);
      expect(combinationsTested).toBe(0);
    });

    it("grafo com um vértice → esse vértice", () => {
      expect(greedy.solve(new Graph([5])).clique).toEqual([5]);
    });

    it("grafo sem arestas → clique de tamanho 1", () => {
      const { clique } = greedy.solve(new Graph([1, 2, 3]));
      expect(clique).toHaveLength(1);
      expect([1, 2, 3]).toContain(clique[0]);
    });

    it("uma aresta → clique de tamanho 2", () => {
      const g = makeGraph([1, 2, 3], [[1, 2]]);
      expect(greedy.solve(g).clique).toHaveLength(2);
    });
  });

  describe("solve — grafos completos (guloso é ótimo)", () => {
    for (const n of [2, 3, 4, 5, 6]) {
      it(`K${n} → clique de tamanho ${n}`, () => {
        const vertices = Array.from({ length: n }, (_, i) => i);
        expect(greedy.solve(makeCompleteGraph(vertices)).clique).toHaveLength(n);
      });
    }
  });

  describe("solve — validade e comparação com baseline", () => {
    const cases: Array<{ label: string; g: Graph }> = [
      {
        label: "triângulo + pendente",
        g: makeGraph([0, 1, 2, 3], [[0, 1], [1, 2], [0, 2], [0, 3]]),
      },
      {
        label: "dois cliques disjuntos",
        g: makeGraph([0, 1, 2, 3, 4], [[0, 1], [1, 2], [0, 2], [3, 4]]),
      },
      {
        label: "estrela",
        g: makeGraph([0, 1, 2, 3], [[0, 1], [0, 2], [0, 3]]),
      },
      {
        label: "ciclo C5 (sem triângulos)",
        g: makeGraph([0, 1, 2, 3, 4], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]),
      },
    ];

    for (const { label, g } of cases) {
      it(`resultado é clique válido — ${label}`, () => {
        expect(BruteSolver.isClique(g, greedy.solve(g).clique)).toBe(true);
      });

      it(`nunca supera o ótimo do baseline — ${label}`, () => {
        expect(greedy.solve(g).clique.length).toBeLessThanOrEqual(
          baseline.solve(g).clique.length,
        );
      });
    }
  });

  describe("solve — suboptimalidade demonstrável (trade-off qualidade × tempo)", () => {
    // Hub 3 (grau 4) é o de maior grau → escolhido primeiro pela heurística e
    // bloqueia o triângulo {0,1,2}. Ótimo = {0,1,2} (tamanho 3); o guloso fica
    // preso em {3,0} (tamanho 2). Este é o caso didático do artigo (atividade 7).
    const g = makeGraph(
      [0, 1, 2, 3, 4, 5, 6],
      [[0, 1], [0, 2], [1, 2], [3, 0], [3, 4], [3, 5], [3, 6]],
    );

    it("guloso fica abaixo do ótimo (2 < 3)", () => {
      expect(greedy.solve(g).clique).toHaveLength(2);
      expect(baseline.solve(g).clique).toHaveLength(3);
    });

    it("ainda assim retorna um clique válido", () => {
      expect(BruteSolver.isClique(g, greedy.solve(g).clique)).toBe(true);
    });
  });

  describe("solve — desempate determinístico por id (reprodutibilidade)", () => {
    // Dois triângulos disjuntos, {0,2,3} e {1,4,5}: TODOS os vértices têm grau 2
    // (empate total de grau). Os vértices são inseridos em ordem NÃO-crescente
    // ([5,4,3,2,1,0]) de propósito, para que o resultado dependa exclusivamente
    // do desempate por id — e não da ordem de inserção que um sort estável
    // preservaria. Com desempate por id crescente (greedy.ts), a heurística
    // percorre 0,1,2,3,4,5 e monta o triângulo de menores ids: {0,2,3}.
    // Remover o desempate (passa a valer a ordem de inserção → {1,4,5}) ou
    // invertê-lo para id decrescente (→ {1,4,5}) faria esta asserção falhar —
    // é o teste que blinda o pilar de reprodutibilidade do projeto.
    const g = makeGraph(
      [5, 4, 3, 2, 1, 0],
      [[0, 2], [0, 3], [2, 3], [1, 4], [1, 5], [4, 5]],
    );

    it("empate total de grau → escolhe o clique de menores ids: {0,2,3}", () => {
      const { clique } = greedy.solve(g);
      expect([...clique].sort((a, b) => a - b)).toEqual([0, 2, 3]);
    });

    it("o clique escolhido é válido e exclui o triângulo concorrente {1,4,5}", () => {
      const { clique } = greedy.solve(g);
      expect(BruteSolver.isClique(g, clique)).toBe(true);
      expect(clique).not.toContain(1);
    });
  });

  describe("solve — esforço computacional", () => {
    const g = makeGraph(
      [0, 1, 2, 3, 4],
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]],
    );

    it("combinationsTested = nº de vértices avaliados (= n)", () => {
      expect(greedy.solve(g).combinationsTested).toBe(g.vertexCount);
    });
  });
});
