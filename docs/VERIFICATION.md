# Verification record

## Passed locally

- Production Vite build. Three.js and orbit controls are lazy loaded when the
  3D view is requested. No paid service or runtime data fetch is required.
- Node tests for unique provider keys, unmerged subject definitions, exact
  published benchmarks, missing-data handling, quartile order, outcome ranges,
  consistent scales, cohort labels, search and coordinate provenance.
- DOM integration tests using the actual map implementation: all six subjects,
  hill/marker counts, every marker's provider-ID callback and keyboard
  activation of an unavailable record.
- Application DOM tests for subject/panel/benchmark updates, university search,
  unmapped provider details, mobile sheet state and the source dialog.
- Three.js geometry and raycaster integration tests: selection at an actual
  provider location and independent heights for overlapping hills.
- Standalone SVG export validation: full map retained after zoom, subject,
  tax year, graduation cohort, contour scale and source attribution included.
- Python importer tests: duplicate observations do not multiply sample sizes;
  conflicting medians are not averaged; suppression and absent groups remain
  unavailable.
- Exported computing poster rendered to a raster image and visually inspected
  for coastline, hill placement, legend and source information.
- Offline regeneration of the browser data from the selected source snapshot.

## Verification limits and follow-up

The browser-use security policy rejected access to the local preview during
this session. No browser-policy workaround was used. Consequently a real
desktop/mobile browser pass, WebGL rendering/rotation, responsive layout,
focus movement, reduced-motion animation and user-initiated downloads have
**not** been visually verified in-browser. DOM and raycaster tests do not
establish those browser behaviours. They need a manual browser pass before
publication. No live deployment was created.

Manual checks:

1. Run the app, inspect at desktop width and 390px mobile width; check for
   clipping, scroll behaviour and readable labels.
2. Select computing, search Manchester, select its result and verify its panel.
   Change subject; earnings and benchmark should update together.
3. Select a hollow marker: it must say not published and have no earnings hill.
   Search an unlocated provider: details should still be accessible.
4. Toggle 3D, rotate and zoom; click a hill to update the same university panel.
   Disable WebGL if possible and confirm the usable contour fallback.
5. Use only the keyboard to search, activate results, operate controls, open
   and close the data dialog, and dismiss mobile details.
6. Enable reduced motion and confirm the camera changes without a long tilt.
7. Export a poster after zooming. Open the SVG and confirm the full geography,
   selected subject, period and attribution remain visible.

Seven institutions have no matched coordinates in the retained source response.
They remain searchable; see `data/coverage.json`. Official university website
links are provided where available, but there is no comprehensive set of
verified deep links to every university's course/careers department yet.
