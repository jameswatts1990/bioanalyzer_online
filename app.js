const healthBtn = document.getElementById('healthBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadDemoBtn = document.getElementById('loadDemoBtn');
const apiBaseEl = document.getElementById('apiBase');
const healthStatus = document.getElementById('healthStatus');
const analysisStatus = document.getElementById('analysisStatus');
const resultRows = document.getElementById('resultRows');
const rowTemplate = document.getElementById('rowTemplate');

const genesTestedEl = document.getElementById('genesTested');
const sigHitsEl = document.getElementById('sigHits');
const runtimeEl = document.getElementById('runtime');

const getApiBase = () => apiBaseEl.value.trim().replace(/\/$/, '');

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

const normalizePayload = () => {
  const { records } = parseDataInput(document.getElementById('inputData').value);
  return {
    dataset_name: document.getElementById('datasetName').value.trim() || 'untitled_dataset',
    groups: {
      control: document.getElementById('conditionA').value.trim() || 'control',
      treatment: document.getElementById('conditionB').value.trim() || 'treated'
    },
    thresholds: {
      adj_p_max: Number(document.getElementById('adjP').value),
      abs_log2fc_min: Number(document.getElementById('logfc').value)
    },
    records
  };
};

healthBtn.addEventListener('click', async () => {
  const base = getApiBase();
  if (!base) {
    setStatus(healthStatus, 'Enter an API base URL first.', 'error');
    return;
  }

  setStatus(healthStatus, 'Checking backend health...');
  try {
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    const body = await res.json();
    const version = body.version ? ` (version ${body.version})` : '';
    setStatus(healthStatus, `Backend reachable${version}.`, 'ok');
  } catch (error) {
    setStatus(healthStatus, error.message, 'error');
  }
});

analyzeBtn.addEventListener('click', async () => {
  const base = getApiBase();
  if (!base) {
    setStatus(analysisStatus, 'Enter an API base URL before running analysis.', 'error');
    return;
  }

  const payload = normalizePayload();
  if (!payload.records.length) {
    setStatus(analysisStatus, 'Add at least one data row in CSV/TSV format.', 'error');
    return;
  }

  setStatus(analysisStatus, 'Running differential analysis...');
  analyzeBtn.disabled = true;

  try {
    const res = await fetch(`${base}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
    const body = await res.json();

    genesTestedEl.textContent = body.summary?.genes_tested ?? payload.records.length;
    sigHitsEl.textContent = body.summary?.significant_hits ?? 0;
    runtimeEl.textContent = body.summary?.runtime_sec ?? '—';

    renderResults(body.results ?? []);
    setStatus(analysisStatus, 'Analysis completed successfully.', 'ok');
  } catch (error) {
    setStatus(analysisStatus, error.message, 'error');
  } finally {
    analyzeBtn.disabled = false;
  }
});

loadDemoBtn.addEventListener('click', () => {
  document.getElementById('datasetName').value = 'Synthetic Demo';
  document.getElementById('conditionA').value = 'WT';
  document.getElementById('conditionB').value = 'KO';
  document.getElementById('adjP').value = '0.05';
  document.getElementById('logfc').value = '1.2';
  document.getElementById('inputData').value = [
    'gene,sample_wt_1,sample_wt_2,sample_ko_1,sample_ko_2',
    'TP53,12,11,28,24',
    'EGFR,100,99,52,55',
    'MYC,43,47,41,45',
    'CDK2,14,13,23,21'
  ].join('\n');

  setStatus(analysisStatus, 'Demo payload loaded. Set your backend URL and run analysis.', 'ok');
});
