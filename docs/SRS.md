# Especificação de Requisitos de Software (ERS)

**Projeto:** Click Problem — Análise de Propagação Viral por Clique Máximo  
**Versão:** 1.0  
**Data:** 2026-04-29  
**Autor:** Pumba Developer  

---

## 1. Introdução

### 1.1 Propósito

Este documento especifica os requisitos funcionais e não funcionais do sistema **Click Problem**, uma ferramenta educacional que modela a seleção do melhor grupo de influenciadores para uma campanha por **prova social** em redes sociais — o maior conjunto de criadores com audiências sobrepostas — como instância do Problema do Clique Máximo (NP-Completo). O documento serve como referência para desenvolvimento, teste e manutenção do sistema.

### 1.2 Escopo

O sistema recebe parâmetros de configuração, gera uma rede social sintética, aplica um algoritmo de clique máximo por categoria de conteúdo e produz um relatório HTML interativo com os resultados. Não realiza coleta de dados reais de redes sociais nem integração com APIs externas.

### 1.3 Definições e Acrônimos

| Termo | Definição |
|---|---|
| **Clique** | Subconjunto de vértices de um grafo no qual todo par de vértices está conectado por uma aresta |
| **Clique Máximo** | Clique de maior cardinalidade em um grafo dado |
| **Grupo de Campanha (Seed)** | Conjunto de criadores selecionado para veicular uma campanha; no modelo, o clique máximo de uma categoria |
| **Efeito Manada / Prova Social** | Fenômeno comportamental: a adesão de um usuário cresce quando vários criadores que ele segue endossam o mesmo produto (*bandwagon*) |
| **Curva de Adesão** | Modelo da probabilidade de adesão em função do nº de endossos: `p = 1 − (1 − q)^k`, onde `k` = tamanho do clique e `q` = probabilidade de adesão por endosso único (constante global) |
| **Score de Interação** | Grau de sobreposição de audiência entre dois criadores (∈ [0,1]); alto ⇒ provável que a mesma pessoa siga os dois |
| **Alcance (Reach)** | Número de seguidores de um usuário, representando seu potencial de audiência orgânica |
| **Threshold** | Limiar mínimo de score de interação para que dois usuários sejam conectados por uma aresta |
| **PRNG** | Pseudo-Random Number Generator — gerador de números pseudo-aleatórios |
| **G_a** | Grafo de interação da categoria `a`, construído a partir dos usuários com preferência por essa categoria |
| **ProblemInstance** | Estrutura de dados que encapsula usuários, categorias, interações e threshold |
| **NP-Completo** | Classe de problemas computacionais para os quais não se conhece solução em tempo polinomial |

### 1.4 Referências

- Karp, R. M. "Reducibility among combinatorial problems." _Complexity of Computer Computations_, 1972.
- Cormen, T. et al. _Introduction to Algorithms_, 4ª ed. MIT Press, 2022. §34.5.1.
- Bron, C.; Kerbosch, J. "Finding all cliques of an undirected graph." _Communications of the ACM_, 1973.
- Cialdini, R. B. _Influence: The Psychology of Persuasion_. Harper Business, 2006. (prova social)
- Leibenstein, H. "Bandwagon, Snob, and Veblen Effects in the Theory of Consumers' Demand." _QJE_, 1950. (efeito manada)

---

## 2. Descrição Geral do Sistema

### 2.1 Perspectiva do Produto

O Click Problem é um sistema de linha de comando (CLI) independente, sem dependências de banco de dados ou serviços externos. A entrada é um arquivo de configuração TypeScript; a saída é um relatório HTML autocontido e um sumário impresso no terminal.

### 2.2 Funções Principais

1. **Geração de instância sintética** — cria usuários com alcance aleatório e preferências por categoria usando um PRNG reprodutível (Mulberry32).
2. **Construção de grafos por categoria** — filtra usuários elegíveis e conecta pares cujo score de interação supera o threshold.
3. **Detecção de clique máximo** — aplica busca exaustiva com early exit em cada grafo G_a.
4. **Ranking de categorias** — ordena resultados por (cliqueSize DESC, aggregateReach DESC).
5. **Geração de relatório HTML** — produz visualizações interativas com vis.js e Chart.js.

