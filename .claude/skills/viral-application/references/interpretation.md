# Interpretação de resultados e do relatório

Como ler a saída do sistema — terminal e `report.html` — e como comunicar os
resultados a diferentes públicos. Complementa a seção "Resultados" do artigo.

## Saída no terminal

Após `npm start`, o terminal lista as categorias **em ordem de ranking**. Para cada
uma: nº de vértices, nº de arestas, tamanho do clique máximo, membros do clique com
seus alcances e o alcance total. A melhor categoria para seed viral é destacada.

## O relatório HTML (`report.html`)

Arquivo autocontido, aberto direto no navegador (usa CDNs de vis.js e Chart.js).

| Aba | Conteúdo |
|---|---|
| **Visão Geral** | Tabela de ranking + dois gráficos de barras (Chart.js): tamanho do clique e alcance por categoria |
| **Usuários** | Tabela de todos os usuários (alcance + preferências); linhas de membros de clique destacadas |
| **Interações** | Grafo global de todos os usuários; arestas coloridas pelo score de interação |
| **`<Categoria>`** (uma por categoria) | Grafo interativo (vis.js), stat cards, legenda e lista de membros do clique |
| **Estatísticas** | Metadados (seed, config), tempos por fase (geração, análise, relatório, total), densidade da rede e esforço do solver por categoria |

### Convenção de cores nos grafos

- **Nó laranja** = membro do clique máximo; **nó azul** = usuário elegível fora do clique.
- **Aresta laranja e contínua** = liga dois membros do clique; **aresta cinza e
  tracejada** = demais conexões.
- Clicar num item do ranking (aba Visão Geral) navega para a aba da categoria.
- Redes vis.js são inicializadas *lazy* (só na primeira vez que a aba é aberta) —
  evita defeito de renderização em contêiner oculto.

## Leitura do resultado padrão

Instância padrão (seed 42, 30 usuários, 5 categorias, τ=0.6):

- **animals** lidera: clique de tamanho **4**, alcance agregado **1.201.515**
  (User 1: 300.950; User 5: 134.211; User 10: 463.992; User 22: 302.362). É a
  recomendação do sistema para seed viral.
- Quatro das cinco categorias empatam em clique 4; **music** (só 9 usuários elegíveis)
  atinge clique 3 e fica em último — apesar de $R_a$ maior que *sports*. Isso mostra
  que **tamanho do clique domina o ranking**; alcance só desempata.

## Comunicação por público

### Para gestores / marketing
"Encontramos, em cada tema, o **maior grupo de criadores cujas audiências já se
reforçam entre si** — o núcleo ideal para uma campanha pegar fogo organicamente. Em
*animals*, esse núcleo tem 4 criadores somando ~1,2 milhão de seguidores: o melhor alvo
para investir." Nós laranja = o grupo recomendado.

### Para desenvolvedores
Ver skill **clique-codebase**: cada aba do relatório vem de um `CategoryResult`; o
ranking sai de `ViralAnalyzer.rankCategories`.

### Para pesquisadores
Ver `references/modeling.md` (mesmo diretório) e skill **clique-theory** para o
enquadramento formal e a complexidade.

## Armadilhas de interpretação

- **Alcance alto não vence** se o clique for menor — o critério primário é coesão
  (tamanho do clique), não audiência bruta.
- **Grafo maior não implica clique maior**: *sports* tem mais vértices/arestas que
  *animals* mas o mesmo clique 4 e $R_a$ bem menor — a topologia e o `reach` dos
  membros específicos é que decidem.
- **Reprodutibilidade**: mesma `seed` ⇒ mesmos números em qualquer máquina. Ao reportar
  resultados no artigo, sempre registre a seed e a config usadas.
