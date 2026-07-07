import { writeFileSync } from "node:fs";
import type {
  ProblemInstance,
  GraphNodeData,
  GraphEdgeData,
  CategoryResult,
  GeneratorOptions,
  SimulationStats,
  BenchmarkReport,
} from "../models/models.js";

/**
 * Gerador do relatório HTML interativo de análise de cliques.
 *
 * Produz um arquivo HTML autocontido com:
 * - Navegação por abas (Visão Geral, Usuários, uma aba por categoria)
 * - Gráficos de barras comparativos via Chart.js (CDN)
 * - Grafos interativos por categoria via vis.js Network (CDN, lazy-init)
 * - Tabela completa de usuários com preferências por categoria
 *
 * Uso: `new ReportGenerator().generate(instance, ranked)`.
 */
export class ReportGenerator {
  /** Converte um nome de categoria em slug seguro para IDs HTML e chaves JS. */
  private static slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  /** Formata um inteiro com separador de milhar no padrão pt-BR. */
  private static fmtN(n: number): string {
    return n.toLocaleString("pt-BR");
  }

  /** Capitaliza a primeira letra de uma string. */
  private static capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * Gera a atribuição JS da função de inicialização vis.js para uma categoria.
   * A função é armazenada em `netInits[slug]` e chamada apenas na primeira exibição
   * da aba, evitando problemas de renderização em contêineres ocultos (display:none).
   */
  private static buildNetworkFn(r: CategoryResult): string {
    const id = ReportGenerator.slugify(r.category);

    const visNodes = r.nodes.map((n: GraphNodeData) => ({
      id: n.id,
      label: n.label,
      color: {
        background: n.inClique ? "#eb6834" : "#2a78d6",
        border: n.inClique ? "#b34a1e" : "#1c5cab",
        highlight: {
          background: n.inClique ? "#FFB05A" : "#6BA3D6",
          border: "#555",
        },
      },
      font: { color: "#fff", size: 13 },
      size: n.inClique ? 28 : 20,
      borderWidth: n.inClique ? 3 : 1,
    }));

    const visEdges = r.edges.map((e: GraphEdgeData) => ({
      from: e.from,
      to: e.to,
      color: {
        color: e.inClique ? "#eb6834" : "#ccc",
        opacity: e.inClique ? 1.0 : 0.6,
      },
      width: e.inClique ? 3 : 1,
      dashes: !e.inClique,
    }));

    return `netInits['${id}']=function(){
    var c=document.getElementById('net-${id}');
    if(!c)return;
    new vis.Network(c,{
      nodes:new vis.DataSet(${JSON.stringify(visNodes)}),
      edges:new vis.DataSet(${JSON.stringify(visEdges)})
    },{
      physics:{barnesHut:{gravitationalConstant:-5000,springLength:130},stabilization:{iterations:200,fit:true}},
      edges:{smooth:{type:'continuous'}},
      interaction:{hover:true}
    });
  };`;
  }

  /**
   * Gera o bloco HTML de uma categoria: header, stat cards, legenda, grafo e membros do clique.
   * @param r    - dados da categoria
   * @param rank - posição no ranking (1 = melhor)
   * @param q    - adesão por endosso único, para exibir a curva de adesão da categoria
   */
  private static buildCategorySection(
    r: CategoryResult,
    rank: number,
    q: number,
  ): string {
    const id = ReportGenerator.slugify(r.category);
    const medal =
      rank === 1
        ? "&#127945;"
        : rank === 2
          ? "&#129352;"
          : rank === 3
            ? "&#129353;"
            : `#${rank}`;

    const memberCards = r.cliqueMembers
      .map(
        (m) =>
          `<div class="member-card">
          <span class="member-name">${m.name}</span>
          <span class="member-reach">${ReportGenerator.fmtN(m.reach)} seguidores</span>
        </div>`,
      )
      .join("");

    return `<section class="card cat-section">
    <div class="cat-header">
      <span class="rank-badge">${medal}</span>
      <h2>${ReportGenerator.capitalize(r.category)}</h2>
      <span class="clique-pill">Clique: ${r.cliqueSize}</span>
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(5,1fr)">
      <div class="stat-card"><span class="stat-val">${r.graphVertices}</span><span class="stat-lbl">v&#233;rtices</span></div>
      <div class="stat-card"><span class="stat-val">${r.graphEdgeCount}</span><span class="stat-lbl">arestas</span></div>
      <div class="stat-card accent"><span class="stat-val">${r.cliqueSize}</span><span class="stat-lbl">clique m&#225;ximo</span></div>
      <div class="stat-card"><span class="stat-val">${ReportGenerator.fmtN(r.aggregateReach)}</span><span class="stat-lbl">alcance total</span></div>
      <div class="stat-card accent"><span class="stat-val">${(r.adoptionProbability * 100).toFixed(1)}%</span><span class="stat-lbl">ades&#227;o estimada</span></div>
    </div>
    <p class="users-subtitle" style="margin:-.4rem 0 1rem">
      &#128101; Prova social: com <strong>${r.cliqueSize}</strong> endosso(s) simult&#226;neo(s) e q = ${(q * 100).toFixed(0)}%,
      ades&#227;o estimada <strong>&#8776; ${(r.adoptionProbability * 100).toFixed(1)}%</strong>
      &nbsp;<span style="opacity:.8">(p = 1 &#8722; (1 &#8722; q)<sup>k</sup>)</span>
    </p>
    <div class="graph-legend">
      <span><span class="dot dot-clique"></span>Membro do clique</span>
      <span><span class="dot dot-regular"></span>Fora do clique</span>
      <span><span class="line line-clique"></span>Aresta do clique</span>
      <span><span class="line line-regular"></span>Aresta comum</span>
    </div>
    <div id="net-${id}" class="network-box"></div>
    <div class="members-section">
      <h4>Membros do Clique M&#225;ximo</h4>
      <div class="members-grid">${memberCards || '<span class="no-members">Nenhum clique encontrado</span>'}</div>
    </div>
  </section>`;
  }

