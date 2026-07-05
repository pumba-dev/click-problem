---
name: viral-application
description: >
  Modelagem da aplicação prática do projeto click-problem: o Problema do Clique
  Máximo aplicado à detecção de núcleos de propagação viral em redes sociais.
  Use SEMPRE que a tarefa envolver a formulação do problema real — usuários,
  alcance (reach/seguidores), preferências por categoria, score de interação s_uv,
  limiar (threshold τ), grafo por categoria G_a, clique máximo como seed viral,
  alcance agregado R_a, o ranking de categorias e seu critério de desempate —, a
  interpretação dos resultados/relatório, ou a justificativa de por que um clique
  modela o melhor grupo de seed. Dispare também em pedidos como "explique o score
  de interação", "por que animals venceu", "como interpretar o report", "qual a
  intuição da modelagem" ou "explique para um gestor de marketing".
---

# Aplicação: Propagação Viral por Clique Máximo

Como o Problema do Clique é traduzido no problema prático do projeto e como
interpretar seus resultados. Detalhes formais e de leitura de relatório ficam em
`references/`.

## O problema prático

Em campanhas de marketing digital segmentadas, o objetivo **não** é apenas alcançar
muita gente, mas encontrar o **grupo mais coeso** de usuários que compartilham um
interesse e cujas audiências se **reforçam mutuamente**. Esse núcleo é o *seed* viral
ideal para disseminação orgânica. Formalmente, ele corresponde ao **maior clique** do
grafo de interações de cada categoria.

Para cada categoria de conteúdo (ex.: *animals*, *sports*, *technology*, *music*,
*food*), o sistema encontra o maior grupo de criadores totalmente interconectados e
rankeia as categorias por potencial viral.

## Os quatro objetos do modelo

| Objeto | Papel na aplicação |
|---|---|
| **Usuário** (vértice) | Criador de conteúdo com `reach` (nº de seguidores) e `preferences` (interesse binário por categoria) |
| **Score de interação** $s_{uv} \in [0,1]$ | Quão conectadas/sobrepostas são as audiências de $u$ e $v$ — potencial de reforço cruzado |
| **Threshold** $\tau$ | Limiar: só há aresta se $s_{uv} \ge \tau$. Controla a densidade do grafo |
| **Alcance agregado** $R_a$ | Soma dos `reach` dos membros do clique — audiência total atingível pelo núcleo |

## Intuição: por que clique?

Um clique exige que **todo par** de criadores tenha audiências suficientemente
conectadas ($s_{uv} \ge \tau$). Quando isso vale, um seguidor exposto à mensagem por um
criador a **reencontra, reforçada**, pelos canais de outro criador confiável. Essa
exposição múltipla a fontes distintas aumenta a propensão à adesão e à recomendação
orgânica. Um grupo que forma clique é, portanto, uma **rede densa de recomendação**
que maximiza cobertura *e* intensidade de reforço — não bastando o alcance isolado de
um só influenciador.

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
- Dados **sintéticos** e reprodutíveis; não há coleta real de redes sociais.

## Onde isto entra no projeto

- **Artigo, seções "Aplicação Prática", "Modelagem Formal" e "Resultados"** → combine
  este material com a skill **sbc-article** para redigir.
- **Interpretar/gerar um relatório** → `interpretation.md` + skill **clique-codebase**
  (rodar `npm start`).
