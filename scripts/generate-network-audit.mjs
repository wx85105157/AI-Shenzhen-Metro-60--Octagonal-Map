import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(repoRoot, 'src/data');
const viewport = { width: 4964, height: 2900, padding: 160 };
const MEDIUM_PRIORITY_DEVIATION_PX = 220;

async function readJson(relativePath) {
  const raw = await readFile(path.join(repoRoot, relativePath), 'utf8');
  return JSON.parse(raw);
}

function buildGeoProjector(stations) {
  const geoStations = stations.filter(
    (station) => Number.isFinite(station.geoPosition?.lng) && Number.isFinite(station.geoPosition?.lat)
  );
  const lngValues = geoStations.map((station) => station.geoPosition.lng);
  const latValues = geoStations.map((station) => station.geoPosition.lat);
  const lngMin = Math.min(...lngValues);
  const lngMax = Math.max(...lngValues);
  const latMin = Math.min(...latValues);
  const latMax = Math.max(...latValues);
  const lngSpan = Math.max(lngMax - lngMin, Number.EPSILON);
  const latSpan = Math.max(latMax - latMin, Number.EPSILON);
  const usableWidth = viewport.width - viewport.padding * 2;
  const usableHeight = viewport.height - viewport.padding * 2;
  const scale = Math.min(usableWidth / lngSpan, usableHeight / latSpan);
  const extraX = (usableWidth - lngSpan * scale) / 2;
  const extraY = (usableHeight - latSpan * scale) / 2;

  return (station) => ({
    x: Number((viewport.padding + extraX + (station.geoPosition.lng - lngMin) * scale).toFixed(2)),
    y: Number((viewport.padding + extraY + (latMax - station.geoPosition.lat) * scale).toFixed(2))
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findOutOfOrderStationIds(currentStationIds, expectedStationIds) {
  const currentIndexById = new Map(currentStationIds.map((stationId, index) => [stationId, index]));
  const commonIds = expectedStationIds.filter((stationId) => currentIndexById.has(stationId));
  const currentIndexes = commonIds.map((stationId) => currentIndexById.get(stationId));
  const offenders = new Set();

  for (let index = 1; index < currentIndexes.length; index += 1) {
    if (currentIndexes[index] < currentIndexes[index - 1]) {
      offenders.add(commonIds[index - 1]);
      offenders.add(commonIds[index]);
    }
  }

  return [...offenders];
}

function buildGapReport(lines, stations, baseline) {
  const stationById = new Map(stations.items.map((station) => [station.id, station]));
  const baselineByLineId = new Map(baseline.items.map((entry) => [entry.lineId, entry]));
  const items = lines.items.map((line) => {
    const currentStationIds = line.stationIds;
    const baselineEntry = baselineByLineId.get(line.id);
    const expectedStations = baselineEntry?.expectedStations ?? [];
    const expectedStationIds = expectedStations.map((station) => station.stationId);
    const canCompare = expectedStationIds.length > 0;
    const missingBacklinks = currentStationIds.filter((stationId) => !stationById.get(stationId)?.lineIds.includes(line.id));
    const missingStations = canCompare
      ? expectedStations
          .filter((station) => !currentStationIds.includes(station.stationId))
          .map(({ stationId, nameZh = null, nameEn = null }) => ({ stationId, nameZh, nameEn }))
      : [];
    const unexpectedStations = canCompare
      ? currentStationIds
          .filter((stationId) => !expectedStationIds.includes(stationId))
          .map((stationId) => ({
            stationId,
            nameZh: stationById.get(stationId)?.name?.zh ?? null,
            nameEn: stationById.get(stationId)?.name?.en ?? null
          }))
      : [];
    const outOfOrderStationIds = canCompare ? findOutOfOrderStationIds(currentStationIds, expectedStationIds) : [];
    const currentTransferStationIds = currentStationIds.filter((stationId) => stationById.get(stationId)?.isTransfer);

    return {
      lineId: line.id,
      shortName: line.shortName,
      baselineStatus: baselineEntry?.baselineStatus ?? 'missing_baseline_entry',
      currentStationCount: currentStationIds.length,
      expectedStationCount: baselineEntry?.expectedStationCount ?? null,
      currentTransferStationIds,
      stationsMissingLineBacklink: missingBacklinks,
      canCompare,
      missingStations,
      unexpectedStations,
      outOfOrderStationIds,
      notes: canCompare
        ? '已可与官方基线进行缺口与站序对比。'
        : 'expectedStations 尚未补录，当前仅输出工作数据快照与自检结果。'
    };
  });

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      purpose: '辅助执行“先补全站点，再做坐标校准”的阶段2工作流。',
      baselineStatus: `${items.filter((item) => item.canCompare).length}/${items.length} 条线路已具备可比对基线`
    },
    summary: {
      totalLines: lines.items.length,
      totalStations: stations.items.length,
      transferStations: stations.items.filter((station) => station.isTransfer).length,
      linesReadyForComparison: items.filter((item) => item.canCompare).length,
      linesPendingBaseline: items.filter((item) => !item.canCompare).length,
      linesWithBacklinkIssues: items.filter((item) => item.stationsMissingLineBacklink.length > 0).length
    },
    items
  };
}

function buildCalibrationTasks(lines, stations) {
  const stationById = new Map(stations.items.map((station) => [station.id, station]));
  const endpointStationIds = new Set();
  lines.items.forEach((line) => {
    if (line.stationIds.length > 0) {
      endpointStationIds.add(line.stationIds[0]);
      endpointStationIds.add(line.stationIds[line.stationIds.length - 1]);
    }
  });

  const project = buildGeoProjector(stations.items);
  const tasks = stations.items.map((station) => {
    const suggested = project(station);
    const deviationPx = Number(distance(station.schematicPosition, suggested).toFixed(2));
    const isEndpoint = endpointStationIds.has(station.id);
    const priority =
      station.isTransfer || isEndpoint ? 'high' : deviationPx >= MEDIUM_PRIORITY_DEVIATION_PX ? 'medium' : 'low';

    return {
      id: `cal-${station.id}`,
      stationId: station.id,
      nameZh: station.name.zh,
      relatedLineIds: station.lineIds,
      status: 'pending',
      priority,
      isTransfer: station.isTransfer,
      isEndpoint,
      currentSchematicPosition: station.schematicPosition,
      suggestedSchematicPosition: suggested,
      geoPosition: station.geoPosition,
      deviationPx,
      notes: station.isTransfer
        ? '换乘站优先校准，需保证多线共用同一示意坐标。'
        : isEndpoint
          ? '线路端点优先校准，用于稳定整条线的走向。'
          : '先按地理投影建议值初定位，再结合参考图微调。'
    };
  });

  const summary = tasks.reduce(
    (acc, task) => {
      acc[task.priority] += 1;
      if (task.deviationPx >= 200) {
        acc.largeDeviationCount += 1;
      }
      return acc;
    },
    { high: 0, medium: 0, low: 0, largeDeviationCount: 0 }
  );

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      projectionMethod: '基于 geoPosition 的等比例包围盒投影，映射到 4964x2900 参考图坐标系。',
      calibrationRules: [
        '先按 suggestedSchematicPosition 初定位，再结合参考图微调。',
        '换乘站与线路端点优先处理。',
        '微调后仍须保持八向走线与可读间距。'
      ]
    },
    summary: {
      totalTasks: tasks.length,
      highPriorityTasks: summary.high,
      mediumPriorityTasks: summary.medium,
      lowPriorityTasks: summary.low,
      largeDeviationCount: summary.largeDeviationCount
    },
    tasks
  };
}

async function main() {
  const [lines, stations, baseline] = await Promise.all([
    readJson('src/data/lines.json'),
    readJson('src/data/stations.json'),
    readJson('src/data/station-baseline.json')
  ]);

  const gapReport = buildGapReport(lines, stations, baseline);
  const calibrationTasks = buildCalibrationTasks(lines, stations);

  await mkdir(dataDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(dataDir, 'station-gap-report.json'), `${JSON.stringify(gapReport, null, 2)}\n`, 'utf8'),
    writeFile(path.join(dataDir, 'calibration-tasks.json'), `${JSON.stringify(calibrationTasks, null, 2)}\n`, 'utf8')
  ]);

  console.log(
    `Generated station-gap-report.json (${gapReport.summary.linesReadyForComparison}/${gapReport.summary.totalLines} lines ready) and calibration-tasks.json (${calibrationTasks.summary.totalTasks} tasks).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
