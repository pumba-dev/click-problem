import { writeFileSync } from "node:fs";
import type { ProblemInstance, GraphNodeData, GraphEdgeData, CategoryResult } from "../models/models.js";

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
        background: n.inClique ? "#F28E2B" : "#4E79A7",
        border: n.inClique ? "#B35C00" : "#2A5A8F",
        highlight: { background: n.inClique ? "#FFB05A" : "#6BA3D6", border: "#555" },
      },
      font: { color: "#fff", size: 13 },
      size: n.inClique ? 28 : 20,
      borderWidth: n.inClique ? 3 : 1,
    }));

    const visEdges = r.edges.map((e: GraphEdgeData) => ({
      from: e.from,
      to: e.to,
      color: { color: e.inClique ? "#F28E2B" : "#ccc", opacity: e.inClique ? 1.0 : 0.6 },
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
   */
  private static buildCategorySection(r: CategoryResult, rank: number): string {
    const id = ReportGenerator.slugify(r.category);
    const medal =
      rank === 1 ? "&#127945;" : rank === 2 ? "&#129352;" : rank === 3 ? "&#129353;" : `#${rank}`;

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
    <div class="stats-row">
      <div class="stat-card"><span class="stat-val">${r.graphVertices}</span><span class="stat-lbl">v&#233;rtices</span></div>
      <div class="stat-card"><span class="stat-val">${r.graphEdgeCount}</span><span class="stat-lbl">arestas</span></div>
      <div class="stat-card accent"><span class="stat-val">${r.cliqueSize}</span><span class="stat-lbl">clique m&#225;ximo</span></div>
      <div class="stat-card"><span class="stat-val">${ReportGenerator.fmtN(r.aggregateReach)}</span><span class="stat-lbl">alcance total</span></div>
    </div>
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
  private static buildUsersTable(instance: ProblemInstance, cliqueUserIds: Set<number>): string {
    const catHeaders = instance.categories
      .map((c) => `<th class="pref-th" title="${c}">${ReportGenerator.capitalize(c)}</th>`)
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

  /**
   * Gera e salva o relatório HTML completo em `outputPath`.
   *
   * As redes vis.js são inicializadas de forma lazy (na primeira exibição da aba)
   * para evitar problemas de renderização em contêineres ocultos.
   *
   * @param instance   - instância do problema
   * @param ranked     - resultados ordenados por (cliqueSize DESC, aggregateReach DESC)
   * @param outputPath - caminho do arquivo HTML de saída (padrão: `report.html`)
   */
  generate(instance: ProblemInstance, ranked: CategoryResult[], outputPath = "report.html"): void {
    const labels = JSON.stringify(ranked.map((r) => r.category));
    const cliqueSizes = JSON.stringify(ranked.map((r) => r.cliqueSize));
    const reaches = JSON.stringify(ranked.map((r) => r.aggregateReach));

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
          `<div id="tab-${ReportGenerator.slugify(r.category)}" class="tab-panel" role="tabpanel">${ReportGenerator.buildCategorySection(r, i + 1)}</div>`,
      )
      .join("\n");

    const networkFns = ranked.map((r) => ReportGenerator.buildNetworkFn(r)).join("\n  ");

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
    .tab-btn.active{background:#4E79A7;color:#fff}
    .tab-pill{display:inline-block;background:#e2e8f0;color:#2d3748;border-radius:12px;
              padding:.05rem .5rem;font-size:.75rem;font-weight:700;min-width:1.4rem;text-align:center}
    .tab-btn.active .tab-pill{background:rgba(255,255,255,.25);color:#fff}
    .tab-pill.best{background:#F28E2B;color:#fff}
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
    .rank-link{background:none;border:none;color:#4E79A7;cursor:pointer;font-size:.88rem;font-weight:500;padding:0;text-decoration:underline}
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
    .in-clique-badge{background:#F28E2B;color:#fff;border-radius:10px;padding:.05rem .5rem;font-size:.7rem;font-weight:700;margin-left:.4rem;vertical-align:middle}

    .cat-section{margin-bottom:0}
    .cat-header{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem}
    .cat-header h2{font-size:1.25rem;color:#1a365d;flex:1}
    .rank-badge{font-size:1.4rem}
    .clique-pill{background:#F28E2B;color:#fff;border-radius:20px;padding:.2rem .85rem;font-size:.82rem;font-weight:700}
    .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.1rem}
    @media(max-width:600px){.stats-row{grid-template-columns:repeat(2,1fr)}}
    .stat-card{background:#f7f9fc;border-radius:8px;padding:.9rem;text-align:center;border:1px solid #e2e8f0}
    .stat-card.accent{background:#fff8f0;border-color:#F28E2B}
    .stat-val{display:block;font-size:1.45rem;font-weight:700;color:#2d3748}
    .stat-card.accent .stat-val{color:#C45E00}
    .stat-lbl{font-size:.7rem;color:#718096;text-transform:uppercase;letter-spacing:.05em}
    .graph-legend{display:flex;flex-wrap:wrap;gap:.9rem;font-size:.8rem;color:#718096;margin-bottom:.5rem}
    .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:.3rem;vertical-align:middle}
    .dot-clique{background:#F28E2B}.dot-regular{background:#4E79A7}
    .line{display:inline-block;width:20px;height:3px;margin-right:.3rem;vertical-align:middle;border-radius:2px}
    .line-clique{background:#F28E2B}
    .line-regular{background:transparent;border-top:2px dashed #ccc;height:0}
    .network-box{height:360px;border:1px solid #e2e8f0;border-radius:8px;background:#fafbfc;margin-bottom:1.1rem}
    .members-section h4{font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:#718096;margin-bottom:.65rem}
    .members-grid{display:flex;flex-wrap:wrap;gap:.5rem}
    .member-card{background:#fff8f0;border:1px solid #F28E2B;border-radius:8px;padding:.45rem .85rem}
    .member-name{display:block;font-weight:600;font-size:.86rem}
    .member-reach{font-size:.76rem;color:#718096}
    .no-members{color:#a0aec0;font-size:.86rem}

    footer{text-align:center;padding:1.5rem;color:#a0aec0;font-size:.8rem}
  </style>
</head>
<body>

<header>
  <h1>An&#225;lise de Propaga&#231;&#227;o Viral por Clique</h1>
  <p class="subtitle">${instance.users.length} usu&#225;rios &middot; ${instance.categories.length} categorias &middot; limiar = ${instance.threshold.toFixed(2)}</p>
</header>

<nav class="tabs-bar" role="tablist">
  <button class="tab-btn active" data-tab="overview" onclick="showTab('overview')" role="tab">Vis&#227;o Geral</button>
  <button class="tab-btn" data-tab="users" onclick="showTab('users')" role="tab">Usu&#225;rios</button>
  <div class="tab-divider" aria-hidden="true"></div>
  ${catTabBtns}
</nav>

<div class="container">

  <div id="tab-overview" class="tab-panel active" role="tabpanel">
    <section class="card">
      <h2>Comparativo entre Categorias</h2>
      <div class="chart-row">
        <div class="chart-box"><canvas id="chart-clique"></canvas></div>
        <div class="chart-box"><canvas id="chart-reach"></canvas></div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Rank</th><th>Categoria</th><th>V&#233;rtices</th><th>Arestas</th>
              <th>Clique M&#225;x.</th><th>Alcance Total</th><th>Membros</th>
            </tr>
          </thead>
          <tbody>${rankingRows}</tbody>
        </table>
      </div>
    </section>
  </div>

  <div id="tab-users" class="tab-panel" role="tabpanel">
    ${ReportGenerator.buildUsersTable(instance, cliqueUserIds)}
  </div>

  ${catPanels}

</div>

<footer>Gerado pelo Click Problem &mdash; An&#225;lise de Clique M&#225;ximo em Grafos de Propaga&#231;&#227;o Viral</footer>

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

  new Chart(document.getElementById('chart-clique'), {
    type: 'bar',
    data: {
      labels: ${labels},
      datasets: [{ label: 'Clique Máximo', data: ${cliqueSizes},
        backgroundColor: '#4E79A7cc', borderColor: '#4E79A7', borderWidth: 2, borderRadius: 6 }]
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
        backgroundColor: '#F28E2Bcc', borderColor: '#F28E2B', borderWidth: 2, borderRadius: 6 }]
    },
    options: {
      responsive: true,
      onClick: function(_e, els) { if (els.length) showTab(${labels}[els[0].index].toLowerCase().replace(/[^a-z0-9]+/g,'-')); },
      plugins: { title: { display: true, text: 'Alcance Agregado do Clique', font: { size: 14 } }, legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Seguidores totais' } } }
    }
  });
</script>

</body>
</html>`;

    writeFileSync(outputPath, html, "utf-8");
    console.log(`\nRelatório HTML gerado: ${outputPath}`);
  }
}
