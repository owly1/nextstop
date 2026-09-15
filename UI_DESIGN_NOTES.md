# Nextstop atlas interface

September 15, 2026. UI milestone only; planning-data work waits for user review.

## Reference research

- [MetroDreamin](https://metrodreamin.com/explore): map discovery and playful transit exploration. Borrow the prominence of the map; retain Nextstop's adjustment-only workflow.
- [Conveyal scenario interface](https://docs.conveyal.com/edit-scenario): explicit scenarios and modifications. Borrow the separation of assumptions and results, without implying Nextstop has Conveyal's accessibility analysis.
- [Transit main-screen guide](https://help.transitapp.com/article/93-how-to-use-transit) and [cartographic design article](https://blog.transitapp.com/how-we-built-the-worlds-prettiest-auto-generated-transit-maps-12d0c6fa502f/): route-oriented map/list interaction and a distinct visual identity. Use readable route numbers and keep corresponding connections identifiable across the list, map and notes.

## Nextstop's own direction

A transit atlas of possible connections: charcoal and off-white surfaces, a restrained orange accent, numbered connections and prominent connection notes. Use compact functional headings, rectangular panels and borders rather than decorative sparkles, oversized introduction copy or stacks of rounded pastel cards. The existing explanation of why a connection matters is the focal point alongside its map and illustrative costs. This is a product/design distinction, not a claim that no other app offers explanations.

Light, Dark and System appearances share the same hierarchy. Theme preference alone persists locally; no account, analytics or saved-scenario capability is added. If browser storage is unavailable, switching still works for the session. Changing the theme recolours the loaded basemap without discarding source layers, camera position or proposal adjustments. A reload still resets the scenario, as before.

On small screens, the summary and notes follow the map instead of covering it. Existing budget controls, proposal generation, adjustments, comparisons, survey explorer, evidence panels and exports remain available. No network drawing, new analytical data or model changes are introduced.

## Verification

Local headless Chrome checks cover desktop light/dark, mobile 390×844, Nature and Density overlays, connection details, mode adjustment, preference persistence and automatic system-theme changes. Captured screens reviewed directly. No page errors or horizontal page overflow observed in these checks. Theme switching preserved the rendered proposal selection; applying an adjustment correctly closed the detail dialog. Further data work remains paused until the user approves the UI direction.

## Connection inspector refinement

Overview, Evidence and Stops tabs now separate service adjustments from research and stop locations. Native expandable evidence folders expose coverage gaps without a long wall of panels. Tab semantics support ArrowLeft/ArrowRight/Home/End; the title and navigation stay visible while the content scrolls. Browser QA on desktop light and mobile dark passed tabs, terrain controls, applied-mode changes, and Rouge map button state. Evidence is tied to the applied proposal until changes are confirmed. No planning model changes.
