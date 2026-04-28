import type { ProblemInstance, User, GeneratorOptions } from "./models.js";

/**
 * Gerador de instâncias aleatórias reprodutíveis do problema do clique.
 *
 * Encapsula o PRNG e a lógica de construção da instância.
 * Uso: `new InstanceGenerator().generate({ seed: 42 })`.
 */
export class InstanceGenerator {
  /**
   * PRNG Mulberry32 — retorna uma closure que produz floats em [0, 1) a cada chamada.
   * Não altera o estado global (`Math.random`), garantindo isolamento entre instâncias.
   */
  private static rand(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Gera a chave canônica para o score de interação entre os usuários a e b.
   * Usa sempre `"min,max"` para garantir simetria: `key(u,v) === key(v,u)`.
   */
  private static key(a: number, b: number): string {
    return `${Math.min(a, b)},${Math.max(a, b)}`;
  }

  /**
   * Gera uma instância aleatória e reprodutível do problema do clique.
   *
   * Processo:
   * 1. Cria `numUsers` usuários com alcance uniforme em `[reachLow, reachHigh]`
   * 2. Atribui preferências binárias a cada categoria com probabilidade `prefProb`
   * 3. Gera scores de interação `uniform(0, 1)` para todos os pares `(i, j)` com `i < j`
   *
   * Os grafos G_a são construídos por `ViralAnalyzer` usando o `threshold`
   * para decidir quais pares formam arestas.
   */
  generate(options: GeneratorOptions = {}): ProblemInstance {
    const {
      numUsers = 30,
      categories = ["animals", "sports", "technology", "music", "food"],
      prefProb = 0.5,
      threshold = 0.6,
      reachLow = 1_000,
      reachHigh = 500_000,
      seed = 42,
    } = options;

    const rand = InstanceGenerator.rand(seed);

    const users: User[] = Array.from({ length: numUsers }, (_, i) => ({
      id: i,
      name: `User ${i + 1}`,
      reach: Math.floor(rand() * (reachHigh - reachLow)) + reachLow,
      preferences: Object.fromEntries(categories.map((c) => [c, rand() < prefProb])),
    }));

    const interactions = new Map<string, number>();
    for (let i = 0; i < numUsers; i++) {
      for (let j = i + 1; j < numUsers; j++) {
        interactions.set(InstanceGenerator.key(i, j), rand());
      }
    }

    return { users, categories, interactions, threshold };
  }
}
