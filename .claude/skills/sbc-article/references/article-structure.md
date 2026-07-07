# Estrutura do artigo e orientação por seção

Mapa das seções exigidas pela disciplina e do que cada uma deve conter. Referência
para escrever/revisar `latex/template-latex/sbc-template.tex`.

## Requisitos formais (do enunciado)

- Modelo **SBC**, **máximo 10 páginas** de conteúdo.
- Obrigatórios: **Título, Autores, Resumo, Introdução, Conclusão**.
- Para **cada algoritmo**: estratégia, complexidade, principais características,
  resultados (gráficos e tabelas).
- **Ambiente de execução** (obrigatório): linguagem/compilador, SO, processador, RAM.
- **Testes com diferentes tamanhos de entrada**, preferencialmente gerados
  automaticamente.
- Conclusão com: resultados esperados, resultados obtidos e **comparação baseline ×
  heurística** — desempenho (tempo) e qualidade da solução.

## Seções (estado atual + o que ajustar)

### Resumo / Abstract
Já presentes (PT + EN). Ao adicionar a heurística, mencione o comparativo no resumo
(uma frase). Mantenha números coerentes com os resultados finais.

### 1. Introdução
Motivação (marketing viral: achar o núcleo coeso, não só alcance) + o que o trabalho
entrega. Bom lugar para o gancho histórico: o termo "clique" nasce na análise de redes
sociais (Luce & Perry, 1949) — ver skill **clique-theory**, `references/history.md`.

### 2. O Problema do Clique
Definição formal (clique = subgrafo completo), decisão vs otimização, e a
**NP-completude** com a redução 3-CNF-SAT → CLIQUE `\cite{karp:1972}` `\cite{cormen:2022}`.
Fonte: skill **clique-theory**, `references/np-completeness.md`. Se a disciplina pedir a
prova completa no corpo (atividade 5), traga as duas direções da equivalência.

### 3. Aplicação Prática: Engajamento Viral
Intuição comportamental: **prova social / efeito manada** (*bandwagon*) — vários
criadores endossando o mesmo produto para a **mesma audiência** elevam a adesão. O score
$s_{uv}$ como grau de **sobreposição de audiência**; por que o **maior clique** maximiza
o reforço. Cite a base comportamental: `\cite{cialdini:2006}`, `\cite{leibenstein:1950}`,
`\cite{asch:1951}`, `\cite{zajonc:1968}` (ver `bibliography.md`). Fonte: skill
**viral-application**.

### 4. Modelagem Formal
$U$, $A$, $\text{pref}$, $\text{reach}$, $G_a=(V_a,E_a)$, aresta sse $s_{uv}\ge\tau$,
$C^*_a$, $R_a$, regra de ranking (tamanho do clique; desempate por alcance). Inclua a
**curva de adesão** $p=1-(1-q)^k$ ($k=|C^*_a|$, $q$ = adesão por endosso único, constante
global) que liga o tamanho do clique à taxa de adesão e motiva maximizar $|C^*_a|$. Fonte:
skill **viral-application**, `references/modeling.md`.

### 5. Metodologia
Etapas: geração da instância → construção dos grafos → solução do clique máximo →
ranking → relatório. Parâmetros padrão (30 usuários, 5 categorias, p=0.5, τ=0.6, seed
42). **Adicione aqui a subseção de ambiente de execução** (linguagem/compilador, SO,
processador, RAM).

### 6. Implementação
Módulos (models, generator, graph, solver, analyzer, report). Fonte: skill
**clique-codebase**. Cobrir:
- **6.x Algoritmo de Clique Máximo (baseline):** força bruta com early exit,
  $O(2^n\cdot n^2)$, espaço $O(n)$.
- **6.y Heurística (FEITA — atividade 6):** `GreedySolver` — guloso por grau
  decrescente (desempate por id), sem retrocesso, $O(n^2)$, espaço $O(n)$,
  determinístico. Já redigida no `.tex` (`\label{sec:heuristica}`). Contrasta com o
  baseline (exato × aproximado, garantia de ótimo × não).

### 7. Resultados (FEITA — atividade 7)
Traz a tabela da instância padrão (por categoria) **e** a subseção comparativa
`\label{sec:comparativo}` baseline × heurística por tamanho de entrada, alimentada por
`bench.json` (`npm run bench`, skill **clique-codebase**). O modelo abaixo documenta o
formato caso queira regenerar/estender a tabela:
- **Tabela comparativa por tamanho de entrada** ($n$ × tempo × cliqueSize) para baseline
  e heurística. Modelo:

```latex
\begin{table}[h]\centering
\caption{Baseline vs heurística por tamanho de entrada (média de 10 seeds, $\tau=0{,}6$)}
\label{tab:comparativo}
\begin{tabular}{rrrrr}
\toprule
$n$ & $t_{\text{bf}}$ (ms) & $t_{\text{heur}}$ (ms) & $|C|_{\text{bf}}$ & $|C|_{\text{heur}}$ \\
\midrule
% preencher a partir de bench.json (gerado por npm run bench; ver skill clique-codebase)
\bottomrule
\end{tabular}
\end{table}
```

- **Gráfico tempo × $n$** (baseline explode; heurística cresce devagar) — considere
  escala log no eixo do tempo.
- **Gráfico/coluna de qualidade:** razão $|C|_{\text{heur}}/|C|_{\text{bf}}$ e % de
  acerto do ótimo.
- Discussão do **ponto de virada** (maior $n$ viável para o baseline).

Os dados saem do harness em skill **clique-codebase**, `references/extending.md` (§5).
Exporte gráficos como PDF/PNG e inclua com `\includegraphics` (pacote `graphicx` já está
no preâmbulo).

### 8. Conclusão (FEITA)
Contém: resultados esperados × obtidos e a **comparação baseline × heurística** em
desempenho e qualidade; a heurística consta como **resultado entregue**. Trabalhos futuros
remanescentes: algoritmos exatos melhores (Bron-Kerbosch) e metaheurísticas, grafos
ponderados, refinamento da curva de adesão, dados reais.

## Checklist final antes de entregar

- [ ] ≤ 10 páginas de conteúdo.
- [ ] Resumo (PT) e Abstract (EN) presentes e coerentes com os números finais.
- [ ] Baseline **e** heurística documentados (estratégia + complexidade + características).
- [ ] Ambiente de execução reportado.
- [ ] Testes em múltiplos tamanhos de entrada, com tabela e gráfico.
- [ ] Comparação desempenho + qualidade na Conclusão.
- [ ] Todas as `\cite` resolvidas (rodar bibtex); sem `[?]` no PDF.
- [ ] Números batem com a instância/seed reportada.
