# SOURCES.md

## Reference overlay asset

- Local path: `assets/reference/shenzhen-bay-area-60-octagonal-reference.png`
- Purpose: layout-validation overlay only
- Usage rule: default off, visually behind schematic content, synchronized with the SVG viewport transform

## Production-data sourcing rule

Production line, station, service, project, city-boundary, and park-boundary data must come from official sources such as operators, project owners, or government / planning / transport authorities.

Non-official references may help discover leads, but they must not be presented as authoritative production data.

## Phase 1 sample data status

The included Shenzhen Metro sample line is **Phase 1 demonstration data** only.

- It is a real operating line sample used to validate rendering and interaction.
- It must not be interpreted as a complete or fully source-verified network dataset.
- If service timings are not confirmed from an official source available to the agent, the UI must state `官方未公开 / Not published by operator in this demo` or equivalent instead of inventing values.
- Until later verification work is completed, source metadata should clearly indicate `demonstration pending source verification` rather than claiming official confirmation.
