# LinePulse · Custom Report Builder

A dynamic report engine that lets users **design their own reports without
developer involvement**. Existing LinePulse report screens are static — users
can only change filters. This project removes that limit: the user picks the
measures (KPIs), the dimensions to break them down by, and the chart type;
the system generates the **chart + data set** live from that selection.

**🔗 Live demo:** https://batikanakdenizz.github.io/CTS_DynamicReports/

> All data is **dummy** (deterministic generator). When the real API is
> connected, only the data-source layer changes; the report engine and the UI
> stay the same.

## Features

- **Report Builder panel** — measures, dimensions, date granularity
  (day/week/month/quarter/year), chart type and filters (date range, line)
  configured in one panel; the result updates instantly.
- **4 chart types** — Bar, Stacked Bar, Line, Donut. When percentage and count
  measures are selected together, a **dual Y axis** is applied automatically
  (% on the left, counts on the right).
- **Data set** — full-width table below the chart with sorting, pagination and
  formatted numbers.
- **Saved reports** — a configured report definition can be saved under a name
  (localStorage), reloaded with one click, or deleted.
- **Drill-down** — click a line's bar in the chart to drill into that line's
  daily trend; step back with the "Back" button.
- **Export** — Excel (`.xlsx` with raw numeric values), PDF (chart image +
  formatted table), chart PNG download / copy to clipboard. Export libraries
  (xlsx, jspdf) are **lazy-loaded** on click, so they don't inflate the initial
  page load.
- **Zoom & focus** — mouse-wheel zoom, drag to pan; hovering a series dims the
  others (hover-focus).
- **TR / EN localization** and **dark mode** — preferences persist in
  localStorage; the OS theme is detected on first load.
- **Line Daily KPI** — a reference shell of the real LinePulse 28-column table
  report (per-column filtering/sorting/pagination).

## Architecture

A report is represented by a serializable **report definition** model:

```js
{ measures: [], dimensions: [], dateGranularity: 'day',
  chartType: 'bar', filters: { dateFrom, dateTo, lines } }
```

`reportEngine.runReport(definition, records)` takes this definition: it
filters the records, groups them by the selected dimensions, computes the
measures and returns `{ columns, rows }`. The engine is a pure function,
independent of both the UI and the data source — saving, restoring and
(eventually) sending the definition to a backend as a query all work through
this single model.

### Derived KPIs and correct aggregation

Derived KPIs (Up Time %, Rate/Reject/Downtime Loss %, Availability, MTBF) are
defined in `reportCatalog.js` as **numerator/denominator (num/den)** functions.
Percentages are **never averaged** when grouping: numerators and denominators
are summed row by row first, then the ratio is computed. As a result, the five
loss buckets (Up Time + Rate + Reject + Planned + Unplanned) always add up to
**100%** in every group and at every granularity — matching the real LinePulse
exactly. The formulas were extracted from live LinePulse screens and verified
against real data (see `docs/HowWorksReports.md`).

## Tech Stack

Vue 3 (Composition API) · PrimeVue 4 (Aura, custom LinePulse theme) ·
Chart.js 4 · chartjs-plugin-zoom · SheetJS (xlsx) · jsPDF + autotable · Vite

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173/CTS_DynamicReports/
npm run build      # production build -> dist/
npm run preview    # preview the build locally
```

## Project Structure

```
.
├── .github/workflows/deploy.yml   # automatic GitHub Pages deploy (CI/CD)
├── index.html
├── vite.config.js                 # base: /CTS_DynamicReports/ (Pages subpath)
├── docs/
│   ├── job.md                     # task definition
│   ├── HowWorksReports.md         # LinePulse report analysis + verified KPI formulas
│   └── design/                    # design sketches
└── src/
    ├── main.js                    # PrimeVue setup (LinePulse theme)
    ├── App.vue                    # simple view routing
    ├── layout/
    │   ├── AppSidebar.vue         # LinePulse side menu
    │   └── AppTopbar.vue          # title + language/theme switches
    ├── views/
    │   ├── CustomReport.vue       # report builder (the main screen)
    │   └── LineDailyKpi.vue       # 28-column table report (reference shell)
    ├── data/
    │   ├── dummyData.js           # deterministic dummy records (line × day)
    │   └── reportCatalog.js       # MEASURES (raw + derived) & DIMENSIONS catalog
    └── lib/
        ├── reportEngine.js        # definition -> { columns, rows } (filter + group-by + compute)
        ├── i18n.js                # lightweight TR/EN translation layer
        └── theme.js               # dark-mode state
```

## Deployment

Every push to `master` is automatically built and published to GitHub Pages
via GitHub Actions (`.github/workflows/deploy.yml`). No manual deploy is
needed; run status can be monitored on the repo's **Actions** tab.

## Switching to Real Data

1. Replace `generateRows()` in `src/data/dummyData.js` with the real API call
   (field names must match `reportCatalog.js`).
2. If needed, update measure keys/labels and num/den functions in
   `reportCatalog.js`.
3. `reportEngine.js` and the entire UI remain unchanged.

## Roadmap

- [ ] Connect real dummy/API data (field mapping)
- [ ] Additional dimensions: Production Center, Shift, Machine, Stop Reason
- [ ] Combo chart (stacked bar + Uptime line) and KPI cards
- [ ] Unit tests for the report engine (100% loss-invariant check)
