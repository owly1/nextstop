# Nextstop — Toronto Lab

The atlas interface uses `dist/atlas.css`, early-loading `dist/theme.js` and `dist/map-theme.js`. Appearance supports Light, Dark and System; only this local preference persists. Map recolouring preserves the current layers and proposal. See `UI_DESIGN_NOTES.md` for research, rationale and validation. New planning-data work awaits the user's UI review.

## Flood review guide

Connection details include `dist/flood.js`: review questions for the applied bus/BRT/LRT/metro option, links to TRCA's official river-flood viewer and companion polygon/line sources, and a historical September 19, 2019 TTC flood-management case (report pages 3–6). Questions are Nextstop interpretations, not agency recommendations for a corridor. No flood geometry is bundled, and no overlap, depth, probability or mitigation cost is calculated. Snapshot and GeoJSON exports preserve explicit `not_assessed` states and null measurements. Source geometry ingestion, coverage checks and reuse review remain unfinished. No scores or costs change.

A small transit-imagination website. Generate upgrades from six Toronto bus corridors, adjust each connection's mode, departure interval and stop spacing, compare alternatives, and export a GeoJSON proposal. There is no network-drawing tool.

## Open it locally

Use a local HTTP server; opening `dist/index.html` directly as a file prevents browser modules and datasets from loading reliably.

From the `site/dist` folder, run `python3 -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/`. The published site needs no terminal or coding tools.

## What is implemented

- Actual TTC routes and stops from the August 27, 2026 GTFS snapshot, with rail, streetcar and optional daytime bus layers.
- A density layer for 158 Toronto neighbourhoods and area-weighted density context around each corridor, using sourced 2021 census weighted 25% sample estimates. The coverage factor identifies missing areas outside Toronto.
- A regional travel-pattern explorer using published 2022 TTS origin–destination tables. Explore inbound/outbound trips for six GTHA regions, morning or full day. All modes and purposes are included; these coarse flows do not change corridor ranking or imply transit ridership.
- A Nature map layer and corridor environmental screening using Toronto ravine (2019 download) and ESA (2026 download) polygons. Invalid ravine shapes are displayed provisionally and excluded from measured overlaps; affected corridors are marked incomplete. Includes mode-specific review questions and a sourced Singapore case study.
- Interactive ground profiles for all six corridors, with 708 sampled estimates from Toronto’s 2023 LiDAR-derived terrain polygons. The slider reports distance and height; source notes distinguish bare-earth context from road/rail grade and tunnel depth.
- A reproducible rule-based comparison of bus priority, BRT, LRT and metro along six existing corridors.
- Separate construction and annual operating allowances; no construction when no package fits.
- Individual adjustments, mode comparison, explanatory case studies and sourced limitations.
- Desktop and mobile layouts, keyboard controls and WebMCP proposal tools.

## What is still research, not a working model

This version is not a trained AI, a demand forecast or an engineering assessment. Neighbourhood density is historical context; it does not establish current population, walking access or ridership. The app does not yet assign corridor-level origin–destination demand or assess geology, regional GDP or actual public funding. Terrain profiles provide sampled historical ground context, not surveyed elevations or engineering grades. Environmental screening covers only two Toronto datasets, not all constraints. Costs, speeds, vehicle capacities and ranking weights are illustrative design assumptions. The baseline excludes GO and regional bus networks and does not represent committed future projects. Geometry follows representative TTC bus paths, including road turns unsuitable for a literal railway alignment.

The next substantive phase should extend environmental coverage (Greenbelt, national parks and flood hazards), build a combined regional baseline, and evaluate finer trip patterns and walk catchments. Keep these separate from speculative scenario assumptions. GDP must never be treated as available government funds. An LLM can explain retrieved evidence later; it should not invent the numerical analysis.

## Files to change

