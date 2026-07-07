---
name: clique-theory
description: >
  Fundamentos teóricos do Problema do Clique para o projeto click-problem.
  Use SEMPRE que a tarefa envolver a definição formal de clique, as versões de
  decisão e otimização, a prova de que CLIQUE é NP-completo (redução polinomial
  3-CNF-SAT → CLIQUE, Teorema 34.11 do CLRS / Karp 1972), a análise de
  complexidade do algoritmo de força bruta O(2ⁿ·n²) (melhor/pior/médio caso,
  efeito do early exit, custo de espaço), ou a história do problema.
  Dispare mesmo sem a palavra "teoria": pedidos como "prove que é NP-completo",
  "explique a redução do SAT", "qual a complexidade do solver", "por que é
  intratável" ou "o que é um clique" caem aqui.
---

# Teoria do Problema do Clique

Conhecimento teórico de referência para o artigo, as apresentações e a análise de
complexidade do projeto. Os detalhes longos (provas completas, derivações) estão em
`references/` — carregue apenas o arquivo relevante.

## Definição formal

Seja $G = (V, E)$ um grafo **não direcionado**. Uma **clique** é um subconjunto
$V' \subseteq V$ tal que todo par de vértices em $V'$ está conectado por uma aresta:

$$\forall u, v \in V',\ u \neq v \Rightarrow (u,v) \in E.$$

Equivalente: uma clique é um **subgrafo completo** de $G$. O *tamanho* da clique é
$|V'|$.

Duas formulações:

- **Decisão** $\mathrm{CLIQUE} = \{\langle G, k\rangle \mid G \text{ tem clique de tamanho } k\}$.
- **Otimização:** encontrar $C^* = \arg\max_{C \text{ clique}} |C|$ (clique máximo).

> Distinga **clique máxima** (*maximum*, a maior de todas) de **clique maximal**
> (*maximal*, não extensível, mas não necessariamente a maior). O projeto resolve o
> **máximo**.

## NP-completude (resumo)

**Teorema (Karp, 1972; CLRS Teorema 34.11):** CLIQUE é NP-completo.

1. **CLIQUE ∈ NP.** Certificado: o conjunto $V'$. Verificar que todo par em $V'$ é
   aresta custa $O(|V'|^2)$ — polinomial.
2. **CLIQUE é NP-difícil.** Redução polinomial $\text{3-CNF-SAT} \le_p \text{CLIQUE}$:
   de uma fórmula com $k$ cláusulas constrói-se, em tempo polinomial, um grafo com um
   vértice por literal; liga-se dois vértices sse são de cláusulas diferentes e os
   literais **não são complementares**. Então $\phi$ é satisfatível **se e somente se**
   $G$ tem clique de tamanho $k$.

A prova completa, com as duas direções da equivalência e o exemplo do CLRS, está em
[references/np-completeness.md](references/np-completeness.md). Leia-a ao redigir a
seção de NP-completude do artigo (atividade 5) ou preparar a apresentação.

## Complexidade do baseline (força bruta)

O `BruteSolver.solve` enumera subconjuntos em **ordem decrescente de tamanho**
($k = n \to 1$) e retorna o primeiro que é clique (*early exit*).

- **Pior caso:** $T(n) = \sum_{k=1}^{n} \binom{n}{k} O(k^2) = O(n^2 \cdot 2^n)$.
- **Melhor caso:** grafo completo — o primeiro subconjunto ($k=n$) já é clique: $O(n^2)$.
- **Caso médio:** exponencial (a enumeração explode antes de atingir o clique).
- **Espaço:** $O(n)$ — `combinations` é gerador *lazy* (backtracking, profundidade $k$).
- **Early exit:** melhora o tempo **prático** (termina cedo em grafos densos) mas
  **não muda a classe de pior caso**.

A derivação passo a passo (laços, identidade combinatória
$\sum_k \binom{n}{k}k^2 = n(n+1)2^{n-2}$, exemplos numéricos) está em
[references/complexity.md](references/complexity.md).

## Por que não resolver exato em escala real

Por ser NP-completo, não se conhece algoritmo polinomial para o caso geral; além
disso, aproximar clique máximo é *inaproximável* dentro de qualquer fator constante,
a menos que P = NP (Feige et al., 1991). Daí a motivação, em instâncias grandes, para
**heurísticas** (Bron-Kerbosch com pivoteamento, guloso, *simulated annealing*) —
tratadas do lado de engenharia na skill **clique-codebase**.

## Histórico

Linha do tempo (Ramsey 1935 → terminologia "clique" 1949 → primeiro algoritmo 1957 →
Cook 1971 → Karp 1972 → Tarjan-Trojanowski 1977 → Feige 1991), com DOIs para citação,
em [references/history.md](references/history.md).

## Onde isto entra no projeto

- **Artigo, seção "O Problema do Clique"** e **prova de NP-completude** → use
  `np-completeness.md`.
- **Artigo, "Algoritmo de Clique Máximo" / análise de complexidade** → `complexity.md`.
- **Introdução e referências** → `history.md`.
- Para redigir/compilar de fato o artigo, combine com a skill **sbc-article**.
