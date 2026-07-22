import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
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
  const [lines, stations, services, projects, cities, parks] = await Promise.all([
    readJson('src/data/lines.json'),
    readJson('src/data/stations.json'),
    readJson('src/data/services.json'),
    readJson('src/data/projects.json'),
    readJson('src/data/cities.geojson'),
    readJson('src/data/parks.geojson')
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

  await access(path.join(repoRoot, 'assets/reference/shenzhen-bay-area-60-octagonal-reference.png'));

  console.log(`Validated ${lines.items.length} lines, ${stations.items.length} stations, ${services.items.length} services.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
