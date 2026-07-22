export const MAP_CONFIG = {
  width: 4964,
  height: 2900,
  minScale: 0.75,
  maxScale: 8,
  zoomStep: 0.18,
  referenceImagePath: './assets/reference/shenzhen-bay-area-60-octagonal-reference.png',
  defaultReferenceOpacity: 0.45,
  calibration: {
    coordinateSystem: 'Reference image natural pixel space',
    assumption: 'Schematic positions are stored in the same 4964x2900 base viewport as the reference overlay.'
  }
};
