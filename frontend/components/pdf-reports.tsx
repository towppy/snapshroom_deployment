/* ═══════════════════════════════════════════════════════════════
   SnapShroom  ·  PDF Report Generator
   ───────────────────────────────────────────────────────────────
   Generates professional A4 report HTML for expo-print.
   
   KEY FIXES:
   - @page margin: 0 + padding via .page div → suppresses browser-
     injected URL, date, and page-number headers/footers in WebKit
   - Removed .page-header bar that mimicked the website nav
   - Cover page uses text-only logo (emojis are unreliable in PDF)
   - All charts rendered as pure HTML/CSS bars (no canvas needed)
═══════════════════════════════════════════════════════════════ */

/* ─── colour palette ─── */
const C = {
  ink:     '#0F1A0F',
  forest:  '#1E3020',
  green:   '#2D4A2D',
  moss:    '#3A5C3A',
  sage:    '#5A7A5A',
  mist:    '#E8F0E8',
  teal:    '#2BA8A0',
  tealLt:  '#D6F0EE',
  red:     '#C0392B',
  redLt:   '#FADBD8',
  amber:   '#D68910',
  amberLt: '#FEF9E7',
  rule:    '#C8D8C8',
  bg:      '#F7FAF7',
  white:   '#FFFFFF',
  mid:     '#6B7C6B',
  light:   '#A8B8A8',
  mushroom:'#C17B3F',
};

/* ─── helpers ─── */
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return iso; }
};

const pct = (n: number, total: number) =>
  total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';

const barW = (n: number, max: number) =>
  max > 0 ? Math.max(2, Math.round((n / max) * 100)) : 2;

const medal = (i: number) =>
  i === 0 ? '#1' : i === 1 ? '#2' : i === 2 ? '#3' : `#${i + 1}`;

