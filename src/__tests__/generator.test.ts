import { describe, it, expect } from "vitest";
import { InstanceGenerator } from "../services/generator.js";
import type { GeneratorOptions } from "../models/models.js";

const baseOptions: GeneratorOptions = {
  seed: 42,
  numUsers: 10,
  categories: ["tech", "music"],
  prefProb: 0.5,
  threshold: 0.6,
  reachLow: 1_000,
  reachHigh: 10_000,
};

describe("InstanceGenerator", () => {
  const generator = new InstanceGenerator();

  describe("generate — estrutura dos usuários", () => {
    it("produz o número correto de usuários", () => {
      const instance = generator.generate(baseOptions);
      expect(instance.users).toHaveLength(10);
    });

    it("atribui ids sequenciais a partir de 0", () => {
      const instance = generator.generate(baseOptions);
      instance.users.forEach((u, i) => expect(u.id).toBe(i));
    });

    it("atribui nomes no formato 'User N' (1-indexado)", () => {
      const instance = generator.generate(baseOptions);
      instance.users.forEach((u, i) => expect(u.name).toBe(`User ${i + 1}`));
    });

    it("atribui reach dentro de [reachLow, reachHigh)", () => {
      const instance = generator.generate(baseOptions);
      instance.users.forEach((u) => {
        expect(u.reach).toBeGreaterThanOrEqual(1_000);
        expect(u.reach).toBeLessThan(10_000);
      });
    });

    it("atribui reach como inteiro", () => {
      const instance = generator.generate(baseOptions);
      instance.users.forEach((u) => expect(Number.isInteger(u.reach)).toBe(true));
    });

    it("atribui preferências booleanas para cada categoria", () => {
      const instance = generator.generate(baseOptions);
      instance.users.forEach((u) => {
        expect(typeof u.preferences["tech"]).toBe("boolean");
        expect(typeof u.preferences["music"]).toBe("boolean");
      });
    });

    it("cria preferências apenas para as categorias definidas (sem extras)", () => {
      const instance = generator.generate(baseOptions);
      instance.users.forEach((u) => {
        expect(Object.keys(u.preferences)).toEqual(expect.arrayContaining(["tech", "music"]));
        expect(Object.keys(u.preferences)).toHaveLength(2);
      });
    });
  });

  describe("generate — instância retornada", () => {
    it("preserva categories na instância de saída", () => {
      const instance = generator.generate(baseOptions);
      expect(instance.categories).toEqual(["tech", "music"]);
    });

    it("preserva threshold na instância de saída", () => {
      const instance = generator.generate(baseOptions);
      expect(instance.threshold).toBe(0.6);
    });

    it("gera exatamente n*(n-1)/2 pares de interação", () => {
      const instance = generator.generate(baseOptions);
      const expected = (10 * 9) / 2;
      expect(instance.interactions.size).toBe(expected);
    });

    it("scores de interação estão no intervalo [0, 1)", () => {
      const instance = generator.generate(baseOptions);
      for (const score of instance.interactions.values()) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThan(1);
      }
    });

    it("chaves do mapa de interações seguem o formato 'min,max'", () => {
      const instance = generator.generate(baseOptions);
      for (const key of instance.interactions.keys()) {
        const [a, b] = key.split(",").map(Number);
        expect(a).toBeLessThan(b);
      }
    });
  });

  describe("generate — reprodutibilidade", () => {
    it("mesma seed produz instâncias idênticas", () => {
      const a = generator.generate(baseOptions);
      const b = generator.generate(baseOptions);
      expect(a.users).toEqual(b.users);
      expect([...a.interactions.entries()]).toEqual([...b.interactions.entries()]);
    });

    it("seeds diferentes produzem instâncias distintas", () => {
      const a = generator.generate({ ...baseOptions, seed: 1 });
      const b = generator.generate({ ...baseOptions, seed: 2 });
      expect(a.users.map((u) => u.reach)).not.toEqual(b.users.map((u) => u.reach));
    });

    it("calls independentes com a mesma seed não interferem entre si", () => {
      const first = generator.generate(baseOptions);
      generator.generate({ ...baseOptions, seed: 99 }); // call intermediária
      const third = generator.generate(baseOptions);
      expect(first.users).toEqual(third.users);
    });
  });

  describe("generate — variações de configuração", () => {
    it("gera instância com uma única categoria", () => {
      const instance = generator.generate({ ...baseOptions, categories: ["animals"] });
      expect(instance.categories).toEqual(["animals"]);
      instance.users.forEach((u) => expect(Object.keys(u.preferences)).toEqual(["animals"]));
    });

    it("gera instância com numUsers = 1 (sem interações)", () => {
      const instance = generator.generate({ ...baseOptions, numUsers: 1 });
      expect(instance.users).toHaveLength(1);
      expect(instance.interactions.size).toBe(0);
    });

    it("gera instância com numUsers = 2 (exatamente 1 interação)", () => {
      const instance = generator.generate({ ...baseOptions, numUsers: 2 });
      expect(instance.interactions.size).toBe(1);
    });

    it("prefProb = 1.0 faz todos os usuários gostarem de todas as categorias", () => {
      const instance = generator.generate({ ...baseOptions, prefProb: 1.0 });
      instance.users.forEach((u) =>
        Object.values(u.preferences).forEach((v) => expect(v).toBe(true)),
      );
    });

    it("prefProb = 0.0 faz nenhum usuário gostar de qualquer categoria", () => {
      const instance = generator.generate({ ...baseOptions, prefProb: 0.0 });
      instance.users.forEach((u) =>
        Object.values(u.preferences).forEach((v) => expect(v).toBe(false)),
      );
    });
  });
});