  /**
   * Gera a tabela completa de usuários da instância.
   * Usuários que participam de ao menos um clique ficam destacados.
   *
   * @param instance      - instância do problema
   * @param cliqueUserIds - conjunto de IDs de usuários presentes em algum clique
   */
  private static buildUsersTable(
    instance: ProblemInstance,
    cliqueUserIds: Set<number>,
  ): string {
    const catHeaders = instance.categories
      .map(
        (c) =>
          `<th class="pref-th" title="${c}">${ReportGenerator.capitalize(c)}</th>`,
      )
      .join("");

    const rows = instance.users
      .map((u) => {
        const inAnyClique = cliqueUserIds.has(u.id);
        const prefCells = instance.categories
          .map((c) =>
            u.preferences[c]
              ? `<td class="pref-cell"><span class="pref-yes">&#10003;</span></td>`
              : `<td class="pref-cell"><span class="pref-no">&#8722;</span></td>`,
          )
          .join("");
        return `<tr${inAnyClique ? ' class="clique-user-row"' : ""}>
        <td>${u.id + 1}</td>
        <td class="user-name-cell">${u.name}${inAnyClique ? ' <span class="in-clique-badge">clique</span>' : ""}</td>
        <td class="reach-cell">${ReportGenerator.fmtN(u.reach)}</td>
        ${prefCells}
      </tr>`;
      })
      .join("");

    const totalReach = instance.users.reduce((s, u) => s + u.reach, 0);

    return `<section class="card">
    <h2>Usu&#225;rios da Inst&#226;ncia</h2>
    <p class="users-subtitle">${instance.users.length} usu&#225;rios &middot; alcance total da rede: ${ReportGenerator.fmtN(totalReach)} &middot; linhas destacadas = membros de algum clique</p>
    <div class="table-scroll">
      <table class="users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Alcance</th>
            ${catHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>`;
  }

  private static buildInteractionsNetworkFn(instance: ProblemInstance): string {
    const maxReach = Math.max(...instance.users.map((u) => u.reach));
    const visNodes = instance.users.map((u) => {
      const t = maxReach > 0 ? u.reach / maxReach : 0;
      const r = Math.round(219 + (30 - 219) * t);
      const g = Math.round(191 + (64 - 191) * t);
      const b = Math.round(254 + (175 - 254) * t);
      const bg = `rgb(${r},${g},${b})`;
      return {
        id: u.id,
        label: u.name,
        title: `${u.name}\n${ReportGenerator.fmtN(u.reach)} seguidores`,
        color: {
          background: bg,
          border: "#1e40af",
          highlight: { background: "#93c5fd", border: "#1e3a8a" },
        },
        font: { color: t > 0.55 ? "#fff" : "#1e3748", size: 12 },
        size: 20,
      };
    });

    const visEdges = Array.from(instance.interactions.entries()).map(
      ([key, score]) => {
        const [from, to] = key.split(",").map(Number);
        const pct = Math.round(score * 100);
        const er = Math.round(226 + (242 - 226) * score);
        const eg = Math.round(232 + (142 - 232) * score);
        const eb = Math.round(240 + (43 - 240) * score);
        const edgeColor = `rgb(${er},${eg},${eb})`;
        const aboveThreshold = score >= instance.threshold;
        return {
          from,
          to,
          label: `${pct}%`,
          width: 1 + score * 5,
          dashes: !aboveThreshold,
          color: {
            color: edgeColor,
            opacity: 0.3 + score * 0.7,
            highlight: aboveThreshold ? "#e11d48" : edgeColor,
          },
          font: { size: 9, color: "#718096", align: "middle", strokeWidth: 0 },
        };
      },
    );

    return `netInits['interactions']=function(){
  var c=document.getElementById('net-interactions');
  if(!c)return;
  new vis.Network(c,{
    nodes:new vis.DataSet(${JSON.stringify(visNodes)}),
    edges:new vis.DataSet(${JSON.stringify(visEdges)})
  },{
    physics:{barnesHut:{gravitationalConstant:-8000,springLength:160,centralGravity:0.2,springConstant:0.04,damping:0.09},stabilization:{iterations:300,fit:true}},
    edges:{smooth:{type:'continuous'},font:{size:9,color:'#718096',align:'middle',strokeWidth:0}},
    nodes:{borderWidth:1},
    interaction:{hover:true,tooltipDelay:150},
    layout:{improvedLayout:true}
  });
};`;
  }

  private static buildInteractionsSection(instance: ProblemInstance): string {
    const scores = Array.from(instance.interactions.values());
    const totalPairs = scores.length;
    const mean =
      totalPairs > 0 ? scores.reduce((s, v) => s + v, 0) / totalPairs : 0;
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 1
          ? sorted[mid]
          : (sorted[mid - 1] + sorted[mid]) / 2;
    const aboveThreshold = scores.filter((v) => v >= instance.threshold).length;

    return `<section class="card">
    <h2>Grafo de Intera&#231;&#245;es entre Usu&#225;rios</h2>
    <p class="users-subtitle">${totalPairs} pares &middot; limiar = ${instance.threshold.toFixed(2)} &middot; espessura e cor da aresta proporcionais ao score</p>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val">${totalPairs}</span><span class="stat-lbl">pares totais</span></div>
      <div class="stat-card"><span class="stat-val">${Math.round(mean * 100)}%</span><span class="stat-lbl">m&#233;dia</span></div>
      <div class="stat-card"><span class="stat-val">${Math.round(median * 100)}%</span><span class="stat-lbl">mediana</span></div>
      <div class="stat-card accent"><span class="stat-val">${aboveThreshold}</span><span class="stat-lbl">acima do limiar</span></div>
    </div>
    <div class="graph-legend">
      <span><span class="dot" style="background:#1e40af"></span>Alto alcance</span>
      <span><span class="dot" style="background:#dbeafe;border:1px solid #93c5fd"></span>Baixo alcance</span>
      <span><span class="line" style="background:#eb6834"></span>Score alto</span>
      <span><span class="line" style="background:#e2e8f0"></span>Score baixo</span>
      <span><span class="line line-regular"></span>Abaixo do limiar</span>
    </div>
    <div id="net-interactions" class="network-box network-box--tall"></div>
  </section>`;
  }

  /** Formata um número de ms com 3 casas decimais para exibição. */
  private static fmtMs(ms: number): string {
    return ms.toFixed(3) + " ms";
  }