### 2.3 Usuários do Sistema

| Perfil | Descrição |
|---|---|
| **Pesquisador / Educador** | Usa a ferramenta para demonstrar o Problema do Clique em contexto aplicado |
| **Estudante** | Explora o impacto dos parâmetros (seed, threshold, prefProb) nos resultados |
| **Desenvolvedor** | Estende o sistema com novos algoritmos ou visualizações |

### 2.4 Restrições Gerais

- O algoritmo de busca exaustiva é educacional e não adequado para produção com instâncias grandes.
- Um grafo por categoria acima de ~25 vértices elegíveis pode tornar o baseline impraticável (O(2ⁿ · n²)); com os parâmetros padrão (30 usuários, prefProb 0.5) o maior |V_a| fica ≤ 20. Para escala, use o `GreedySolver`.
- Requer Node.js 18+ para execução.

---

## 3. Requisitos Funcionais

### RF-01 — Configuração da simulação

**Descrição:** O sistema deve permitir que o usuário configure todos os parâmetros da simulação por meio do arquivo `src/config/config.ts`, sem necessidade de alterações em outros arquivos.

**Parâmetros configuráveis:**

| Parâmetro | Tipo | Descrição | Padrão |
|---|---|---|---|
| `seed` | `number` | Semente do PRNG para reprodutibilidade | 42 |
| `numUsers` | `number` | Número de usuários na rede | 30 |
| `categories` | `string[]` | Lista de categorias de conteúdo | `["animals","sports","technology","music","food"]` |
| `prefProb` | `number` (0–1) | Probabilidade de interesse por categoria | 0.5 |
| `threshold` | `number` (0–1) | Limiar mínimo de score para criar aresta | 0.6 |
| `reachLow` | `number` | Alcance mínimo de seguidores | 1.000 |
| `reachHigh` | `number` | Alcance máximo de seguidores | 500.000 |

**Critério de aceite:** Alterar qualquer parâmetro e executar `npm start` deve produzir resultados consistentes com os novos valores.

---

### RF-02 — Geração de instância reprodutível

**Descrição:** O sistema deve gerar uma instância aleatória do problema a partir dos parâmetros de configuração, garantindo que a mesma semente sempre produza a mesma instância.

**Comportamento:**

- Cada usuário recebe: `id` (sequencial a partir de 0), `name` ("User N"), `reach` (inteiro uniforme em `[reachLow, reachHigh)`), e `preferences` (mapa de categoria para booleano, com probabilidade `prefProb`).
- Para cada par `(i, j)` com `i < j`, gera um score de interação uniforme em `[0, 1)`.
- O PRNG utilizado é Mulberry32, isolado do estado global (`Math.random`).

**Critério de aceite:** Duas chamadas com mesma `seed` produzem instâncias byte-a-byte idênticas. Chamadas intermediárias com outras seeds não afetam o resultado.

---

### RF-03 — Construção de grafo por categoria

**Descrição:** Para cada categoria, o sistema deve construir um grafo G_a cujos vértices são os usuários com `preferences[categoria] === true` e cujas arestas conectam pares com `score >= threshold`.

**Critério de aceite:**
- Usuários sem interesse na categoria não aparecem como vértices em G_a.
- Pares com score abaixo do threshold não possuem aresta.
- Pares com score exatamente igual ao threshold possuem aresta (`>=`).

---

### RF-04 — Detecção do clique máximo

**Descrição:** O sistema deve encontrar o clique de maior cardinalidade em cada grafo G_a por meio de busca exaustiva com early exit (iteração em ordem decrescente de tamanho de subconjunto).

**Critério de aceite:**
- O resultado retornado é sempre um clique válido (todo par de vértices no resultado está conectado por aresta).
- Não existe subconjunto de vértices maior que seja também clique.
- Grafo vazio retorna clique vazio `[]`.

---

### RF-05 — Ranking de categorias

