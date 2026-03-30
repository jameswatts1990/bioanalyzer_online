# bioanalyzer_online

A lightweight web UI that runs Femto Trace-style differential analysis locally in the browser.

## Femto Trace workflow (new user quick guide)

1. Start the web UI locally:
   ```bash
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080`.
3. In **Femto Trace Inputs**, fill:
   - Dataset name (for example: `Femto Trace Plate 07`)
   - Group A and Group B labels (for example: `Control` and `Treated`)
   - Analysis thresholds (`adj_p_max` and `|log2FC|`)
4. Paste Femto Trace matrix data (CSV/TSV), where:
   - First row is header
   - First column is marker/gene ID
   - Remaining columns are sample intensity values
5. Click **Detect Sample Columns** and verify Group A / Group B sample assignments.
6. Click **Run Femto Trace Analysis**.
7. Read results in KPI cards, the R output preview panel, volcano plot, and marker-level results table.

Tip: Click **Load Demo Payload** to run a known-good sample payload before using your own data.

## What this includes

- Single-page UI for:
  - Uploading/pasting expression matrix data
  - Selecting sample columns for each comparison group
  - Running local differential analysis in-browser
  - Viewing summary KPIs, R-style output preview, volcano plot, and gene-level results
- Responsive layout and accessible status messaging.

## Quick start

Because this is a static front end, you can run it with any static server.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Notes

- This UI does not require backend configuration to run analysis.
- Calculations are intended for fast exploratory use in-browser.
- The R output panel provides an R-style preview of key analysis steps and top results.