  /**
   * Calcula todas as estatísticas derivadas de uma execução da simulação.
   * Centraliza a lógica de montagem de `SimulationStats` fora de `main.ts`.
   *
   * @param instance          - instância do problema gerada
   * @param ranked            - resultados rankeados da análise
   * @param generationTimeMs  - tempo de geração da instância (ms)
   * @param analysisTimeMs    - tempo total de análise (ms)
   */
  static buildStats(
    instance: ProblemInstance,
    ranked: CategoryResult[],
    config: GeneratorOptions,
    generationTimeMs: number,
    analysisTimeMs: number,
    adoptionPerEndorsement: number,
  ): SimulationStats {
    const allScores = Array.from(instance.interactions.values());
    const totalPossiblePairs = allScores.length;
    const connectionsAboveThreshold = allScores.filter((s) => s >= instance.threshold).length;
    const networkDensity =
      totalPossiblePairs > 0 ? connectionsAboveThreshold / totalPossiblePairs : 0;

    const cliqueSizes = ranked.map((r) => r.cliqueSize);
    const totalCombinationsTested = ranked.reduce(
      (s, r) => s + (r.combinationsTested ?? 0),
      0,
    );
    const avgCliqueSize =
      cliqueSizes.length > 0
        ? cliqueSizes.reduce((a, b) => a + b, 0) / cliqueSizes.length
        : 0;
    const highestReachCategory =
      ranked.length > 0
        ? ranked.reduce((best, r) => (r.aggregateReach > best.aggregateReach ? r : best)).category
        : "";

    return {
      timestamp: new Date().toISOString(),
      config,
      generationTimeMs,
      analysisTimeMs,
      reportTimeMs: 0,
      totalTimeMs: 0,
      categoryTimings: ranked.map((r) => ({
        category: r.category,
        solveTimeMs: r.solveTime ?? 0,
        combinationsTested: r.combinationsTested ?? 0,
      })),
      totalPossiblePairs,
      connectionsAboveThreshold,
      networkDensity,
      totalCombinationsTested,
      avgCliqueSize,
      maxCliqueSize: cliqueSizes.length > 0 ? Math.max(...cliqueSizes) : 0,
      minCliqueSize: cliqueSizes.length > 0 ? Math.min(...cliqueSizes) : 0,
      highestReachCategory,
      adoptionPerEndorsement,
    };
  }

