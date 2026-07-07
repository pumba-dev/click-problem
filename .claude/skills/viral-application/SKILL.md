---
name: viral-application
description: >
  Modelagem da aplicação prática do projeto click-problem: o Problema do Clique
  Máximo aplicado à seleção de núcleos de reforço para campanhas em redes sociais.
  Use SEMPRE que a tarefa envolver a formulação do problema real — usuários,
  alcance (reach/seguidores), preferências por categoria, score de interação s_uv,
  limiar (threshold τ), grafo por categoria G_a, clique máximo como grupo de campanha,
  alcance agregado R_a, o ranking de categorias e seu critério de desempate, o
  mecanismo de prova social / efeito manada (bandwagon) e a curva de adesão
  p = 1 − (1−q)^k —, a interpretação dos resultados/relatório, ou a justificativa de
  por que um clique modela o melhor grupo de campanha. Dispare também em pedidos como
  "explique o score de interação", "por que animals venceu", "como interpretar o
  report", "qual a intuição da modelagem", "explique o efeito manada" ou "explique
  para um gestor de marketing".
---

# Aplicação: Campanhas Virais por Prova Social (Clique Máximo)

Como o Problema do Clique é traduzido no problema prático do projeto e como
interpretar seus resultados. Detalhes formais e de leitura de relatório ficam em
`references/`.

## O problema prático

Em campanhas de marketing digital segmentadas, o objetivo **não** é apenas alcançar
muita gente, mas provocar **adesão** — que o usuário compre, siga ou aja. A alavanca
é comportamental: uma pessoa adere muito mais quando **vários criadores que ela
acompanha endossam o mesmo produto ao mesmo tempo**. Esse reforço positivo vindo do
próprio meio social dispara o **efeito manada** (*bandwagon*) e a **prova social** —
o produto parece validado pela comunidade inteira, não por um anúncio isolado.

Para o reforço ocorrer, os criadores precisam falar para **a mesma audiência**: só
assim a mesma pessoa recebe o endosso repetido, de fontes distintas e confiáveis. O
**grupo ideal de campanha** é, portanto, o maior conjunto de criadores cujas audiências
se sobrepõem par a par — formalmente, o **maior clique** do grafo de audiências de cada
categoria.

Para cada categoria de conteúdo (ex.: *animals*, *sports*, *technology*, *music*,
*food*), o sistema encontra esse grupo e rankeia as categorias por intensidade de
reforço (tamanho do clique) e alcance.

## Os quatro objetos do modelo

| Objeto | Papel na aplicação |
|---|---|
| **Usuário** (vértice) | Criador de conteúdo com `reach` (nº de seguidores) e `preferences` (interesse binário por categoria) |
| **Score de interação** $s_{uv} \in [0,1]$ | Grau de **sobreposição de audiência** entre $u$ e $v$ — quão provável a mesma pessoa seguir os dois e, logo, receber o endosso repetido |
| **Threshold** $\tau$ | Limiar: só há aresta se $s_{uv} \ge \tau$. Controla a densidade do grafo |
| **Alcance agregado** $R_a$ | Soma dos `reach` dos membros do clique — total de pessoas afetadas pelos criadores do grupo (público sob reforço) |

## Intuição: por que clique?

Um clique exige que **todo par** de criadores compartilhe audiência ($s_{uv} \ge \tau$).
Quando isso vale, o público comum ao grupo recebe o produto endossado por **todos** os
membros ao mesmo tempo — prova social plena, sem elo fraco. O seguidor vê a mensagem,
depois a **reencontra reforçada** pelos outros criadores que segue, e a lê como consenso
do seu meio: sobe a propensão a aderir (efeito manada) e a recomendar ao próprio círculo.

### Por que o *maior* clique, e não um qualquer?

Num clique de tamanho $k$, o público compartilhado recebe $k$ endossos simultâneos. A
adesão cresce com o número de endossos independentes — modelada pela **curva de adesão**

$$p(\text{adesão}) = 1 - (1 - q)^{k}, \qquad k = |C^*_a|,$$

onde $q$ é a probabilidade de adesão por endosso único (constante global; ex.: $q=0{,}15$).
Cada criador a mais no clique é mais um endosso sobre a mesma pessoa:
$k{=}1 \to 15\%$, $k{=}3 \to 39\%$, $k{=}4 \to 48\%$. Maximizar $|C^*_a|$ maximiza a
intensidade do reforço — por isso o alvo é o **clique máximo**, não bastando o alcance
isolado de um só influenciador. A visualização dessa curva no relatório é trabalho da
fase seguinte; aqui ela justifica a escolha do objetivo.

## Modelagem formal (resumo)

Para cada categoria $a$: grafo $G_a = (V_a, E_a)$ com
- $V_a = \{u \mid \text{pref}(u,a) = 1\}$ (usuários interessados na categoria);
- $(u,v) \in E_a \iff s_{uv} \ge \tau$.

Busca-se $C^*_a$ = clique máximo de $G_a$. Alcance agregado
$R_a = \sum_{u \in C^*_a} \text{reach}(u)$.

**Ranking:** por $|C^*_a|$ **decrescente**; empate desfeito por $R_a$ **decrescente**.
O tamanho do clique é o fator primário; o alcance só diferencia empates.

Detalhes (modelo Erdős–Rényi de geração, densidade esperada $p = 1-\tau$, tamanho
esperado do clique) em [references/modeling.md](references/modeling.md).

## Interpretação dos resultados

Instância padrão (seed 42, 30 usuários, 5 categorias, τ=0.6):

| Categoria | $\lvert V_a\rvert$ | $\lvert E_a\rvert$ | $\lvert C^*_a\rvert$ | $R_a$ |
|---|---|---|---|---|
| animals | 18 | 65 | 4 | 1.201.515 |
| technology | 15 | 36 | 4 | 851.826 |
| food | 15 | 40 | 4 | 842.877 |
| sports | 20 | 76 | 4 | 538.537 |
| music | 9 | 15 | 3 | 655.851 |

**animals** vence: clique 4 e maior alcance agregado. **music**, apesar de $R_a$ maior
que *sports*, fica em último por ter clique menor (3) — ilustra o critério de desempate.

Como ler o `report.html` (abas, cores dos nós/arestas, navegação), incluindo a leitura
para públicos não técnicos (gestores), em
[references/interpretation.md](references/interpretation.md).

## Limitações da modelagem (para o artigo)

- O solver é **força bruta exata** — inviável para grafos reais com milhares de
  usuários por categoria (ver skill **clique-theory** para a complexidade).
- Grafo **não ponderado**: $s_{uv}$ só decide a existência da aresta, não pesa o
  ranking. Trabalho futuro: grafos ponderados.
- **Curva de adesão** com $q$ constante e endossos **independentes** é uma
  simplificação — na prática $q$ varia por categoria/nicho e há saturação (retornos
  decrescentes já embutidos, mas sem correlação entre endossos). Refinamento futuro.
- Dados **sintéticos** e reprodutíveis; não há coleta real de redes sociais.

## Onde isto entra no projeto

- **Artigo, seções "Aplicação Prática", "Modelagem Formal" e "Resultados"** → combine
  este material com a skill **sbc-article** para redigir.
- **Interpretar/gerar um relatório** → `interpretation.md` + skill **clique-codebase**
  (rodar `npm start`).
