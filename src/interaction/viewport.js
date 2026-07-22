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

  let pointerState = null;

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

  function zoomAt(clientX, clientY, direction) {
    const localPoint = getSvgPoint(clientX, clientY);
    const worldX = (localPoint.x - state.translateX) / state.scale;
    const worldY = (localPoint.y - state.translateY) / state.scale;
    const nextScale = clampScale(state.scale * (direction > 0 ? 1 + zoomStep : 1 / (1 + zoomStep)));

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

  svg.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1 : -1);
    },
    { passive: false }
  );

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType !== 'touch') {
      return;
    }

    pointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originTranslateX: state.translateX,
      originTranslateY: state.translateY
    };

    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-panning');
  });

  svg.addEventListener('pointermove', (event) => {
    if (!pointerState || event.pointerId !== pointerState.pointerId) {
      return;
    }

    const startPoint = getSvgPoint(pointerState.startX, pointerState.startY);
    const currentPoint = getSvgPoint(event.clientX, event.clientY);
    state.translateX = pointerState.originTranslateX + (currentPoint.x - startPoint.x);
    state.translateY = pointerState.originTranslateY + (currentPoint.y - startPoint.y);
    applyTransform();
  });

  function clearPointer(event) {
    if (pointerState && event.pointerId === pointerState.pointerId) {
      pointerState = null;
      svg.classList.remove('is-panning');
    }
  }

  svg.addEventListener('pointerup', clearPointer);
  svg.addEventListener('pointercancel', clearPointer);
  svg.addEventListener('lostpointercapture', () => {
    pointerState = null;
    svg.classList.remove('is-panning');
  });

  applyTransform();

  return {
    reset,
    getState() {
      return { ...state };
    }
  };
}