/* ════════════════════════════════════════════════════════════════
   BASE CSS
   
   CRITICAL for suppressing WebKit/expo-print browser chrome:
   - @page { size: A4; margin: 0; }  → removes the margin area
     where the browser normally injects URL, title, date, page #
   - All padding lives inside .page div, not on @page
   - -webkit-print-color-adjust: exact → preserves bg colours
════════════════════════════════════════════════════════════════ */
const BASE_CSS = `
  @page {
    size: A4;
    margin: 0mm;
  }

  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 210mm;
    background: #e0e0e0;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 10pt;
    color: ${C.ink};
    line-height: 1.45;
  }

  /* ── Page shell ──
     Each .page is exactly A4. The 18mm padding replaces the
     @page margin so content is still inset from the edge.      */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 20mm 16mm 20mm;
    background: ${C.white};
    position: relative;
    page-break-after: always;
    overflow: hidden;
  }

  @media print {
    .page {
      box-shadow: none;
    }
  }

  /* ── Cover page ── */
  .cover {
    width: 210mm;
    height: 297mm;
    background-color: ${C.forest};
    position: relative;
    page-break-after: always;
    padding: 0;
    overflow: hidden;
  }

  .cover-top-accent {
    background-color: ${C.teal};
    height: 10mm;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .cover-side-accent {
    background-color: ${C.moss};
    width: 14mm;
    height: 297mm;
    position: absolute;
    top: 0;
    right: 0;
  }

  .cover-body {
    padding: 22mm 24mm 20mm 24mm;
  }

  .cover-wordmark {
    font-size: 9pt;
    font-weight: bold;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: ${C.teal};
    border-left: 3px solid ${C.teal};
    padding-left: 8px;
    margin-bottom: 42mm;
  }

  .cover-eyebrow {
    font-size: 7pt;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: ${C.light};
    margin-bottom: 5mm;
  }

  .cover-title {
    font-size: 28pt;
    font-weight: bold;
    color: ${C.white};
    line-height: 1.2;
    margin-bottom: 5mm;
    max-width: 125mm;
  }

  .cover-subtitle {
    font-size: 10.5pt;
    color: ${C.light};
    margin-bottom: 12mm;
    max-width: 112mm;
    line-height: 1.6;
  }

  .cover-rule {
    width: 20mm;
    height: 2px;
    background-color: ${C.teal};
    margin-bottom: 8mm;
  }

  .cover-meta {
    margin-top: 32mm;
    border-top: 0.5pt solid rgba(255,255,255,0.15);
    padding-top: 6mm;
    display: flex;
    gap: 10mm;
  }

  .cover-meta-item {
    flex: 1;
  }

  .cover-meta-label {
    font-size: 6.5pt;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: ${C.light};
    margin-bottom: 1.5mm;
  }

  .cover-meta-value {
    font-size: 9pt;
    color: ${C.white};
    font-weight: bold;
  }

  .cover-confidential {
    margin-top: 6mm;
    display: inline-block;
    border: 1pt solid ${C.red};
    color: ${C.red};
    font-size: 6.5pt;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 1.5mm 4mm;
    font-weight: bold;
  }

  /* ── Page footer (replaces old page-header + page-footer combo) ── */
  .page-footer {
    position: absolute;
    bottom: 8mm;
    left: 20mm;
    right: 20mm;
    border-top: 0.5pt solid ${C.rule};
    padding-top: 2.5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 7pt;
    color: ${C.light};
  }

  .page-footer-brand {
    font-weight: bold;
    color: ${C.sage};
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* ── TOC ── */
  .toc-title {
    font-size: 17pt;
    font-weight: bold;
    color: ${C.forest};
    margin-bottom: 7mm;
    padding-bottom: 2.5mm;
    border-bottom: 2pt solid ${C.teal};
  }

  .toc-table {
    width: 100%;
    border-collapse: collapse;
  }

  .toc-table td {
    padding: 3mm 0;
    border-bottom: 0.5pt dotted ${C.rule};
    vertical-align: middle;
  }

  .toc-num {
    font-size: 8pt;
    font-weight: bold;
    color: ${C.teal};
    width: 9mm;
  }

  .toc-label {
    font-size: 10pt;
    color: ${C.ink};
  }

  /* ── Section headings ── */
  .section-heading {
    display: flex;
    align-items: center;
    margin-bottom: 3mm;
  }

  .section-num {
    font-size: 8pt;
    font-weight: bold;
    color: ${C.teal};
    letter-spacing: 1px;
    width: 10mm;
    flex-shrink: 0;
  }

  .section-title {
    font-size: 13pt;
    font-weight: bold;
    color: ${C.forest};
  }

  .section-rule {
    height: 2pt;
    background-color: ${C.teal};
    margin-bottom: 5mm;
  }

  .subsection-title {
    font-size: 8.5pt;
    font-weight: bold;
    color: ${C.moss};
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 5mm 0 2.5mm;
    border-bottom: 0.5pt solid ${C.rule};
    padding-bottom: 1.5mm;
  }

  /* ── Executive summary box ── */
  .exec-box {
    background-color: ${C.mist};
    border-left: 4pt solid ${C.teal};
    padding: 4mm 5mm;
    margin-bottom: 6mm;
  }

  .exec-label {
    font-size: 6.5pt;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: ${C.teal};
    font-weight: bold;
    margin-bottom: 2mm;
  }

  .exec-text {
    font-size: 9pt;
    line-height: 1.65;
    color: ${C.ink};
  }

  /* ── KPI cards ── */
  .kpi-grid {
    display: flex;
    gap: 3mm;
    margin-bottom: 5mm;
    flex-wrap: wrap;
  }

  .kpi-card {
    flex: 1;
    min-width: 55mm;
    background-color: ${C.bg};
    border: 0.5pt solid ${C.rule};
    border-top: 3pt solid ${C.sage};
    padding: 4mm 3mm 3.5mm;
    text-align: center;
  }

  .kpi-card.teal  { border-top-color: ${C.teal}; }
  .kpi-card.red   { border-top-color: ${C.red}; }
  .kpi-card.amber { border-top-color: ${C.amber}; }
  .kpi-card.mush  { border-top-color: ${C.mushroom}; }

  .kpi-value {
    font-size: 16pt;
    font-weight: bold;
    color: ${C.forest};
    line-height: 1;
    margin-bottom: 1.5mm;
    display: block;
  }

  .kpi-label {
    font-size: 6.5pt;
    color: ${C.mid};
    text-transform: uppercase;
    letter-spacing: 1px;
    display: block;
  }

  .kpi-delta {
    font-size: 7.5pt;
    color: ${C.teal};
    font-weight: bold;
    margin-top: 1mm;
    display: block;
  }

  /* ── Horizontal distribution bars ── */
  .dist-item {
    display: flex;
    align-items: center;
    margin-bottom: 2.5mm;
  }

  .dist-label {
    width: 36mm;
    font-size: 8pt;
    font-weight: bold;
    flex-shrink: 0;
  }

  .dist-track {
    flex: 1;
    height: 5mm;
    background-color: ${C.mist};
    margin: 0 3mm;
    border-radius: 1px;
  }

  .dist-fill {
    height: 5mm;
    border-radius: 1px;
  }

  .dist-value {
    width: 30mm;
    text-align: right;
    font-size: 8pt;
    color: ${C.mid};
    flex-shrink: 0;
  }

  /* ── Ranked items ── */
  .rank-item {
    display: flex;
    align-items: center;
    padding: 2.5mm 0;
    border-bottom: 0.5pt solid ${C.mist};
  }

  .rank-medal {
    width: 9mm;
    font-size: 8pt;
    font-weight: bold;
    color: ${C.teal};
    flex-shrink: 0;
  }

  .rank-name {
    flex: 1;
    font-size: 9pt;
    font-weight: bold;
    padding-right: 3mm;
  }

  .rank-bar {
    width: 40mm;
    height: 3.5mm;
    background-color: ${C.mist};
    margin: 0 2mm;
    flex-shrink: 0;
    border-radius: 1px;
  }

  .rank-bar-fill {
    height: 3.5mm;
    border-radius: 1px;
  }

  .rank-count {
    width: 18mm;
    text-align: right;
    font-size: 8.5pt;
    font-weight: bold;
    flex-shrink: 0;
  }

  .rank-unit {
    width: 9mm;
    text-align: right;
    font-size: 7pt;
    color: ${C.light};
    flex-shrink: 0;
  }

  .rank-pct {
    width: 13mm;
    text-align: right;
    font-size: 7.5pt;
    color: ${C.light};
    flex-shrink: 0;
  }

  /* ── Data tables ── */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 2mm 0 4mm;
    font-size: 8.5pt;
  }

  .data-table th {
    background-color: ${C.forest};
    padding: 2.5mm 3mm;
    text-align: left;
    font-size: 7pt;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-weight: bold;
    color: ${C.white};
  }

  .data-table td {
    padding: 2mm 3mm;
    border-bottom: 0.5pt solid ${C.rule};
    vertical-align: middle;
  }

  .data-table tr:nth-child(even) td {
    background-color: ${C.bg};
  }

  .data-table .right { text-align: right; }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 0.8mm 2.5mm;
    font-size: 6.5pt;
    font-weight: bold;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-radius: 2px;
  }

  .badge-active   { background-color: #D5F5E3; color: #1E8449; }
  .badge-inactive { background-color: ${C.redLt}; color: ${C.red}; }
  .badge-admin    { background-color: ${C.mist}; color: ${C.moss}; border: 0.5pt solid ${C.sage}; }
  .badge-user     { background-color: ${C.tealLt}; color: ${C.teal}; }

  /* ── Two-column layout ── */
  .two-col {
    display: flex;
    gap: 5mm;
    margin-bottom: 3mm;
  }

  .col { flex: 1; }

  /* ── Timeline sparkline ── */
  .sparkline-wrap {
    margin: 2mm 0 4mm;
  }

  .sparkline-container {
    width: 100%;
    height: 18mm;
    background-color: ${C.bg};
    border: 0.5pt solid ${C.rule};
    padding: 1.5mm 1.5mm 0;
    display: flex;
    align-items: flex-end;
    gap: 1px;
    border-radius: 2px;
  }

  .spark-bar {
    flex: 1;
    background-color: ${C.teal};
    min-height: 3px;
    border-radius: 1px 1px 0 0;
  }

  .sparkline-label-row {
    display: flex;
    justify-content: space-between;
    margin-top: 1mm;
  }

  .sparkline-label {
    font-size: 6pt;
    color: ${C.light};
  }

  /* ── Vertical bar chart (for species/location charts) ── */
  .vchart-wrap {
    display: flex;
    align-items: flex-end;
    gap: 2mm;
    height: 32mm;
    padding: 0 1mm;
    margin: 2mm 0 5mm;
    border-bottom: 1pt solid ${C.rule};
  }

  .vchart-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 1mm;
  }

  .vchart-val {
    font-size: 6.5pt;
    font-weight: bold;
    color: ${C.forest};
  }

  .vchart-bar {
    width: 100%;
    border-radius: 2px 2px 0 0;
  }

  .vchart-label {
    font-size: 5.5pt;
    color: ${C.mid};
    text-align: center;
    word-break: break-word;
    line-height: 1.2;
    max-width: 24mm;
    margin-top: 1mm;
  }

  /* ── Callout ── */
  .callout {
    border: 1pt solid ${C.amber};
    background-color: ${C.amberLt};
    border-left: 4pt solid ${C.amber};
    padding: 3mm 4mm;
    margin: 4mm 0;
    border-radius: 2px;
  }

  .callout-label {
    font-size: 6.5pt;
    font-weight: bold;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: ${C.amber};
    margin-bottom: 1mm;
  }

  .callout-text {
    font-size: 8.5pt;
    line-height: 1.5;
  }

  .mono {
    font-family: 'Courier New', Courier, monospace;
    font-size: 8pt;
  }
`;

