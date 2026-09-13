# Nextstop — Toronto Lab

A small transit-imagination website. Generate upgrades from six Toronto bus corridors, adjust each connection's mode, departure interval and stop spacing, compare alternatives, and export a GeoJSON proposal. There is no network-drawing tool.

## Open it locally

Use a local HTTP server; opening `dist/index.html` directly as a file prevents browser modules and datasets from loading reliably.

From the `site/dist` folder, run `python3 -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/`. The published site needs no terminal or coding tools.

## What is implemented

- Actual TTC routes and stops from the August 27, 2026 GTFS snapshot, with rail, streetcar and optional daytime bus layers.
- A density layer for 158 Toronto neighbourhoods and area-weighted density context around each corridor, using sourced 2021 census weighted 25% sample estimates. The coverage factor identifies missing areas outside Toronto.
- A reproducible rule-based comparison of bus priority, BRT, LRT and metro along six existing corridors.
- Separate construction and annual operating allowances; no construction when no package fits.
- Individual adjustments, mode comparison, explanatory case studies and sourced limitations.
- Desktop and mobile layouts, keyboard controls and WebMCP proposal tools.

## What is still research, not a working model

This version is not a trained AI, a demand forecast or an engineering assessment. Neighbourhood density is historical context; it does not establish current population, walking access or ridership. The app does not yet calculate origin–destination flows, elevation, geology, protected-area intersections, regional GDP or actual public funding. Costs, speeds, vehicle capacities and ranking weights are illustrative design assumptions. The baseline excludes GO and regional bus networks and does not represent committed future projects. Geometry follows representative TTC bus paths, including road turns unsuitable for a literal railway alignment.

The next substantive phase should ingest travel-flow evidence, build a combined regional baseline, and evaluate walk catchments and environmental constraints. Keep these separate from speculative scenario assumptions. GDP must never be treated as available government funds. An LLM can explain retrieved evidence later; it should not invent the numerical analysis.

## Files to change

- `dist/index.html`: page content and controls.
- `dist/styles.css` and `dist/workspace.css`: presentation.
- `dist/app.js`: browser interaction, mapping, dialogs, export and WebMCP.
- `dist/engine.js`: corridor descriptions, explicit assumptions and scenario selection.
- `dist/data/provenance.json`: source, licence, retrieval details and data transformation notes.
- `scripts/prepare-transit.py`: recreate the compact TTC snapshot from GTFS.
- `scripts/test-engine.mjs`: model checks; run with `node scripts/test-engine.mjs` from this folder.
- `scripts/prepare-demographics.py`: census/geography join and 800 m corridor intersections. Requires openpyxl, Shapely and pyproj. Use `scripts/export-corridors.mjs OUTPUT.json` first to export the exact current candidates. Pass source workbook, boundary GeoJSON, corridor JSON and output directory with the named CLI arguments. See `dist/data/demographics-provenance.json` for source URLs, hashes and the calculation method. Raw inputs are not required to serve the site.

The preprocessing script contains the raw GTFS input path. Update it and the provenance metadata deliberately when refreshing data; recheck all six endpoints and run the model checks. No raw GTFS archive is required to serve the website.

## Hosting and dependencies

This is a static website with no package installation or build step. `.openai/hosting.json` identifies the existing Sites project; reuse it rather than registering a second site. Deployment requires saving and publishing the same committed source through Sites.

MapLibre GL JS 5.6.1 is vendored with its licence. CARTO basemap tiles, OpenStreetMap data and Google Fonts require internet access. The dataset and scenario model run locally in the visitor's browser. No API key, account, analytics or paid AI service is connected. Refreshing the page resets the scenario; download the proposal to keep a copy.

Contains information licensed under the Open Government Licence – Toronto. Independent project; no TTC, Metrolinx or City endorsement is implied.
