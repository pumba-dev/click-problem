# Análise de complexidade — `BruteSolver.solve`

Referência para a subseção de complexidade do artigo e para os slides. Corresponde
ao código em `src/services/solver.ts` e ao documento `docs/complexidade_clique_solver.md`.

## O algoritmo

```ts
solve(graph: Graph): SolveResult {
  const verts = graph.vertices;
  const n = verts.length;
  let combinationsTested = 0;
  for (let k = n; k >= 1; k--) {                       // ordem decrescente de tamanho
    for (const subset of BruteSolver.combinations(verts, k)) {
      combinationsTested++;
      if (BruteSolver.isClique(graph, subset)) {      // primeiro clique = máximo
        return { clique: subset, combinationsTested };
      }
    }
  }
  return { clique: [], combinationsTested };
}
```

Estratégia: testar todos os subconjuntos de vértices, mas **do maior para o menor**.
Assim, o primeiro subconjunto que for clique é necessariamente o **máximo** — permite
*early exit*.

## Custo por parte

### Laço externo `for (k = n; k >= 1; k--)`
Percorre os tamanhos possíveis de clique: **n iterações**. Isolado seria linear, mas
controla o laço interno combinatório.

### Laço interno `combinations(verts, k)`
Gera todas as combinações de $k$ vértices dentre $n$: são $\binom{n}{k}$ subconjuntos.
- $k = n$ → 1 subconjunto
- $k = n-1$ → $n$ subconjuntos
- $k = n/2$ → máximo, $\binom{n}{n/2}$ (enorme)

Somando sobre todos os $k$: $\sum_{k=1}^{n}\binom{n}{k} = 2^n - 1$ subconjuntos não
vazios.

### Verificação `isClique(graph, subset)` — $O(k^2)$
Testa todos os pares do subconjunto: $\binom{k}{2} = \frac{k(k-1)}{2}$ pares, cada
`hasEdge` em $O(1)$ amortizado (lista de adjacências com `Set`). Custo $O(k^2)$.

## Complexidade total (pior caso)

$$T(n) = \sum_{k=1}^{n} \binom{n}{k}\, O(k^2).$$

Usando a identidade combinatória
$$\sum_{k=0}^{n}\binom{n}{k} k^2 = n(n+1)\,2^{\,n-2},$$
obtém-se
$$T(n) = O\!\left(n^2 \cdot 2^n\right).$$

## Melhor / pior / médio caso

| Caso | Situação | Custo |
|---|---|---|
| **Melhor** | Grafo completo: o único subconjunto com $k=n$ já é clique | $O(n^2)$ |
| **Pior** | Sem clique grande, ou clique máximo aparece tarde na enumeração | $O(n^2 \cdot 2^n)$ |
| **Médio** | A enumeração explode antes de atingir o máximo | Exponencial |

## Espaço

$O(n)$. O grafo já reside em memória; o algoritmo guarda apenas o subconjunto atual e
variáveis auxiliares. `combinations` é um **gerador lazy** (backtracking recursivo,
profundidade máxima $k$) — não materializa todas as combinações. Se fosse materializada
a lista inteira, o espaço explodiria.

## Efeito do early exit

O `return subset` interrompe assim que acha o primeiro clique. Benefício **prático**:
evita examinar subconjuntos menores depois de já ter o maior possível; termina cedo em
grafos densos. Mas **não altera a complexidade de pior caso**: em grafos esparsos ainda
pode ser preciso testar quase todos os subconjuntos antes de encontrar solução.

O campo `combinationsTested` do `SolveResult` mede exatamente esse esforço empírico por
categoria — útil para os gráficos de "esforço computacional" do relatório e para a
avaliação experimental (atividade 7).

## Frase-resumo para slide

> O algoritmo percorre todos os subconjuntos de vértices em ordem decrescente de
> tamanho e, para cada um, verifica se é clique — complexidade exponencial
> $O(n^2 \cdot 2^n)$ no pior caso. Correto e simples, porém inviável para grafos
> grandes: adequado a fins didáticos e instâncias pequenas ($n \lesssim 25$).

## Comparação com Bron-Kerbosch

O algoritmo de Bron-Kerbosch (1973) enumera todas as cliques maximais por backtracking;
com **pivoteamento** poda ramos não promissores e tem melhor desempenho médio, embora
o pior caso permaneça exponencial (limite de Moon–Moser: $3^{n/3}$ cliques maximais).
No projeto ele figura como alternativa/heurística — ver skill **clique-codebase** para
a implementação e **sbc-article** para o comparativo no artigo.
