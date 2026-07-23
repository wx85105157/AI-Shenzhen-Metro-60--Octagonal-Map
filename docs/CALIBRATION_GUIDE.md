# 站点位置校准指南

本指南用于执行“先补全站点，再做坐标校准”的第二阶段。

## 目标

- 先保证线路拓扑、站序、换乘关系正确；
- 再优化 `schematicPosition`，使其更贴近参考图；
- 最终走线仍需遵循 0° / 45° / 90° / 135° 八向规则。

## 输入文件

- `src/data/stations.json`
- `src/data/lines.json`
- `src/data/calibration-tasks.json`
- `assets/reference/shenzhen-bay-area-60-octagonal-reference.png`

## 操作顺序

1. 先补齐 `station-baseline.json` 中的官方站序；
2. 运行 `node scripts/generate-network-audit.mjs`；
3. 优先处理 `calibration-tasks.json` 中的：
   - `priority = high` 的换乘站；
   - `priority = high` 的线路端点；
   - 偏差较大的核心走廊站点；
4. 修改 `stations.json` 中对应站点的 `schematicPosition`；
5. 打开参考图叠加层人工核对；
6. 再运行审计脚本和 `node tests/validate-data.mjs`。

## 调整原则

- `suggestedSchematicPosition` 只作为地理初定位，不直接视为最终值；
- 同一换乘站在所有线路上必须共用同一个 `schematicPosition`；
- 相邻站点应保持可读间距，避免标签和站点重叠；
- 如真实地理关系与参考图冲突，以参考图可读性和八向走线优先，但不能破坏拓扑。

## 完成标准

- 基线缺口已收敛；
- 参考图叠加下关键走廊与枢纽偏差明显缩小；
- `node tests/validate-data.mjs` 通过。
