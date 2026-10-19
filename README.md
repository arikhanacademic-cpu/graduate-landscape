# The Graduate Landscape

An interactive contour and 3D map of graduate earnings across Great Britain.
Each university is a separate hill: higher median earnings produce a higher
summit. Click a university to explore earnings, employment, study and possible
career routes. All six subject views use real published DfE LEO data.

## Run locally

Requires Node.js 24+ and pnpm 10+. Python 3.10+ is
needed only for rebuilding or refreshing data, not for using the app.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the local address printed by Vite, normally http://127.0.0.1:5173/.
No account, API key, paid maps service, server database or runtime AI is needed.
Google Fonts is optional: the interface falls back to local serif/sans fonts.

```sh
pnpm test
python -m unittest discover -s tests -p test_import.py
pnpm build
pnpm preview
```

The production output is `dist/`, a static website. This repository does not
automatically publish or deploy it. GitHub Actions runs tests, checks offline
data reproducibility and builds the production site.

## Explore

- Default north-up contour map, with zoom buttons, wheel zoom and drag-to-pan.
- Search by university name, nation or provider region. Search includes
  providers whose locations are unresolved.
- Six subjects in rollout order: computing; business and management;
  engineering; economics; law; creative arts and design.
- Optional 3D terrain with drag-to-rotate, wheel zoom and clickable surfaces.
  Three.js loads only on demand. Devices without WebGL retain the contour map.
- University details with 3- and 5-year earnings, quartiles, earnings sample,
  matching GB subject benchmark and 5-year employment/further-study outcomes.
- General career route guidance with National Careers Service links and
  institution website links where available. Guidance is not presented as
  observed university job destinations.
- Mobile bottom sheet, keyboard-operable markers/search/buttons, reduced-motion
  support, an explanatory data dialog and SVG poster export.

## Understand the data

The pinned source is the **DfE LEO provider dashboard archive, June 2026
release, tax year 2023–24**. Five-year figures describe **2017/18 graduates**;
three-year figures describe **2019/20 graduates**. They are different cohorts,
not a pay-growth series. Includes UK-domiciled first-degree graduates at HEIs
in England, Scotland and Wales. Northern Ireland is outside this archive's
provider coverage. The map places the institution, not graduate workplaces.

Suppressed/missing figures stay unavailable and never become zero earnings.
Published national medians are used directly. University medians are never
averaged. Conflicting regional observations are withheld. Current DfE earnings
definitions include qualifying PAYE and positive self-employment income; they
differ from the Discover Uni PAYE-only presentation considered during planning.

See [data sources and limitations](docs/DATA.md), [verification](docs/VERIFICATION.md)
and the machine-readable [coverage audit](data/coverage.json).

## Refresh data

```sh
# Rebuild deterministically from checked-in selected source records, offline:
python scripts/import_data.py

# Redownload the pinned 2026 archive and UKPRN-matched Wikidata locations:
python scripts/import_data.py --refresh
```

The importer uses Python's standard library. A refresh needs network access;
no credentials are used. Review changed coordinates, coverage, source rows and
output before committing a refresh. Updating to another release requires an
explicit change to the archive URL, reporting-period filters, cohort labels
and tests. Do not just replace figures with a newer mixed-vintage download.

## Structure

```text
src/main.js               application state and university panels
src/map.js                contour map, 3D controls, selection and SVG export
src/terrain.js            independent 3D hill surfaces
src/model.js              shared scales, projection, search, career guidance
src/style.css             responsive editorial design
scripts/import_data.py    source selection, stable joins and coverage audit
data/source/              selected original DfE rows and Wikidata response
public/data/              small self-contained browser snapshots
tests/                    data, importer, DOM selection and 3D picking checks
```

Code: MIT. DfE data: Crown copyright, OGL v3.0. Natural Earth: public domain.
Wikidata structured data: CC0. Full source links and licences are in `docs/DATA.md`.
