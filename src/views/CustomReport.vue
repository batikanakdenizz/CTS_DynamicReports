<script setup>
import { ref, computed, watch } from 'vue'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Chart from 'primevue/chart'
import Button from 'primevue/button'

import { generateRows, LINE_OPTIONS } from '../data/dummyData.js'
import {
  MEASURE_OPTIONS,
  MEASURE_MAP,
  DIMENSIONS,
  DATE_GRANULARITIES,
  CHART_TYPES,
} from '../data/reportCatalog.js'
import { runReport, formatValue } from '../lib/reportEngine.js'
import zoomPlugin from 'chartjs-plugin-zoom'

// Ortak veri kaynağı (shell'in generateRows'u)
const allRows = generateRows(30)

// --- Report definition state ---
const selectedMeasures = ref(['upTime', 'unplannedDowntimeLoss', 'rateLoss', 'rejectLoss'])
const selectedDimensions = ref(['line'])
const dateGranularity = ref('day')
const chartType = ref('stacked')

const startDate = ref(new Date(2026, 4, 7))
const endDate = ref(new Date(2026, 5, 5))
const selectedLines = ref(LINE_OPTIONS.map((o) => o.value))

const dimensionOptions = DIMENSIONS.map((d) => ({ label: d.label, value: d.key }))
const showGranularity = computed(() => selectedDimensions.value.includes('date'))

const definition = computed(() => ({
  measures: selectedMeasures.value,
  dimensions: selectedDimensions.value,
  dateGranularity: dateGranularity.value,
  filters: {
    dateFrom: startDate.value,
    dateTo: endDate.value,
    lines: selectedLines.value,
  },
}))

const report = computed(() => runReport(definition.value, allRows))
const hasData = computed(() => selectedMeasures.value.length > 0 && report.value.rows.length > 0)

// --- Grafik ---
const PALETTE = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308']

// Chart.js instance'ını yakala (zoom sıfırlama + hover-focus için)
const chartInstance = ref(null)
const capturePlugin = {
  id: 'captureInstance',
  afterInit: (c) => { chartInstance.value = c },
}
const chartPlugins = [zoomPlugin, capturePlugin]

function resetZoom() {
  chartInstance.value?.resetZoom?.()
}