/* ════════════════════════════════════════════════════════════════
   COMPONENT BUILDERS
════════════════════════════════════════════════════════════════ */

/** Cover page — text-only logo, no emoji (unreliable in WebKit PDF) */
const coverPage = (
  title: string,
  subtitle: string,
  generatedAt: string,
  preparedBy: string,
) => `
<div class="cover">
  <div class="cover-top-accent"></div>
  <div class="cover-side-accent"></div>
  <div class="cover-body">
    <div class="cover-wordmark">SNAPSHROOM</div>
    <div class="cover-eyebrow">Admin Portal &middot; Official Report</div>
    <div class="cover-title">${title}</div>
    <div class="cover-subtitle">${subtitle}</div>
    <div class="cover-rule"></div>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Report Date</div>
        <div class="cover-meta-value">${generatedAt}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Prepared By</div>
        <div class="cover-meta-value">${preparedBy}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">System</div>
        <div class="cover-meta-value">SnapShroom v1.0</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Report ID</div>
        <div class="cover-meta-value">SSR-${Date.now().toString(36).toUpperCase()}</div>
      </div>
    </div>
    <div class="cover-confidential">Confidential &mdash; Internal Use Only</div>
  </div>
</div>`;

/**
 * Page shell — NO page-header bar (that was mimicking the website nav).
 * Only a minimal footer with brand name, section name, and page number.
 */
