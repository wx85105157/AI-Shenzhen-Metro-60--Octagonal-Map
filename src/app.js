import { MAP_CONFIG } from './config/mapConfig.js';
import { createViewportController } from './interaction/viewport.js';
import { createMapRenderer } from './render/mapRenderer.js';
import { createTooltip } from './render/tooltip.js';

const FILTER_DEFAULTS = {
  status: new Set(['operating', 'under_construction', 'planned']),
  category: new Set(['metro', 'intercity_rail', 'other_transit'])
};

const ui = {
  svg: document.getElementById('metro-map'),
  contentGroup: document.getElementById('viewport-content'),
  mapStage: document.getElementById('map-stage'),
  tooltip: document.getElementById('station-tooltip'),
  statusText: document.getElementById('status-text'),
  referenceToggle: document.getElementById('toggle-reference'),
  referenceOpacity: document.getElementById('reference-opacity'),
  filterInputs: Array.from(document.querySelectorAll('[data-filter-group]')),
  resetButtons: [document.getElementById('reset-view'), document.getElementById('reset-view-toolbar')]
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadData() {
  const [lines, stations, services, projects, cities, parks] = await Promise.all([
    loadJson('./src/data/lines.json'),
    loadJson('./src/data/stations.json'),
    loadJson('./src/data/services.json'),
    loadJson('./src/data/projects.json'),
    loadJson('./src/data/cities.geojson'),
    loadJson('./src/data/parks.geojson')
  ]);

  return { lines, stations, services, projects, cities, parks };
}

function readFilters() {
  const filters = {
    status: new Set(),
    category: new Set()
  };

  ui.filterInputs.forEach((input) => {
    if (input.checked) {
      filters[input.dataset.filterGroup].add(input.value);
    }
  });

  return filters;
}

function setStatus(message) {
  ui.statusText.textContent = message;
}

async function init() {
  const tooltip = createTooltip({ element: ui.tooltip, stageElement: ui.mapStage });
  const viewport = createViewportController({
    svg: ui.svg,
    contentGroup: ui.contentGroup,
    minScale: MAP_CONFIG.minScale,
    maxScale: MAP_CONFIG.maxScale,
    zoomStep: MAP_CONFIG.zoomStep
  });

  const renderer = createMapRenderer({
    svg: ui.svg,
    contentGroup: ui.contentGroup,
    referenceImagePath: MAP_CONFIG.referenceImagePath,
    referenceOpacity: MAP_CONFIG.defaultReferenceOpacity,
    onStationInteract(payload) {
      if (!payload) {
        tooltip.hide();
        return;
      }

      tooltip.show(payload);
    }
  });

  ui.referenceOpacity.value = String(MAP_CONFIG.defaultReferenceOpacity);
  renderer.setReferenceVisibility(false);
  renderer.setReferenceOpacity(MAP_CONFIG.defaultReferenceOpacity);

  ui.referenceToggle.addEventListener('change', () => {
    renderer.setReferenceVisibility(ui.referenceToggle.checked);
  });

  ui.referenceOpacity.addEventListener('input', () => {
    renderer.setReferenceOpacity(Number(ui.referenceOpacity.value));
  });

  ui.filterInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const filters = readFilters();

      if (input.dataset.filterGroup === 'status' && !filters.status.size) {
        input.checked = true;
      }
      if (input.dataset.filterGroup === 'category' && !filters.category.size) {
        input.checked = true;
      }
      if (window.__PHASE1_DATA__) {
        tooltip.hide();
        renderer.applyFilters(window.__PHASE1_DATA__, readFilters());
      }
    });
  });

  ui.resetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      viewport.reset();
      tooltip.hide();
      setStatus('视图已重置。参考图与 SVG 已恢复到共享基准视口。');
    });
  });

  try {
    const data = await loadData();
    window.__PHASE1_DATA__ = data;
    renderer.render(data);
    renderer.applyFilters(data, FILTER_DEFAULTS);

    setStatus(
      `已加载 ${data.lines.items.length} 条线路、${data.stations.items.length} 个站点和 ${data.services.items.length} 条服务记录。当前为 Phase 1 演示样本。`
    );
  } catch (error) {
    console.error(error);
    setStatus('加载失败：请通过静态服务器打开项目，并检查 JSON / 模块路径。');
  }
}

init();
