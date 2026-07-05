# Referência de configuração e comandos

Tudo em `src/config/config.ts`. Edite e rode `npm start` de novo — nenhum argumento de
linha de comando é suportado.

## Parâmetros (`simulationConfig: GeneratorOptions`)

| Parâmetro | Tipo | Padrão | Efeito |
|---|---|---|---|
| `seed` | `number` | 42 | Semente do Mulberry32. Mesma seed ⇒ mesma instância. Troque para outro cenário reprodutível. |
| `numUsers` | `number` | 30 | Total de usuários. **Mantenha ≲ 25** por grafo elegível — solver é O(2ⁿ·n²). |
| `categories` | `string[]` | `["animals","sports","technology","music","food"]` | Uma aba/grafo por categoria. Minúsculas, sem espaços. |
| `prefProb` | `number` 0–1 | 0.5 | Prob. de interesse por categoria. ↑ ⇒ mais vértices por grafo ⇒ solver mais lento. |
| `threshold` | `number` 0–1 | 0.6 | Limiar de score para criar aresta (`>=`). ↓ ⇒ grafo mais denso (p = 1−τ). |
| `reachLow` | `number` | 1000 | Alcance mínimo (seguidores). |
| `reachHigh` | `number` | 500000 | Alcance máximo. Afeta $R_a$ e o desempate, não a topologia. |

`reportOutputPath` (padrão `"report.html"`): caminho do HTML gerado, relativo à raiz.

### Densidade em função de τ

| τ | p = 1−τ | Densidade |
|---|---|---|
| 0.3 | 0.70 | densa (~70% dos pares elegíveis conectados) |
| 0.6 | 0.40 | moderada (~40%) |
| 0.8 | 0.20 | esparsa (~20%) |

## Comandos

| Comando | Ação |
|---|---|
| `npm install` | instala tsx, typescript, vitest, @types/node |
| `npm start` | `tsx src/main.ts` → ranking no terminal + `report.html` |
| `npm test` | `vitest run` (suíte completa, uma passada) |
| `npm run test:watch` | vitest em modo watch |
| `npm run build` | `tsc` → `dist/` |
| `npx tsx <arquivo>.ts` | roda um script TS avulso (ex.: harness de experimentos) |

## Requisitos de ambiente (reportar no artigo)

O enunciado exige registrar: linguagem/compilador (TypeScript ~5.4 via `tsx`/Node 22),
sistema operacional, processador e RAM. Node 18+ é o mínimo; o projeto foi validado em
Node 22. Preencha esses dados na seção de metodologia/resultados do artigo (skill
**sbc-article**).

## Reprodutibilidade — cuidados

- Nunca use `Math.random` na simulação; use apenas o PRNG semeado.
- Não altere a ordem de consumo do PRNG em `generate()` (reach/preferências por usuário,
  depois pares) — mudaria todas as instâncias existentes.
- Ao publicar um resultado, registre `seed` e a config completa: garante que qualquer
  pessoa reproduza os mesmos números (RNF-02).
