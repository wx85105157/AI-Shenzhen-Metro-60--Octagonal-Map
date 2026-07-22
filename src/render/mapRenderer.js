const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  });
  return element;
}

function polylinePointsToPath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function stationVisible(station, linesById, filters) {
  const hasVisibleLine = station.lineIds.some((lineId) => {
    const line = linesById.get(lineId);
    if (!line) {
      return false;
    }

    return filters.status.has(line.status) && filters.category.has(line.category);
  });

  return hasVisibleLine && filters.status.has(station.status) && filters.category.has(station.category);
}

/**
 * 为换乘站生成多线颜色弧段（SVG path）。
 * 将外圆等分成 N 段，每段染对应线路的颜色。
 * @param {string[]} lineColors - 各线路颜色数组（最多8条）
 * @param {number} r - 外圆半径
 * @returns {SVGPathElement[]}
 */
function buildTransferArcs(lineColors, r) {
  const n = lineColors.length;
  if (n < 2) return [];

  const arcs = [];
  const sweep = (2 * Math.PI) / n;

  for (let i = 0; i < n; i++) {
    const startAngle = i * sweep - Math.PI / 2;
    const endAngle = startAngle + sweep;
    const x1 = r * Math.cos(startAngle);
    const y1 = r * Math.sin(startAngle);
    const x2 = r * Math.cos(endAngle);
    const y2 = r * Math.sin(endAngle);
    // 大弧标志：仅当弧度超过 π 时为 1
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

    arcs.push(
      createSvgElement('path', {
        d,
        fill: lineColors[i],
        class: 'transfer-arc',
        'vector-effect': 'non-scaling-stroke'
      })
    );
  }
  return arcs;
}

