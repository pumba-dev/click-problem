import { readdirSync, rmSync } from "node:fs";

/**
 * Remove os arquivos intermediários do LaTeX, mantendo as fontes
 * (.tex/.sty/.bib/.bst) e o PDF final. Portável (não depende do latexmk, que
 * falha neste ambiente por um conflito de PATH do MiKTeX).
 */
const dir = "latex/template-latex";
const intermediate =
  /\.(aux|bbl|blg|log|out|fls|fdb_latexmk|toc|lof|lot|synctex\.gz)$/;

let removed = 0;
for (const file of readdirSync(dir)) {
  if (intermediate.test(file)) {
    rmSync(`${dir}/${file}`);
    removed++;
  }
}
console.log(
  `clean:latex — ${removed} arquivo(s) intermediário(s) removido(s) (PDF e fontes mantidos).`,
);
