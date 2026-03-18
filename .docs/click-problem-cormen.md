# 34.5.1 The Clique Problem (CLRS 4a ed.)

## Definicao

Em um grafo nao direcionado $G = (V, E)$, uma **clique** e um subconjunto $V' \subseteq V$ tal que todo par de vertices em $V'$ esta conectado por uma aresta em $E$.

- Equivalente: um clique é um subgrafo completo de $G$.
- Tamanho do clique: numero de vertices em $V'$.

## Problemas (otimizacao e decisao)

- **Otimizacao**: encontrar um clique de tamanho maximo.
- **Decisao**: dado $k$, decidir se existe um clique de tamanho $k$.

Definicao formal do problema de decisao:

$$
\mathrm{CLIQUE} = \{\langle G, k\rangle \mid \exists V' \subseteq V,\ |V'| = k\ \land\ \forall u \ne v \in V',\ (u,v) \in E\}
$$

## Algoritmo ingenuo e custo

Uma abordagem ingenua testa todos os subconjuntos de $k$ vertices e verifica se cada subconjunto forma um clique.

- Numero de subconjuntos testados: $\binom{|V|}{k}$
- Verificacao por subconjunto: $O(k^2)$
- Tempo total: $O\left(k^2 \binom{|V|}{k}\right)$

Se $k$ for constante, o tempo e polinomial em $|V|$. Em geral, porem, $k$ pode ser proximo de $|V|/2$, e o algoritmo se torna superpolinomial.

## Teorema 34.11

**O problema CLIQUE e NP-completo.**

## Prova (estrutura)

### 1) CLIQUE esta em NP

Certificado: conjunto $V' \subseteq V$.

Verificacao em tempo polinomial:

1. Para cada par $u, v \in V'$, verificar se $(u, v) \in E$.
1. Se todos os pares estiverem conectados, $V'$ e um clique.

### 2) CLIQUE e NP-dificil

Reducao: $\text{3-CNF-SAT} \le_p \text{CLIQUE}$.

Considere uma formula

$$
\phi = C_1 \land C_2 \land \cdots \land C_k
$$

em 3-CNF, onde cada clausula $C_r$ tem tres literais distintos: $l_{r1}, l_{r2}, l_{r3}$.

Construimos $G = (V, E)$ assim:

1. Para cada clausula $C_r$, criar tres vertices $v_{r1}, v_{r2}, v_{r3}$ (um para cada literal).
1. Adicionar aresta entre $v_{ri}$ e $v_{sj}$ se, e somente se:
   - $r \ne s$ (vertices de clausulas diferentes), e
   - os literais correspondentes sao consistentes (nao sao complementares).

A construcao e polinomial no tamanho de $\phi$.

### Corretude da reducao

#### ($\Rightarrow$) Se $\phi$ e satisfativel, entao $G$ tem clique de tamanho $k$

Se existe atribuicao satisfatoria, cada clausula $C_r$ tem ao menos um literal verdadeiro. Escolha um vertice por clausula correspondente a um literal verdadeiro.

- Obtemos $k$ vertices (um por clausula).
- Dois literais verdadeiros escolhidos de clausulas diferentes nao podem ser complementares.
- Logo, ha aresta entre todo par escolhido.

Portanto, os $k$ vertices formam um clique.

#### ($\Leftarrow$) Se $G$ tem clique de tamanho $k$, entao $\phi$ e satisfativel

Nao ha arestas entre vertices da mesma clausula, entao um clique de tamanho $k$ deve conter exatamente um vertice de cada clausula.

Atribua valor 1 aos literais correspondentes aos vertices do clique.

- Como todos os pares na clique sao conectados, nao ha literais complementares simultaneamente com valor 1.
- Cada clausula recebe ao menos um literal verdadeiro.

Logo, $\phi$ e satisfativel.

Conclui-se que CLIQUE e NP-completo.

## Exemplo do livro

Para

$$
\phi = (x_1 \lor \neg x_2 \lor \neg x_3) \land (\neg x_1 \lor x_2 \lor x_3) \land (x_1 \lor x_2 \lor x_3)
$$

o grafo resultante tem 3 triplas de vertices (uma por clausula). Uma atribuicao satisfatoria e:

- $x_2 = 0$
- $x_3 = 1$
- $x_1$ pode ser 0 ou 1

um clique de tamanho $k=3$ correspondente escolhe:

- $\neg x_2$ da primeira clausula,
- $x_3$ da segunda,
- $x_3$ da terceira.

## Observacoes importantes do trecho

1. A prova mostra NP-dificuldade mesmo em uma classe **restrita** de grafos (vertices em triplas e sem arestas intratripla). Isso ja implica NP-dificuldade no caso geral.
1. Se existisse algoritmo polinomial para CLIQUE em grafos gerais, ele resolveria esse caso restrito tambem.
1. A reducao deve usar apenas a **instancia** de 3-CNF-SAT, nunca a solucao. Se dependesse de saber se $\phi$ e satisfativel, a reducao nao seria valida.

## Referencia

- Cormen, Leiserson, Rivest, Stein. _Introduction to Algorithms_, 4th edition.
- Secao 34.5.1, Teorema 34.11 (pp. 1081-1084).
