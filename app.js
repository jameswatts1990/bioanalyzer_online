const analyzeBtn = document.getElementById('analyzeBtn');
const loadDemoBtn = document.getElementById('loadDemoBtn');
const detectColumnsBtn = document.getElementById('detectColumnsBtn');
const analysisStatus = document.getElementById('analysisStatus');
const resultRows = document.getElementById('resultRows');
const rowTemplate = document.getElementById('rowTemplate');
const rOutput = document.getElementById('rOutput');
const plotWrap = document.getElementById('plotWrap');

const groupAColsEl = document.getElementById('groupACols');
const groupBColsEl = document.getElementById('groupBCols');
const inputDataEl = document.getElementById('inputData');

const genesTestedEl = document.getElementById('genesTested');
const sigHitsEl = document.getElementById('sigHits');
const runtimeEl = document.getElementById('runtime');

const setStatus = (element, message, tone = 'neutral') => {
  element.textContent = message;
  element.classList.remove('ok', 'error');
  if (tone === 'ok') element.classList.add('ok');
  if (tone === 'error') element.classList.add('error');
};

const parseDataInput = (raw) => {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], records: [] };

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const records = lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    return headers.reduce((acc, header, idx) => {
      acc[header] = values[idx] ?? '';
      return acc;
    }, {});
  });

  return { headers, records };
};

const selectedValues = (selectEl) =>
  Array.from(selectEl.selectedOptions).map((option) => option.value);

const fillColumnSelectors = (headers) => {
  const numericColumns = headers.slice(1);
  groupAColsEl.innerHTML = '';
  groupBColsEl.innerHTML = '';

  if (!numericColumns.length) return;

  numericColumns.forEach((column, idx) => {
    const optionA = document.createElement('option');
    optionA.value = column;
    optionA.textContent = column;
    optionA.selected = idx < Math.ceil(numericColumns.length / 2);
    groupAColsEl.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = column;
    optionB.textContent = column;
    optionB.selected = idx >= Math.ceil(numericColumns.length / 2);
    groupBColsEl.appendChild(optionB);
  });
};

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

const variance = (values) => {
  if (values.length < 2) return 0;
  const mu = mean(values);
  return values.reduce((sum, value) => sum + (value - mu) ** 2, 0) / (values.length - 1);
};

const normalCdfApprox = (x) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let prob =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  prob = 1 - prob;
  return x < 0 ? 1 - prob : prob;
};

const pValueFromT = (t) => {
  const p = 2 * (1 - normalCdfApprox(Math.abs(t)));
  return Math.min(1, Math.max(0, p));
};

const benjaminiHochberg = (rows) => {
  const sorted = [...rows].sort((a, b) => a.p_raw - b.p_raw);
  const m = sorted.length;
  let minAdjusted = 1;

  for (let i = m - 1; i >= 0; i -= 1) {
    const rank = i + 1;
    const adjusted = (sorted[i].p_raw * m) / rank;
    minAdjusted = Math.min(minAdjusted, adjusted);
    sorted[i].adj_p_val = Math.min(1, minAdjusted);
  }

  const adjustedByGene = Object.fromEntries(sorted.map((row) => [row.gene, row.adj_p_val]));
  return rows.map((row) => ({ ...row, adj_p_val: adjustedByGene[row.gene] }));
};

const renderResults = (rows) => {
  resultRows.innerHTML = '';

  if (!rows.length) {
    resultRows.innerHTML = '<tr><td colspan="4" class="empty">No rows returned.</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const clone = rowTemplate.content.cloneNode(true);
    clone.querySelector('[data-key="gene"]').textContent = row.gene ?? '—';
    clone.querySelector('[data-key="log2fc"]').textContent = Number(row.log2fc ?? 0).toFixed(3);
    clone.querySelector('[data-key="adj_p_val"]').textContent = Number(row.adj_p_val ?? 1).toExponential(2);
    clone.querySelector('[data-key="status"]').textContent = row.status ?? 'n.s.';
    resultRows.appendChild(clone);
  });
};

