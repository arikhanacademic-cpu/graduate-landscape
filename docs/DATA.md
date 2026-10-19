# Data provenance and interpretation

## Source decision

Discover Uni was considered first. It offers public CSVs with provider/subject
LEO medians and useful teaching locations, but its HESA download endpoint
returned an automated-access challenge during this build. Its current
[data notes](https://discoveruni.gov.uk/about-our-data/) describe the 2025 LEO
presentation and a later November 2026 update. We did not scrape course pages
or mix their values into the current DfE series.

The source selected instead is the official
[Graduate labour market outcomes (LEO), tax year 2023–24](https://explore-education-statistics.service.gov.uk/find-statistics/graduate-labour-market-outcomes-leo/2023-24/explore),
published 25 June 2026, last updated 14 September 2026.

Exact provider archive:
https://content.explore-education-statistics.service.gov.uk/api/releases/b018e5c2-81fd-4640-b3f8-cb63633cf3a0/files/8ce2ccb6-87ea-40ad-ae89-357104e98fc4

The importer reads `provider_data_by_sex.csv`, not the ethnicity, deprivation or
prior-attainment tables. The source `variable_lookup.csv` defines field units
and suppression tokens. The selected original rows are checked into
`data/source/leo-selected.csv`. A SHA-256 of that exact selected file appears
in the browser snapshot. Running `--refresh` also records the archive SHA-256.

## Population and filters

- `tax_year = 2023/2024`, `sex = Total`, `provider_type = HEI`.
- First-degree, UK-domiciled graduates; providers in England, Scotland, Wales.
- `YAG = 5` (graduation academic year 2017/2018) and `YAG = 3` (2019/2020).
- Actual providers have numeric eight-digit UKPRNs. `ukprn = Total` rows are
  retained only when provider country and region are both `Total`.
- No all-provider-type, postgraduate, sex-specific, region-adjusted or
  international populations are blended into these results.

| Display subject | Source CAH2 code | Published 5-year medians | Mapped hills |
| --- | --- | ---: | ---: |
| Computing | CAH11-01 | 108 | 107 |
| Business and management | CAH17-01 | 132 | 128 |
| Engineering | CAH10-01 | 94 | 93 |
| Economics | CAH15-02 | 65 | 65 |
| Law | CAH16-01 | 102 | 101 |
| Creative arts and design | CAH25-01 | 94 | 94 |

These are existing source subject groups. In particular Engineering is not
merged with Materials and technology, and Creative arts and design is not
merged with Performing arts or Media, journalism and communications.

The checked-in `data/coverage.json` is the authoritative machine-readable
coverage audit, including 7 unresolved provider locations and 2 conflicting
three-year regional records for the University of Law. Counts can change on
a reviewed data refresh. Providers present at only one reporting period are
retained, with the absent period explicitly unavailable.

## Joins, duplicates and missing data

All joins use UKPRN, CAH2 subject code and years after graduation. No fuzzy name
matching is used. Identical metric records are deduplicated, not counted
twice. Distinct regional populations sharing a provider/subject/period cannot
be aggregated from medians, so their combined result is flagged
`conflicting-regional-records` and withheld. No record is arbitrarily selected.

Suppression/source tokens (`c`, `low`, `x`, `z`, empty) are retained as unknown,
not coerced to the numeric value 0. An explicit numeric `0` remains numeric.
The source lookup calls `z` zero, but it is not treated as a published numeric
earnings observation; it yields an unavailable hill. Earnings, quartiles,
sample size and each outcome percentage are parsed independently.

The benchmark is the published all-sex HEI subject median with country and
region `Total` at the same five-year horizon and tax year. It covers the
source HEI population, including providers without mapped coordinates. It is
not the median or mean of the displayed university medians.

## Definitions and limits

Read the [official methodology](https://explore-education-statistics.service.gov.uk/methodology/graduate-labour-market-outcomes-leo).
Earnings are median annualised earnings among the source's eligible earnings
population, not current starting salaries, hourly wages or FTE salaries.
Qualifying PAYE and positive self-employment income are included under this
DfE methodology. Self-employment is handled differently from annualised PAYE;
hours of work are not observed. Do not reuse Discover Uni's PAYE-only note
for these DfE values. Graduates in further study are excluded from earnings
under the published methodology, but remain relevant to the outcomes measures.

Employment (`sust_emp_with_or_without_fs`) and further study
(`fs_with_or_without_sust_emp`) overlap. Their union is separately published
as `sust_emp_fs_or_both`; never sum the two percentages. Outcome and earnings
denominators differ. Sample counts are source-rounded. The lower/upper
quartiles describe the middle 50% of earnings, not statistical confidence
intervals. Figures cannot isolate the causal effect of attending an institution.

## Geography

The coastline is the public-domain Natural Earth 1:50m countries GeoJSON,
restricted to the United Kingdom and Ireland. The UK geometry includes Northern
Ireland. Ireland is contextual geography, without university earnings hills.

Source:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson

[Natural Earth public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/).
The bundled `public/data/coastline.geojson` is the retained selected snapshot.
Refresh it by downloading the linked file and retaining only features whose
`ADMIN` is `United Kingdom` or `Ireland`, renamed to the `name` property.

Institution coordinates use Wikidata `P4971` (UKPRN), `P625` (coordinate) and
`P856` (official website). The complete query response is retained in
`data/source/wikidata.json`. Each provider's map point links to its Wikidata
entity. Coordinates are range-checked. Where several coordinates exist, the
first after sorting by longitude, latitude, then website is used consistently;
the panel discloses the alternatives. This is an institutional reference point,
not a claim to locate every course. No campus-specific earnings are inferred.
The Open University's point represents administration, not distance learners.
Unresolved coordinates remain searchable and are omitted from the terrain.

Projection is a simple regional equirectangular approximation with longitude
scaled by 0.58 (near cos 55°), shared by 2D, 3D and export. Coastlines remain
geographic, while terrain is intentionally artificial. Every hill has radius
0.235 map units (roughly 26 km N–S). All heights start at £0 with a constant
conversion of £10,000 to 0.18 map units. Contours occur at £5,000 intervals.
The colour scale is fixed £0–£105,000, and the legend says £100k+ at its upper
end. No salaries are clipped in height. Neighbouring surfaces are independent,
not summed or smoothed into an inferred earnings field. Occlusion is possible;
use zoom or search to select crowded providers. The fixed footprint is an
illustrative symbol and does not represent campus area or cohort size.

## Career content and attribution

Prewritten career summaries offer possible subject routes. They are not claims
about graduates from a particular university, employers or placements. Each
links to a relevant official National Careers Service profile:

- [Software developer](https://nationalcareers.service.gov.uk/job-profiles/software-developer)
- [Business development manager](https://nationalcareers.service.gov.uk/job-profiles/business-development-manager)
- [Civil engineer](https://nationalcareers.service.gov.uk/job-profiles/civil-engineer)
- [Economist](https://nationalcareers.service.gov.uk/job-profiles/economist)
- [Solicitor](https://nationalcareers.service.gov.uk/job-profiles/solicitor)
- [Graphic designer](https://nationalcareers.service.gov.uk/job-profiles/graphic-designer)

No university-specific destination prose is invented. Official institution
website URLs are supplied where present in the UKPRN-matched Wikidata record;
deep course/careers links have not been comprehensively curated. Individually
verified careers-service links are included for Manchester, Cambridge and
Oxford; other providers retain their official institution website where known.

DfE data and NCS role guidance: © Crown copyright,
[Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
Wikidata structured data: [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing).
Geography: Natural Earth, public domain. Code: MIT. The project is independent
and not endorsed by DfE, HESA, Discover Uni or the institutions shown.
