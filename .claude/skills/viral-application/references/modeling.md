# Modelagem formal da aplicação viral

Detalhamento matemático da instância do problema. Base para as seções "Modelagem
Formal da Aplicação" e "Metodologia" do artigo.

## Conjuntos e funções

- $U$ = conjunto de usuários; $A$ = conjunto de categorias.
- Cada $u \in U$ tem:
  - preferências binárias $\text{pref}(u, a) \in \{0,1\}$ para cada $a \in A$;
  - alcance $\text{reach}(u) \in \mathbb{Z}^+$ (nº de seguidores).
- Score de interação por par: $s_{uv} \in [0,1]$, simétrico ($s_{uv} = s_{vu}$),
  armazenado com chave canônica `"min(u,v),max(u,v)"`.
- Limiar $\tau \in [0,1]$.

## Grafo por categoria

Para cada $a \in A$:
$$V_a = \{u \in U \mid \text{pref}(u,a) = 1\}, \qquad E_a = \{(u,v) \mid u,v \in V_a,\ s_{uv} \ge \tau\}.$$

Objetivo: $C^*_a = \arg\max_{C \subseteq V_a,\ C \text{ clique}} |C|$.

Alcance agregado: $R_a = \sum_{u \in C^*_a} \text{reach}(u)$.

**Ranking:** ordenar $A$ por $|C^*_a|$ decrescente; desempate por $R_a$ decrescente.

## O score de interação (semântica)

$s_{uv}$ quantifica o quanto a audiência de um usuário se engaja com o conteúdo do
outro — o grau de sobreposição/conexão entre as duas redes. Interpretação prática:

> $s_{uv} \approx \dfrac{(\text{interações dos seguidores de } A \text{ com posts de } B) + (\text{de } B \text{ com posts de } A)}{\text{total de interações na janela de observação}}.$

Não basta $A$ e $B$ se seguirem: o que importa para viralização é que os **seguidores**
de um engajem com o conteúdo do outro. Quanto maior $s_{uv}$, mais as redes já
"conversam" e mais eficiente é colocar ambos no mesmo grupo de seed.

## Modelo de geração de instâncias

Os scores são gerados por um PRNG determinístico (Mulberry32, seed fixa). Para cada par
$(u,v)$, $s_{uv} \sim \text{Uniform}(0,1)$. Uma aresta em $G_a$ existe sse
$s_{uv} \ge \tau$. Isso equivale ao modelo de **grafo aleatório de Erdős–Rényi**
$G(n, p)$ com
$$p = P(s_{uv} \ge \tau) = 1 - \tau.$$

Para $\tau = 0{,}6$: $p = 0{,}4$. Nº esperado de arestas em $G_a$:
$\binom{|V_a|}{2}\cdot p$.

### Tamanho esperado do clique máximo

Em $G(n, p)$, o tamanho esperado do maior clique é aproximadamente
$$\omega(G) \approx 2\log_{1/p}(n).$$
Para $p = 0{,}4$: $\omega \approx 2\log_{1/0{,}4}(n) \approx 2{,}06\,\log(n)$,
compatível com os cliques de tamanho 3–4 observados para $n \le 20$ na instância padrão.

Esse resultado é útil no artigo para explicar por que os cliques observados são
pequenos e crescem lentamente com $n$ — e por que aumentar `numUsers` estressa o solver
muito antes de os cliques ficarem grandes.

## Efeito dos parâmetros na instância

| Parâmetro | Efeito no grafo / resultado |
|---|---|
| $\tau$ ↓ (menor limiar) | $p = 1-\tau$ ↑ → grafos mais densos → cliques maiores e $R_a$ maior |
| `prefProb` ↑ | mais usuários elegíveis por categoria → $\lvert V_a\rvert$ maior → grafos maiores (solver mais lento) |
| `numUsers` ↑ | mais vértices por categoria → custo do solver cresce como $O(2^n)$ |
| `seed` | muda a instância inteira mantendo reprodutibilidade |
| `reachLow/High` | faixa de seguidores — afeta $R_a$ e o desempate, não a topologia |

## Casos-limite da modelagem

- **Grafo vazio / sem arestas:** clique máximo é qualquer vértice único (tamanho 1);
  o solver retorna `[]` apenas quando não há vértices.
- **Empate no limiar:** $s_{uv} = \tau$ **cria** aresta (`>=`).
- **Categoria sem interessados:** $V_a = \varnothing$ → clique vazio, fica no fim do
  ranking.