export function createMapRenderer({
  svg,
  contentGroup,
  referenceImagePath,
  referenceOpacity,
  onStationInteract
}) {
  const referenceLayer = createSvgElement('g', { 'data-layer': 'reference' });
  const cityLayer = createSvgElement('g', { 'data-layer': 'cities' });
  const parkLayer = createSvgElement('g', { 'data-layer': 'parks' });
  const lineLayer = createSvgElement('g', { 'data-layer': 'lines' });
  const stationLayer = createSvgElement('g', { 'data-layer': 'stations' });
  const labelLayer = createSvgElement('g', { 'data-layer': 'labels' });

  const referenceImage = createSvgElement('image', {
    href: referenceImagePath,
    x: 0,
    y: 0,
    width: 4964,
    height: 2900,
    preserveAspectRatio: 'none',
    opacity: referenceOpacity,
    visibility: 'hidden'
  });

  referenceLayer.append(referenceImage);
  contentGroup.replaceChildren(referenceLayer, cityLayer, parkLayer, lineLayer, stationLayer, labelLayer);

  const rendered = {
    lineElements: new Map(),
    stationElements: new Map(),
    labelElements: new Map(),
    linesById: new Map(),
    servicesByStation: new Map()
  };

  function render(data) {
    rendered.lineElements.clear();
    rendered.stationElements.clear();
    rendered.labelElements.clear();
    rendered.linesById = new Map(data.lines.items.map((line) => [line.id, line]));
    rendered.servicesByStation = data.services.items.reduce((acc, service) => {
      if (!acc.has(service.stationId)) {
        acc.set(service.stationId, []);
      }
      acc.get(service.stationId).push(service);
      return acc;
    }, new Map());

    lineLayer.replaceChildren();
    stationLayer.replaceChildren();
    labelLayer.replaceChildren();

    data.lines.items.forEach((line) => {
      const path = createSvgElement('path', {
        d: polylinePointsToPath(line.pathPoints),
        stroke: line.color,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        fill: 'none',
        'vector-effect': 'non-scaling-stroke',
        class: `map-line status-${line.status} category-${line.category}`,
        'data-line-id': line.id
      });

      if (line.strokeStyle === 'dashed') {
        path.setAttribute('stroke-dasharray', '24 18');
      }

      lineLayer.append(path);
      rendered.lineElements.set(line.id, path);
    });

    data.stations.items.forEach((station) => {
      const primaryLine = rendered.linesById.get(station.lineIds[0]);
      if (!primaryLine) {
        return;
      }

      // 收集该站所有线路的颜色（去重，保持线路顺序）
      const stationLineColors = station.lineIds
        .map((lid) => rendered.linesById.get(lid)?.color)
        .filter(Boolean);

      // aria-label 包含所有换乘线路名称
      const lineNames = station.lineIds
        .map((lid) => rendered.linesById.get(lid)?.shortName)
        .filter(Boolean)
        .join('、');

      const group = createSvgElement('g', {
        transform: `translate(${station.schematicPosition.x} ${station.schematicPosition.y})`,
        tabindex: 0,
        role: 'button',
        class: `station-node status-${station.status} category-${station.category}`,
        'data-station-id': station.id,
        'aria-label': `${station.name.zh} ${station.name.en}，${lineNames}`
      });

      if (station.isTransfer) {
        if (stationLineColors.length >= 2) {
          // 换乘站：外圆用多色弧段展示各线路颜色
          const arcGroup = createSvgElement('g', { class: 'transfer-arc-group' });
          buildTransferArcs(stationLineColors, 20).forEach((arc) => arcGroup.append(arc));
          group.append(arcGroup);
        } else {
          // 仅标注换乘但单线的站点：保持白色外圆样式
          group.append(
            createSvgElement('circle', {
              r: 20,
              class: 'station-ring',
              'vector-effect': 'non-scaling-stroke'
            })
          );
        }
      }

      group.append(
        createSvgElement('circle', {
          r: station.isTransfer ? 10 : 8,
          class: 'station-core',
          fill: primaryLine.color,
          'vector-effect': 'non-scaling-stroke'
        })
      );

      const hitArea = createSvgElement('circle', {
        r: 28,
        class: 'station-hit-area',
        fill: 'transparent'
      });
      group.append(hitArea);

      const showTooltip = () =>
        onStationInteract({
          station,
          line: primaryLine,
          services: rendered.servicesByStation.get(station.id) || [],
          targetElement: group
        });

      group.addEventListener('mouseenter', showTooltip);
      group.addEventListener('focus', showTooltip);
      group.addEventListener('mouseleave', () => onStationInteract(null));
      group.addEventListener('blur', () => onStationInteract(null));
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          group.blur();
        }
      });

      stationLayer.append(group);
      rendered.stationElements.set(station.id, group);

      const label = createSvgElement('text', {
        x: station.schematicPosition.x + station.labelPosition.dx,
        y: station.schematicPosition.y + station.labelPosition.dy,
        'text-anchor': station.labelPosition.anchor,
        class: 'station-label'
      });

      const zhText = createSvgElement('tspan', { x: station.schematicPosition.x + station.labelPosition.dx, dy: 0, class: 'label-zh' });
      zhText.textContent = station.name.zh;
      const enText = createSvgElement('tspan', {
        x: station.schematicPosition.x + station.labelPosition.dx,
        dy: 30,
        class: 'label-en'
      });
      enText.textContent = station.name.en;
      label.append(zhText, enText);
      labelLayer.append(label);
      rendered.labelElements.set(station.id, label);
    });
  }

  function applyLineVisibility(filters) {
    rendered.lineElements.forEach((element, lineId) => {
      const line = rendered.linesById.get(lineId);
      const visible = filters.status.has(line.status) && filters.category.has(line.category);
      element.setAttribute('display', visible ? 'inline' : 'none');
    });
  }

  function applyDataDrivenVisibility(data, filters) {
    const stationsById = new Map(data.stations.items.map((station) => [station.id, station]));

    rendered.stationElements.forEach((element, stationId) => {
      const station = stationsById.get(stationId);
      const visible = stationVisible(station, rendered.linesById, filters);
      element.setAttribute('display', visible ? 'inline' : 'none');
      rendered.labelElements.get(stationId)?.setAttribute('display', visible ? 'inline' : 'none');
    });
  }

  return {
    render,
    applyFilters(data, filters) {
      applyLineVisibility(filters);
      applyDataDrivenVisibility(data, filters);
    },
    setReferenceVisibility(isVisible) {
      referenceImage.setAttribute('visibility', isVisible ? 'visible' : 'hidden');
    },
    setReferenceOpacity(opacity) {
      referenceImage.setAttribute('opacity', opacity);
    },
    getReferenceElement() {
      return referenceImage;
    }
  };
}
