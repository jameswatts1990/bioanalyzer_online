# bioanalyzer_online

A lightweight web UI that runs Femto Trace-style differential analysis locally in the browser.

## Femto CSV workflow (new user step-by-step)

Use this checklist when preparing your first Femto CSV for analysis.

1. Start the web UI locally:
   ```bash
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080`.
3. (Optional, recommended) Click **Load Demo Payload** once to see a known-good CSV shape and auto-detected column assignment behavior.
4. Prepare your Femto CSV so it follows this structure:
   - Row 1 must be headers.
   - Column 1 must be the feature/region/marker ID.
   - Every remaining column must be one sample replicate.
   - Values should be numeric (intensity, concentration, or molarity).
5. Use clear sample names that include group identity. Example:
   ```csv
   feature,control_rep_1,control_rep_2,control_rep_3,treated_rep_1,treated_rep_2,treated_rep_3
   Region_200_500bp,102,98,105,187,192,181
   Region_500_1500bp,44,47,43,31,28,30
   ```
6. In **Femto Trace Inputs**, fill:
   - Dataset name (for example: `Femto Trace Plate 07`)
   - Baseline and Test labels (for example: `Control` and `Treated`)
   - Analysis thresholds (`adj_p_max` and `|log2FC|`)
7. Paste the CSV/TSV into **Femto Trace Data Matrix (CSV/TSV)**.
8. Click **Detect Sample Columns**, then verify Baseline and Test sample assignment in both multi-select lists.
9. Click **Run Femto Trace Analysis**.
10. Review KPIs, R output preview, volcano plot, and the feature-level results table.

Troubleshooting tip: if detection or analysis fails, verify there are no blank headers, no text values in numeric columns, and at least one sample selected in each group.

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
