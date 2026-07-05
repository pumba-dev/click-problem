# Prova de NP-completude de CLIQUE

Referência completa para a atividade 5 (prova de NP-completude) e a seção
correspondente do artigo. Baseada em CLRS 4ª ed., §34.5.1, Teorema 34.11
(pp. 1081–1084) e em Karp (1972).

## Índice

1. [Enunciado](#enunciado)
2. [CLIQUE ∈ NP](#1-clique--np)
3. [CLIQUE é NP-difícil: redução 3-CNF-SAT ≤ₚ CLIQUE](#2-clique-é-np-difícil)
4. [Corretude da redução (⇒ e ⇐)](#3-corretude-da-redução)
5. [Exemplo do CLRS](#4-exemplo-do-clrs)
6. [Observações que valem no artigo](#5-observações-importantes)

## Enunciado

Problema de decisão:

$$\mathrm{CLIQUE} = \{\langle G, k\rangle \mid \exists V' \subseteq V,\ |V'| = k \ \land\ \forall u \neq v \in V',\ (u,v) \in E\}.$$

**Teorema 34.11 (Karp, 1972):** CLIQUE é NP-completo.

Para provar NP-completude mostra-se (a) que CLIQUE ∈ NP e (b) que CLIQUE é NP-difícil,
reduzindo um problema NP-completo conhecido (3-CNF-SAT) a CLIQUE em tempo polinomial.

## 1. CLIQUE ∈ NP

- **Certificado:** um conjunto $V' \subseteq V$.
- **Verificação polinomial:** para cada par $u, v \in V'$, testar se $(u,v) \in E$.
  São $\binom{|V'|}{2}$ pares, logo $O(|V'|^2) = O(|V|^2)$ — polinomial no tamanho da
  entrada. Se todos os pares estão conectados, $V'$ é clique.

Portanto CLIQUE ∈ NP.

## 2. CLIQUE é NP-difícil

Reduz-se **3-CNF-SAT** (sabidamente NP-completo, Cook 1971) a CLIQUE.

Seja uma fórmula em 3-CNF
$$\phi = C_1 \land C_2 \land \cdots \land C_k,$$
onde cada cláusula $C_r$ tem exatamente três literais $l_{r1}, l_{r2}, l_{r3}$
(um literal é uma variável $x_i$ ou sua negação $\neg x_i$).

**Construção do grafo $G = (V, E)$:**

1. Para cada cláusula $C_r$, crie **três vértices** $v_{r1}, v_{r2}, v_{r3}$, um por
   literal. (Total: $3k$ vértices.)
2. Adicione a aresta $(v_{ri}, v_{sj})$ **se e somente se**:
   - $r \neq s$ (vértices de **cláusulas diferentes**), **e**
   - os literais $l_{ri}$ e $l_{sj}$ são **consistentes**, isto é, **não** são
     complementares (não são $x$ e $\neg x$ da mesma variável).

Note que **não há arestas dentro de uma mesma cláusula** (só se liga $r \neq s$).

A construção percorre pares de literais: $O((3k)^2)$ — **polinomial** em $|\phi|$.

O parâmetro do problema de decisão é o próprio número de cláusulas: pergunta-se se
$G$ tem clique de tamanho $k$.

## 3. Corretude da redução

Deve-se mostrar: $\phi$ é satisfatível $\iff$ $G$ tem clique de tamanho $k$.

### (⇒) Se $\phi$ é satisfatível, então $G$ tem clique de tamanho $k$

Tome uma atribuição satisfatória. Cada cláusula $C_r$ tem **ao menos um literal
verdadeiro**; escolha um vértice $v_r$ correspondente a um desses literais verdadeiros
(um por cláusula). Seja $V' = \{v_1, \dots, v_k\}$, com $|V'| = k$.

Para qualquer par $v_r, v_s$ com $r \neq s$: ambos correspondem a literais
verdadeiros. Dois literais verdadeiros **não podem ser complementares** (não podem
$x$ e $\neg x$ ser ambos verdadeiros). Como são de cláusulas diferentes e
consistentes, a aresta $(v_r, v_s)$ existe. Logo $V'$ é clique de tamanho $k$.

### (⇐) Se $G$ tem clique de tamanho $k$, então $\phi$ é satisfatível

Seja $V'$ clique com $|V'| = k$. Como **não há arestas intra-cláusula**, dois vértices
da mesma cláusula nunca estão ambos em $V'$; portanto $V'$ contém **exatamente um
vértice de cada uma das $k$ cláusulas**.

Atribua o valor 1 (verdadeiro) a cada literal correspondente a um vértice de $V'$.
Isso é consistente: se dois vértices em $V'$ correspondessem a literais complementares
($x$ e $\neg x$), não haveria aresta entre eles — contradizendo que $V'$ é clique.
Variáveis não fixadas recebem qualquer valor.

Cada cláusula tem ao menos um literal com valor 1 (o do seu vértice em $V'$), logo
toda cláusula é satisfeita e $\phi$ é satisfatível.

**Conclusão:** a equivalência vale nas duas direções, a redução é polinomial, logo
CLIQUE é NP-difícil. Com CLIQUE ∈ NP, segue que **CLIQUE é NP-completo**. ∎

## 4. Exemplo do CLRS

Para
$$\phi = (x_1 \lor \neg x_2 \lor \neg x_3) \land (\neg x_1 \lor x_2 \lor x_3) \land (x_1 \lor x_2 \lor x_3),$$
o grafo tem 3 triplas de vértices (uma por cláusula). Uma atribuição satisfatória:
$x_2 = 0,\ x_3 = 1$ (e $x_1$ livre). Um clique de tamanho $k = 3$ correspondente
escolhe $\neg x_2$ da 1ª cláusula, $x_3$ da 2ª e $x_3$ da 3ª — todos verdadeiros,
mutuamente consistentes e de cláusulas distintas.

## 5. Observações importantes

1. A prova estabelece NP-dificuldade já numa **classe restrita** de grafos (vértices
   organizados em triplas, sem arestas intra-tripla). Isso implica NP-dificuldade no
   caso geral: um algoritmo polinomial para o caso geral resolveria também o restrito.
2. A redução usa **apenas a instância** de 3-CNF-SAT, nunca a resposta (se $\phi$ é
   satisfatível). Uma redução que dependesse de conhecer a solução seria inválida.
3. Por que **3**-CNF-SAT e não SAT genérico: 3-CNF-SAT já é NP-completo e sua estrutura
   regular (3 literais por cláusula) torna a construção do grafo direta.

## Referências

- Cormen, Leiserson, Rivest, Stein. *Introduction to Algorithms*, 4ª ed. MIT Press,
  2022. §34.5.1, Teorema 34.11 (pp. 1081–1084).
- Karp, R. M. "Reducibility among combinatorial problems." *Complexity of Computer
  Computations*, 1972.
- Cook, S. A. "The complexity of theorem-proving procedures." STOC, 1971.
  DOI: 10.1145/800157.805047 (origem da NP-completude de SAT).
