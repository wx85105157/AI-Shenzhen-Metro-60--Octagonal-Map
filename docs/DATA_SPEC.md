# DATA_SPEC.md

Phase 1 keeps business data outside rendering and interaction code. The JSON/GeoJSON files in `src/data/` are the only source for lines, stations, service entries, and future project/geography layers.

## Coordinate model

Each station or map object may use up to three position models:

- `geoPosition`: real-world geographic position, typically longitude/latitude.
- `schematicPosition`: SVG-space position used for the 60° / eight-direction schematic rendering.
- `labelPosition`: label offset/anchor information used to place bilingual labels without changing station coordinates.

Phase 1 calibration assumptions:

- The SVG base coordinate system matches the reference image natural size: **4964 × 2900**.
- `schematicPosition` coordinates are therefore stored in the same pixel-like units as the reference overlay so both layers can share one transform.
- Reset view restores the untransformed base extent (`translate(0,0) scale(1)`).
- The current sample line is demonstration-only and must not be treated as a full production dataset.

## Shared source metadata

Use the following traceability block wherever applicable:

```json
{
  "sourceName": "发布机构或资料名称",
  "sourceUrl": "https://example.invalid/source",
  "publishedAt": "YYYY-MM-DD 或原始发布日期文本",
  "checkedAt": "2026-07-22",
  "notes": "适用范围、演示说明、待核验项等"
}
```

Required fields:

- `sourceName`
- `sourceUrl`
- `publishedAt`
- `checkedAt`
- `notes`

## `lines.json`

Top-level structure:

```json
{
  "meta": {},
  "items": []
}
```

Line object:

```json
{
  "id": "szm-line-11-demo",
  "shortName": "11号线",
  "englishName": "Line 11",
  "category": "metro",
  "status": "operating",
  "color": "#7a2e8e",
  "strokeStyle": "solid",
  "isPhase1Demo": true,
  "pathPoints": [{ "x": 2700, "y": 1720 }],
  "stationIds": ["st-futian"],
  "source": {}
}
```

Notes:

- `category` framework values: `metro`, `intercity_rail`, `other_transit`
- `status` framework values: `operating`, `under_construction`, `planned`
- `pathPoints` are schematic polyline vertices only.

## `stations.json`

Station object:

```json
{
  "id": "st-futian",
  "name": { "zh": "福田", "en": "Futian" },
  "lineIds": ["szm-line-11-demo"],
  "category": "metro",
  "status": "operating",
  "geoPosition": { "lng": 114.05, "lat": 22.54 },
  "schematicPosition": { "x": 2700, "y": 1720 },
  "labelPosition": { "dx": 0, "dy": -72, "anchor": "middle" },
  "isTransfer": false,
  "transferLines": ["Line 2"],
  "source": {}
}
```

Notes:

- `geoPosition` may be provisional in Phase 1 demonstration records and must be labeled as such in `source.notes`.
- `labelPosition.anchor` maps to SVG `text-anchor`: `start`, `middle`, `end`.

## `services.json`

Service entry:

```json
{
  "id": "svc-futian-to-bitou",
  "lineId": "szm-line-11-demo",
  "stationId": "st-futian",
  "directionZh": "往碧头",
  "directionEn": "Toward Bitou",
  "serviceStatusZh": "运营中（演示）",
  "serviceStatusEn": "Operating (demo)",
  "firstTrain": null,
  "lastTrain": null,
  "firstTrainNote": "官方未公开 / Not published by operator in this demo",
  "lastTrainNote": "官方未公开 / Not published by operator in this demo",
  "source": {}
}
```

## `projects.json`

Project object for later phases:

```json
{
  "id": "project-example",
  "name": "示例项目",
  "category": "metro",
  "status": "under_construction",
  "plannedOpening": "2028",
  "source": {}
}
```

Phase 1 may keep `items` empty while preserving a valid schema container.

## `cities.geojson` / `parks.geojson`

Valid empty GeoJSON is acceptable in Phase 1:

```json
{
  "type": "FeatureCollection",
  "features": []
}
```

Recommended future feature properties:

- `id`
- `nameZh`
- `nameEn`
- `category`
- `labelPosition`
- `source`

## Demonstration-data rule

Any Phase 1 record that is real-world but not yet verified against an official production source must be explicitly marked as demonstration data in metadata and/or `source.notes`. Rendering code should present those values as provisional rather than authoritative.
