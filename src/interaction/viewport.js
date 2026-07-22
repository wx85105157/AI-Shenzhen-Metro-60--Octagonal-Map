export function createViewportController({
  svg,
  contentGroup,
  minScale,
  maxScale,
  initialScale = 1,
  zoomStep = 0.18
}) {
  const state = {
    scale: initialScale,
    translateX: 0,
    translateY: 0
  };

  // 当前激活的触控点（pointerId -> {clientX, clientY}）
  const activePointers = new Map();
  // 单指拖拽状态
  let panState = null;
  // 上次双指间距，用于增量计算捏合缩放比例
  let lastPinchDist = null;

  function clampScale(scale) {
    return Math.min(maxScale, Math.max(minScale, scale));
  }

  function getSvgPoint(clientX, clientY) {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  function applyTransform() {
    contentGroup.setAttribute(
      'transform',
      `translate(${state.translateX} ${state.translateY}) scale(${state.scale})`
    );
  }

  // 以指定屏幕坐标为中心，按 scaleFactor 倍率缩放
  function zoomAt(clientX, clientY, scaleFactor) {
    const localPoint = getSvgPoint(clientX, clientY);
    const worldX = (localPoint.x - state.translateX) / state.scale;
    const worldY = (localPoint.y - state.translateY) / state.scale;
    const nextScale = clampScale(state.scale * scaleFactor);

    if (nextScale === state.scale) {
      return;
    }

    state.translateX = localPoint.x - worldX * nextScale;
    state.translateY = localPoint.y - worldY * nextScale;
    state.scale = nextScale;
    applyTransform();
  }

  function reset() {
    state.scale = initialScale;
    state.translateX = 0;
    state.translateY = 0;
    applyTransform();
  }

  // 鼠标滚轮缩放
  svg.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1 + zoomStep : 1 / (1 + zoomStep);
      zoomAt(event.clientX, event.clientY, factor);
    },
    { passive: false }
  );

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }

    activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    svg.setPointerCapture(event.pointerId);

    if (activePointers.size === 1) {
      // 单指：开始拖拽
      panState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originTranslateX: state.translateX,
        originTranslateY: state.translateY
      };
      lastPinchDist = null;
      svg.classList.add('is-panning');
    } else if (activePointers.size === 2) {
      // 双指：切换到捏合缩放模式
      panState = null;
      svg.classList.remove('is-panning');
      const [p1, p2] = [...activePointers.values()];
      const dx = p1.clientX - p2.clientX;
      const dy = p1.clientY - p2.clientY;
      lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  });

  svg.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) {
      return;
    }

    activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

    if (activePointers.size === 2) {
      // 双指捏合缩放：以两指中点为缩放中心
      const [p1, p2] = [...activePointers.values()];
      const dx = p1.clientX - p2.clientX;
      const dy = p1.clientY - p2.clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDist !== null && newDist > 0) {
        const midX = (p1.clientX + p2.clientX) / 2;
        const midY = (p1.clientY + p2.clientY) / 2;
        zoomAt(midX, midY, newDist / lastPinchDist);
      }
      lastPinchDist = newDist;
    } else if (activePointers.size === 1 && panState) {
      // 单指拖拽平移
      const startPoint = getSvgPoint(panState.startX, panState.startY);
      const currentPoint = getSvgPoint(event.clientX, event.clientY);
      state.translateX = panState.originTranslateX + (currentPoint.x - startPoint.x);
      state.translateY = panState.originTranslateY + (currentPoint.y - startPoint.y);
      applyTransform();
    }
  });

  function clearPointer(event) {
    activePointers.delete(event.pointerId);
    lastPinchDist = null;

    if (activePointers.size === 0) {
      // 所有指离开，结束交互
      panState = null;
      svg.classList.remove('is-panning');
    } else if (activePointers.size === 1) {
      // 捏合结束，切换回单指拖拽
      const [[remainingId, pos]] = [...activePointers.entries()];
      panState = {
        pointerId: remainingId,
        startX: pos.clientX,
        startY: pos.clientY,
        originTranslateX: state.translateX,
        originTranslateY: state.translateY
      };
      svg.classList.add('is-panning');
    }
  }

  svg.addEventListener('pointerup', clearPointer);
  svg.addEventListener('pointercancel', clearPointer);
  svg.addEventListener('lostpointercapture', (event) => {
    activePointers.delete(event.pointerId);
    lastPinchDist = null;
    if (activePointers.size === 0) {
      panState = null;
      svg.classList.remove('is-panning');
    }
  });

  applyTransform();

  return {
    reset,
    getState() {
      return { ...state };
    }
  };
}
