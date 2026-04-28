# Implementação do Problema do Clique

> Documentação técnica para diferentes perfis de leitores.

---

## Índice

1. [Para Gestores e Stakeholders](#1-para-gestores-e-stakeholders)
2. [Para Desenvolvedores](#2-para-desenvolvedores)
3. [Para Pesquisadores e Acadêmicos](#3-para-pesquisadores-e-acadêmicos)

---

## 1. Para Gestores e Stakeholders

### O que é e por que importa?

Imagine que você quer lançar uma campanha viral nas redes sociais sobre cinco temas diferentes: animais, esportes, tecnologia, música e gastronomia. Para que uma campanha "pegue fogo" organicamente, você precisa encontrar um **grupo de pessoas que se conhecem entre si e têm interesse no mesmo tema**. Quanto maior esse grupo e quanto mais seguidores eles têm, maior o potencial de propagação.

O **Problema do Clique** é exatamente a ferramenta matemática que encontra esse grupo ideal. Um _clique_ em um grafo é um conjunto de pessoas em que **todo mundo se conecta com todo mundo** — o núcleo mais coeso possível.

### O que o sistema faz?

1. **Gera uma rede de usuários** com interesses e histórico de interações simulados
2. **Calcula o quanto as redes de cada par de usuários se conectam** — o _score de interação_
3. **Monta um grafo por categoria**: liga dois usuários se ambos têm interesse no tema e suas redes interagem acima de um limiar
4. **Encontra o maior grupo coeso** (maior clique) em cada categoria
5. **Rankeia as categorias** pela qualidade do grupo encontrado — tamanho do clique e, em empate, pelo alcance total de seguidores

### O que é o score de interação?

O score de interação entre dois usuários A e B quantifica **o quanto a audiência de um se engaja com o conteúdo do outro**. Não basta que A e B se sigam mutuamente — o que importa para propagação viral é que os *seguidores* de A curtam, comentem e compartilhem os posts de B (e vice-versa). Quando isso acontece, seedar os dois ao mesmo tempo ativa uma comunidade já conectada, multiplicando o alcance orgânico.

Em termos práticos, esse score poderia ser calculado como:

> (interações dos seguidores de A com posts de B + interações dos seguidores de B com posts de A) ÷ total de interações na janela de observação

Quanto mais alto o score, mais as redes dos dois usuários já se conversam — e mais eficiente é incluir ambos no mesmo grupo de seed viral.

### Como interpretar o relatório?

O relatório HTML gerado (`report.html`) mostra:

| Elemento            | Significado                                       |
| ------------------- | ------------------------------------------------- |
| **Clique Máximo**   | Número de pessoas no grupo mais coeso             |
| **Alcance Total**   | Soma dos seguidores de todos os membros do clique |
| **Grafo colorido**  | Nós laranja = no clique; azul = fora do clique    |
| **Arestas laranja** | Conexões dentro do clique                         |
| **Rank 1**          | Melhor categoria para seed viral                  |

### Limitação importante

O algoritmo utilizado é **força bruta** — adequado para demonstração com instâncias pequenas. Em redes reais com milhares de usuários, seriam necessárias heurísticas (algoritmos aproximados) por limitações computacionais fundamentais da teoria da computação (NP-Completude).

---

## 2. Para Desenvolvedores

### Arquitetura do Projeto

O projeto adota **arquitetura de classes** com separação clara de responsabilidades. Todas as interfaces de domínio estão centralizadas em `models.ts`; cada módulo exporta uma única classe com helpers como métodos privados.

```
src/
├── models.ts      Todas as interfaces (User, ProblemInstance, GeneratorOptions,
│                  CategoryResult, GraphNodeData, GraphEdgeData)
├── graph.ts       class Graph — ADT de grafo não-direcionado
├── generator.ts   class InstanceGenerator — geração aleatória reprodutível
├── solver.ts      class CliqueSolver — força bruta com early exit
├── analyzer.ts    class ViralAnalyzer — orquestra grafos, solver e ranking
├── report.ts      class ReportGenerator — gera o relatório HTML
└── main.ts        apenas main() — instancia e encadeia as classes
```

Grafo de dependências (sem ciclos):

```
models  ←  graph  ←  solver
   ↑                    ↑
generator            analyzer  ←  report
                         ↑
                       main
```

Comandos:

```bash
npm install       # instala typescript, tsx e @types/node
npm start         # executa src/main.ts → terminal + report.html
npm run build     # compila TypeScript para dist/
```

### Interfaces de Domínio (`models.ts`)

Todas as interfaces do projeto vivem em `models.ts` e são importadas pelos demais módulos:

```typescript
interface User            { id, name, reach, preferences }
interface ProblemInstance { users, categories, interactions, threshold }
interface GeneratorOptions{ numUsers, categories, prefProb, threshold, ... }
interface CategoryResult  { category, graphVertices, graphEdgeCount,
                            clique, cliqueSize, aggregateReach,
                            cliqueMembers, nodes, edges }
interface GraphNodeData   { id, label, inClique }
interface GraphEdgeData   { from, to, inClique }
```

A chave da matriz de interações usa sempre `"min_id,max_id"` para garantir acesso simétrico sem duplicar dados (aresta {u,v} = aresta {v,u}).

### Classe `Graph` (`graph.ts`)

Representação por **lista de adjacência** usando `Map<number, Set<number>>`:

```
adjacency:
  0 → { 2, 4, 7 }
  2 → { 0, 4 }
  4 → { 0, 2, 7 }
  7 → { 0, 4 }
```

| Método | Complexidade | Descrição |
| --- | --- | --- |
| `addEdge(u, v)` | O(1) amortizado | Insere ambas as direções; idempotente |
| `hasEdge(u, v)` | O(1) amortizado | Lookup em Set |
| `getEdges()` | O(V + E) | Emite cada aresta uma vez (`u < v`) |

Preferiu-se lista de adjacência em vez de matriz por economia de memória em grafos esparsos.

### Classe `InstanceGenerator` (`generator.ts`)

Encapsula o PRNG e a lógica de geração. Helpers são `private static`:

```typescript
class InstanceGenerator {
  private static rand(seed)  // Mulberry32 — closure com estado interno
  private static key(a, b)   // "min,max" — chave canônica de interação
  generate(options?)          // ponto de entrada público
}
```

O método `rand` implementa **Mulberry32**, um PRNG de 32 bits com seed que não altera o estado global (`Math.random`), garantindo que a mesma seed produz sempre a mesma instância:

```typescript
private static rand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Classe `CliqueSolver` (`solver.ts`)

```typescript
class CliqueSolver {
  private static isClique(graph, subset)      // O(k²)
  private static *combinations(arr, k)        // gerador lazy, O(k) espaço
  solve(graph): number[]                      // O(2^n · n²) com early exit
}
```

O método `solve` itera os subconjuntos em ordem decrescente de tamanho (k = n → 1) e retorna ao encontrar o primeiro clique, sem examinar subconjuntos menores.

### Classe `ViralAnalyzer` (`analyzer.ts`)

Orquestra toda a análise. Recebe uma `ProblemInstance` e retorna `CategoryResult[]` rankeados:

```typescript
class ViralAnalyzer {
  private static key(a, b)                    // chave de interação (privada)
  private static formatReach(n)               // formatação pt-BR
  private buildCategoryGraph(instance, cat)   // constrói G_a
  private aggregateReach(instance, clique)    // soma de reach dos membros
  private rankCategories(results)             // ordena DESC por clique e reach
  analyze(instance): CategoryResult[]         // fluxo completo
  printResults(instance, ranked): void        // saída no terminal
}
```

### Fluxo de Execução

```
new InstanceGenerator().generate({ seed: 42 })
        │
        ▼
  ProblemInstance
        │
        │  analyzer.analyze(instance)
        │    para cada categoria a ∈ A:
        ▼
  buildCategoryGraph(instance, a)
        │  V_a = {u | preferences[a] == true}
        │  E_a = {(u,v) | interactions["u,v"] ≥ threshold}
        ▼
  new Graph(V_a, E_a)
        │
        ▼
  solver.solve(graph) ──→ number[]
        │
        ▼
  CategoryResult[]
        │
        ▼
  rankCategories()  →  sort por (cliqueSize DESC, aggregateReach DESC)
        │
        ├── analyzer.printResults()  →  saída no terminal
        │
        └── new ReportGenerator().generate()  →  report.html
```

### Classe `ReportGenerator` (`report.ts`)

Todos os helpers de construção HTML são `private static`. O único ponto de entrada público é `generate()`:

```typescript
class ReportGenerator {
  private static slugify(s)                         // ID seguro para HTML
  private static fmtN(n)                            // formatação pt-BR
  private static capitalize(s)                      // primeira letra maiúscula
  private static buildNetworkFn(r)                  // init vis.js (lazy)
  private static buildCategorySection(r, rank)      // HTML de uma categoria
  private static buildUsersTable(instance, ids)     // tabela de usuários
  generate(instance, ranked, outputPath?)           // gera e salva o HTML
}
```

Gera um HTML autocontido com navegação por abas usando dois CDNs:

| Biblioteca | Uso |
| --- | --- |
| **vis.js Network** | Grafos interativos por categoria (física de partículas, drag & drop) |
| **Chart.js** | Gráficos de barras comparando clique size e alcance |

As redes vis.js são inicializadas de forma **lazy** (na primeira exibição da aba) para evitar problemas de renderização em contêineres ocultos.

### `main.ts` — apenas `main()`

```typescript
function main(): void {
  const instance = new InstanceGenerator().generate({ seed: 42 });
  const analyzer = new ViralAnalyzer();
  const ranked   = analyzer.analyze(instance);
  analyzer.printResults(instance, ranked);
  new ReportGenerator().generate(instance, ranked);
}
```

### Como Estender

- **Novo algoritmo**: adicione um método `solve(graph): number[]` em `CliqueSolver` (ex.: Bron-Kerbosch) e substitua a chamada em `ViralAnalyzer.analyze()`
- **Nova interface**: declare em `models.ts` e importe nos módulos que precisarem
- **Novos parâmetros de geração**: expanda `GeneratorOptions` em `models.ts` e implemente em `InstanceGenerator.generate()`
- **Frontend web**: todas as classes e interfaces são reutilizáveis em Vue 3 — basta importar os módulos

---

## 3. Para Pesquisadores e Acadêmicos

### Definição Formal

Seja $G = (V, E)$ um grafo não-direcionado. Um **clique** é um subconjunto $C \subseteq V$ tal que:

$$\forall u, v \in C,\ u \neq v \Rightarrow (u, v) \in E$$

O **problema de otimização** consiste em encontrar o maior clique $C^*$:

$$C^* = \arg\max_{C \subseteq V,\ C \text{ é clique}} |C|$$

### Instância de Aplicação

Para cada categoria $a \in A$, define-se o grafo $G_a = (V_a, E_a)$ onde:

- $V_a = \{u \in U \mid \text{preferences}[u][a] = \top\}$
- $(u, v) \in E_a \iff \text{interactions}[\min(u,v), \max(u,v)] \geq \tau$

O objetivo é encontrar $C^*_a = \arg\max_{C \subseteq V_a,\ C \text{ é clique}} |C|$ para cada $a$.

O ranking final ordena as categorias por $|C^*_a|$ com desempate por $\sum_{u \in C^*_a} \text{reach}(u)$.

### Análise de Complexidade do Algoritmo Baseline

O algoritmo `bruteForceMaxClique` usa enumeração de combinações em ordem decrescente de tamanho:

**Pior caso**: todos os subconjuntos são examinados.

$$T(n) = \sum_{k=1}^{n} \binom{n}{k} \cdot O(k^2) = O\!\left(2^n \cdot n^2\right)$$

**Early exit**: ao encontrar o primeiro clique de tamanho $k$, o algoritmo retorna imediatamente. Em grafos com cliques grandes, isso reduz significativamente o tempo prático.

**Espaço**: $O(n)$ — a geração de combinações usa backtracking recursivo com profundidade $k$, não aloca todas as combinações simultaneamente.

### NP-Completude

O problema do clique é **NP-completo** (Karp, 1972). A prova clássica é feita por redução polinomial de 3-SAT para CLIQUE, demonstrando que:

1. **CLIQUE ∈ NP**: dado um subconjunto $C$, verificar se é clique leva tempo $O(|C|^2)$
2. **CLIQUE é NP-difícil**: qualquer instância de 3-CNF-SAT com $k$ cláusulas pode ser transformada em um grafo $G$ em tempo polinomial tal que a fórmula é satisfatível $\iff$ $G$ possui clique de tamanho $k$

A demonstração completa está no Teorema 34.11 do CLRS 4ª edição (pp. 1081–1084), documentada em `.docs/click-problem-cormen.md`.

### Modelo de Geração de Instâncias

O gerador usa o modelo de **grafo aleatório de Erdős–Rényi** $G(n, p)$ adaptado:

- Cada par de usuários elegíveis em $V_a$ recebe um score $s \sim \text{Uniform}(0, 1)$
- Uma aresta $(u,v) \in E_a$ é criada se e somente se $s \geq \tau$
- A probabilidade de cada aresta é $p = 1 - \tau$

Para $\tau = 0.6$, temos $p = 0.4$. A esperança do número de arestas em $G_a$ é $\binom{|V_a|}{2} \cdot 0.4$.

A esperança do tamanho do maior clique em $G(n, 0.4)$ é aproximadamente $2\log_{1/0.4}(n) \approx 2.06\log(n)$, compatível com os resultados observados para $n \leq 15$.

### Referências

- Cormen et al. _Introduction to Algorithms_, 4ª ed. MIT Press, 2022. Seção 34.5.1.
- Karp, R. M. "Reducibility among combinatorial problems." 1972.
- Bron, C.; Kerbosch, J. "Finding all cliques of an undirected graph." _CACM_, 1973.
- Feige, U. et al. "Approximating clique is almost NP-complete." _FOCS_, 1991.
