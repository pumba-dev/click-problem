---
name: sbc-article
description: >
  Redação e compilação do artigo acadêmico do projeto click-problem no formato SBC
  (LaTeX), em latex/template-latex/sbc-template.tex. Use SEMPRE que a tarefa
  envolver o artigo/relatório final — escrever ou revisar seções (resumo/abstract,
  introdução, problema do clique, aplicação, modelagem, metodologia, implementação,
  resultados, conclusão), a estrutura obrigatória exigida pela disciplina, o limite
  de 10 páginas, tabelas e gráficos de resultados, citações e a bibliografia
  (.bib/.bst SBC), ou COMPILAR o PDF (pdflatex + bibtex / latexmk). Dispare em
  pedidos como "escreva a seção de resultados", "adicione a prova ao artigo",
  "compile o PDF", "gere a tabela de comparação", "cite Karp", "revise o abstract"
  ou "formate no padrão SBC".
---

# Artigo SBC do Click Problem

Guia para escrever e compilar o artigo. Estrutura obrigatória e orientação por seção em
[references/article-structure.md](references/article-structure.md); template, estilos e
comandos de compilação em [references/sbc-template-guide.md](references/sbc-template-guide.md);
entradas BibTeX e chaves de citação em
[references/bibliography.md](references/bibliography.md).

## Arquivos

```
latex/template-latex/
├── sbc-template.tex   ← ARTIGO (edite aqui)
├── sbc-template.sty   ← estilo SBC (não editar)
├── sbc-template.bib   ← bibliografia (chaves: cormen:2022, karp:1972, bron:1973, feige:1991)
├── sbc.bst            ← estilo de bibliografia
└── caption2.sty
```

Título atual: *"O Problema do Clique e sua Aplicação em Análise de Propagação Viral"*.
Autor: Paulo E. R. Araujo (UFPI). O `.tex` já tem `abstract` (EN) + `resumo` (PT) e as
seções: Introdução, O Problema do Clique, Aplicação Prática, Modelagem Formal,
Metodologia, Implementação, Resultados, Conclusão.

## Requisitos obrigatórios da disciplina

- **Modelo SBC**, **≤ 10 páginas** de conteúdo.
- Itens obrigatórios: Título, Autores, Resumo, Introdução, Conclusão.
- A **Conclusão** deve conter: resultados esperados, resultados obtidos e **comparação
  baseline × heurística** em (a) desempenho (tempo) e (b) qualidade da solução
  (proximidade do ótimo).
- Reportar o **ambiente de execução**: linguagem/compilador, SO, processador, RAM.
- Apresentar **testes em diferentes tamanhos de entrada** (gerados automaticamente), em
  gráficos e tabelas.
- Para cada algoritmo: estratégia, complexidade, características, resultados.

## Lacunas atuais do artigo (fechar antes da entrega final)

O `.tex` hoje descreve apenas o **baseline** e menciona heurísticas como *trabalho
futuro*. Para cumprir as atividades 6 e 7, será preciso:

1. Adicionar uma subseção de **heurística** (estratégia + complexidade) — ver skill
   **clique-codebase** para implementá-la e **clique-theory** para a complexidade.
2. Reescrever/expandir **Resultados** com o **comparativo baseline × heurística** por
   tamanho de entrada (tabela + gráficos tempo×n e qualidade×n).
3. Ajustar a **Conclusão** para apresentar essa comparação (hoje ela ainda trata a
   força bruta como solução final).
4. Incluir a subseção de **ambiente de execução**.

Detalhe do que escrever em cada uma em `article-structure.md`.

## Compilar

Da pasta `latex/template-latex/`:

```bash
pdflatex sbc-template.tex
bibtex   sbc-template
pdflatex sbc-template.tex
pdflatex sbc-template.tex        # resolve referências e citações
```

Ou, se disponível: `latexmk -pdf sbc-template.tex` (roda o ciclo automaticamente).
Encoding UTF-8, `babel` em `brazil`. Pitfalls comuns (acentos, `\cite` indefinido,
tabelas com `booktabs`) em `sbc-template-guide.md`.

## Convenções de escrita

- Texto do corpo em **português**; `abstract` em inglês, `resumo` em português (o
  template exige ambos).
- Fórmulas em LaTeX (`$...$`, `\[...\]`); notação consistente com a modelagem
  ($G_a$, $V_a$, $E_a$, $C^*_a$, $R_a$, $\tau$, $s_{uv}$).
- Cite sempre pelas chaves do `.bib` (ex.: `\cite{karp:1972}`). Números e resultados
  devem bater com a instância padrão reportada (ver skill **viral-application**).
- Tabelas com `booktabs` (`\toprule/\midrule/\bottomrule`).