  /** Gera o HTML completo da aba Estatísticas. */
  private static buildStatsSection(stats: SimulationStats): string {
    const dt = new Date(stats.timestamp).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    });
    const cats = stats.config.categories.join(", ");
    const reachRange = `${ReportGenerator.fmtN(stats.config.reachLow)} – ${ReportGenerator.fmtN(stats.config.reachHigh)}`;

    const timingRows = stats.categoryTimings
      .map(
        (t) => `<tr>
          <td>${ReportGenerator.capitalize(t.category)}</td>
          <td class="reach-cell">${t.solveTimeMs.toFixed(3)}</td>
          <td class="reach-cell">${ReportGenerator.fmtN(t.combinationsTested)}</td>
        </tr>`,
      )
      .join("");

    return `<section class="card">
    <h2>Metadados da Simula&#231;&#227;o</h2>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val" style="font-size:1rem">${dt}</span><span class="stat-lbl">data / hora</span></div>
      <div class="stat-card"><span class="stat-val">${stats.config.seed}</span><span class="stat-lbl">seed (PRNG)</span></div>
      <div class="stat-card"><span class="stat-val">${stats.config.numUsers}</span><span class="stat-lbl">usu&#225;rios</span></div>
      <div class="stat-card"><span class="stat-val">${stats.config.categories.length}</span><span class="stat-lbl">categorias</span></div>
    </div>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val">${stats.config.threshold.toFixed(2)}</span><span class="stat-lbl">limiar (threshold)</span></div>
      <div class="stat-card"><span class="stat-val">${(stats.config.prefProb * 100).toFixed(0)}%</span><span class="stat-lbl">prob. prefer&#234;ncia</span></div>
      <div class="stat-card"><span class="stat-val" style="font-size:1rem">${reachRange}</span><span class="stat-lbl">alcance m&#237;n – m&#225;x</span></div>
      <div class="stat-card accent"><span class="stat-val">${(stats.adoptionPerEndorsement * 100).toFixed(0)}%</span><span class="stat-lbl">q (ades&#227;o/endosso)</span></div>
    </div>
    <p class="users-subtitle" style="margin-top:.5rem">Categorias: ${cats}</p>
  </section>

  <section class="card">
    <h2>Desempenho de Processamento</h2>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val" style="font-size:1.1rem">${ReportGenerator.fmtMs(stats.generationTimeMs)}</span><span class="stat-lbl">gera&#231;&#227;o da inst&#226;ncia</span></div>
      <div class="stat-card"><span class="stat-val" style="font-size:1.1rem">${ReportGenerator.fmtMs(stats.analysisTimeMs)}</span><span class="stat-lbl">an&#225;lise (todas categorias)</span></div>
      <div class="stat-card"><span class="stat-val" style="font-size:1.1rem">${ReportGenerator.fmtMs(stats.reportTimeMs)}</span><span class="stat-lbl">gera&#231;&#227;o do relat&#243;rio</span></div>
      <div class="stat-card accent"><span class="stat-val" style="font-size:1.1rem">${ReportGenerator.fmtMs(stats.totalTimeMs)}</span><span class="stat-lbl">tempo total</span></div>
    </div>
    <div class="chart-box" style="max-width:640px;margin-top:.5rem">
      <canvas id="chart-timing"></canvas>
    </div>
    <div class="table-scroll" style="margin-top:1rem">
      <table class="users-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th style="text-align:right">Tempo Solver (ms)</th>
            <th style="text-align:right">Subconjuntos Testados</th>
          </tr>
        </thead>
        <tbody>${timingRows}</tbody>
      </table>
    </div>
  </section>

  <section class="card">
    <h2>Estat&#237;sticas do Grafo de Intera&#231;&#245;es</h2>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val">${ReportGenerator.fmtN(stats.totalPossiblePairs)}</span><span class="stat-lbl">pares poss&#237;veis C(n,2)</span></div>
      <div class="stat-card accent"><span class="stat-val">${ReportGenerator.fmtN(stats.connectionsAboveThreshold)}</span><span class="stat-lbl">conex&#245;es acima do limiar</span></div>
      <div class="stat-card"><span class="stat-val">${(stats.networkDensity * 100).toFixed(1)}%</span><span class="stat-lbl">densidade da rede</span></div>
      <div class="stat-card"><span class="stat-val">${stats.config.threshold.toFixed(2)}</span><span class="stat-lbl">limiar aplicado</span></div>
    </div>
  </section>

  <section class="card">
    <h2>Esfor&#231;o Computacional (Solver)</h2>
    <div class="stats-row">
      <div class="stat-card accent"><span class="stat-val">${ReportGenerator.fmtN(stats.totalCombinationsTested)}</span><span class="stat-lbl">subconjuntos testados (total)</span></div>
      <div class="stat-card"><span class="stat-val">${stats.avgCliqueSize.toFixed(2)}</span><span class="stat-lbl">tamanho m&#233;dio de clique</span></div>
      <div class="stat-card"><span class="stat-val">${stats.maxCliqueSize}</span><span class="stat-lbl">maior clique</span></div>
      <div class="stat-card"><span class="stat-val">${stats.minCliqueSize}</span><span class="stat-lbl">menor clique</span></div>
    </div>
    <div class="stats-row" style="grid-template-columns:1fr">
      <div class="stat-card accent"><span class="stat-val">${ReportGenerator.capitalize(stats.highestReachCategory)}</span><span class="stat-lbl">categoria com maior alcance agregado</span></div>
    </div>
  </section>`;
  }

  /**
   * Gera o conteúdo da aba Benchmark: KPIs, três gráficos (tempo×n em escala log,
   * acerto do ótimo por n, e trade-off aceleração×qualidade por experimento) e a
   * tabela de agregados. Se `bench.json` não foi carregado, mostra um aviso com o
   * comando `npm run bench`.
   */
  private static buildBenchmarkSection(benchmark?: BenchmarkReport): string {
    if (!benchmark || benchmark.runs.length === 0) {
      return `<section class="card">
    <h2>Benchmark: For&#231;a Bruta &times; Heur&#237;stica</h2>
    <p class="users-subtitle">Nenhum dado de benchmark encontrado. Rode <code>npm run bench</code> para gerar <code>bench.json</code> e depois <code>npm start</code> novamente &mdash; a compara&#231;&#227;o baseline &times; heur&#237;stica (tempo e qualidade por tamanho de entrada) aparecer&#225; aqui.</p>
  </section>`;
    }

    const aggs = benchmark.aggregates;
    const last = aggs[aggs.length - 1];
    const totalRuns = benchmark.runs.length;
    const totalOptimal = benchmark.runs.filter((r) => r.optimal).length;
    const totalSub = totalRuns - totalOptimal;
    const globalOptimalRate =
      totalRuns > 0 ? (totalOptimal / totalRuns) * 100 : 0;

    const rows = aggs
      .map((a) => {
        const sub = a.suboptimalCount > 0;
        return `<tr${sub ? ' class="clique-user-row"' : ""}>
          <td>${a.n}</td>
          <td class="reach-cell">${a.meanTimeBruteMs.toFixed(3)}</td>
          <td class="reach-cell">${a.meanTimeGreedyMs.toFixed(3)}</td>
          <td class="reach-cell">${a.speedup.toFixed(1)}&times;</td>
          <td class="reach-cell">${a.meanSizeBrute.toFixed(2)}</td>
          <td class="reach-cell">${a.meanSizeGreedy.toFixed(2)}</td>
          <td class="reach-cell">${(a.qualityRatio * 100).toFixed(1)}%</td>
          <td class="reach-cell">${(a.optimalRate * 100).toFixed(0)}%</td>
          <td class="reach-cell">${a.suboptimalCount}${sub ? ' <span class="in-clique-badge" style="background:#d03b3b">sub&#243;timo</span>' : ""}</td>
        </tr>`;
      })
      .join("");

    return `<section class="card">
    <h2>Benchmark: For&#231;a Bruta (exato) &times; Heur&#237;stica (guloso)</h2>
    <p class="users-subtitle">Compara&#231;&#227;o real por tamanho de entrada (n = v&#233;rtices do grafo), ${benchmark.seeds.length} seeds por n, &tau; = ${benchmark.threshold.toFixed(2)}. A for&#231;a bruta garante o &#243;timo mas &#233; O(2&#8319;&middot;n&#178;) (teto n&le;${benchmark.bruteCeiling}); o guloso &#233; O(n&#178;) e troca otimalidade por escala. O ponto central da atividade 7: h&#225; casos em que o guloso <strong>n&#227;o acha o &#243;timo, mas resolve muito mais r&#225;pido</strong> &mdash; destacados em vermelho abaixo.</p>
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val">n&le;${benchmark.bruteCeiling}</span><span class="stat-lbl">teto vi&#225;vel da for&#231;a bruta</span></div>
      <div class="stat-card accent"><span class="stat-val">${last ? last.speedup.toFixed(0) : "0"}&times;</span><span class="stat-lbl">guloso mais r&#225;pido (n=${last ? last.n : 0})</span></div>
      <div class="stat-card"><span class="stat-val">${globalOptimalRate.toFixed(0)}%</span><span class="stat-lbl">acerto do &#243;timo (global)</span></div>
      <div class="stat-card"><span class="stat-val">${totalSub}</span><span class="stat-lbl">casos sub&#243;timos (de ${totalRuns})</span></div>
    </div>
    <div class="chart-row">
      <div class="chart-box"><canvas id="chart-bench-time"></canvas></div>
      <div class="chart-box"><canvas id="chart-bench-quality"></canvas></div>
    </div>
    <div class="chart-box" style="max-width:760px;margin:0 auto 1rem"><canvas id="chart-bench-tradeoff"></canvas></div>
    <div class="graph-legend">
      <span><span class="dot" style="background:#eb6834"></span>Guloso atingiu o &#243;timo</span>
      <span><span class="dot" style="background:#eb6834;box-shadow:0 0 0 2px #d03b3b"></span>Guloso sub&#243;timo (mais r&#225;pido, clique menor)</span>
    </div>
    <div class="table-scroll" style="margin-top:1rem">
      <table class="users-table">
        <thead>
          <tr>
            <th>n</th>
            <th style="text-align:right">t Bruta (ms)</th>
            <th style="text-align:right">t Guloso (ms)</th>
            <th style="text-align:right">Speedup</th>
            <th style="text-align:right">|C| Bruta</th>
            <th style="text-align:right">|C| Guloso</th>
            <th style="text-align:right">Qualidade</th>
            <th style="text-align:right">% &#211;timo</th>
            <th style="text-align:right">Sub&#243;timos</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>`;
  }

  /**
   * Gera e salva o relatório HTML completo em `outputPath`.
   *
   * As redes vis.js são inicializadas de forma lazy (na primeira exibição da aba)
   * para evitar problemas de renderização em contêineres ocultos.
   *
   * @param instance   - instância do problema
   * @param ranked     - resultados ordenados por (cliqueSize DESC, aggregateReach DESC)
   * @param stats      - estatísticas de execução (timing, metadados, métricas)
   * @param outputPath - caminho do arquivo HTML de saída (padrão: `report.html`)
   */
  generate(
    instance: ProblemInstance,
    ranked: CategoryResult[],
    stats: SimulationStats,
    outputPath = "report.html",
    benchmark?: BenchmarkReport,
  ): void {
    const reportStart = performance.now();
    const labels = JSON.stringify(ranked.map((r) => r.category));
    const cliqueSizes = JSON.stringify(ranked.map((r) => r.cliqueSize));
    const reaches = JSON.stringify(ranked.map((r) => r.aggregateReach));

    // Curva de adesão p = 1 − (1 − q)^k para o gráfico da aba Visão Geral.
    const q = stats.adoptionPerEndorsement;
    const qPct = (q * 100).toFixed(0);
    const maxCliqueK = ranked.reduce((m, r) => Math.max(m, r.cliqueSize), 0);
    const curveMaxK = Math.max(maxCliqueK + 2, 6);
    const adoptionCurve: Array<{ x: number; y: number }> = [];
    for (let k = 1; k <= curveMaxK; k++) {
      adoptionCurve.push({ x: k, y: Number((1 - (1 - q) ** k).toFixed(4)) });
    }
    const adoptionCurveJson = JSON.stringify(adoptionCurve);
    const adoptionPointsJson = JSON.stringify(
      ranked
        .filter((r) => r.cliqueSize > 0)
        .map((r) => ({
          x: r.cliqueSize,
          y: Number(r.adoptionProbability.toFixed(4)),
          label: ReportGenerator.capitalize(r.category),
        })),
    );

    // ── Dados da aba Benchmark (só quando bench.json foi carregado) ──────────
    const hasBench = !!benchmark && benchmark.runs.length > 0;
    const EPS_MS = 0.001; // piso p/ escala logarítmica (tempos > 0)
    const benchTimeBruteJson = hasBench
      ? JSON.stringify(
          benchmark!.aggregates.map((a) => ({
            x: a.n,
            y: Math.max(a.meanTimeBruteMs, EPS_MS),
          })),
        )
      : "[]";
    const benchTimeGreedyJson = hasBench
      ? JSON.stringify(
          benchmark!.aggregates.map((a) => ({
            x: a.n,
            y: Math.max(a.meanTimeGreedyMs, EPS_MS),
          })),
        )
      : "[]";
    const benchQualityJson = hasBench
      ? JSON.stringify(
          benchmark!.aggregates.map((a) => ({
            x: a.n,
            y: Number((a.optimalRate * 100).toFixed(1)),
          })),
        )
      : "[]";
    const benchTradeoffJson = (optimal: boolean): string =>
      JSON.stringify(
        benchmark!.runs
          .filter((r) => r.optimal === optimal)
          .map((r) => ({
            x:
              Math.max(r.timeBruteMs, EPS_MS) / Math.max(r.timeGreedyMs, EPS_MS),
            y:
              r.sizeBrute > 0
                ? Number(((r.sizeGreedy / r.sizeBrute) * 100).toFixed(1))
                : 100,
            n: r.n,
            seed: r.seed,
          })),
      );
    const benchTradeoffOptimalJson = hasBench ? benchTradeoffJson(true) : "[]";
    const benchTradeoffSubJson = hasBench ? benchTradeoffJson(false) : "[]";

    // Blocos Chart.js da aba Benchmark — só emitidos quando há dados (senão os
    // canvases não existem e chamar new Chart lançaria erro).
    const benchmarkChartsJs = hasBench
      ? `
  new Chart(document.getElementById('chart-bench-time'), {
    type: 'line',
    data: { datasets: [
      { label: 'Força bruta (exato)', data: ${benchTimeBruteJson},
        borderColor: '#2a78d6', backgroundColor: '#2a78d6', borderWidth: 2, pointRadius: 3, tension: 0.2 },
      { label: 'Guloso (heurística)', data: ${benchTimeGreedyJson},
        borderColor: '#eb6834', backgroundColor: '#eb6834', borderWidth: 2, pointRadius: 3, tension: 0.2 }
    ] },
    options: {
      responsive: true, parsing: false,
      plugins: {
        title: { display: true, text: 'Tempo médio × tamanho de entrada (escala log)', font: { size: 14 } },
        legend: { display: true, position: 'bottom' },
        tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label + ': n=' + ctx.raw.x + ' → ' + ctx.raw.y.toFixed(3) + ' ms'; } } }
      },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'n (vértices do grafo)' }, ticks: { stepSize: 2 } },
        y: { type: 'logarithmic', title: { display: true, text: 'Tempo do solver (ms, log)' } }
      }
    }
  });

  new Chart(document.getElementById('chart-bench-quality'), {
    type: 'line',
    data: { datasets: [
      { label: '% de acerto do ótimo', data: ${benchQualityJson},
        borderColor: '#1baf7a', backgroundColor: '#1baf7a', borderWidth: 2, pointRadius: 3, tension: 0.2, fill: false }
    ] },
    options: {
      responsive: true, parsing: false,
      plugins: {
        title: { display: true, text: 'Qualidade do guloso: acerto do ótimo por n', font: { size: 14 } },
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx){ return 'n=' + ctx.raw.x + ' → ' + ctx.raw.y + '% ótimo'; } } }
      },
      scales: {
        x: { type: 'linear', title: { display: true, text: 'n (vértices do grafo)' }, ticks: { stepSize: 2 } },
        y: { beginAtZero: true, suggestedMax: 100, title: { display: true, text: '% de runs com clique ótimo' }, ticks: { callback: function(v){ return v + '%'; } } }
      }
    }
  });

  new Chart(document.getElementById('chart-bench-tradeoff'), {
    type: 'scatter',
    data: { datasets: [
      { label: 'Guloso ótimo', data: ${benchTradeoffOptimalJson},
        backgroundColor: '#eb6834', borderColor: '#eb6834', pointRadius: 5, pointHoverRadius: 7 },
      { label: 'Guloso subótimo (mais rápido, clique menor)', data: ${benchTradeoffSubJson},
        backgroundColor: '#eb6834', borderColor: '#d03b3b', borderWidth: 2, pointRadius: 7, pointHoverRadius: 9 }
    ] },
    options: {
      responsive: true, parsing: false,
      plugins: {
        title: { display: true, text: 'Trade-off: aceleração × qualidade (cada ponto = um experimento)', font: { size: 14 } },
        legend: { display: true, position: 'bottom' },
        tooltip: { callbacks: { label: function(ctx){ var d = ctx.raw; return (ctx.datasetIndex === 1 ? 'subótimo ' : 'ótimo ') + 'n=' + d.n + ' seed=' + d.seed + ': ' + d.x.toFixed(1) + '× mais rápido, qualidade ' + d.y.toFixed(0) + '%'; } } }
      },
      scales: {
        x: { type: 'logarithmic', title: { display: true, text: 'Aceleração vs força bruta (×, log)' } },
        y: { beginAtZero: true, suggestedMax: 105, title: { display: true, text: 'Qualidade |C|guloso / |C|bruta (%)' }, ticks: { callback: function(v){ return v + '%'; } } }
      }
    }
  });`
      : "";

    const cliqueUserIds = new Set<number>(
      ranked.flatMap((r) => r.nodes.filter((n) => n.inClique).map((n) => n.id)),
    );

    const rankingRows = ranked
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td><button class="rank-link" onclick="showTab('${ReportGenerator.slugify(r.category)}')">${ReportGenerator.capitalize(r.category)}</button></td>
        <td>${r.graphVertices}</td>
        <td>${r.graphEdgeCount}</td>
        <td><strong>${r.cliqueSize}</strong></td>
        <td>${ReportGenerator.fmtN(r.aggregateReach)}</td>
        <td>${(r.adoptionProbability * 100).toFixed(1)}%</td>
        <td>${r.cliqueMembers.map((m) => m.name).join(", ") || "&mdash;"}</td>
      </tr>`,
      )
      .join("");

    const catTabBtns = ranked
      .map(
        (r, i) =>
          `<button class="tab-btn" data-tab="${ReportGenerator.slugify(r.category)}" onclick="showTab('${ReportGenerator.slugify(r.category)}')">
          ${ReportGenerator.capitalize(r.category)}<span class="tab-pill${i === 0 ? " best" : ""}">${r.cliqueSize}</span>
        </button>`,
      )
      .join("");

    const catPanels = ranked
      .map(
        (r, i) =>
          `<div id="tab-${ReportGenerator.slugify(r.category)}" class="tab-panel" role="tabpanel">${ReportGenerator.buildCategorySection(r, i + 1, q)}</div>`,
      )
      .join("\n");

    const networkFns = ranked
      .map((r) => ReportGenerator.buildNetworkFn(r))
      .join("\n  ");
    const interactionsNetworkFn =
      ReportGenerator.buildInteractionsNetworkFn(instance);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Click Problem &mdash; An&#225;lise de Cliques</title>
  <script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f0f2f5;color:#2d3748;line-height:1.5}

    header{background:linear-gradient(135deg,#1a365d,#2b6cb0);color:#fff;padding:2rem 2rem 1.5rem;text-align:center}
    header h1{font-size:1.8rem;font-weight:700;margin-bottom:.3rem}
    .subtitle{opacity:.85;font-size:.9rem}

    .tabs-bar{position:sticky;top:0;z-index:200;background:#fff;border-bottom:2px solid #e2e8f0;
              display:flex;align-items:center;gap:.25rem;padding:.6rem 1.5rem;overflow-x:auto;white-space:nowrap;
              scrollbar-width:thin;scrollbar-color:#cbd5e0 transparent}
    .tabs-bar::-webkit-scrollbar{height:4px}
    .tabs-bar::-webkit-scrollbar-thumb{background:#cbd5e0;border-radius:2px}
    .tab-btn{display:inline-flex;align-items:center;gap:.35rem;padding:.45rem 1rem;border:none;
             background:transparent;border-radius:8px;cursor:pointer;font-size:.88rem;color:#718096;
             font-weight:500;transition:background .15s,color .15s;white-space:nowrap}
    .tab-btn:hover{background:#f0f2f5;color:#2d3748}
    .tab-btn.active{background:#2a78d6;color:#fff}
    .tab-pill{display:inline-block;background:#e2e8f0;color:#2d3748;border-radius:12px;
              padding:.05rem .5rem;font-size:.75rem;font-weight:700;min-width:1.4rem;text-align:center}
    .tab-btn.active .tab-pill{background:rgba(255,255,255,.25);color:#fff}
    .tab-pill.best{background:#eb6834;color:#fff}
    .tab-btn.active .tab-pill.best{background:rgba(255,255,255,.3)}
    .tab-divider{width:1px;height:1.5rem;background:#e2e8f0;margin:0 .25rem;flex-shrink:0}

    .tab-panel{display:none}.tab-panel.active{display:block}

    .container{max-width:1100px;margin:0 auto;padding:2rem 1.5rem}
    .card{background:#fff;border-radius:12px;padding:2rem;margin-bottom:1.5rem;box-shadow:0 1px 6px rgba(0,0,0,.08)}
    .card>h2{font-size:1.2rem;color:#1a365d;margin-bottom:1.25rem}

    .chart-row{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem}
    @media(max-width:700px){.chart-row{grid-template-columns:1fr}}
    .chart-box{background:#f7f9fc;border-radius:8px;padding:1rem}
    .chart-box canvas{max-height:250px}

    .table-scroll{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:.88rem}
    th{background:#edf2f7;text-align:left;padding:.55rem .75rem;font-weight:600;border-bottom:2px solid #cbd5e0;white-space:nowrap}
    td{padding:.5rem .75rem;border-bottom:1px solid #e2e8f0;vertical-align:middle}
    tr:hover td{background:#f7fafc}
    .rank-link{background:none;border:none;color:#2a78d6;cursor:pointer;font-size:.88rem;font-weight:500;padding:0;text-decoration:underline}
    .rank-link:hover{color:#2b6cb0}

    .users-subtitle{font-size:.83rem;color:#718096;margin-bottom:1rem}
    .users-table .pref-th{text-align:center;font-size:.78rem;max-width:80px;overflow:hidden;text-overflow:ellipsis}
    .pref-cell{text-align:center}
    .pref-yes{color:#38a169;font-size:1rem;font-weight:700}
    .pref-no{color:#cbd5e0;font-size:1rem}
    .reach-cell{font-variant-numeric:tabular-nums;text-align:right}
    .clique-user-row td{background:#fffaf0}
    .clique-user-row:hover td{background:#fff3e0}
    .user-name-cell{white-space:nowrap}
    .in-clique-badge{background:#eb6834;color:#fff;border-radius:10px;padding:.05rem .5rem;font-size:.7rem;font-weight:700;margin-left:.4rem;vertical-align:middle}

    .cat-section{margin-bottom:0}
    .cat-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem}
    .cat-header h2{font-size:1.25rem;color:#1a365d;flex:1}
    .rank-badge{font-size:1.4rem}
    .clique-pill{background:#eb6834;color:#fff;border-radius:20px;padding:.2rem .85rem;font-size:.82rem;font-weight:700}
    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.1rem}
    @media(max-width:600px){.stats-row{grid-template-columns:repeat(2,1fr)}}
    .stat-card{background:#f7f9fc;border-radius:8px;padding:.9rem;text-align:center;border:1px solid #e2e8f0}
    .stat-card.accent{background:#fff8f0;border-color:#eb6834}
    .stat-val{display:block;font-size:1.45rem;font-weight:700;color:#2d3748}
    .stat-card.accent .stat-val{color:#b34a1e}
    .stat-lbl{font-size:.7rem;color:#718096;text-transform:uppercase;letter-spacing:.05em}
    .graph-legend{display:flex;flex-wrap:wrap;gap:.9rem;font-size:.8rem;color:#718096;margin-bottom:.5rem}
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:.3rem;vertical-align:middle}
    .dot-clique{background:#eb6834}.dot-regular{background:#2a78d6}
    .line{display:inline-block;width:20px;height:3px;margin-right:.3rem;vertical-align:middle;border-radius:2px}
    .line-clique{background:#eb6834}
    .line-regular{background:transparent;border-top:2px dashed #ccc;height:0}
    .network-box{height:360px;border:1px solid #e2e8f0;border-radius:8px;background:#fafbfc;margin-bottom:1.1rem}
    .network-box--tall{height:480px}
    .members-section h4{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#718096;margin-bottom:.65rem}
    .members-grid{display:flex;flex-wrap:wrap;gap:.5rem}
    .member-card{background:#fff8f0;border:1px solid #eb6834;border-radius:8px;padding:.45rem .85rem}
    .member-name{display:block;font-weight:600;font-size:.86rem}
    .member-reach{font-size:.76rem;color:#718096}
    .no-members{color:#a0aec0;font-size:.86rem}

    footer{text-align:center;padding:1.5rem;color:#a0aec0;font-size:.8rem}
  </style>
</head>
<body>

<header>
  <h1>Propaga&#231;&#227;o Viral por Prova Social &amp; Clique M&#225;ximo</h1>
  <p class="subtitle">${instance.users.length} usu&#225;rios &middot; ${instance.categories.length} categorias &middot; limiar = ${instance.threshold.toFixed(2)} &middot; efeito manada via clique</p>
</header>

<nav class="tabs-bar" role="tablist">
  <button class="tab-btn active" data-tab="overview" onclick="showTab('overview')" role="tab">Vis&#227;o Geral</button>
  <button class="tab-btn" data-tab="users" onclick="showTab('users')" role="tab">Usu&#225;rios</button>
  <button class="tab-btn" data-tab="interactions" onclick="showTab('interactions')" role="tab">Intera&#231;&#245;es</button>
  <button class="tab-btn" data-tab="benchmark" onclick="showTab('benchmark')" role="tab">Benchmark</button>
  <div class="tab-divider" aria-hidden="true"></div>
  ${catTabBtns}
  <div class="tab-divider" aria-hidden="true"></div>
  <button class="tab-btn" data-tab="estatisticas" onclick="showTab('estatisticas')" role="tab">Estat&#237;sticas</button>
</nav>

<div class="container">

  <div id="tab-overview" class="tab-panel active" role="tabpanel">
    <section class="card">
      <h2>Comparativo entre Categorias</h2>
      <p class="users-subtitle">Em cada categoria buscamos o <strong>maior grupo de criadores com audi&#234;ncias sobrepostas</strong> (clique m&#225;ximo). Quando todos endossam o mesmo produto, o p&#250;blico comum recebe v&#225;rios endossos simult&#226;neos e a <strong>prova social</strong> (efeito manada) eleva a ades&#227;o. Ranking: tamanho do clique (intensidade do refor&#231;o) e, em empate, alcance agregado (pessoas afetadas).</p>
      <div class="chart-row">
        <div class="chart-box"><canvas id="chart-clique"></canvas></div>
        <div class="chart-box"><canvas id="chart-reach"></canvas></div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Rank</th><th>Categoria</th><th>V&#233;rtices</th><th>Arestas</th>
              <th>Clique M&#225;x.</th><th>Alcance Total</th><th>Ades&#227;o est.</th><th>Membros</th>
            </tr>
          </thead>
          <tbody>${rankingRows}</tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Curva de Ades&#227;o por Prova Social</h2>
      <p class="users-subtitle">Modelo do efeito manada: a chance de ades&#227;o cresce com o n&#250;mero de endossos simult&#226;neos (k = tamanho do clique), segundo <code>p = 1 &#8722; (1 &#8722; q)<sup>k</sup></code> com q = ${qPct}% de ades&#227;o por endosso &#250;nico. Cada ponto laranja &#233; uma categoria no seu clique atual; a linha &#233; a curva te&#243;rica.</p>
      <div class="chart-box" style="max-width:720px;margin:0 auto"><canvas id="chart-adoption"></canvas></div>
    </section>
  </div>

  <div id="tab-users" class="tab-panel" role="tabpanel">
    ${ReportGenerator.buildUsersTable(instance, cliqueUserIds)}
  </div>

  <div id="tab-interactions" class="tab-panel" role="tabpanel">
    ${ReportGenerator.buildInteractionsSection(instance)}
  </div>

  <div id="tab-benchmark" class="tab-panel" role="tabpanel">
    ${ReportGenerator.buildBenchmarkSection(benchmark)}
  </div>

  ${catPanels}

  <div id="tab-estatisticas" class="tab-panel" role="tabpanel">
    <div class="container" style="padding:0">
      ___STATS_SECTION___
    </div>
  </div>

</div>

<footer>Gerado pelo Click Problem &mdash; Clique M&#225;ximo &amp; Prova Social em Redes de Propaga&#231;&#227;o Viral</footer>

<script>
  var netInits = {};
  var netDone  = {};

  function showTab(id) {
    document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
    var panel = document.getElementById('tab-' + id);
    var btn   = document.querySelector('[data-tab="' + id + '"]');
    if (panel) panel.classList.add('active');
    if (btn)   btn.classList.add('active');
    if (netInits[id] && !netDone[id]) { netDone[id] = true; netInits[id](); }
  }

  ${networkFns}
  ${interactionsNetworkFn}

  new Chart(document.getElementById('chart-clique'), {
    type: 'bar',
    data: {
      labels: ${labels},
      datasets: [{ label: 'Clique Máximo', data: ${cliqueSizes},
        backgroundColor: '#2a78d6cc', borderColor: '#2a78d6', borderWidth: 2, borderRadius: 6 }]
    },
    options: {
      responsive: true,
      onClick: function(_e, els) { if (els.length) showTab(${labels}[els[0].index].toLowerCase().replace(/[^a-z0-9]+/g,'-')); },
      plugins: { title: { display: true, text: 'Clique Máximo por Categoria', font: { size: 14 } }, legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Nº de membros' } } }
    }
  });

  new Chart(document.getElementById('chart-reach'), {
    type: 'bar',
    data: {
      labels: ${labels},
      datasets: [{ label: 'Alcance Agregado', data: ${reaches},
        backgroundColor: '#eb6834cc', borderColor: '#eb6834', borderWidth: 2, borderRadius: 6 }]
    },
    options: {
      responsive: true,
      onClick: function(_e, els) { if (els.length) showTab(${labels}[els[0].index].toLowerCase().replace(/[^a-z0-9]+/g,'-')); },
      plugins: { title: { display: true, text: 'Alcance Agregado do Clique', font: { size: 14 } }, legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Seguidores totais' } } }
    }
  });

  new Chart(document.getElementById('chart-adoption'), {
    type: 'scatter',
    data: {
      datasets: [
        { label: 'Curva p = 1 − (1 − q)^k', type: 'line', data: ${adoptionCurveJson},
          borderColor: '#2b6cb0', backgroundColor: '#2b6cb0', borderWidth: 2,
          pointRadius: 0, tension: 0.25, fill: false, order: 2 },
        { label: 'Categorias (clique atual)', data: ${adoptionPointsJson},
          backgroundColor: '#eb6834', borderColor: '#b34a1e', pointRadius: 6,
          pointHoverRadius: 8, showLine: false, order: 1 }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Curva de Adesão por Prova Social (q = ${qPct}%)', font: { size: 14 } },
        legend: { display: true, position: 'bottom' },
        tooltip: { callbacks: { label: function(ctx) {
          var d = ctx.raw; var pct = (d.y * 100).toFixed(1) + '%';
          return (d.label ? d.label + ': ' : '') + 'k=' + d.x + ' → ' + pct;
        } } }
      },
      scales: {
        x: { type: 'linear', min: 0, ticks: { stepSize: 1 },
             title: { display: true, text: 'k = tamanho do clique (nº de endossos)' } },
        y: { beginAtZero: true, suggestedMax: 1,
             ticks: { callback: function(v) { return Math.round(v * 100) + '%'; } },
             title: { display: true, text: 'Adesão estimada' } }
      }
    }
  });

  new Chart(document.getElementById('chart-timing'), {
    type: 'bar',
    data: {
      labels: ${JSON.stringify(stats.categoryTimings.map((t) => ReportGenerator.capitalize(t.category)))},
      datasets: [{
        label: 'Tempo do solver (ms)',
        data: ${JSON.stringify(stats.categoryTimings.map((t) => parseFloat(t.solveTimeMs.toFixed(3))))},
        backgroundColor: '#2a78d6cc',
        borderColor: '#2a78d6',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        title: { display: true, text: 'Tempo do Solver por Categoria (ms)', font: { size: 14 } },
        legend: { display: false }
      },
      scales: { x: { beginAtZero: true, title: { display: true, text: 'Milissegundos' } } }
    }
  });
  ${benchmarkChartsJs}
</script>

</body>
</html>`;

    stats.reportTimeMs = performance.now() - reportStart;
    stats.totalTimeMs = stats.generationTimeMs + stats.analysisTimeMs + stats.reportTimeMs;
    const finalHtml = html.replace("___STATS_SECTION___", ReportGenerator.buildStatsSection(stats));
    writeFileSync(outputPath, finalHtml, "utf-8");
    console.log(`\nRelatório HTML gerado: ${outputPath}`);
  }
}
