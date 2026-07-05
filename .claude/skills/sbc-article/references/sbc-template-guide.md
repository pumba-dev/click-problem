# Guia do template SBC e compilação

## Arquivos do template (`latex/template-latex/`)

| Arquivo | Papel |
|---|---|
| `sbc-template.tex` | O artigo. **Único arquivo a editar.** |
| `sbc-template.sty` | Estilo SBC (margens, título, autores, `\address`, `abstract`/`resumo`). Não editar. |
| `sbc-template.bib` | Bibliografia BibTeX. Ver `bibliography.md`. |
| `sbc.bst` | Estilo de citação SBC (usado por `\bibliographystyle{sbc}`). |
| `caption2.sty` | Legendas. |

Há também `latex/sbc_template.odt` e `template-openoffice.stw` (versões OpenOffice do
modelo) — irrelevantes para o fluxo LaTeX.

## Preâmbulo atual

```latex
\documentclass[12pt]{article}
\usepackage{sbc-template}
\usepackage{graphicx,url}
\usepackage[utf8]{inputenc}
\usepackage[brazil]{babel}
\usepackage{booktabs}
\sloppy
```

- `graphicx` já disponível → use `\includegraphics` para os gráficos de resultados.
- `booktabs` → tabelas com `\toprule/\midrule/\bottomrule`.
- `inputenc utf8` + `babel brazil` → escreva acentos direto (á, ç, ã). Se algum
  ambiente reclamar de encoding, confirme que o arquivo está salvo em UTF-8.

## Estrutura mínima do documento

```latex
\begin{document}
\maketitle
\begin{abstract} ... \end{abstract}   % inglês
\begin{resumo}   ... \end{resumo}      % português
\section{...} ...
\bibliographystyle{sbc}
\bibliography{sbc-template}
\end{document}
```

Título/autores/endereço vêm de `\title`, `\author{... \inst{n}}`, `\address{...}`,
`\email{...}` no preâmbulo (comandos do `sbc-template.sty`).

## Compilação

Sempre a partir de `latex/template-latex/`:

```bash
pdflatex sbc-template.tex
bibtex   sbc-template          # sem a extensão .tex
pdflatex sbc-template.tex
pdflatex sbc-template.tex      # 2 passadas finais resolvem refs cruzadas e citações
```

Alternativa (faz o ciclo sozinho, se instalado):

```bash
latexmk -pdf sbc-template.tex
latexmk -c                     # limpa auxiliares (.aux, .bbl, .blg, .log, .out)
```

Requer uma distribuição TeX (TeX Live / MiKTeX) com `pdflatex` e `bibtex` no PATH.
Verifique com `pdflatex --version`. Se não houver TeX instalado localmente, o `.tex`
compila em Overleaf (subir a pasta `template-latex` inteira e definir `sbc-template.tex`
como principal).

## Pitfalls comuns

- **`[?]` no lugar de citações:** faltou rodar `bibtex` ou uma passada extra de
  `pdflatex`. Rode o ciclo completo (4 comandos).
- **`Citation undefined`:** a chave no `\cite{}` não existe no `.bib`. Confira contra as
  chaves em `bibliography.md`.
- **Estouro de 10 páginas:** compacte figuras (`width=0.8\linewidth`), evite espaço
  vertical excessivo, prefira uma tabela a várias. O limite é de **conteúdo**;
  referências ajudam pouco a economizar.
- **`\includegraphics` não acha o arquivo:** use caminho relativo à pasta do `.tex`
  (coloque os PDFs/PNGs dos gráficos ao lado de `sbc-template.tex` ou em subpasta e
  referencie `figuras/grafico.pdf`).
- **Acentos "quebrados":** arquivo não está em UTF-8, ou faltou `inputenc`/`babel`
  (ambos já estão no preâmbulo).
- **`sbc-template.sty` / `sbc.bst` não encontrados:** compile de dentro da pasta que os
  contém, ou garanta que estão no mesmo diretório do `.tex`.
