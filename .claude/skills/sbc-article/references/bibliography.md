# Bibliografia — chaves e entradas BibTeX

Chaves já presentes em `sbc-template.bib` (use nos `\cite{}`):

| Chave | Referência | Uso no artigo |
|---|---|---|
| `cormen:2022` | CLRS, *Introduction to Algorithms*, 4ª ed., §34.5.1, Teor. 34.11 | Definição, NP-completude, redução |
| `karp:1972` | Karp, "Reducibility among Combinatorial Problems" | NP-completude de CLIQUE |
| `bron:1973` | Bron & Kerbosch, "Algorithm 457: Finding All Cliques..." | Heurística/alternativa exata |
| `feige:1991` | Feige et al., "Approximating Clique is Almost NP-Complete" | Inaproximabilidade → motiva heurísticas |

## Entradas atuais (referência)

```bibtex
@book{cormen:2022,
  author = {Thomas H. Cormen and Charles E. Leiserson and Ronald L. Rivest and Clifford Stein},
  title = {Introduction to Algorithms}, edition = {4th}, publisher = {MIT Press},
  year = {2022}, note = {Seção 34.5.1, Teorema 34.11, pp. 1081--1084}
}
@incollection{karp:1972,
  author = {Richard M. Karp}, title = {Reducibility among Combinatorial Problems},
  booktitle = {Complexity of Computer Computations},
  editor = {R. E. Miller and J. W. Thatcher}, publisher = {Plenum Press},
  year = {1972}, pages = {85--103}
}
@article{bron:1973,
  author = {Coen Bron and Joep Kerbosch},
  title = {Algorithm 457: Finding All Cliques of an Undirected Graph},
  journal = {Communications of the ACM}, volume = {16}, number = {9},
  pages = {575--577}, year = {1973}
}
@inproceedings{feige:1991,
  author = {Uriel Feige and Shafi Goldwasser and L{\'a}szl{\'o} Lov{\'a}sz and Shmuel Safra and Mario Szegedy},
  title = {Approximating Clique is Almost {NP}-Complete},
  booktitle = {Proceedings of the 32nd Annual Symposium on Foundations of Computer Science},
  year = {1991}, pages = {2--12}
}
```

## Entradas adicionais sugeridas (histórico e metaheurísticas)

Adicione ao `.bib` se citar a linha do tempo histórica (ver skill **clique-theory**,
`references/history.md`) ou heurísticas alternativas.

```bibtex
@article{luce:1949,
  author = {R. Duncan Luce and Albert D. Perry},
  title = {A Method of Matrix Analysis of Group Structure},
  journal = {Psychometrika}, volume = {14}, number = {2}, pages = {95--116},
  year = {1949}, doi = {10.1007/BF02289146}
}
@article{harary:1957,
  author = {Frank Harary and Ian C. Ross},
  title = {A Procedure for Clique Detection Using the Group Matrix},
  journal = {Sociometry}, volume = {20}, number = {3}, pages = {205--215},
  year = {1957}, doi = {10.2307/2785673}
}
@inproceedings{cook:1971,
  author = {Stephen A. Cook},
  title = {The Complexity of Theorem-Proving Procedures},
  booktitle = {Proceedings of the 3rd Annual ACM Symposium on Theory of Computing (STOC)},
  year = {1971}, pages = {151--158}, doi = {10.1145/800157.805047}
}
@article{tarjan:1977,
  author = {Robert E. Tarjan and Anthony E. Trojanowski},
  title = {Finding a Maximum Independent Set},
  journal = {SIAM Journal on Computing}, volume = {6}, number = {3},
  pages = {537--546}, year = {1977}, doi = {10.1137/0206038}
}
```

## Regras de citação

- Toda afirmação teórica-chave (NP-completude, inaproximabilidade, algoritmos) deve ter
  citação. Não afirme "é NP-completo" sem `\cite{karp:1972}` (e/ou `\cite{cormen:2022}`).
- Depois de mexer no `.bib` ou nos `\cite`, rode o ciclo completo (`pdflatex → bibtex →
  pdflatex → pdflatex`) — ver `sbc-template-guide.md` — senão as citações saem como `[?]`.
- Mantenha as chaves em `autor:ano`, padrão já usado no projeto.