const buildRPreview = (payload, summary, rows) => {
  const topRows = rows
    .slice(0, 6)
    .map(
      (row) =>
        `${row.gene.padEnd(18, ' ')}  logFC=${row.log2fc.toFixed(3)}  adj.P.Val=${row.adj_p_val.toExponential(2)}  ${row.status}`
    )
    .join('\n');

  return [
    '> library(bioanalyzeR)',
    `> dataset_name <- "${payload.dataset_name}"`,
    `> groups <- c("${payload.groups.control}", "${payload.groups.treatment}")`,
    '> # Typical upstream import path:',
    '> # epg <- read.prosize("Femto_Run.zip")',
    '> # qc <- qc.electrophoresis(epg)',
    '> # summary <- summary.electrophoresis(epg)',
    `# Features tested: ${summary.genes_tested}`,
    `# Significant features: ${summary.significant_hits}`,
    `# Runtime: ${summary.runtime_sec}s`,
    '',
    topRows || '# No rows'
  ].join('\n');
};

const renderVolcano = (rows, thresholdP, thresholdLogfc) => {
  if (!rows.length) {
    plotWrap.innerHTML = '<p class="empty">No plot data available.</p>';
    return;
  }

  const width = 560;
  const height = 300;
  const margin = { top: 18, right: 16, bottom: 34, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const maxX = Math.max(...rows.map((r) => Math.abs(r.log2fc)), thresholdLogfc, 1.5);
  const maxY = Math.max(...rows.map((r) => -Math.log10(Math.max(r.adj_p_val, 1e-9))), -Math.log10(Math.max(thresholdP, 1e-9)));

  const xScale = (x) => margin.left + ((x + maxX) / (2 * maxX)) * plotWidth;
  const yScale = (y) => margin.top + (1 - y / (maxY * 1.1)) * plotHeight;

  const points = rows
    .map((row) => {
      const x = xScale(row.log2fc);
      const y = yScale(-Math.log10(Math.max(row.adj_p_val, 1e-9)));
      const color = row.status === 'upregulated' ? '#e23d5f' : row.status === 'downregulated' ? '#2f80ed' : '#98a4b3';
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" fill="${color}" opacity="0.85"><title>${row.gene} | log2FC=${row.log2fc.toFixed(2)} | adj.P=${row.adj_p_val.toExponential(2)}</title></circle>`;
    })
    .join('');

  const xZero = xScale(0);
  const sigY = yScale(-Math.log10(Math.max(thresholdP, 1e-9)));
  const fcPos = xScale(thresholdLogfc);
  const fcNeg = xScale(-thresholdLogfc);

  plotWrap.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="volcano" role="img" aria-label="Volcano plot of differential analysis">
      <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="#f8fbff" stroke="#d9e2ec" />
      <line x1="${xZero}" x2="${xZero}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#9fb3c8" stroke-dasharray="4 4" />
      <line x1="${fcPos}" x2="${fcPos}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#c3cfda" stroke-dasharray="5 4" />
      <line x1="${fcNeg}" x2="${fcNeg}" y1="${margin.top}" y2="${height - margin.bottom}" stroke="#c3cfda" stroke-dasharray="5 4" />
      <line x1="${margin.left}" x2="${width - margin.right}" y1="${sigY}" y2="${sigY}" stroke="#c3cfda" stroke-dasharray="5 4" />
      ${points}
      <text x="${width / 2}" y="${height - 8}" text-anchor="middle" fill="#486581" font-size="11">log2 fold-change</text>
      <text x="14" y="${height / 2}" transform="rotate(-90 14 ${height / 2})" text-anchor="middle" fill="#486581" font-size="11">-log10(adj.P.Val)</text>
    </svg>
  `;
};

const normalizePayload = () => {
  const { headers, records } = parseDataInput(inputDataEl.value);
  return {
    dataset_name: document.getElementById('datasetName').value.trim() || 'femto_trace_dataset',
    groups: {
      control: document.getElementById('conditionA').value.trim() || 'Control',
      treatment: document.getElementById('conditionB').value.trim() || 'Treated'
    },
    thresholds: {
      adj_p_max: Number(document.getElementById('adjP').value),
      abs_log2fc_min: Number(document.getElementById('logfc').value)
    },
    headers,
    records,
    groupACols: selectedValues(groupAColsEl),
    groupBCols: selectedValues(groupBColsEl)
  };
};

const runLocalAnalysis = (payload) => {
  const runtimeStart = performance.now();

  const results = payload.records
    .map((record) => {
      const gene = record[payload.headers[0]] || record.gene || 'Unknown';
      const groupAValues = payload.groupACols.map((column) => Number(record[column])).filter(Number.isFinite);
      const groupBValues = payload.groupBCols.map((column) => Number(record[column])).filter(Number.isFinite);
      if (!groupAValues.length || !groupBValues.length) return null;

      const meanA = mean(groupAValues);
      const meanB = mean(groupBValues);
      const log2fc = Math.log2((meanB + 1e-9) / (meanA + 1e-9));

      const pooledSE = Math.sqrt(variance(groupAValues) / groupAValues.length + variance(groupBValues) / groupBValues.length + 1e-9);
      const t = pooledSE > 0 ? (meanB - meanA) / pooledSE : 0;
      const pRaw = pValueFromT(t);

      return { gene, log2fc, p_raw: pRaw };
    })
    .filter(Boolean);

  const adjusted = benjaminiHochberg(results).map((row) => {
    const significant = row.adj_p_val <= payload.thresholds.adj_p_max && Math.abs(row.log2fc) >= payload.thresholds.abs_log2fc_min;
    let status = 'n.s.';
    if (significant && row.log2fc > 0) status = 'upregulated';
    if (significant && row.log2fc < 0) status = 'downregulated';
    return { ...row, status };
  });

  const runtimeSec = ((performance.now() - runtimeStart) / 1000).toFixed(2);
  return {
    summary: {
      genes_tested: adjusted.length,
      significant_hits: adjusted.filter((row) => row.status !== 'n.s.').length,
      runtime_sec: runtimeSec
    },
    results: adjusted.sort((a, b) => a.adj_p_val - b.adj_p_val)
  };
};

detectColumnsBtn.addEventListener('click', () => {
  const { headers } = parseDataInput(inputDataEl.value);
  if (headers.length < 3) {
    setStatus(analysisStatus, 'Add CSV/TSV data with at least 1 feature column and 2 sample columns first.', 'error');
    return;
  }
  fillColumnSelectors(headers);
  setStatus(analysisStatus, 'Sample columns detected. Verify Baseline and Test selections.', 'ok');
});

analyzeBtn.addEventListener('click', async () => {
  const payload = normalizePayload();
  if (!payload.records.length) {
    setStatus(analysisStatus, 'Add at least one Femto Trace row in CSV/TSV format.', 'error');
    return;
  }

  if (!payload.groupACols.length || !payload.groupBCols.length) {
    setStatus(analysisStatus, 'Select at least one sample column for both Baseline and Test groups.', 'error');
    return;
  }

  setStatus(analysisStatus, 'Running local Femto Trace comparison analysis...');
  analyzeBtn.disabled = true;

  try {
    await new Promise((resolve) => setTimeout(resolve, 80));
    const body = runLocalAnalysis(payload);

    genesTestedEl.textContent = body.summary.genes_tested;
    sigHitsEl.textContent = body.summary.significant_hits;
    runtimeEl.textContent = body.summary.runtime_sec;

    renderResults(body.results);
    rOutput.textContent = buildRPreview(payload, body.summary, body.results);
    renderVolcano(body.results, payload.thresholds.adj_p_max, payload.thresholds.abs_log2fc_min);
    setStatus(analysisStatus, 'Local analysis completed successfully.', 'ok');
  } catch (error) {
    setStatus(analysisStatus, error.message, 'error');
  } finally {
    analyzeBtn.disabled = false;
  }
});

loadDemoBtn.addEventListener('click', () => {
  document.getElementById('datasetName').value = 'Femto Pulse Demo Run (3v3)';
  document.getElementById('conditionA').value = 'Reference';
  document.getElementById('conditionB').value = 'Fragmented';
  document.getElementById('adjP').value = '0.05';
  document.getElementById('logfc').value = '1.0';
  inputDataEl.value = [
    'feature,ref_rep_1,ref_rep_2,ref_rep_3,test_rep_1,test_rep_2,test_rep_3',
    'Region_1to200bp,120,111,118,288,244,271',
    'Region_200to500bp,100,99,103,52,55,58',
    'Region_500to1500bp,43,47,45,41,45,44',
    'Region_1500to6000bp,14,13,15,23,21,22',
    'Peak_AdapterDimer,61,58,60,126,130,121',
    'Peak_MainLibrary,210,198,205,148,152,145'
  ].join('\n');

  const { headers } = parseDataInput(inputDataEl.value);
  fillColumnSelectors(headers);
  rOutput.textContent = 'No analysis run yet.';
  plotWrap.innerHTML = '<p class="empty">Run analysis to render volcano plot.</p>';
  setStatus(analysisStatus, 'Femto Trace demo loaded with balanced replicates. Review labels/thresholds, then run analysis.', 'ok');
});

plotWrap.innerHTML = '<p class="empty">Run analysis to render volcano plot.</p>';
