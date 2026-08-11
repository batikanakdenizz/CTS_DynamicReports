# LinePulse · Custom Report Builder — PrimeVue

A dynamic report engine that lets users **design their own reports without
developer involvement**. Existing LinePulse report screens are static — users
can only change filters. This project removes that limit: the user picks the
measures (KPIs), the dimensions to break them down by, and the chart type;
the system generates the **chart + data set** live from that selection.

This is the **PrimeVue implementation** and the reference version — it was
built first. A functionally equivalent
[DevExtreme implementation](https://github.com/batikanakdenizz/CTS-DynamicReports-DevExtreme)
exists; both share the same framework-independent report engine and the same
serializable report-definition model, so a report saved in one opens in the
other. The two repos exist so the company could choose a UI library by
**building the same product twice** rather than comparing feature tables.

**🔗 Live demo:** https://batikanakdenizz.github.io/CTS-DynamicReports-PrimeVue/

> All data is **dummy** (deterministic seeded generator). When the real API is
> connected, only the data-source layer changes; the report engine and the UI
> stay the same.

## Features

- **Report Builder panel** (`Drawer`) — measures, dimensions, date granularity
  (day / ISO week / month / quarter / year), chart type and filters (date
  range, line, machine, product) configured in one panel; the result updates
  instantly.
- **Cascading filters** — Line → Machine → Product. The options narrow down the
  chain (picking a line limits the machine list; picking a machine limits the
  product list) and selections that become invalid are cleared automatically.
  The hierarchy is not invented: it comes from `lineTopology.js` and reflects a
  relationship already implicit in the data, so the filter genuinely narrows
  the rows rather than just the dropdown.
- **4 chart types** — Bar, Stacked Bar, Line, Donut (Chart.js). When percentage
  and count measures are selected together, a **dual Y axis** is applied
  automatically (% on the left, counts on the right).
- **Zoom & focus** — mouse-wheel zoom, drag to pan (`chartjs-plugin-zoom`);
  hovering a series dims the others. The hover-focus is a small custom plugin
  that applies transparency **at draw time** rather than mutating colours and
  calling `chart.update()` — the earlier approach deadlocked when zoom and
  hover ran together.
- **Drill-down** — click a bar to descend one level along the real business
  hierarchy: Line → Machine → Product → Date. Every step pushes the previous
  state onto a stack, so "Back" walks out one level at a time.
- **Report templates** — three seeded layouts (Downtime Analysis, Line
  Comparison, Machine Performance) load with one click. Templates deliberately
  store **no date range**: each apply recomputes "last 30 days from today", so
  a template can never silently fall outside the generated data window.
- **Root-cause summary (no AI)** — for the primary measure, the engine is run a
  few more times over dimensions not yet used as a breakdown (machine,
  product); the sub-group deviating most from the overall average is surfaced
  in a clickable card. No model, no prediction — just the same pure engine,
  called again with different parameters.
- **A/B comparison mode** — a second, independent date-range + line filter
  shown side by side. Measures, dimensions and chart type are shared with panel
  A; nothing was added to the engine — `runReport` simply runs a second time
  with a different filter set. Because Chart.js needs hand-built datasets, the
  chart setup was refactored into `buildChartData(rows, opts)` /
  `buildChartOptions(opts)` and panel B just calls them with different
  arguments, so A and B can never drift apart.
- **Shareable link** — the report definition is already flat and JSON-safe, so
  it is base64-encoded into a `#r=` URL hash. No backend, no router: the hash
  is parsed once on mount and the app opens directly on that report.
- **Saved reports** — a configured report definition can be saved under a name
  (localStorage), reloaded with one click, or deleted.
- **Data set** — full-width `DataTable` below the chart with sorting,
  pagination and engine-formatted numbers.
- **Export** — Excel (`.xlsx` with raw numeric values, via SheetJS), PDF (chart
  image + formatted table via jsPDF/autotable), chart PNG download / copy to
  clipboard. Export libraries are **lazy-loaded** on click, so they don't
  inflate the initial page load.
- **TR / EN localization** and **dark mode** — a from-scratch, dependency-free
  `t(key)` helper (no `vue-i18n`); preferences persist in localStorage.
  Dark mode is wired through PrimeVue's `darkModeSelector: '.dark-mode'`, so
  the component theme and the shell palette switch together.
- **Line Daily KPI** — a reference shell of the real LinePulse 28-column table
  report (per-column filtering, global search, sorting, pagination). It exists
  to show what the _old_, static report experience looked like; see
  [Known Limitations](#known-limitations).

## Architecture

Four independent layers: **data → catalog → engine → view**. Only the view
layer differs from the DevExtreme sibling; the other three are the same files.

A report is represented by a serializable **report definition** model:

```js
{ measures: [], dimensions: [], dateGranularity: 'day',
  filters: { dateFrom, dateTo, lines, machines, products } }
```

`reportEngine.runReport(definition, records)` takes this definition: it
filters the records, groups them by the selected dimensions, computes the
measures and returns `{ columns, rows }`. The engine is a pure function,
independent of both the UI and the data source — saving, restoring, drill-down,
templates, A/B comparison and (eventually) sending the definition to a backend
as a query all work through this single model.

**No UI-specific modes are ever added to `runReport`.** Root-cause summary, A/B
comparison and drill-down are all implemented by calling the engine again with
different parameters. That is what guarantees both sibling projects produce
numbers from the same formula.

### Derived KPIs and correct aggregation

Derived KPIs (Up Time %, Rate/Reject/Downtime Loss %, Availability, MTBF) are
defined in `reportCatalog.js` as **numerator/denominator (num/den)** functions.
Percentages are **never averaged** when grouping: numerators and denominators
are summed row by row first, then the ratio is computed. As a result, the five
loss buckets (Up Time + Rate + Reject + Planned + Unplanned) always add up to
**100%** in every group and at every granularity — matching the real LinePulse
exactly. The formulas were extracted from live LinePulse screens and verified
against real data (see `docs/HowWorksReports.md`).

## Testing

```bash
npm test           # vitest run — 23 tests
npm run test:watch
```

`src/lib/reportEngine.test.js` deliberately uses the **real** `reportCatalog.js`
measure definitions rather than mocks, because the risk lives in the formulas,
not in the loop. It covers the 100% invariant (single row / multiple differing
rows / zero-downtime), proof that derived measures are volume-weighted rather
than averaged, the zero-denominator guard, raw `sum` vs `agg:'avg'`, grouping,
filters (inclusive date range, AND semantics, empty array = no constraint),
date granularity + chronological ordering, column order and `formatValue`.

Everything outside the engine — drill-down, compare mode, exports, cascading
filters — has only ever been verified manually in a browser.

## Tech Stack

Vue 3 (Composition API) · PrimeVue 4 (Aura, custom LinePulse preset) ·
Chart.js 4 · chartjs-plugin-zoom · SheetJS (xlsx) · jsPDF + autotable · Vite ·
Vitest · ESLint + Prettier

No router, no state-management library, no backend: view routing is a plain
`active` ref mapped to a `VIEWS` object, and all persistence is localStorage +
URL hash.

## Getting Started

```bash
npm install
npm run dev          # http://localhost:5173/CTS-DynamicReports-PrimeVue/
npm run build        # production build -> dist/
npm run preview      # preview the build locally
npm test             # unit tests
npm run lint         # eslint .
npm run format       # prettier --check .
```

> Node 24 is required and enforced (`.nvmrc` + `engines` + `engine-strict=true`
> in `.npmrc`). The dev URL includes the GitHub Pages base path
> (`vite.config.js`).

## Project Structure

```
.
├── .github/workflows/deploy.yml   # CI: test -> lint -> build -> GitHub Pages
├── index.html
├── vite.config.js                 # base: /CTS-DynamicReports-PrimeVue/ (Pages subpath)
├── docs/
│   └── HowWorksReports.md         # LinePulse report analysis + verified KPI formulas
└── src/
    ├── main.js                    # PrimeVue setup (LinePulse Aura preset)
    ├── App.vue                    # simple view routing + share-link hash entry
    ├── layout/
    │   ├── AppSidebar.vue         # LinePulse side menu
    │   └── AppTopbar.vue          # title + language/theme switches
    ├── views/
    │   ├── CustomReport.vue       # report builder (the main screen)
    │   └── LineDailyKpi.vue       # 28-column table report (reference shell)
    ├── data/
    │   ├── lineTopology.js        # Line -> Machine -> Product topology (single source)
    │   ├── dummyData.js           # deterministic dummy records (line × day, + cascade set)
    │   ├── reportCatalog.js       # MEASURES (raw + derived) & DIMENSIONS catalog
    │   └── reportTemplates.js     # seeded report layouts
    └── lib/
        ├── reportEngine.js        # definition -> { columns, rows } (pure function)
        ├── reportEngine.test.js   # Vitest suite (the 100% invariant lives here)
        ├── i18n.js                # lightweight TR/EN translation layer
        └── theme.js               # dark-mode state
```

## Deployment

Every push to `master` is published to GitHub Pages via GitHub Actions
(`.github/workflows/deploy.yml`), gated on `npm test` → `npm run lint` →
`npm run build` — a failing test or a lint error blocks the deploy. No manual
deploy is needed; run status can be monitored on the repo's **Actions** tab.

## Switching to Real Data

1. Replace `generateRows()` / `generateCascadeRows()` in
   `src/data/dummyData.js` with the real API call (field names must match
   `reportCatalog.js`).
2. If needed, update measure keys/labels and num/den functions in
   `reportCatalog.js`.
3. `reportEngine.js` and the entire UI remain unchanged. The definition model
   is serializable, so aggregation can later move server-side by posting the
   definition to a backend.

## Known Limitations

- **Line Daily KPI is a shell, not a finished screen.** Only "Generate Report"
  is wired; the Excel-export and clear-filters buttons are placeholders with no
  handler, and `generate()` filters by line only — the date pickers do not
  narrow the result. The screen exists as a visual reference for the old static
  report, and the DevExtreme sibling is where that report was actually
  completed.
- **No pivot / cross-tab screen.** PrimeVue has no enterprise pivot component;
  the multi-dimensional exploration screen exists only in the DevExtreme repo.
- **No automated tests beyond the engine.** View-layer behaviour is covered by
  manual browser testing only.
- **The shared core is kept in sync by hand.** `reportEngine.js`,
  `reportCatalog.js`, `dummyData.js`, `lineTopology.js`, `reportTemplates.js`
  and `reportEngine.test.js` are meant to stay identical to the DevExtreme
  repo's copies, but nothing — no monorepo, no shared package, no CI check —
  enforces it.
