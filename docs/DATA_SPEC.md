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

## `station-baseline.json`

用于维护“应有站点清单”的权威基线模板。该文件**只能**根据官方资料填写，不能从当前工作数据反推。

```json
{
  "meta": {
    "snapshotDate": "2026-07-23",
    "status": "baseline-template",
    "boundaryRules": {}
  },
  "items": [
    {
      "lineId": "szm-line-1",
      "shortName": "1号线",
      "baselineStatus": "pending_official_verification",
      "expectedStationCount": null,
      "expectedStations": [],
      "expectedTransferStationIds": [],
      "source": {}
    }
  ]
}
```

说明：

- `boundaryRules` 用于明确是否纳入支线、跨市延伸终点、未开通站等边界规则。
- `expectedStations` 的顺序即官方站序。
- `baselineStatus` 建议值：`pending_official_verification`、`in_review`、`verified`。

## `station-gap-report.json`

由审计脚本生成的当前库 vs 基线对账结果。

```json
{
  "meta": {},
  "summary": {},
  "items": [
    {
      "lineId": "szm-line-1",
      "currentStationCount": 25,
      "expectedStationCount": null,
      "canCompare": false,
      "missingStations": [],
      "unexpectedStations": [],
      "outOfOrderStationIds": []
    }
  ]
}
```

说明：

- 当 `expectedStations` 为空时，`canCompare` 为 `false`，表示该线路尚未具备与官方基线的缺口比较条件。
- `stationsMissingLineBacklink` 用于发现 `lines.json` 与 `stations.json` 的双向归属不一致问题。

## `calibration-tasks.json`

由审计脚本生成的坐标校准任务清单，用于执行“两阶段定位法”。

```json
{
  "meta": {},
  "summary": {},
  "tasks": [
    {
      "stationId": "st-futian",
      "priority": "high",
      "currentSchematicPosition": { "x": 2700, "y": 1720 },
      "suggestedSchematicPosition": { "x": 2684.5, "y": 1708.2 },
      "deviationPx": 19.48
    }
  ]
}
```

说明：

- `suggestedSchematicPosition` 由 `geoPosition` 等比例投影得到，只作为初定位建议值。
- `priority` 规则默认优先换乘站和线路端点，其次处理偏差较大的普通站。
- 最终 `schematicPosition` 仍需以参考图叠加和八向走线规则做人工微调。

## 补全与校准工作流

1. 先在 `station-baseline.json` 中按官方资料补录每条线的 `expectedStations`。
2. 运行审计脚本生成 `station-gap-report.json`，查看缺站、归属错误与站序异常。
3. 补齐 `stations.json` / `lines.json` 后再次运行审计，直到缺口收敛。
4. 再依据 `calibration-tasks.json` 中的建议坐标与优先级校准 `schematicPosition`。
5. 每批修改后运行 `node tests/validate-data.mjs` 做结构校验。

## Demonstration-data rule

Any Phase 1 record that is real-world but not yet verified against an official production source must be explicitly marked as demonstration data in metadata and/or `source.notes`. Rendering code should present those values as provisional rather than authoritative.
