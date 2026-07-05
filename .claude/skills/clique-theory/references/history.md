# História do Problema do Clique

Linha do tempo para a introdução e as referências do artigo. DOIs prontos para
citação (entradas BibTeX na skill **sbc-article**, `references/bibliography.md`).

| Ano | Autores | Contribuição | Link |
|---|---|---|---|
| 1935 | Erdős & Szekeres | Primeira aparição da ideia no contexto da teoria de Ramsey (reformulação combinatória) | — |
| 1949 | Luce & Perry | Cunham a terminologia **"clique"** em análise de redes sociais | DOI: 10.1007/BF02289146 |
| 1957 | Harary & Ross | **Primeiro algoritmo** para encontrar cliques em um grafo | DOI: 10.2307/2785673 |
| 1971 | Cook | NP-completude de SAT — base para toda a teoria de NP-completude | DOI: 10.1145/800157.805047 |
| 1972 | Karp | "Reducibility among combinatorial problems" — prova que **CLIQUE é NP-completo** (entre os 21 problemas) | — |
| 1977 | Tarjan & Trojanowski | Algoritmo exato mais eficiente para conjunto independente máximo (dual do clique) | DOI: 10.1137/0206038 |
| 1991 | Feige, Goldwasser, Lovász, Safra, Szegedy | "Approximating clique is almost NP-complete" — **inaproximabilidade** do clique máximo | DOI: 10.1109/SFCS.1991.185341 |

## Fios narrativos úteis para a introdução

- **Origem social.** O termo "clique" nasce (Luce & Perry, 1949) justamente na análise
  de **redes sociais** — um grupo em que todos se conhecem mutuamente. Isso conecta
  diretamente à aplicação do projeto (seed viral), fechando um arco de ~75 anos entre
  a origem do conceito e o caso de uso.
- **Intratabilidade.** Karp (1972) coloca CLIQUE entre os 21 problemas NP-completos,
  a partir da NP-completude de SAT (Cook, 1971). Feige et al. (1991) reforçam: não só é
  difícil resolver exatamente como é difícil **aproximar** — justificando heurísticas
  sem garantia de ótimo em escala real.
- **Dualidade.** Clique máximo em $G$ = conjunto independente máximo no complemento
  $\bar{G}$ = complemento de uma cobertura de vértices mínima. Resultados algorítmicos
  (Tarjan-Trojanowski) transitam entre esses problemas.

## Relação com o baseline do projeto

O `CliqueSolver` é a abordagem **ingênua** descrita no CLRS (§34.5.1): testar
$\binom{|V|}{k}$ subconjuntos, cada um verificado em $O(k^2)$. Historicamente é o ponto
de partida antes de algoritmos de backtracking (Harary-Ross, Bron-Kerbosch) e das
heurísticas modernas.