const pageShell = (
  sectionName: string,
  pageNum: number,
  content: string,
) => `
<div class="page">
  ${content}
  <div class="page-footer">
    <span class="page-footer-brand">SnapShroom</span>
    <span>${sectionName}</span>
    <span>Page ${pageNum}</span>
  </div>
</div>`;

const tocPage = (items: { num: string; label: string }[]) => {
  const rows = items
    .map(it => `
    <tr>
      <td class="toc-num">${it.num}</td>
      <td class="toc-label">${it.label}</td>
    </tr>`)
    .join('');

  return pageShell('Table of Contents', 1, `
    <div class="toc-title">Table of Contents</div>
    <table class="toc-table">${rows}</table>
  `);
};

const sectionHeading = (num: string, title: string) => `
  <div class="section-heading">
    <span class="section-num">${num}</span>
    <span class="section-title">${title}</span>
  </div>
  <div class="section-rule"></div>`;

const kpiGrid = (
  cards: { value: string | number; label: string; delta?: string; cls?: string }[],
) => `
  <div class="kpi-grid">
    ${cards
      .map(
        c => `
      <div class="kpi-card${c.cls ? ' ' + c.cls : ''}">
        <span class="kpi-value">${c.value}</span>
        <span class="kpi-label">${c.label}</span>
        ${c.delta ? `<span class="kpi-delta">${c.delta}</span>` : ''}
      </div>`,
      )
      .join('')}
  </div>`;

const distBar = (label: string, value: number, total: number, color: string) => `
  <div class="dist-item">
    <span class="dist-label">${label}</span>
    <div class="dist-track">
      <div class="dist-fill" style="width:${barW(value, total)}%;background-color:${color};"></div>
    </div>
    <span class="dist-value">${value.toLocaleString()} &nbsp;(${pct(value, total)})</span>
  </div>`;

const rankedList = (
  items: { name: string; count: number }[],
  total: number,
  color: string,
  limit = 8,
) => {
  const max = items[0]?.count ?? 1;
  return items
    .slice(0, limit)
    .map(
      (item, i) => `
    <div class="rank-item">
      <span class="rank-medal">${medal(i)}</span>
      <span class="rank-name">${item.name}</span>
      <div class="rank-bar">
        <div class="rank-bar-fill" style="width:${barW(item.count, max)}%;background-color:${color};"></div>
      </div>
      <span class="rank-count">${item.count.toLocaleString()}</span>
      <span class="rank-unit">scans</span>
      <span class="rank-pct">${pct(item.count, total)}</span>
    </div>`,
    )
    .join('');
};

/** Vertical bar chart rendered in pure HTML/CSS — no canvas needed */
const verticalBarChart = (
  items: { label: string; value: number }[],
  color: string,
  limit = 7,
) => {
  const slice = items.slice(0, limit);
  const max = Math.max(...slice.map(d => d.value), 1);
  const chartH = 28; // mm — the bar area height (label row is below)
  return `
    <div class="vchart-wrap">
      ${slice
        .map(d => {
          const heightPct = Math.max(4, (d.value / max) * 100);
          return `
        <div class="vchart-col">
          <span class="vchart-val">${d.value}</span>
          <div class="vchart-bar" style="height:${heightPct}%;background-color:${color};"></div>
        </div>`;
        })
        .join('')}
    </div>
    <div style="display:flex;gap:2mm;padding:0 1mm;margin-bottom:4mm;">
      ${slice
        .map(
          d =>
            `<div style="flex:1;font-size:5.5pt;color:${C.mid};text-align:center;word-break:break-word;line-height:1.2;">${d.label}</div>`,
        )
        .join('')}
    </div>`;
};

/** Timeline sparkline with first/last date labels */
const sparkline = (data: { date: string; scans: number }[], limit = 28) => {
  const slice = data.slice(-limit);
  const max = Math.max(...slice.map(d => d.scans), 1);
  const first = slice[0]?.date ?? '';
  const last = slice[slice.length - 1]?.date ?? '';

  return `
    <div class="sparkline-wrap">
      <div class="sparkline-container">
        ${slice
          .map(d => {
            const h = Math.max(3, (d.scans / max) * 100);
            return `<div class="spark-bar" style="height:${h}%;"></div>`;
          })
          .join('')}
      </div>
      <div class="sparkline-label-row">
        <span class="sparkline-label">${first}</span>
        <span class="sparkline-label">${last}</span>
      </div>
    </div>`;
};