// hex -> rgba (odaklanmayan serileri soluklaştırmak için)
function fade(color, a = 0.15) {
  if (typeof color !== 'string' || !color.startsWith('#')) return color
  const n = parseInt(color.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Zoom (scroll) sırasında hover-focus'u baskıla — scroll ile odak değişmesin.
let focusSuppressed = false
let focusTimer = null
function suppressFocusDuringZoom() {
  focusSuppressed = true
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => {
    focusSuppressed = false
  }, 250)
}

// Taban renk daima PALETTE'ten (index'e göre) — chart verisine özel alan gömmeyiz.
const baseColor = (i) => PALETTE[i % PALETTE.length]

// Bir dataset'in/dilimin odak durumuna göre renklerini uygula.
function paintFocus(chart, key) {
  const isDonut = chart.config.type === 'doughnut'
  if (isDonut) {
    const ds = chart.data.datasets[0]
    if (!ds) return
    const focusIdx = key == null ? null : Number(key.slice(1))
    ds.backgroundColor = chart.data.labels.map((_, i) =>
      focusIdx === null || i === focusIdx ? baseColor(i) : fade(baseColor(i))
    )
  } else {
    const focusDs = key == null ? null : Number(key.slice(1))
    chart.data.datasets.forEach((ds, i) => {
      const on = focusDs === null || i === focusDs
      ds.backgroundColor = on ? baseColor(i) : fade(baseColor(i))
      ds.borderColor = on ? baseColor(i) : fade(baseColor(i), 0.3)
    })
  }
  chart.update('none')
}

// Chart üzerinde bir segmente GELİNCE onu odakla, diğerlerini soluklaştır.
function handleHover(evt, elements, chart) {
  if (focusSuppressed) return // zoom sırasında odak değiştirme
  const isDonut = chartType.value === 'donut'
  const key = elements.length
    ? (isDonut ? 'i' + elements[0].index : 'd' + elements[0].datasetIndex)
    : null
  if (chart.__focusKey === key) return
  chart.__focusKey = key
  paintFocus(chart, key)
}

// Fare chart'tan ayrılınca odaklanmayı sıfırla (soluklaşma kalıcı olmasın).
function restoreFocus() {
  const chart = chartInstance.value
  if (!chart || chart.__focusKey == null) return
  chart.__focusKey = null
  paintFocus(chart, null)
}

const groupLabel = (row) =>
  selectedDimensions.value.length
    ? selectedDimensions.value.map((d) => row[d]).join(' / ')
    : 'Total'

const chartJsType = computed(() =>
  chartType.value === 'donut' ? 'doughnut' : chartType.value === 'line' ? 'line' : 'bar'
)

const chartData = computed(() => {
  const { rows } = report.value
  const labels = rows.map(groupLabel)

  if (chartType.value === 'donut') {
    const mkey = selectedMeasures.value[0]
    if (!mkey) return { labels: [], datasets: [] }
    return {
      labels,
      datasets: [
        {
          data: rows.map((r) => Math.round((r[mkey] ?? 0) * 100) / 100),
          backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        },
      ],
    }
  }

  return {
    labels,
    datasets: selectedMeasures.value.map((mkey, i) => {
      const color = PALETTE[i % PALETTE.length]
      return {
        label: MEASURE_MAP[mkey]?.label ?? mkey,
        data: rows.map((r) => Math.round((r[mkey] ?? 0) * 100) / 100),
        backgroundColor: color,
        borderColor: color,
        fill: false,
        tension: 0.3,
      }
    }),
  }
})

const chartOptions = computed(() => {
  const stacked = chartType.value === 'stacked'
  const isDonut = chartType.value === 'donut'
  const text = '#475569'
  const grid = 'rgba(148,163,184,0.18)'
  return {
    responsive: true,
    maintainAspectRatio: false,
    onHover: handleHover,
    interaction: { mode: 'nearest', intersect: true },
    plugins: {
      legend: { labels: { color: text } },
      // Tekerlek ile zoom (büyüt/küçült), sürükle ile pan. Donut'ta kapalı.
      zoom: isDonut
        ? {}
        : {
            zoom: {
              wheel: { enabled: true, speed: 0.12 },
              pinch: { enabled: true },
              mode: 'y',
              // Zoom sırasında hover-focus'u baskıla (scroll ile odak değişmesin)
              onZoomStart: () => { suppressFocusDuringZoom() },
              onZoom: () => { suppressFocusDuringZoom() },
            },
            pan: {
              enabled: true,
              mode: 'xy',
              onPanStart: () => { suppressFocusDuringZoom() },
              onPan: () => { suppressFocusDuringZoom() },
            },
          },
    },
    scales: isDonut
      ? {}
      : {
          x: { stacked, ticks: { color: text }, grid: { color: grid } },
          y: { stacked, ticks: { color: text }, grid: { color: grid } },
        },
  }
})

// Veri/ölçüm/grafik tipi değişince odak durumunu sıfırla (renkler taban'a döner)
watch(chartData, () => {
  if (chartInstance.value) chartInstance.value.__focusKey = null
})

const donutNote = computed(
  () => chartType.value === 'donut' && selectedMeasures.value.length > 1
)

const fmt = (row, col) => formatValue(row[col.key], col.format)

function resetAll() {
  // Tüm filtreleri gerçekten temizle (boş/nötr duruma al)
  selectedMeasures.value = []
  selectedDimensions.value = []
  dateGranularity.value = 'day'
  chartType.value = 'stacked'
  selectedLines.value = []
  startDate.value = null
  endDate.value = null
}
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">Custom Report</h1>
        <div class="lp-breadcrumb">Reports · Custom Report Builder</div>
      </div>
    </div>

    <!-- ÜST SATIR: solda grafik (büyük), sağda filtre -->
    <div class="cr-top">
      <!-- SOL: Grafikler -->
      <section class="cr-charts">
        <div v-if="!hasData" class="cr-empty lp-card">
          <i class="pi pi-chart-bar"></i>
          <p>Rapor için sağdan en az bir <b>Measure</b> seç. Sonuç yoksa filtreleri gevşet.</p>
        </div>

        <div v-else-if="chartType === 'table'" class="cr-empty lp-card">
          <i class="pi pi-table"></i>
          <p>Tablo modu seçili — veri seti aşağıda tam genişlikte gösteriliyor.</p>
        </div>

        <div v-else class="lp-card cr-card cr-charts-card">
          <div class="cr-card-head">
            <h3>Chart</h3>
            <div class="cr-chart-actions">
              <small v-if="donutNote" class="cr-warn">
                Donut tek ölçüm gösterir — "{{ MEASURE_MAP[selectedMeasures[0]]?.label }}"
              </small>
              <small v-if="chartType !== 'donut'" class="cr-hint">
                <i class="pi pi-search-plus"></i> Scroll: yakınlaş · sürükle: kaydır
              </small>
              <Button
                v-if="chartType !== 'donut'"
                icon="pi pi-refresh"
                text
                rounded
                size="small"
                @click="resetZoom"
                v-tooltip.top="'Zoom sıfırla'"
                aria-label="Zoom sıfırla"
              />
            </div>
          </div>
          <div class="cr-chart" @mouseleave="restoreFocus">
            <Chart
              :type="chartJsType"
              :data="chartData"
              :options="chartOptions"
              :plugins="chartPlugins"
            />
          </div>
        </div>
      </section>

      <!-- SAĞ: Konfigürasyon rayı -->
      <aside class="cr-config lp-card">
        <div class="cr-config-title">
          <i class="pi pi-sliders-h"></i> Report Builder
        </div>

        <div class="cr-field">
          <label>Measures</label>
          <MultiSelect
            v-model="selectedMeasures"
            :options="MEASURE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            optionGroupLabel="label"
            optionGroupChildren="items"
            filter
            :maxSelectedLabels="1"
            selectedItemsLabel="{0} ölçüm seçili"
            placeholder="Ölçüm seç"
            class="cr-w"
          />
        </div>

        <div class="cr-field">
          <label>Dimensions (Kırılım)</label>
          <MultiSelect
            v-model="selectedDimensions"
            :options="dimensionOptions"
            optionLabel="label"
            optionValue="value"
            :maxSelectedLabels="2"
            selectedItemsLabel="{0} kırılım"
            placeholder="Kırılım seç"
            class="cr-w"
          />
        </div>

        <div v-if="showGranularity" class="cr-field">
          <label>Date Granularity</label>
          <SelectButton
            v-model="dateGranularity"
            :options="DATE_GRANULARITIES"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
          />
        </div>

        <div class="cr-field">
          <label>Chart Type</label>
          <SelectButton
            v-model="chartType"
            :options="CHART_TYPES"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
          />
        </div>

        <div class="cr-divider"></div>

        <div class="cr-field">
          <label>Start Date</label>
          <DatePicker v-model="startDate" dateFormat="dd.mm.yy" showIcon class="cr-w" />
        </div>
        <div class="cr-field">
          <label>End Date</label>
          <DatePicker v-model="endDate" dateFormat="dd.mm.yy" showIcon class="cr-w" />
        </div>
        <div class="cr-field">
          <label>Line</label>
          <MultiSelect
            v-model="selectedLines"
            :options="LINE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            :maxSelectedLabels="2"
            selectedItemsLabel="{0} hat seçili"
            placeholder="Tümü"
            class="cr-w"
          />
        </div>

        <Button label="Reset" icon="pi pi-refresh" severity="secondary" outlined size="small" @click="resetAll" />
      </aside>
    </div>

    <!-- ALT SATIR: veri seti (tam genişlik, soldan sağa) -->
    <div v-if="hasData" class="lp-card cr-card cr-dataset">
      <div class="cr-card-head">
        <h3>Data Set</h3>
        <small>{{ report.rows.length }} rows</small>
      </div>
      <DataTable
        :value="report.rows"
        paginator
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        removableSort
        scrollable
        scrollHeight="380px"
        showGridlines
        size="small"
        :style="{ fontSize: '0.82rem' }"
      >
        <Column
          v-for="col in report.columns"
          :key="col.key"
          :field="col.key"
          :header="col.label"
          sortable
          :style="{ minWidth: '120px', whiteSpace: 'nowrap' }"
        >
          <template #body="{ data }">
            <span :style="{ fontVariantNumeric: 'tabular-nums' }">
              {{ col.isDimension ? data[col.key] : fmt(data, col) }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.cr-top {
  display: flex;
  gap: 1.25rem;
  align-items: stretch;
}
.cr-charts {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cr-charts-card {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.cr-card {
  min-width: 0;
}
.cr-dataset {
  margin-top: 1.25rem;
  padding: 1rem 1.1rem;
}
.cr-config {
  width: 320px;
  flex-shrink: 0;
  min-width: 0;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
/* 5 seçenekli SelectButton'lar (Chart Type / Granularity) rayı taşırmasın */
.cr-config :deep(.p-selectbutton) {
  flex-wrap: wrap;
}
.cr-config :deep(.p-togglebutton) {
  flex: 1 0 auto;
}
.cr-config :deep(.p-multiselect-label) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.cr-config-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
}
.cr-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cr-field > label {
  font-size: 0.76rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.cr-w {
  width: 100%;
}
.cr-divider {
  border-top: 1px solid var(--lp-border);
  margin: 0.1rem 0;
}
.cr-card {
  padding: 1rem 1.1rem;
}
.cr-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.cr-card-head h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
}
.cr-card-head small {
  color: var(--lp-text-muted);
}
.cr-chart-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.cr-hint {
  color: var(--lp-text-muted);
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
}
.cr-warn {
  color: #d97706 !important;
}
.cr-chart {
  flex: 1;
  min-height: 480px;
  position: relative;
}
/* PrimeVue Chart sarmalayıcısı + canvas kabı tam kaplasın (kısa kalmasın) */
.cr-chart :deep(.p-chart) {
  position: relative;
  height: 100%;
  width: 100%;
}
.cr-chart :deep(canvas) {
  height: 100% !important;
}
.cr-empty {
  flex: 1;
  min-height: 480px;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--lp-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}
.cr-empty .pi {
  font-size: 2rem;
}

@media (max-width: 1100px) {
  .cr-top {
    flex-direction: column-reverse;
  }
  .cr-config {
    width: 100%;
    position: static;
  }
}
</style>
