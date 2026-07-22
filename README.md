# Shenzhen 60° / Octagonal Transit Map (Phase 1)

Static HTML/SVG prototype for a Shenzhen-centered schematic rail-transit map. Phase 1 establishes the project skeleton, synchronized SVG/reference overlay foundation, and one minimal operating-line demonstration sample.

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

## GitHub Pages

This project is pure static frontend (`HTML + CSS + JavaScript + SVG + JSON/GeoJSON`), so it can be served directly from GitHub Pages without a build step.

## Phase 1 scope

- Interactive SVG viewport with pointer-centered zoom, pan, touch-friendly pointer events, and reset view.
- Reference image overlay (`assets/reference/shenzhen-bay-area-60-octagonal-reference.png`) sharing the same transform as schematic content.
- Separate data files under `src/data/`.
- One real Shenzhen operating metro line sample, clearly marked as **Phase 1 demonstration data**.
- Tooltip/focus card for sample stations with transparent handling of unknown or unverified values.
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
│       ├── cities.geojson
│       ├── lines.json
│       ├── parks.geojson
│       ├── projects.json
│       ├── services.json
│       └── stations.json
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

## Phase 1 limitations

- This is **not** a complete or authoritative Shenzhen network dataset.
- Only one operating-line sample is included.
- Official source verification for production-grade line/station/service coverage remains a later phase; unverified demo values are explicitly labeled.
- City boundaries, park boundaries, under-construction lines, and planned lines are schema-ready but not populated yet.

See `docs/DATA_SPEC.md` for schema details and `docs/SOURCES.md` for sourcing rules.
