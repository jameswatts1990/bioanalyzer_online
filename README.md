# bioanalyzer_online

A lightweight web front end for a `bioanalyzeR`-compatible backend API.

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
