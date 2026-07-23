# Shenzhen 60° / Octagonal Transit Map

Static HTML/SVG prototype for a Shenzhen-centered schematic rail-transit map. The repository now includes a Phase 2 workflow for station coverage auditing and schematic-position calibration.

## Run locally

Because the app loads JSON/GeoJSON modules with `fetch`, use a simple static server instead of opening `index.html` directly from `file://`.

### Python

```bash
cd /path/to/AI-Shenzhen-Metro-60--Octagonal-Map
python -m http.server 4173
```

Then open `http://localhost:4173`.

### Optional data validation

```bash
node tests/validate-data.mjs
```

### Generate station audit artifacts

```bash
node scripts/generate-network-audit.mjs
```

## GitHub Pages

This project is pure static frontend (`HTML + CSS + JavaScript + SVG + JSON/GeoJSON`), so it can be served directly from GitHub Pages without a build step.

## Current scope

- Interactive SVG viewport with pointer-centered zoom, pan, touch-friendly pointer events, and reset view.
- Reference image overlay (`assets/reference/shenzhen-bay-area-60-octagonal-reference.png`) sharing the same transform as schematic content.
- Separate data files under `src/data/`.
- Shenzhen operating-line / station working dataset, explicitly marked as pending official verification.
- Station coverage baseline template, gap report, and calibration task generation workflow.
- Tooltip/focus card for stations with transparent handling of unknown or unverified values.
- Framework controls for operating / under-construction / planned and metro / intercity rail / other transit.

## Project structure

```text
.
├── index.html
├── README.md
├── assets/
│   └── reference/
│       └── shenzhen-bay-area-60-octagonal-reference.png
├── docs/
│   ├── DATA_SPEC.md
│   ├── SOURCES.md
│   └── WORK_PLAN.md
├── src/
│   ├── app.js
│   ├── config/
│   │   └── mapConfig.js
│   ├── interaction/
│   │   └── viewport.js
│   ├── render/
│   │   ├── mapRenderer.js
│   │   └── tooltip.js
│   ├── styles/
│   │   └── main.css
│   └── data/
│       ├── calibration-tasks.json
│       ├── cities.geojson
│       ├── lines.json
│       ├── parks.geojson
│       ├── projects.json
│       ├── services.json
│       ├── station-baseline.json
│       ├── station-gap-report.json
│       └── stations.json
├── scripts/
│   └── generate-network-audit.mjs
└── tests/
    └── validate-data.mjs
```

## Controls

- **Show reference overlay**: enables the layout-validation image layer behind schematic content.
- **Reference opacity**: adjusts overlay opacity without changing the schematic layer.
- **Status/category filters**: framework controls for current and later phases.
- **Reset view**: restores the natural base extent of the SVG/reference viewport.

## Manual test checklist

1. Start a local static server and open the app.
2. Turn on the reference overlay and confirm it appears behind the schematic line.
3. Zoom with mouse wheel or trackpad over different points and confirm the overlay and SVG content stay aligned.
4. Drag to pan and confirm the overlay remains synchronized.
5. Use either reset button and confirm the default full-map framing is restored.
6. Hover or keyboard-focus a station and confirm the tooltip shows bilingual name, line, service state, and source/update messaging.
7. Narrow the browser width and confirm the control panel stacks above the map while remaining usable.
8. Run `node scripts/generate-network-audit.mjs` and confirm `src/data/station-gap-report.json` and `src/data/calibration-tasks.json` are updated.
9. Run `node tests/validate-data.mjs` and confirm baseline / report / calibration artifacts pass validation.

## Station coverage and calibration workflow

1. Fill `src/data/station-baseline.json` from official operator / government sources.
2. Run `node scripts/generate-network-audit.mjs` to produce:
   - `src/data/station-gap-report.json`: current library vs baseline gap report
   - `src/data/calibration-tasks.json`: station coordinate calibration queue
3. Fix missing stations, line backlinks, and station order issues before adjusting schematic coordinates.
4. Use `suggestedSchematicPosition` only as a geographic seed; finalize `schematicPosition` against the reference overlay and octagonal rules.
5. Follow `docs/CALIBRATION_GUIDE.md` for the manual calibration pass.

## Current limitations

- This is **not** a complete or authoritative Shenzhen network dataset.
- The baseline template is intentionally empty until official station sequences are filled in.
- Generated gap reports become authoritative only after `station-baseline.json` is completed from official sources.
- City boundaries, park boundaries, under-construction lines, and planned lines are schema-ready but not populated yet.

See `docs/DATA_SPEC.md` for schema details and `docs/SOURCES.md` for sourcing rules.