**Descrição:** O sistema deve rankear as categorias pelo par `(cliqueSize DESC, aggregateReach DESC)`, onde `aggregateReach` é a soma dos `reach` de todos os membros do clique.

**Critério de aceite:** Em caso de empate em `cliqueSize`, a categoria com maior `aggregateReach` ocupa posição superior. O ranking é exibido no terminal e incorporado ao relatório HTML.

---

### RF-06 — Exibição de resultados no terminal

**Descrição:** Ao final da execução, o sistema deve imprimir no terminal, para cada categoria (em ordem de ranking): número de vértices, número de arestas, tamanho do clique máximo, membros do clique com seus alcances, alcance total e a adesão estimada (curva de prova social). Deve destacar a melhor categoria para a campanha de reforço.

---

### RF-07 — Geração de relatório HTML interativo

**Descrição:** O sistema deve gerar um arquivo HTML autocontido com:

| Aba | Conteúdo |
|---|---|
| Visão Geral | Tabela de ranking + dois gráficos de barras (Chart.js): clique máximo e alcance por categoria |
| Usuários | Tabela com todos os usuários, alcance e preferências; linhas de membros de clique destacadas |
| Interações | Grafo global de todos os usuários com arestas coloridas pelo score de interação |
| `<Categoria>` (uma por categoria) | Grafo interativo (vis.js), stat cards, legenda e lista de membros do clique |
| Estatísticas | Metadados da execução (seed, config), tempos por fase (geração, análise, relatório, total), estatísticas do grafo de interações e esforço computacional do solver por categoria |

**Critério de aceite:**
- Nós do clique são exibidos em laranja; demais em azul.
- Arestas do clique são contínuas e laranja; demais são tracejadas e cinza.
- Redes vis.js são inicializadas de forma lazy (apenas na primeira exibição da aba).
- O clique em um item da tabela de ranking navega para a aba da categoria correspondente.
- A aba Estatísticas exibe `reportTimeMs` e `totalTimeMs` corretamente medidos (não zero).

---

### RF-08 — Configuração do caminho de saída do relatório

**Descrição:** O caminho do arquivo HTML gerado deve ser configurável por meio da constante `reportOutputPath` em `src/config/config.ts`. O padrão é `"report.html"` na raiz do projeto.

---

## 4. Requisitos Não Funcionais

### RNF-01 — Desempenho

**Descrição:** Com os parâmetros padrão (`numUsers = 30`, `prefProb = 0.5`), em que o maior grafo por categoria tem `|V_a| ≤ 20`, a execução completa (geração + análise + relatório) deve terminar em menos de 30 segundos em hardware de uso geral. O fator determinante do custo O(2ⁿ · n²) é o número de usuários elegíveis por categoria (`|V_a|`), não `numUsers`.

**Justificativa:** O baseline é O(2ⁿ · n²) por categoria. Acima de ~25 usuários elegíveis por grafo (`|V_a|`), o tempo pode ser proibitivo — nesses casos use o `GreedySolver` (O(n²)); essa limitação deve ser documentada.

---

### RNF-02 — Reprodutibilidade

**Descrição:** Dada a mesma configuração (em especial o mesmo `seed`), o sistema deve sempre produzir exatamente os mesmos resultados, independentemente do ambiente de execução, sistema operacional ou ordem de chamadas anteriores.

---

### RNF-03 — Manutenibilidade

**Descrição:** O código deve ser organizado em módulos com responsabilidades únicas e bem definidas. Cada classe deve ser testável de forma isolada, sem dependência de estado global.

**Estrutura de módulos:**

```
src/
├── config/      — configuração da simulação
├── models/      — contratos de dados (interfaces TypeScript) e estrutura Graph
├── services/    — lógica de negócio (generator, analyzer, solver)
├── reports/     — geração de saída (HTML) e compilação de estatísticas
└── __tests__/   — testes unitários (vitest)
```

---

### RNF-04 — Testabilidade

**Descrição:** Todas as classes de serviço (`Graph`, `BruteSolver`, `InstanceGenerator`, `ViralAnalyzer`) devem possuir cobertura de testes unitários utilizando o framework **vitest**, cobrindo casos normais, limítrofes e de erro.