/* ════════════════════════════════════════════════════════════════
   INTERFACES
════════════════════════════════════════════════════════════════ */

interface MushroomAnalytics {
  total_scans: number;
  scans_last_30d: number;
  most_scanned_mushrooms: { name: string; count: number }[];
 
  detection_success_rate: number;
  edible_vs_toxic: { edible: number; toxic: number; unknown: number };
}

interface UserAnalytics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_count: number;
  recent_registrations_30d: number;
  recent_logins_7d: number;
}

interface Analytics {
  users: UserAnalytics;
  mushrooms: MushroomAnalytics;
  timeline: { date: string; scans: number }[];
}

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  is_active: boolean;
  last_login?: string;
}

/* ─── Exec summaries ─── */
const execSummaryAnalytics = (a: Analytics) => {
  const activeRate =
    a.users.total_users > 0
      ? ((a.users.active_users / a.users.total_users) * 100).toFixed(1)
      : '0';
  const topMush = a.mushrooms.most_scanned_mushrooms[0]?.name ?? 'N/A';
 
  const edibleShare =
    a.mushrooms.total_scans > 0
      ? ((a.mushrooms.edible_vs_toxic.edible / a.mushrooms.total_scans) * 100).toFixed(1)
      : '0';

  return `This report presents a comprehensive analysis of platform activity for the SnapShroom
mushroom identification system. As of the reporting date, the platform has <strong>${a.users.total_users}
registered users</strong>, of whom <strong>${a.users.active_users} (${activeRate}%) are currently active</strong>.
The platform has processed <strong>${a.mushrooms.total_scans} total identification scans</strong>, with
<strong>${a.mushrooms.scans_last_30d} scans recorded in the past 30 days</strong>.
<br><br>
<strong>Key Insights:</strong> The platform shows ${parseFloat(activeRate) > 70 ? 'strong' : parseFloat(activeRate) > 50 ? 'moderate' : 'low'} user engagement with ${activeRate}% active users. 
Recent activity accounts for ${a.mushrooms.total_scans > 0 ? ((a.mushrooms.scans_last_30d / a.mushrooms.total_scans) * 100).toFixed(1) : 0}% of total scans, 
indicating ${a.mushrooms.scans_last_30d > a.mushrooms.total_scans * 0.3 ? 'healthy' : 'declining'} platform usage.`;
};

const execSummaryUsers = (users: User[]) => {
  const active = users.filter(u => u.is_active).length;
  const inactive = users.filter(u => !u.is_active).length;
  const admins = users.filter(u => u.role === 'admin').length;
  const activeRate = users.length > 0 ? ((active / users.length) * 100).toFixed(1) : '0';
  const newest = [...users].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  return `This report provides a complete directory of all <strong>${users.length}
registered SnapShroom accounts</strong>. Of these, <strong>${active} accounts are active
(${activeRate}%)</strong> and <strong>${inactive} are currently deactivated</strong>.
The platform has <strong>${admins} administrator account${admins !== 1 ? 's' : ''}</strong>.
${
  newest
    ? `The most recently registered account belongs to <em>${newest.name}</em>,
created on ${fmtDate(newest.created_at)}.`
    : ''
}
<br><br>
<strong>Key Insights:</strong> User engagement is ${parseFloat(activeRate) > 70 ? 'excellent' : parseFloat(activeRate) > 50 ? 'moderate' : 'low'} with ${activeRate}% active users.
The admin-to-user ratio is ${users.length > 0 ? (admins / users.length * 100).toFixed(1) : 0}%, which ${admins > users.length * 0.1 ? 'indicates strong administrative oversight' : 'suggests adequate administrative coverage'}.`;
};

/* ════════════════════════════════════════════════════════════════
   BUILD ANALYTICS REPORT  (Full Analytics export button)
════════════════════════════════════════════════════════════════ */

