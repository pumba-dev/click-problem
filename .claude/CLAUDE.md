# Click Problem — guia do projeto

Este arquivo dá a **visão completa** do projeto e roteia cada tarefa para a skill de
domínio certa. Ao trabalhar neste repositório, use-o para se situar e delegue os detalhes
profundos às skills em `.claude/skills/` (via a tool Skill).

## Identidade do projeto

- **Nome:** Click Problem — *Análise de Propagação Viral por Clique Máximo*.
- **Problema NP-completo escolhido:** Problema do Clique (Máximo).
- **Aplicação prática proposta:** dado um conjunto de usuários de rede social com
  interesses por categoria e um score de interação entre pares, encontrar em cada
  categoria o **maior grupo totalmente conectado** (clique máximo) — o núcleo ideal
  de *seed* para uma campanha de propagação viral orgânica. Rankear categorias por
  tamanho do clique e, em empate, pelo alcance agregado (soma de seguidores).
- **Stack:** TypeScript estrito (Node 18+, validado em Node 22), testes em vitest,
  relatório HTML autocontido com vis.js (grafos) e Chart.js (gráficos).
- **Contexto acadêmico:** Trabalho da disciplina *Projeto e Análise de Algoritmos*
  (PAA, 2026.1), PPGCC — Universidade Federal do Piauí (UFPI). Professor: Guilherme
  Avelino. Autor: Paulo E. R. Araujo. Entrega no formato de **artigo SBC**
  (máx. 10 páginas de conteúdo).
- **Repositório:** https://github.com/pumba-dev/click-problem

## Modelo mental de 30 segundos

```
config.ts ──▶ InstanceGenerator.generate() ──▶ ProblemInstance
                                                     │
                                     ViralAnalyzer.analyze()
                                     para cada categoria a ∈ A:
                                        V_a = usuários com preferência[a]
                                        E_a = pares com score s_uv ≥ threshold τ
                                        C*_a = CliqueSolver.solve(G_a)   ← força bruta O(2ⁿ·n²)
                                     ranquear por (|C*_a| DESC, R_a DESC)
                                                     │
                          printResults() (terminal) + ReportGenerator.generate() (report.html)
```

- **Baseline (atividade 4):** `CliqueSolver` — busca exaustiva exata com *early exit*,
  itera subconjuntos de tamanho `n → 1` e retorna o primeiro que é clique.
  Complexidade **O(2ⁿ · n²)**; melhor caso O(n²); espaço O(n). Viável até `n ≈ 25`
  vértices por categoria.
- **Instância padrão** (seed 42, 30 usuários, 5 categorias, prefProb 0.5, τ 0.6,
  reach 1k–500k): a categoria **animals** vence — clique de tamanho **4**, alcance
  agregado **1.201.515** seguidores (User 1, 5, 10, 22).

## Estado atual e lacunas (leia antes de agir)

O trabalho tem **8 atividades** em **4 entregas**. A Entrega 4 (atividades 6, 7, 8 —
heurística, avaliação, relatório final) tinha previsão para **02/07/2026**.

- ✅ Atividades 1–5: problema, aplicação, implementação, baseline força-bruta e
  prova de NP-completude — cobertas em código e docs.
- ⚠️ **Lacuna crítica — atividade 6 (heurística):** o código só tem o baseline exato.
  Não há heurística implementada. O artigo cita Bron-Kerbosch com pivoteamento,
  guloso e *simulated annealing* apenas como *trabalhos futuros*.
- ⚠️ **Lacuna crítica — atividade 7 (avaliação):** falta o comparativo
  **baseline × heurística** exigido pelo enunciado — desempenho (tempo) e qualidade
  da solução (proximidade do ótimo), com **testes em diferentes tamanhos de entrada**
  gerados automaticamente, apresentados em gráficos e tabelas.

Quando o pedido tocar a entrega final, **sinalize proativamente** essas lacunas: a
heurística e a avaliação comparativa são obrigatórias e ainda não existem.

## Roteamento para as skills de domínio

Resolva você mesmo o que for de visão geral. Para profundidade, invoque a skill:

| Tarefa | Skill |
|---|---|
| Definição formal do clique, NP-completude, redução 3-CNF-SAT → CLIQUE, análise de complexidade, história do problema | **clique-theory** |
| Modelagem da aplicação viral (score de interação, reach, threshold, grafo por categoria G_a, alcance agregado, ranking), interpretação do relatório | **viral-application** |
| Arquitetura do código TS, rodar/testar/compilar, convenções, **estender o solver com heurística**, **rodar experimentos** por tamanho de entrada | **clique-codebase** |
| Escrever/estruturar/compilar o artigo SBC em LaTeX, seções obrigatórias, citações, tabelas e gráficos | **sbc-article** |

Se uma tarefa cruza domínios (ex.: "implemente Bron-Kerbosch, meça e escreva a seção
de resultados"), sequencie: **clique-codebase** (implementar + experimentar) →
**sbc-article** (redigir), apoiando-se em **clique-theory** para a complexidade.

## Fatos-chave para não reconsultar

- **Chave canônica de interação:** `"min_id,max_id"` (aresta {u,v} = {v,u}).
- **PRNG:** Mulberry32, isolado de `Math.random` — mesma `seed` ⇒ mesma instância.
- **Aresta em G_a:** criada sse `score ≥ threshold` (`>=`, empate no limiar conecta).
- **Densidade esperada:** modelo Erdős–Rényi G(n, p) com p = 1 − τ (τ=0.6 ⇒ p=0.4).
- **Módulos:** `src/config`, `src/models` (models.ts, graph.ts), `src/services`
  (generator, analyzer, solver), `src/reports` (report), `src/main.ts`.
- **Comandos:** `npm start` (gera report.html), `npm test` (vitest), `npm run build`.
- **Artigo:** `latex/template-latex/sbc-template.tex` (+ .sty, .bib, .bst). Formato SBC,
  ≤10 páginas. Obrigatório reportar ambiente de execução (linguagem/compilador, SO,
  processador, RAM) e comparar baseline × heurística.

## Convenções de trabalho

- Responda em **português** (idioma do projeto), com termos técnicos precisos.
- TypeScript estrito, sem `any` implícito; interfaces em `src/models/models.ts`.
- Preserve a reprodutibilidade: nunca introduza aleatoriedade fora do PRNG semeado.
- Ao propor mudança que afeta a entrega, relacione-a às atividades/entregas do
  enunciado e às lacunas acima.
- Prefira as skills de domínio a improvisar detalhes — elas guardam as provas,
  fórmulas e comandos exatos.
