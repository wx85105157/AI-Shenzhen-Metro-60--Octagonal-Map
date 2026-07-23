import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readJson(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  const raw = await readFile(fullPath, 'utf8');
  return JSON.parse(raw);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const [lines, stations, services, projects, cities, parks, baseline, gapReport, calibrationTasks] = await Promise.all([
    readJson('src/data/lines.json'),
    readJson('src/data/stations.json'),
    readJson('src/data/services.json'),
    readJson('src/data/projects.json'),
    readJson('src/data/cities.geojson'),
    readJson('src/data/parks.geojson'),
    readJson('src/data/station-baseline.json'),
    readJson('src/data/station-gap-report.json'),
    readJson('src/data/calibration-tasks.json')
  ]);

  assert(Array.isArray(lines.items), 'lines.items must be an array');
  assert(Array.isArray(stations.items), 'stations.items must be an array');
  assert(Array.isArray(services.items), 'services.items must be an array');
  assert(Array.isArray(projects.items), 'projects.items must be an array');
  assert(cities.type === 'FeatureCollection', 'cities.geojson must be a FeatureCollection');
  assert(parks.type === 'FeatureCollection', 'parks.geojson must be a FeatureCollection');

  const stationIds = new Set(stations.items.map((station) => station.id));
  const lineIds = new Set(lines.items.map((line) => line.id));

  lines.items.forEach((line) => {
    assert(Array.isArray(line.pathPoints) && line.pathPoints.length >= 2, `${line.id} needs at least two pathPoints`);
    line.stationIds.forEach((stationId) => {
      assert(stationIds.has(stationId), `Unknown station ${stationId} referenced by ${line.id}`);
    });
  });

  stations.items.forEach((station) => {
    assert(station.schematicPosition && Number.isFinite(station.schematicPosition.x), `${station.id} missing schematicPosition.x`);
    assert(station.labelPosition && typeof station.labelPosition.anchor === 'string', `${station.id} missing labelPosition.anchor`);
  });

  services.items.forEach((service) => {
    assert(lineIds.has(service.lineId), `Unknown line ${service.lineId} referenced by service ${service.id}`);
    assert(stationIds.has(service.stationId), `Unknown station ${service.stationId} referenced by service ${service.id}`);
  });

  assert(Array.isArray(baseline.items), 'station-baseline.items must be an array');
  baseline.items.forEach((entry) => {
    assert(lineIds.has(entry.lineId), `Unknown line ${entry.lineId} referenced by station-baseline`);
    assert(typeof entry.baselineStatus === 'string', `${entry.lineId} missing baselineStatus`);
    assert(Array.isArray(entry.expectedStations), `${entry.lineId} expectedStations must be an array`);
    assert(Array.isArray(entry.expectedTransferStationIds), `${entry.lineId} expectedTransferStationIds must be an array`);
    entry.expectedStations.forEach((station) => {
      assert(typeof station.stationId === 'string', `${entry.lineId} expectedStations entry missing stationId`);
    });
  });

  assert(Array.isArray(gapReport.items), 'station-gap-report.items must be an array');
  gapReport.items.forEach((item) => {
    assert(lineIds.has(item.lineId), `Unknown line ${item.lineId} referenced by station-gap-report`);
    assert(Number.isFinite(item.currentStationCount), `${item.lineId} currentStationCount must be finite`);
    assert(Array.isArray(item.currentTransferStationIds), `${item.lineId} currentTransferStationIds must be an array`);
    assert(Array.isArray(item.stationsMissingLineBacklink), `${item.lineId} stationsMissingLineBacklink must be an array`);
    assert(Array.isArray(item.missingStations), `${item.lineId} missingStations must be an array`);
    assert(Array.isArray(item.unexpectedStations), `${item.lineId} unexpectedStations must be an array`);
    assert(Array.isArray(item.outOfOrderStationIds), `${item.lineId} outOfOrderStationIds must be an array`);
  });

  assert(Array.isArray(calibrationTasks.tasks), 'calibration-tasks.tasks must be an array');
  calibrationTasks.tasks.forEach((task) => {
    assert(stationIds.has(task.stationId), `Unknown station ${task.stationId} referenced by calibration-tasks`);
    assert(['high', 'medium', 'low'].includes(task.priority), `${task.stationId} has invalid calibration priority`);
    assert(task.relatedLineIds.every((lineId) => lineIds.has(lineId)), `${task.stationId} has unknown relatedLineIds`);
    assert(Number.isFinite(task.currentSchematicPosition?.x), `${task.stationId} missing currentSchematicPosition.x`);
    assert(Number.isFinite(task.suggestedSchematicPosition?.x), `${task.stationId} missing suggestedSchematicPosition.x`);
    assert(Number.isFinite(task.deviationPx), `${task.stationId} deviationPx must be finite`);
  });

  await access(path.join(repoRoot, 'assets/reference/shenzhen-bay-area-60-octagonal-reference.png'));

  console.log(
    `Validated ${lines.items.length} lines, ${stations.items.length} stations, ${services.items.length} services, ${baseline.items.length} baseline entries, and ${calibrationTasks.tasks.length} calibration tasks.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