- `dist/index.html`: page content and controls.
- `dist/styles.css` and `dist/workspace.css`: presentation.
- `dist/app.js`: browser interaction, mapping, dialogs, export and WebMCP.
- `dist/engine.js`: corridor descriptions, explicit assumptions and scenario selection.
- `dist/data/provenance.json`: source, licence, retrieval details and data transformation notes.
- `scripts/prepare-transit.py`: recreate the compact TTC snapshot from GTFS.
- `scripts/test-engine.mjs`: model checks; run with `node scripts/test-engine.mjs` from this folder.
- `scripts/prepare-demographics.py`: census/geography join and 800 m corridor intersections. Requires openpyxl, Shapely and pyproj. Use `scripts/export-corridors.mjs OUTPUT.json` first to export the exact current candidates. Pass source workbook, boundary GeoJSON, corridor JSON and output directory with the named CLI arguments. See `dist/data/demographics-provenance.json` for source URLs, hashes and the calculation method. Raw inputs are not required to serve the site.
- `scripts/prepare-travel.py REPORT.pdf OUTPUT.json`: reproduces the two regional OD tables from printed page 53 of the public report, with source hash and methodology. Requires pdfplumber. `node scripts/test-travel.mjs` verifies direction, totals and all 24 views. The dataset contains public aggregate numerical facts, not household records; no open-data licence for TTS is claimed.

The preprocessing script contains the raw GTFS input path. Update it and the provenance metadata deliberately when refreshing data; recheck all six endpoints and run the model checks. No raw GTFS archive is required to serve the website.

## Hosting and dependencies

This is a static website with no package installation or build step. `.openai/hosting.json` identifies the existing Sites project; reuse it rather than registering a second site. Deployment requires saving and publishing the same committed source through Sites.

MapLibre GL JS 5.6.1 is vendored with its licence. CARTO basemap tiles, OpenStreetMap data and Google Fonts require internet access. The dataset and scenario model run locally in the visitor's browser. No API key, account, analytics or paid AI service is connected. Refreshing the page resets the scenario; download the proposal to keep a copy.

Contains information licensed under the Open Government Licence – Toronto. Independent project; no TTC, Metrolinx or City endorsement is implied.

## Environmental data maintenance

`dist/environment.js` renders the Nature map layer and corridor evidence. `scripts/prepare-environment.py --ravines INPUT.zip --esa INPUT.geojson --boundaries TORONTO_NEIGHBOURHOODS.geojson --corridors CANDIDATES.json --output dist/data` reproduces the screen. Install the pinned packages in `scripts/requirements-environment.txt` for preprocessing. Run `python3 scripts/test-environment.py` to check overlap unions, boundary contact, proximity, provisional geometry exclusion and published coverage.

Source URLs, SHA256 hashes, snapshot dates and repairs are in `dist/data/environment-provenance.json`. Analysis uses EPSG:2952 and unsimplified valid polygons. The ravine shapefile contains 65 polygons with nested shells; they are excluded from overlap length, with repaired shapes used only for provisional display and proximity context. Within 50 m of their bounding boxes, screening is marked incomplete. Other nearby areas are found using a 50 m minimum distance, an illustrative search radius, not a setback or construction width. Display polygons are simplified by 5 m. Toronto coverage uses a 50 m band intersected with the neighbourhood union; Steeles has incomplete regional coverage.

No source overlap establishes environmental clearance; 2D geometry does not distinguish bridges, tunnels or surface impacts. Screening adds review questions and does not change rankings or cost assumptions. Density and Nature are mutually exclusive thematic layers to keep their legends and colours unambiguous. The proposal export and WebMCP snapshot include the environmental evidence and missing-data state.

## Terrain data maintenance

`dist/terrain.js` renders the interactive profile and exposes a compact summary for WebMCP. Full profiles are included in downloaded proposals. `dist/data/corridor-terrain.json` holds the 708 samples and source record indices; `terrain-provenance.json` documents source URLs, archive hash, methods and limits.

The official source is Toronto’s Triangular Irregular Network, derived from 2023 LiDAR-based 2.5 m bare-earth data. Its horizontal reference is EPSG:2952, with CGVD2013 heights. The catalogue lists September 4, 2024 as resource modification; the downloaded file’s Last-Modified header says October 22, 2024. Neither is the acquisition year. The 188 MB source archive contains 2,628,358 triangles. Only compact derived sample data is published.

