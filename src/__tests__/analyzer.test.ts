import { describe, it, expect, vi } from "vitest";
import { ViralAnalyzer } from "../services/analyzer.js";
import type { ProblemInstance } from "../models/models.js";

function buildInteractions(
  userIds: number[],
  scores: Record<string, number> = {},
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const key = `${userIds[i]},${userIds[j]}`;
      map.set(key, scores[key] ?? 0);
    }
  }
  return map;
}

describe("ViralAnalyzer", () => {
  const analyzer = new ViralAnalyzer();

  describe("analyze — resultados por categoria", () => {
    it("retorna um resultado por categoria", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true, music: false } },
          { id: 1, name: "U2", reach: 2000, preferences: { tech: true, music: true } },
        ],
        categories: ["tech", "music"],
        interactions: buildInteractions([0, 1], { "0,1": 0.9 }),
        threshold: 0.6,
      };
      const results = analyzer.analyze(instance);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.category)).toEqual(
        expect.arrayContaining(["tech", "music"]),
      );
    });

    it("conta corretamente vértices elegíveis por categoria", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true } },
          { id: 2, name: "U3", reach: 1000, preferences: { tech: false } }, // excluído
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1, 2], { "0,1": 0.9 }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.graphVertices).toBe(2);
    });

    it("conta corretamente as arestas acima do threshold", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true } },
          { id: 2, name: "U3", reach: 1000, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1, 2], {
          "0,1": 0.9, // acima
          "0,2": 0.3, // abaixo — sem aresta
          "1,2": 0.7, // acima
        }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.graphEdgeCount).toBe(2);
    });

    it("exclui arestas com score exatamente igual ao threshold (requer >=)", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1], { "0,1": 0.6 }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.graphEdgeCount).toBe(1); // score >= threshold inclui o limiar
    });

    it("trata categoria sem usuários elegíveis — clique vazio", () => {
      const instance: ProblemInstance = {
        users: [{ id: 0, name: "U1", reach: 1000, preferences: { tech: false } }],
        categories: ["tech"],
        interactions: new Map(),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.clique).toEqual([]);
      expect(result.cliqueSize).toBe(0);
      expect(result.aggregateReach).toBe(0);
      expect(result.graphVertices).toBe(0);
    });
  });

  describe("analyze — ranking", () => {
    it("ordena por cliqueSize decrescente", () => {
      // tech: 3 usuários todos conectados (clique 3); music: 2 usuários (clique 2)
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true, music: false } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true, music: true } },
          { id: 2, name: "U3", reach: 1000, preferences: { tech: true, music: true } },
        ],
        categories: ["music", "tech"], // ordem invertida para testar o sort
        interactions: buildInteractions([0, 1, 2], {
          "0,1": 0.9,
          "0,2": 0.9,
          "1,2": 0.9,
        }),
        threshold: 0.6,
      };
      const results = analyzer.analyze(instance);
      expect(results[0].category).toBe("tech");
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].cliqueSize).toBeGreaterThanOrEqual(results[i + 1].cliqueSize);
      }
    });

    it("desempata por aggregateReach decrescente quando cliqueSize é igual", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 100, preferences: { tech: true, music: false } },
          { id: 1, name: "U2", reach: 5000, preferences: { tech: false, music: true } },
        ],
        categories: ["tech", "music"],
        interactions: buildInteractions([0, 1], { "0,1": 0.0 }),
        threshold: 0.6,
      };
      const results = analyzer.analyze(instance);
      expect(results[0].category).toBe("music");
      expect(results[0].aggregateReach).toBeGreaterThan(results[1].aggregateReach);
    });
  });

  describe("analyze — clique e alcance", () => {
    it("calcula aggregateReach como soma dos reaches dos membros do clique", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "Alice", reach: 300, preferences: { tech: true } },
          { id: 1, name: "Bob", reach: 700, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1], { "0,1": 0.9 }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.aggregateReach).toBe(1000);
    });

    it("popula cliqueMembers com name e reach corretos", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "Alice", reach: 500, preferences: { tech: true } },
          { id: 1, name: "Bob", reach: 800, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1], { "0,1": 0.9 }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.cliqueMembers).toHaveLength(2);
      expect(result.cliqueMembers).toEqual(
        expect.arrayContaining([
          { name: "Alice", reach: 500 },
          { name: "Bob", reach: 800 },
        ]),
      );
    });
  });

  describe("analyze — dados de visualização (nodes/edges)", () => {
    it("marca nós do clique com inClique=true e demais com false", () => {
      // U1-U2-U3 formam K3; U4 é isolado (score abaixo)
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true } },
          { id: 2, name: "U3", reach: 1000, preferences: { tech: true } },
          { id: 3, name: "U4", reach: 1000, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1, 2, 3], {
          "0,1": 0.9,
          "0,2": 0.9,
          "1,2": 0.9,
          "0,3": 0.1,
          "1,3": 0.1,
          "2,3": 0.1,
        }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      const cliqueNodes = result.nodes.filter((n) => n.inClique);
      const nonCliqueNodes = result.nodes.filter((n) => !n.inClique);
      expect(cliqueNodes).toHaveLength(3);
      expect(nonCliqueNodes).toHaveLength(1);
    });

    it("marca arestas do clique com inClique=true", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true } },
          { id: 2, name: "U3", reach: 1000, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1, 2], {
          "0,1": 0.9,
          "0,2": 0.9,
          "1,2": 0.9,
        }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.edges.every((e) => e.inClique)).toBe(true);
    });

    it("label dos nós contém o nome do usuário", () => {
      const instance: ProblemInstance = {
        users: [{ id: 0, name: "Alice", reach: 1000, preferences: { tech: true } }],
        categories: ["tech"],
        interactions: new Map(),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.nodes[0].label).toContain("Alice");
    });

    it("edges têm from e to corretos", () => {
      const instance: ProblemInstance = {
        users: [
          { id: 0, name: "U1", reach: 1000, preferences: { tech: true } },
          { id: 1, name: "U2", reach: 1000, preferences: { tech: true } },
        ],
        categories: ["tech"],
        interactions: buildInteractions([0, 1], { "0,1": 0.9 }),
        threshold: 0.6,
      };
      const [result] = analyzer.analyze(instance);
      expect(result.edges).toHaveLength(1);
      const [edge] = result.edges;
      expect([edge.from, edge.to]).toEqual(expect.arrayContaining([0, 1]));
    });
  });

  describe("printResults", () => {
    it("escreve no console.log sem lançar exceção", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const instance: ProblemInstance = {
        users: [{ id: 0, name: "U1", reach: 1000, preferences: { tech: true } }],
        categories: ["tech"],
        interactions: new Map(),
        threshold: 0.6,
      };
      const results = analyzer.analyze(instance);
      expect(() => analyzer.printResults(instance, results)).not.toThrow();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it("não lança exceção com lista de resultados vazia", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const instance: ProblemInstance = {
        users: [],
        categories: [],
        interactions: new Map(),
        threshold: 0.6,
      };
      expect(() => analyzer.printResults(instance, [])).not.toThrow();
      spy.mockRestore();
    });
  });
});