**Comando:** `npm test`

---

### RNF-05 — Portabilidade

**Descrição:** O sistema deve executar em qualquer sistema operacional (Windows, macOS, Linux) com Node.js 18+ instalado, sem configuração adicional além de `npm install`.

---

### RNF-06 — Segurança de tipos

**Descrição:** O projeto deve ser escrito em TypeScript estrito, sem uso de `any` implícito. Todas as interfaces de dados devem ser declaradas em `src/models/models.ts`.

---

### RNF-07 — Relatório autocontido

**Descrição:** O arquivo `report.html` gerado deve funcionar corretamente ao ser aberto diretamente em um navegador moderno, sem servidor web, sem assets externos além de CDNs públicos (vis.js e Chart.js).

---

## 5. Requisitos de Interface

### 5.1 Interface de Linha de Comando

| Comando | Descrição |
|---|---|
| `npm start` | Executa a simulação completa e gera `report.html` |
| `npm test` | Executa os testes unitários com vitest |
| `npm run build` | Compila o TypeScript para JavaScript em `dist/` |

### 5.2 Interface de Configuração

O usuário interage com o sistema exclusivamente por meio do arquivo `src/config/config.ts`. Nenhum argumento de linha de comando é suportado na versão atual.

### 5.3 Interface de Saída

- **Terminal:** Texto formatado com ranking de categorias.
- **report.html:** Arquivo HTML gerado na raiz do projeto (caminho configurável via `reportOutputPath`).

---

## 6. Restrições e Premissas

| # | Restrição / Premissa |
|---|---|
| C-01 | O algoritmo de clique máximo é força bruta — não adequado para grafos com mais de ~25 vértices por categoria |
| C-02 | Os dados de usuários são sintéticos; o sistema não processa dados reais de redes sociais |
| C-03 | As bibliotecas de visualização (vis.js, Chart.js) são carregadas via CDN — o relatório requer conexão com internet para exibir corretamente os gráficos |
| C-04 | O sistema não persiste dados entre execuções; cada `npm start` é independente |
| C-05 | A linguagem padrão da interface do terminal e do relatório é Português (Brasil) |

---

## 7. Casos de Uso Informais

### UC-01 — Explorar impacto do threshold

**Ator:** Estudante  
**Fluxo:** O estudante edita `threshold` de 0.6 para 0.3 em `config.ts`, aumentando a densidade dos grafos. Executa `npm start` e observa cliques maiores e alcance agregado mais alto no relatório.

### UC-02 — Comparar categorias de conteúdo

**Ator:** Pesquisador  
**Fluxo:** O pesquisador adiciona novas entradas em `categories` (ex.: `"gaming"`, `"fitness"`), ajusta `seed` para um novo cenário e roda a simulação. O relatório exibe uma aba por categoria com grafo e métricas individuais.

### UC-03 — Reproduzir um experimento

**Ator:** Educador  
**Fluxo:** O educador distribui o arquivo `config.ts` com uma `seed` específica. Todos os alunos executam `npm start` e obtêm exatamente o mesmo relatório, permitindo análise coletiva dos resultados.

### UC-04 — Rodar testes unitários

**Ator:** Desenvolvedor  
**Fluxo:** Após modificar a lógica do `BruteSolver`, o desenvolvedor executa `npm test`. Os testes validam que o solver retorna cliques válidos e máximos nos casos conhecidos, garantindo que a modificação não introduziu regressões.

---

## 8. Histórico de Revisões

| Versão | Data | Descrição |
|---|---|---|
| 1.0 | 2026-04-29 | Versão inicial — cobre todos os requisitos da implementação atual |
| 1.1 | 2026-04-30 | Adição da aba Estatísticas (RF-07); movimentação de `Graph` para `src/models/`; `BruteSolver.solve()` passa a retornar `SolveResult`; novos tipos `SimulationStats`, `CategoryTimingEntry`; `ReportGenerator.buildStats()` centraliza cálculo de métricas |