Install the existing `scripts/requirements-environment.txt` dependencies, extract the shapefile archive, then run `python3 scripts/prepare-terrain.py --tin INPUT.shp --archive ORIGINAL.zip --corridors CANDIDATES.json --output dist/data`. Candidate geometry comes from `scripts/export-corridors.mjs`. Samples are every 100 m plus both endpoints. The value is the containing polygon’s Avg_Elev, not interpolation of triangle vertices and not the source slope field. Shared-edge matches use the mean of polygon averages. Missing or invalid source coverage stays null; plots split at missing samples. Zero values are never substituted for unavailable data.

Run `node scripts/test-terrain.mjs` for sampling counts, ranges, chart coordinates, missing-data splits and validation. Eighteen start/middle/end sample matches were independently checked against the original shapefile records and their polygons. All 708 points have values in this snapshot; that does not imply all surrounding regional land has coverage. The range summarizes these points, not every extremum along a line. Ground under a bridge is not the bridge deck. No mode, cost, speed or ranking is changed by terrain context.

## Greenbelt screening

The Nature view includes the Ontario Greenbelt outer boundary from the official `GBOUTBND.zip` distribution, dated December 14, 2023, with effective-date field December 6, 2023. The layer covers all Greenbelt areas, including Urban River Valleys; it does not identify site-specific designation or ownership. Ontario’s Urban River Valley policy source is linked in each connection’s Greenbelt panel. Treat overlap as a planning-review question, not permission or a blanket construction ban. National parks and flood hazards remain unscreened.

Reproduce with `python3 scripts/prepare-greenbelt.py --archive GBOUTBND.zip --corridors CANDIDATES.json --output dist/data/greenbelt.json`, using the existing Shapely/pyproj/pyshp dependencies. The source is NAD83 geographic (EPSG:4269), transformed to EPSG:2952 for full-geometry intersections and minimum distances. Only the display copy is simplified by 10 m. The source MultiPolygon is valid and required no repair. SHA256 hashes, source, effective date, methods and Open Government Licence – Ontario attribution are embedded in `greenbelt.json`. No change to ranking or budgets.

## Rouge national-park context

The Nature view compares two federal Rouge records separately: NRCan's live legislative-boundary service (adminAreaId 33245, retrieved September 14, 2026) and ECCC's CPCAD December 2025 conservation snapshot (ZONE_ID 717900000). Both are licensed under Open Government Licence – Canada. Their extents differ by about 17.72 km² of symmetric difference; this is a data comparison, not a park expansion or missing-land estimate. No union is presented as the park boundary. All six candidate lines have no overlap in either checked record, but overall park coverage and park-wide impacts remain explicitly unresolved. Distances from incomplete outlines are not presented as distances to the whole park.

The NRCan Ontario ZIP dated September 9, 2026 also differs from its live service and is not used in the published overlay. Its Rouge geometry covers roughly 45.49 km², versus 62.54 km² in the live-service record and 46.68 km² in CPCAD, calculated in EPSG:2952. A recent file/retrieval date does not establish a current legal extent. Verify legal documents and current Parks Canada land status before making a park-wide conclusion. The park's 2019 management plan supports the local infrastructure/access case in the panel; it is not approval for a proposed line.

`data/rouge-park.json` stores source queries, exact feature identifiers/attributes, hashes, separate full-geometry overlap measurements, display copies simplified by 5 m, and limitations. Reproduce with `python3 scripts/prepare-parks.py --nrcan NRCAN.geojson --cpcad CPCAD.geojson --corridors CANDIDATES.json --output dist/data/rouge-park.json`, using the existing geospatial dependencies. Both service responses use outSR 4326; analysis uses EPSG:2952. `python3 scripts/test-parks.py` checks spatial contact/crossing cases, source separation and unknown coverage. `node scripts/test-parks.mjs` checks UI summaries, optional-data fallback and validation. No ranking, mode, speed or budget change. Other national parks and flood hazards remain outside this layer.

Connection details use `dist/inspector.js` and `dist/inspector.css`: accessible Overview/Evidence/Stops tabs, expandable evidence topics and a persistent inspector heading. Mode-dependent evidence describes the applied proposal until edits are confirmed.