export const buildAnalyticsReport = (analytics: Analytics, adminName: string): string => {
  const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const title = 'Platform Analytics Report';

  const userActPct =
    analytics.users.total_users > 0
      ? ((analytics.users.active_users / analytics.users.total_users) * 100).toFixed(1)
      : '0';

  /* ── Page 2: Executive Summary + User KPIs ── */
  const page2 = pageShell('Executive Summary & User Analytics', 2, `
    ${sectionHeading('01', 'Executive Summary')}
    <div class="exec-box">
      <div class="exec-label">Key Findings</div>
      <div class="exec-text">${execSummaryAnalytics(analytics)}</div>
    </div>

    ${sectionHeading('02', 'User Analytics')}

    ${kpiGrid([
      { value: analytics.users.total_users,           label: 'Total Users',       cls: 'teal' },
      { value: analytics.users.active_users,           label: 'Active',            cls: 'teal', delta: `${userActPct}%` },
      { value: analytics.users.inactive_users,         label: 'Inactive',          cls: 'red' },
      { value: analytics.users.admin_count,            label: 'Admins' },
      { value: analytics.users.recent_registrations_30d, label: 'New Users (30d)' },
      { value: analytics.users.recent_logins_7d,      label: 'Logins (7d)' },
    ])}

    <div class="subsection-title">Account Status Distribution</div>
    ${distBar('Active Accounts',   analytics.users.active_users,   analytics.users.total_users, C.teal)}
    ${distBar('Inactive Accounts', analytics.users.inactive_users, analytics.users.total_users, C.red)}
    ${distBar('Admin Accounts',    analytics.users.admin_count,    analytics.users.total_users, C.sage)}

    <div class="subsection-title" style="margin-top: 4mm;">📊</div>
    <div style="background: #f8f9fa; padding: 3mm; border-radius: 2mm; font-size: 8.5pt; line-height: 1.4;">
      <strong>User Engagement:</strong> ${parseFloat(userActPct) > 70 ? 'Excellent engagement' : parseFloat(userActPct) > 50 ? 'Moderate engagement' : 'Low engagement'} with ${userActPct}% active users. 
      ${analytics.users.recent_logins_7d > analytics.users.active_users * 0.5 ? 'Strong weekly activity observed.' : 'Consider re-engagement strategies for inactive users.'}<br>
      <strong>User Growth:</strong> ${analytics.users.recent_registrations_30d > analytics.users.total_users * 0.1 ? 'Healthy growth trajectory' : 'Moderate growth pattern'} with ${analytics.users.recent_registrations_30d} new users in the last 30 days.
      ${analytics.users.admin_count > analytics.users.total_users * 0.15 ? 'Strong administrative coverage.' : 'Adequate administrative structure.'}
    </div>
  `);

  /* ── Page 3: Mushroom Scan Analytics ── */

  const page3 = pageShell('Mushroom Scan Analytics', 3, `
    ${sectionHeading('03', 'Mushroom Scan Analytics')}

    ${kpiGrid([
      { value: analytics.mushrooms.total_scans,            label: 'Total Scans',       cls: 'mush' },
      { value: analytics.mushrooms.scans_last_30d,         label: 'Last 30 Days',      cls: 'teal' },
      { value: `${analytics.mushrooms.detection_success_rate}%`, label: 'Detection Success',
        cls: analytics.mushrooms.detection_success_rate >= 80 ? 'teal' : 'amber' },
    ])}

    

    <div class="subsection-title">Top Identified Species</div>
    ${
      analytics.mushrooms.most_scanned_mushrooms.length > 0
        ? rankedList(
            analytics.mushrooms.most_scanned_mushrooms,
            analytics.mushrooms.total_scans,
            C.mushroom,
          )
        : '<p style="color:#999;padding:3mm 0;font-size:8.5pt;">No species data available.</p>'
    }

    ${
      analytics.mushrooms.most_scanned_mushrooms.length > 0
        ? `<div class="subsection-title">Species Scan Volume Chart</div>
           ${verticalBarChart(
             analytics.mushrooms.most_scanned_mushrooms.map(m => ({
               label: m.name,
               value: m.count,
             })),
             C.mushroom,
           )}`
        : ''
    }

    <div class="subsection-title" style="margin-top: 4mm;">📊</div>
    <div style="background: #f8f9fa; padding: 3mm; border-radius: 2mm; font-size: 8.5pt; line-height: 1.4;">
      <strong>Platform Usage:</strong> ${analytics.mushrooms.scans_last_30d > analytics.mushrooms.total_scans * 0.3 ? 'High recent activity' : analytics.mushrooms.scans_last_30d > analytics.mushrooms.total_scans * 0.1 ? 'Moderate recent activity' : 'Low recent activity'} with ${analytics.mushrooms.scans_last_30d} scans in the last 30 days.<br>
      <strong>Detection Performance:</strong> ${analytics.mushrooms.detection_success_rate >= 90 ? 'Excellent accuracy' : analytics.mushrooms.detection_success_rate >= 80 ? 'Good accuracy' : 'Needs improvement'} at ${analytics.mushrooms.detection_success_rate}% success rate.
      ${analytics.mushrooms.most_scanned_mushrooms.length > 0 ? `Top species <em>${analytics.mushrooms.most_scanned_mushrooms[0].name}</em> represents ${analytics.mushrooms.total_scans > 0 ? ((analytics.mushrooms.most_scanned_mushrooms[0].count / analytics.mushrooms.total_scans) * 100).toFixed(1) : 0}% of all scans.` : ''}
    </div>
  `);

  /* ── Page 4: Locations + Timeline ── */
  const timelineData = analytics.timeline ?? [];
  const totalTimelineScans = timelineData.reduce((s, t) => s + t.scans, 0);
  const avgDaily =
    timelineData.length > 0 ? (totalTimelineScans / timelineData.length).toFixed(1) : '0';
  const peakDay = timelineData.reduce(
    (best, t) => (t.scans > best.scans ? t : best),
    { date: 'N/A', scans: 0 },
  );

  const page4 = pageShell('Scan Activity Timeline', 4, `


    ${
      timelineData.length > 0
        ? `
      ${sectionHeading('04', 'Scan Activity Timeline')}

      ${kpiGrid([
        { value: totalTimelineScans.toLocaleString(), label: 'Total (Period)', cls: 'teal' },
        { value: avgDaily,                            label: 'Avg Scans / Day' },
        { value: peakDay.scans,                       label: 'Peak Day',  delta: peakDay.date },
        { value: timelineData.length,                 label: 'Days Tracked' },
      ])}

      <div class="subsection-title">Daily Scan Activity (last ${Math.min(timelineData.length, 28)} days)</div>
      ${sparkline(timelineData)}

      <div class="subsection-title" style="margin-top: 4mm;">📊 </div>
      <div style="background: #f8f9fa; padding: 3mm; border-radius: 2mm; font-size: 8.5pt; line-height: 1.4;">
        <strong>Activity Patterns:</strong> ${parseFloat(avgDaily) > 10 ? 'High daily engagement' : parseFloat(avgDaily) > 5 ? 'Moderate daily engagement' : 'Low daily engagement'} with an average of ${avgDaily} scans per day.
        ${peakDay.scans > parseFloat(avgDaily) * 2 ? `Peak activity on ${peakDay.date} with ${peakDay.scans} scans suggests optimal user engagement periods.` : 'Consistent daily activity pattern observed.'}<br>
        <strong>Usage Trends:</strong> ${timelineData.length > 0 ? `${timelineData.length} days tracked show ${totalTimelineScans > 0 ? ((totalTimelineScans / timelineData.length).toFixed(1)) : 0} average daily scans.` : 'No timeline data available.'}
        ${totalTimelineScans > analytics.mushrooms.scans_last_30d ? 'Historical data shows higher activity than recent period.' : 'Recent activity aligns with historical patterns.'}
      </div>`
        : ''
    }
  `);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SnapShroom Analytics Report</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  ${coverPage(
    title,
    'Comprehensive platform usage metrics, user statistics, species identification data, and scan activity analysis.',
    now,
    adminName,
  )}
  ${tocPage([
    { num: '01', label: 'Executive Summary' },
    { num: '02', label: 'User Analytics' },
    { num: '03', label: 'Mushroom Scan Analytics & Species Chart' },
    { num: '04', label: 'Scan Activity Timeline' },
  ])}
  ${page2}
  ${page3}
  ${page4}
</body>
</html>`;
};

/* ════════════════════════════════════════════════════════════════
   BUILD USERS REPORT
════════════════════════════════════════════════════════════════ */

export const buildUsersReport = (users: User[], adminName: string): string => {
  const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const title = 'User Directory Report';

  const active = users.filter(u => u.is_active).length;
  const inactive = users.filter(u => !u.is_active).length;
  const admins = users.filter(u => u.role === 'admin').length;

  const page2 = pageShell('User Summary', 2, `
    ${sectionHeading('01', 'Executive Summary')}
    <div class="exec-box">
      <div class="exec-label">Key Findings</div>
      <div class="exec-text">${execSummaryUsers(users)}</div>
    </div>

    ${sectionHeading('02', 'Account Overview')}

    ${kpiGrid([
      { value: users.length, label: 'Total Accounts', cls: 'teal' },
      { value: active,   label: 'Active',   cls: 'teal', delta: pct(active,   users.length) },
      { value: inactive, label: 'Inactive', cls: 'red',  delta: pct(inactive, users.length) },
      { value: admins,   label: 'Admins',               delta: pct(admins,   users.length) },
    ])}

    <div class="subsection-title">Status Distribution</div>
    ${distBar('Active',   active,   users.length, C.teal)}
    ${distBar('Inactive', inactive, users.length, C.red)}
    ${distBar('Admins',   admins,   users.length, C.sage)}

    <div class="subsection-title" style="margin-top: 4mm;">📊 </div>
    <div style="background: #f8f9fa; padding: 3mm; border-radius: 2mm; font-size: 8.5pt; line-height: 1.4;">
      <strong>User Engagement:</strong> ${parseFloat(pct(active, users.length)) > 70 ? 'Excellent engagement' : parseFloat(pct(active, users.length)) > 50 ? 'Moderate engagement' : 'Low engagement'} with ${active} active users (${pct(active, users.length)}%).
      ${inactive > users.length * 0.3 ? 'High inactive rate suggests need for re-engagement strategies.' : 'Healthy active user ratio.'}<br>
      <strong>Administrative Coverage:</strong> ${parseFloat(pct(admins, users.length)) > 10 ? 'Strong administrative oversight' : parseFloat(pct(admins, users.length)) > 5 ? 'Adequate administrative coverage' : 'Limited administrative coverage'} with ${admins} admin accounts (${pct(admins, users.length)}%).
      ${admins < 2 ? 'Consider adding backup administrators for better coverage.' : 'Administrative structure appears well-balanced.'}
    </div>
  `);

  const sorted = [...users].sort((a, b) => a.name.localeCompare(b.name));
  const chunkSize = 18;
  const chunks: User[][] = [];
  for (let i = 0; i < sorted.length; i += chunkSize) {
    chunks.push(sorted.slice(i, i + chunkSize));
  }

  const dirPages = chunks
    .map((chunk, ci) => {
      const pageNum = ci + 3;
      const rangeLabel = `${ci * chunkSize + 1}–${Math.min((ci + 1) * chunkSize, sorted.length)} of ${sorted.length}`;

      return pageShell(`User Directory (${rangeLabel})`, pageNum, `
        ${ci === 0 ? sectionHeading('03', 'Complete User Directory') : ''}
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            ${chunk
              .map(
                (u, i) => `
            <tr>
              <td>${ci * chunkSize + i + 1}</td>
              <td><strong>${u.name}</strong></td>
              <td class="mono">@${u.username}</td>
              <td class="mono">${u.email}</td>
              <td><span class="badge badge-${u.role}">${u.role}</span></td>
              <td><span class="badge badge-${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>${fmtDate(u.created_at)}</td>
              <td>${u.last_login ? fmtDate(u.last_login) : '&mdash;'}</td>
            </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      `);
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SnapShroom User Directory Report</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  ${coverPage(
    title,
    'Complete account directory with role assignments, status classifications, and registration history.',
    now,
    adminName,
  )}
  ${tocPage([
    { num: '01', label: 'Executive Summary' },
    { num: '02', label: 'Account Overview' },
    { num: '03', label: 'User Directory' },
  ])}
  ${page2}
  ${dirPages}
</body>
</html>`;
};

/* ════════════════════════════════════════════════════════════════
   BUILD OVERVIEW REPORT
════════════════════════════════════════════════════════════════ */

export const buildOverviewReport = (analytics: Analytics, adminName: string): string => {
  const now = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const title = 'Dashboard Overview Report';

  const userActPct =
    analytics.users.total_users > 0
      ? ((analytics.users.active_users / analytics.users.total_users) * 100).toFixed(1)
      : '0';

  const timelineData = analytics.timeline ?? [];

  const page2 = pageShell('Platform Overview', 2, `
    ${sectionHeading('01', 'Executive Summary')}
    <div class="exec-box">
      <div class="exec-label">Platform Status</div>
      <div class="exec-text">${execSummaryAnalytics(analytics)}</div>
    </div>

    ${sectionHeading('02', 'Key Performance Indicators')}

    ${kpiGrid([
      { value: analytics.users.total_users,                       label: 'Total Users',    cls: 'teal' },
      { value: analytics.users.active_users,                      label: 'Active Users',   cls: 'teal', delta: `${userActPct}%` },
      { value: analytics.mushrooms.total_scans,                   label: 'Total Scans',    cls: 'mush' },
      { value: analytics.mushrooms.scans_last_30d,                label: 'Scans (30d)' },
      { value: `${analytics.mushrooms.detection_success_rate}%`,  label: 'Success Rate',
        cls: analytics.mushrooms.detection_success_rate >= 80 ? 'teal' : 'amber' },
      { value: analytics.users.admin_count,                       label: 'Admins' },
    ])}

    <div class="two-col">
      <div class="col">
        <div class="subsection-title">User Status</div>
        ${distBar('Active',   analytics.users.active_users,   analytics.users.total_users, C.teal)}
        ${distBar('Inactive', analytics.users.inactive_users, analytics.users.total_users, C.red)}
        ${distBar('Admins',   analytics.users.admin_count,    analytics.users.total_users, C.sage)}
      </div>
    </div>

    ${
      timelineData.length > 0
        ? `<div class="subsection-title">Scan Activity Trend (last ${Math.min(timelineData.length, 28)} days)</div>
           ${sparkline(timelineData)}`
        : ''
    }

    ${
      analytics.mushrooms.most_scanned_mushrooms.length > 0
        ? `<div class="subsection-title">Top 5 Species</div>
           ${rankedList(analytics.mushrooms.most_scanned_mushrooms, analytics.mushrooms.total_scans, C.mushroom, 5)}`
        : ''
    }
  `);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SnapShroom Dashboard Overview Report</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  ${coverPage(
    title,
    'High-level platform health snapshot including user status, scan performance, and top species.',
    now,
    adminName,
  )}
  ${tocPage([
    { num: '01', label: 'Executive Summary' },
    { num: '02', label: 'Key Performance Indicators' },
    { num: '03', label: 'User Status & Scan Distribution' },
    { num: '04', label: 'Activity Trend & Top Species' },
  ])}
  ${page2}
</body>
</html>`;
};