# bioanalyzer_online

A lightweight web front end for a `bioanalyzeR`-compatible backend API.

## Femto Trace workflow (new user quick guide)

1. Start the web UI locally:
   ```bash
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080`.
3. In **Backend Connection**, enter your backend URL and click **Test Connection**.
4. In **Femto Trace Inputs**, fill:
   - Dataset name (for example: `Femto Trace Plate 07`)
   - Group A and Group B labels (for example: `Control` and `Treated`)
   - Analysis thresholds (`adj_p_max` and `|log2FC|`)
5. Paste Femto Trace matrix data (CSV/TSV), where:
   - First row is header
   - First column is marker/gene ID
   - Remaining columns are sample intensity values
6. Click **Run Femto Trace Analysis**.
7. Read results in the KPI cards and marker-level results table.

Tip: Click **Load Demo Payload** to run a known-good sample payload before using your own data.

## What this includes

- Single-page UI for:
  - Backend connectivity checks (`GET /health`)
  - Upload/paste expression matrix data
  - Running differential analysis (`POST /analyze`)
  - Viewing summary KPIs and gene-level results
- Responsive layout and accessible status messaging.

## Quick start

Because this is a static front end, you can run it with any static server.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Backend contract expected by this UI

### Health

`GET /health`

Example response:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### Analyze

`POST /analyze`

Example request body:

```json
{
  "dataset_name": "BRCA cohort",
  "groups": {
    "control": "control",
    "treatment": "treated"
  },
  "thresholds": {
    "adj_p_max": 0.05,
    "abs_log2fc_min": 1
  },
  "records": [
    { "gene": "TP53", "sample_1": "12", "sample_2": "15" }
  ]
}
```

Example response body:

```json
{
  "summary": {
    "genes_tested": 22000,
    "significant_hits": 740,
    "runtime_sec": 1.84
  },
  "results": [
    {
      "gene": "TP53",
      "log2fc": 1.46,
      "adj_p_val": 0.0002,
      "status": "upregulated"
    }
  ]
}
```

## Notes

- API key auth is optional in the UI. If your backend is open, leave the API key field empty.
- If your backend requires bearer auth, add your key in the API key field and it will be sent as `Authorization: Bearer <key>`.
- The backend URL is user-configurable in the interface, allowing local dev, staging, or production API targets.
