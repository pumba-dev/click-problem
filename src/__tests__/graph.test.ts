import { describe, it, expect } from "vitest";
import { Graph } from "../services/graph.js";

describe("Graph", () => {
  describe("constructor", () => {
    it("creates graph with given vertices and no edges", () => {
      const g = new Graph([1, 2, 3]);
      expect(g.vertexCount).toBe(3);
      expect(g.edgeCount).toBe(0);
      expect(g.vertices).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it("creates empty graph when no vertices given", () => {
      const g = new Graph([]);
      expect(g.vertexCount).toBe(0);
      expect(g.edgeCount).toBe(0);
      expect(g.vertices).toEqual([]);
    });
  });

  describe("addEdge", () => {
    it("adds an undirected edge between two vertices", () => {
      const g = new Graph([1, 2]);
      g.addEdge(1, 2);
      expect(g.hasEdge(1, 2)).toBe(true);
      expect(g.hasEdge(2, 1)).toBe(true);
      expect(g.edgeCount).toBe(1);
    });

    it("is idempotent — adding the same edge twice keeps edgeCount at 1", () => {
      const g = new Graph([1, 2]);
      g.addEdge(1, 2);
      g.addEdge(1, 2);
      expect(g.edgeCount).toBe(1);
    });

    it("ignores edges where a vertex does not exist in the graph", () => {
      const g = new Graph([1, 2]);
      g.addEdge(1, 99);
      expect(g.edgeCount).toBe(0);
      expect(g.hasEdge(1, 99)).toBe(false);
    });

    it("ignores edges where both vertices are absent", () => {
      const g = new Graph([1, 2]);
      g.addEdge(10, 20);
      expect(g.edgeCount).toBe(0);
    });
  });

  describe("hasEdge", () => {
    it("returns false when no edge exists between two valid vertices", () => {
      const g = new Graph([1, 2]);
      expect(g.hasEdge(1, 2)).toBe(false);
    });

    it("returns true after the edge is added", () => {
      const g = new Graph([1, 2]);
      g.addEdge(1, 2);
      expect(g.hasEdge(1, 2)).toBe(true);
    });

    it("returns false for non-existent vertices", () => {
      const g = new Graph([1]);
      expect(g.hasEdge(1, 99)).toBe(false);
    });
  });

  describe("neighbors", () => {
    it("returns empty set when vertex has no neighbors", () => {
      const g = new Graph([1, 2]);
      expect(g.neighbors(1).size).toBe(0);
    });

    it("returns correct neighbor set after adding edges", () => {
      const g = new Graph([1, 2, 3]);
      g.addEdge(1, 2);
      g.addEdge(1, 3);
      expect(g.neighbors(1)).toEqual(new Set([2, 3]));
      expect(g.neighbors(2)).toEqual(new Set([1]));
    });

    it("returns empty set for a vertex that does not exist", () => {
      const g = new Graph([1]);
      expect(g.neighbors(99).size).toBe(0);
    });
  });

  describe("vertexCount", () => {
    it("returns 0 for empty graph", () => {
      expect(new Graph([]).vertexCount).toBe(0);
    });

    it("returns correct count for non-empty graph", () => {
      expect(new Graph([1, 2, 3]).vertexCount).toBe(3);
    });
  });

  describe("edgeCount", () => {
    it("increments correctly as distinct edges are added", () => {
      const g = new Graph([1, 2, 3]);
      expect(g.edgeCount).toBe(0);
      g.addEdge(1, 2);
      expect(g.edgeCount).toBe(1);
      g.addEdge(2, 3);
      expect(g.edgeCount).toBe(2);
      g.addEdge(1, 3);
      expect(g.edgeCount).toBe(3);
    });

    it("does not increment on duplicate edges", () => {
      const g = new Graph([1, 2]);
      g.addEdge(1, 2);
      g.addEdge(1, 2);
      g.addEdge(2, 1);
      expect(g.edgeCount).toBe(1);
    });
  });

  describe("vertices", () => {
    it("returns all vertex IDs", () => {
      const g = new Graph([10, 20, 30]);
      expect(g.vertices).toHaveLength(3);
      expect(g.vertices).toEqual(expect.arrayContaining([10, 20, 30]));
    });

    it("returns empty array for empty graph", () => {
      expect(new Graph([]).vertices).toEqual([]);
    });
  });

  describe("getEdges", () => {
    it("returns empty array when no edges exist", () => {
      const g = new Graph([1, 2]);
      expect(g.getEdges()).toEqual([]);
    });

    it("returns each edge exactly once", () => {
      const g = new Graph([1, 2, 3]);
      g.addEdge(1, 2);
      g.addEdge(2, 3);
      expect(g.getEdges()).toHaveLength(2);
    });

    it("returns edges with u < v (canonical order)", () => {
      const g = new Graph([1, 2, 3]);
      g.addEdge(2, 1);
      g.addEdge(3, 2);
      for (const [u, v] of g.getEdges()) {
        expect(u).toBeLessThan(v);
      }
    });

    it("contains all added edges", () => {
      const g = new Graph([1, 2, 3]);
      g.addEdge(1, 2);
      g.addEdge(2, 3);
      g.addEdge(1, 3);
      const edges = g.getEdges();
      expect(edges).toHaveLength(3);
      expect(edges).toEqual(expect.arrayContaining([[1, 2], [2, 3], [1, 3]]));
    });
  });
});
