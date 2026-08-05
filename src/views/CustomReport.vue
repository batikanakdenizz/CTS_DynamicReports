<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import MultiSelect from 'primevue/multiselect'
import SelectButton from 'primevue/selectbutton'
import DatePicker from 'primevue/datepicker'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Chart from 'primevue/chart'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

import {
  generateCascadeRows,
  LINE_OPTIONS,
  machinesForLines,
  productsForMachines,
} from '../data/dummyData.js'
import {
  MEASURE_OPTIONS,
  MEASURE_MAP,
  DIMENSIONS,
  DIMENSION_MAP,
  DATE_GRANULARITIES,
  CHART_TYPES,
  CHART_PALETTE,
} from '../data/reportCatalog.js'
import { REPORT_TEMPLATES } from '../data/reportTemplates.js'
import { runReport, formatValue } from '../lib/reportEngine.js'
import { addPdfLogo } from '../lib/pdfBrand.js'
import { isDark } from '../lib/theme.js'
import { t } from '../lib/i18n.js'
import zoomPlugin from 'chartjs-plugin-zoom'
// xlsx / jspdf ağır kütüphaneler — sadece export'a tıklanınca lazy-load edilir
// (ilk sayfa yükü şişmesin diye dinamik import).

// Cascade veri kaynağı (hat×gün×makine granülü — bkz. dummyData.js). Line
// Daily KPI ekranı ayrı generateRows()'u kullanır, bu değişiklik onu etkilemez.
const allRows = generateCascadeRows(30)

// Kriter paneli (Report Builder) bir drawer içinde: Show/Hide ile açılıp kapanır
const builderOpen = ref(false)

// Tarihler preset gelir: bitiş = bugün, başlangıç = 29 gün öncesi (son 30 gün).
// Dummy data da bugüne göre üretildiği için bu aralık her zaman veriyi kapsar.
const today = new Date()
today.setHours(0, 0, 0, 0)
const daysAgo = (n) => {
  const d = new Date(today)
  d.setDate(today.getDate() - n)
  return d
}

// Varsayılan filtre değerleri — hem ilk açılışta hem Reset'te kullanılır.
// Reset ekranı BOŞALTMAZ; kullanıcıyı veri gösteren bu makul duruma geri getirir.
const DEFAULT_LINE = LINE_OPTIONS[0].value // 'Link-up 38'
const makeDefaults = () => ({
  measures: ['upTime', 'unplannedDowntimeLoss', 'rateLoss', 'rejectLoss'],
  dimensions: ['line'],
  granularity: 'day',
  chartType: 'bar',
  lines: [DEFAULT_LINE],
  machines: [],
  products: [],
  startDate: daysAgo(29),
  endDate: new Date(today),
})

// --- Report definition state ---
const d0 = makeDefaults()
const selectedMeasures = ref(d0.measures)
const selectedDimensions = ref(d0.dimensions)
const dateGranularity = ref(d0.granularity)
const chartType = ref(d0.chartType)
const startDate = ref(d0.startDate)
const endDate = ref(d0.endDate)
const selectedLines = ref(d0.lines)
const selectedMachines = ref(d0.machines)
const selectedProducts = ref(d0.products)

// Bağlı (cascading) filtre seçenekleri: Machine, seçili Line'lara; Product,
// seçili Machine'lere göre daralır. Boş seçim = "kısıtlama yok" (üst tüm
// seçeneklerin birleşimi) — motorun filters.length===0 kuralıyla tutarlı.
const machineOptions = computed(() =>
  machinesForLines(selectedLines.value).map((m) => ({ label: m, value: m }))
)
const productOptions = computed(() => {
  const basis = selectedMachines.value.length
    ? selectedMachines.value
    : machineOptions.value.map((o) => o.value)
  return productsForMachines(basis).map((p) => ({ label: p, value: p }))
})

// Üst filtre daraldığında altta artık geçersiz olan seçimleri temizle.
watch(selectedLines, () => {
  const allowed = new Set(machineOptions.value.map((o) => o.value))
  selectedMachines.value = selectedMachines.value.filter((m) => allowed.has(m))
})
watch(selectedMachines, () => {
  const allowed = new Set(productOptions.value.map((o) => o.value))
  selectedProducts.value = selectedProducts.value.filter((p) => allowed.has(p))
})

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
    machines: selectedMachines.value,
    products: selectedProducts.value,
  },
}))

const report = computed(() => runReport(definition.value, allRows))
const hasData = computed(() => selectedMeasures.value.length > 0 && report.value.rows.length > 0)

// ==================== KÖK NEDEN ÖZETİ (AI'sız) ====================
// Seçili birincil ölçüm için, henüz kırılım olarak seçilmemiş Machine/Product
// boyutlarında motor (runReport) tekrar çalıştırılır; genel ortalamadan en çok
// sapan alt grup bulunup bilgi kutusunda gösterilir. Model/tahmin yok — sadece
// mevcut saf motorun birkaç kez daha çalıştırılmasıyla elde edilen bir kıyas.
const ROOT_CAUSE_CANDIDATES = ['machine', 'product']

const rootCause = computed(() => {
  if (!hasData.value) return null
  const measureKey = selectedMeasures.value[0]
  if (!measureKey) return null

  const baseRows = runReport({ ...definition.value, dimensions: [] }, allRows).rows
  const baseline = baseRows[0]?.[measureKey]
  if (baseline == null) return null

  const candidates = ROOT_CAUSE_CANDIDATES.filter((d) => !selectedDimensions.value.includes(d))
  let best = null
  for (const dim of candidates) {
    const subRows = runReport({ ...definition.value, dimensions: [dim] }, allRows).rows
    if (subRows.length < 2) continue // tek grup varsa sapma anlamsız
    for (const row of subRows) {
      const v = row[measureKey]
      if (v == null) continue
      // Türetilmiş (yüzde) ölçülerde motor payda=0 olunca sessizce 0 döner
      // (bkz. reportEngine.js) — bu gerçek bir sapma değil, veri yokluğu
      // göstergesi; sürekli rastgele veride tam 0.00% pratikte gerçek bir
      // değer olarak neredeyse hiç oluşmaz, o yüzden bu güvenli bir eleme.
      if (MEASURE_MAP[measureKey]?.kind === 'derived' && v === 0) continue
      const delta = v - baseline
      if (!best || Math.abs(delta) > Math.abs(best.delta)) {
        best = { dim, groupValue: row[dim], measureKey, measureValue: v, delta }
      }
    }
  }
  return best
})

function applyRootCause() {
  const rc = rootCause.value
  if (!rc) return
  if (rc.dim === 'machine') selectedMachines.value = [rc.groupValue]
  else if (rc.dim === 'product') selectedProducts.value = [rc.groupValue]
}

// --- Grafik ---
// Measure'ın anlamsal rengi varsa onu, yoksa kategorik paletten sırayla renk ver.
const measureColor = (mkey, i) =>
  MEASURE_MAP[mkey]?.color ?? CHART_PALETTE[i % CHART_PALETTE.length]
// #rrggbb -> rgba(...) (line dolgusu / donut kenarı için)
const withAlpha = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Chart.js instance'ını yakala (zoom sıfırlama için)
const chartInstance = ref(null)
const capturePlugin = {
  id: 'captureInstance',
  afterInit: (c) => {
    chartInstance.value = c
  },
}

// --- Hover-focus: ÇİZİM ANINDA globalAlpha ile soldurma ---
// Renkleri mutasyona uğratmaz ve chart.update() ÇAĞIRMAZ. Böylece zoom + hover
// birlikteyken güncelleme döngüsüne girip KİLİTLENMEZ (önceki bug'ın kök nedeni).
// Fare bir seriye gelince o seri tam, diğerleri soluk çizilir; fare çıkınca
// Chart.js normal çizer (otomatik geri döner). Zoom sırasında soldurma kapalı.
let zoomingUntil = 0
const markZooming = () => {
  zoomingUntil = Date.now() + 300
}

const focusDimPlugin = {
  id: 'focusDim',
  beforeDatasetDraw(chart, args) {
    chart.ctx.save()
    if (chart.config.type === 'doughnut' || Date.now() < zoomingUntil) return
    const active = chart.getActiveElements ? chart.getActiveElements() : []
    if (active.length && args.index !== active[0].datasetIndex) {
      chart.ctx.globalAlpha = 0.18
    }
  },
  afterDatasetDraw(chart) {
    chart.ctx.restore()
  },
}

const chartPlugins = [zoomPlugin, capturePlugin, focusDimPlugin]

function resetZoom() {
  chartInstance.value?.resetZoom?.()
}

// --- Drill-down: bir öğeye tıkla → detaya in (Line→Machine→Product→Date) ---
// Her drill öncesi önceki durum yığına atılır; "Geri" ile adım adım geri
// dönülür (Reset her şeyi değiştirdiği için ayrı tutuldu). Hiyerarşi
// lineTopology.js'teki gerçek ilişkiyle tutarlı: Line'a tıkla → Machine
// kırılımına in; Machine'e tıkla → Product kırılımına in; Product'a tıkla →
// günlük trende in. Date'ten öteye inecek seviye yok (DRILL_NEXT'te karşılığı
// olmadığı için orada durur).
const drillStack = ref([])
const DRILL_NEXT = { line: 'machine', machine: 'product', product: 'date' }

function onChartClick(evt, elements) {
  if (!elements?.length) return
  const idx = elements[0].index
  const row = report.value.rows[idx]
  if (!row) return
  const dims = selectedDimensions.value
  if (dims.length !== 1) return
  const dim = dims[0]
  const next = DRILL_NEXT[dim]
  if (!next || row[dim] == null) return
  drillStack.value.push(currentDef()) // geri dönebilmek için önceki durumu sakla
  if (dim === 'line') selectedLines.value = [row.line]
  else if (dim === 'machine') selectedMachines.value = [row.machine]
  else if (dim === 'product') selectedProducts.value = [row.product]
  selectedDimensions.value = [next]
  if (next === 'date') dateGranularity.value = 'day'
}

function drillBack() {
  const prev = drillStack.value.pop()
  if (prev) applyDef(prev)
}

// --- Grafiği görsel olarak dışa aktar (PNG indir / panoya kopyala) ---
// Şeffaf canvas yerine tema zeminli kompozit (dark mode'da metin okunur kalsın).
const exportBg = () => (isDark.value ? '#131c2e' : '#ffffff')
function chartCanvasComposite() {
  const src = chartInstance.value?.canvas
  if (!src) return null
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const ctx = c.getContext('2d')
  ctx.fillStyle = exportBg()
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(src, 0, 0)
  return c
}

function downloadPng() {
  const c = chartCanvasComposite()
  if (!c) return
  const a = document.createElement('a')
  a.href = c.toDataURL('image/png')
  a.download = `${exportFileName()}.png`
  a.click()
}

// Paylaşılabilir link: currentDef() zaten flat+JSON-safe (save/load'da kullanılan
// aynı şekil) — base64'e sarıp URL hash'ine ekliyoruz, ek bir backend/route gerekmiyor.
const linkCopied = ref(false)
async function shareLink() {
  try {
    const encoded = btoa(JSON.stringify(currentDef()))
    const url = `${location.origin}${location.pathname}#r=${encoded}`
    await navigator.clipboard?.writeText(url)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 1500)
  } catch {
    /* pano izni yok — sessiz geç */
  }
}

const copied = ref(false)
function copyPng() {
  const c = chartCanvasComposite()
  if (!c || !navigator.clipboard || !window.ClipboardItem) return
  c.toBlob(async (blob) => {
    if (!blob) return
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 1500)
    } catch {
      /* pano izni yok — sessiz geç */
    }
  })
}

const groupLabel = (row) =>
  selectedDimensions.value.length
    ? selectedDimensions.value.map((d) => row[d]).join(' / ')
    : 'Total'

const chartJsType = computed(() =>
  chartType.value === 'donut' ? 'doughnut' : chartType.value === 'line' ? 'line' : 'bar'
)

// Çift Y ekseni: yüzde ve sayı ölçümleri aynı grafikte seçilmişse yüzdeler solda
// ('y'), sayılar sağda ('y1') ayrı eksene gider (ölçek birbirini ezmesin).
const measureFmt = (mkey) => MEASURE_MAP[mkey]?.format
const isMixedAxis = computed(() => {
  const fmts = selectedMeasures.value.map(measureFmt)
  return fmts.some((f) => f === 'pct') && fmts.some((f) => f && f !== 'pct')
})

// A/B ikisi de aynı şekilde grafik verisi kurar — tek fark B'de donut asla
// olmaz (bkz. buildChartData ikinci parametresi ve karşılaştırma modu notu).
function buildChartData(rows, { forceNonDonut = false } = {}) {
  const labels = rows.map(groupLabel)

  if (chartType.value === 'donut' && !forceNonDonut) {
    const mkey = selectedMeasures.value[0]
    if (!mkey) return { labels: [], datasets: [] }
    return {
      labels,
      datasets: [
        {
          data: rows.map((r) => Math.round((r[mkey] ?? 0) * 100) / 100),
          backgroundColor: labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }
  }

  const isLine = chartType.value === 'line'
  return {
    labels,
    datasets: selectedMeasures.value.map((mkey, i) => {
      const color = measureColor(mkey, i)
      return {
        label: MEASURE_MAP[mkey]?.label ?? mkey,
        data: rows.map((r) => Math.round((r[mkey] ?? 0) * 100) / 100),
        // Çizgi: ince çizgi + hafif dolgu + yumuşak nokta; Bar: dolu + yuvarlak köşe
        backgroundColor: isLine ? withAlpha(color, 0.12) : color,
        borderColor: color,
        borderWidth: isLine ? 2.5 : 0,
        fill: isLine,
        tension: 0.35,
        pointRadius: isLine ? 0 : undefined,
        pointHoverRadius: isLine ? 5 : undefined,
        pointBackgroundColor: color,
        borderRadius: isLine ? 0 : 6,
        borderSkipped: false,
        maxBarThickness: 46,
        categoryPercentage: 0.72,
        barPercentage: 0.9,
        yAxisID: isMixedAxis.value ? (measureFmt(mkey) === 'pct' ? 'y' : 'y1') : 'y',
      }
    }),
  }
}

const chartData = computed(() => buildChartData(report.value.rows))

// A/B ikisi de aynı eksen/legend/tooltip mantığını paylaşır — B'de sadece
// tıklama (drill-down) ve zoom/pan kapalı (bkz. karşılaştırma modu notu:
// "sade bir grafik, amaç hızlı görsel kıyas").
function buildChartOptions({ forceNonDonut = false, interactive = true } = {}) {
  const stacked = chartType.value === 'stacked'
  const isDonut = chartType.value === 'donut' && !forceNonDonut
  // Tema-duyarlı eksen/metin renkleri (dark mode'da okunur kalsın)
  const dark = isDark.value
  const text = dark ? '#cbd5e1' : '#475569'
  const grid = dark ? 'rgba(148,163,184,0.16)' : 'rgba(148,163,184,0.14)'
  const mixed = isMixedAxis.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: true },
    onClick: interactive ? onChartClick : undefined,
    plugins: {
      legend: {
        position: isDonut ? 'right' : 'top',
        align: 'start',
        labels: {
          color: text,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 16,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: dark ? 'rgba(2,6,23,0.94)' : 'rgba(15,23,42,0.92)',
        padding: 10,
        cornerRadius: 8,
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { weight: '600' },
      },
      // Tekerlek ile zoom (büyüt/küçült), sürükle ile pan. Donut'ta ve B'de kapalı.
      zoom:
        isDonut || !interactive
          ? {}
          : {
              zoom: {
                wheel: { enabled: true, speed: 0.12 },
                pinch: { enabled: true },
                mode: 'y',
                // Zoom sırasında hover-focus'u baskıla (scroll ile odak değişmesin)
                onZoomStart: () => {
                  markZooming()
                },
                onZoom: () => {
                  markZooming()
                },
              },
              pan: {
                enabled: true,
                mode: 'xy',
                onPanStart: () => {
                  markZooming()
                },
                onPan: () => {
                  markZooming()
                },
              },
            },
    },
    scales: isDonut
      ? {}
      : {
          x: {
            stacked,
            ticks: { color: text, font: { size: 11 } },
            grid: { display: false },
            border: { color: grid },
          },
          y: {
            stacked,
            beginAtZero: true,
            position: 'left',
            title: mixed ? { display: true, text: '%', color: text } : { display: false },
            ticks: { color: text, font: { size: 11 }, padding: 6 },
            grid: { color: grid, drawTicks: false },
            border: { display: false },
          },
          // Sağ eksen — yalnızca yüzde + sayı birlikte seçiliyse görünür
          y1: {
            display: mixed,
            stacked,
            beginAtZero: true,
            position: 'right',
            title: { display: mixed, text: '#', color: text },
            ticks: { color: text, font: { size: 11 }, padding: 6 },
            grid: { drawOnChartArea: false },
            border: { display: false },
          },
        },
  }
}

const chartOptions = computed(() => buildChartOptions())

// ==================== KARŞILAŞTIRMA MODU ====================
// İkinci bağımsız bir tarih/Hat filtresi; measures/dimensions/chartType/
// Machine/Product birincil ile PAYLAŞILIR — motora ayrı bir hesaplama
// eklenmiyor, runReport aynı tanımla ikinci kez çalıştırılıyor.
const compareEnabled = ref(false)
const compareStartDate = ref(null)
const compareEndDate = ref(null)
const compareLines = ref([])

watch(compareEnabled, (on) => {
  if (!on || compareStartDate.value) return
  // Varsayılan: AYNI tarih aralığı, farklı Hat — dummy veri her zaman son 30
  // günü kapsadığı için "önceki dönem" varsayılanı boş gelirdi (veri penceresi
  // dışında kalırdı); kullanıcı isterse B tarihini kendi daraltır/kaydırır.
  compareStartDate.value = startDate.value
  compareEndDate.value = endDate.value
  const other = LINE_OPTIONS.find((o) => !selectedLines.value.includes(o.value))
  compareLines.value = other ? [other.value] : [...selectedLines.value]
})

const compareDefinition = computed(() => ({
  measures: selectedMeasures.value,
  dimensions: selectedDimensions.value,
  dateGranularity: dateGranularity.value,
  filters: {
    dateFrom: compareStartDate.value,
    dateTo: compareEndDate.value,
    lines: compareLines.value,
    machines: selectedMachines.value,
    products: selectedProducts.value,
  },
}))
const compareReport = computed(() =>
  compareEnabled.value ? runReport(compareDefinition.value, allRows) : null
)
const compareChartData = computed(() =>
  buildChartData(compareReport.value?.rows ?? [], { forceNonDonut: true })
)
const compareChartOptions = computed(() =>
  buildChartOptions({ forceNonDonut: true, interactive: false })
)
const compareChartJsType = computed(() => (chartType.value === 'line' ? 'line' : 'bar'))

const donutNote = computed(() => chartType.value === 'donut' && selectedMeasures.value.length > 1)

const fmt = (row, col) => formatValue(row[col.key], col.format)

// --- Export (Excel / PDF) ---
function exportFileName() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `custom-report-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Excel: ham sayısal değerler (Excel'de hesaplanabilsin diye), dimension'lar metin
async function exportExcel() {
  const XLSX = await import('xlsx')
  const { columns, rows } = report.value
  const aoa = [
    columns.map((c) => c.label),
    ...rows.map((r) => columns.map((c) => (c.isDimension ? r[c.key] : (r[c.key] ?? null)))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `${exportFileName()}.xlsx`)
}

// PDF: önce grafik görseli (Chart.js canvas), altına biçimli veri tablosu
async function exportPdf() {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const { columns, rows } = report.value
  const doc = new jsPDF({ orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  // Logo sağ üstte (y 10..24); grafik y=26'dan başladığı için çakışmaz.
  await addPdfLogo(doc, { margin })

  doc.setFontSize(14)
  doc.text('Custom Report', margin, 14)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(new Date().toLocaleString(), margin, 20)
  doc.setTextColor(0)

  let tableY = 26

  // Grafiği beyaz zeminli PNG olarak göm (varsa)
  const chart = chartInstance.value
  if (chart && typeof chart.toBase64Image === 'function') {
    const img = chart.toBase64Image('image/png', 1)
    const availW = pageW - margin * 2
    const ratio = chart.height / chart.width || 0.4
    const imgW = availW
    const imgH = Math.min(availW * ratio, 95) // sayfada tabloya da yer kalsın
    // Şeffaf canvas'ın altına tema zeminli dikdörtgen (dark mode'da metin okunsun)
    const bg = isDark.value ? [19, 28, 46] : [255, 255, 255]
    doc.setFillColor(bg[0], bg[1], bg[2])
    doc.rect(margin, tableY, imgW, imgH, 'F')
    doc.addImage(img, 'PNG', margin, tableY, imgW, imgH)
    tableY += imgH + 6
  }

  autoTable(doc, {
    startY: tableY,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) =>
      columns.map((c) => (c.isDimension ? r[c.key] : formatValue(r[c.key], c.format)))
    ),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
  })
  doc.save(`${exportFileName()}.pdf`)
}

function resetAll() {
  // Ekranı boşaltmaz — makul varsayılanlara döner (Line: Link-up 38, son 30 gün).
  const d = makeDefaults()
  selectedMeasures.value = d.measures
  selectedDimensions.value = d.dimensions
  dateGranularity.value = d.granularity
  chartType.value = d.chartType
  selectedLines.value = d.lines
  selectedMachines.value = d.machines
  selectedProducts.value = d.products
  startDate.value = d.startDate
  endDate.value = d.endDate
  drillStack.value = []
  compareEnabled.value = false
  compareStartDate.value = null
  compareEndDate.value = null
  compareLines.value = []
}

// --- Kaydedilmiş raporlar (localStorage) ---
// Seçili measure + dimension + granularity + chart tipi + filtreler bir "rapor
// tanımı" olarak isimle saklanır; tek tıkla geri yüklenir. Gerçek "dinamik rapor"
// vaadini tamamlar (kullanıcı kurguladığı raporu tekrar tekrar açabilir).
const SAVED_KEY = 'cr-saved-reports'
const savedReports = ref([])
const newReportName = ref('')
const savedSelection = ref(null)

const savedOptions = computed(() =>
  savedReports.value.map((r) => ({ label: r.name, value: r.name }))
)

const toISO = (d) => (d instanceof Date ? d.toISOString() : null)
const fromISO = (s) => (s ? new Date(s) : null)

function currentDef() {
  return {
    measures: [...selectedMeasures.value],
    dimensions: [...selectedDimensions.value],
    granularity: dateGranularity.value,
    chartType: chartType.value,
    lines: [...selectedLines.value],
    machines: [...selectedMachines.value],
    products: [...selectedProducts.value],
    startDate: toISO(startDate.value),
    endDate: toISO(endDate.value),
  }
}

function applyDef(def) {
  selectedMeasures.value = [...(def.measures ?? [])]
  selectedDimensions.value = [...(def.dimensions ?? [])]
  dateGranularity.value = def.granularity ?? 'day'
  chartType.value = def.chartType ?? 'bar'
  selectedLines.value = [...(def.lines ?? [])]
  selectedMachines.value = [...(def.machines ?? [])]
  selectedProducts.value = [...(def.products ?? [])]
  startDate.value = fromISO(def.startDate)
  endDate.value = fromISO(def.endDate)
}

// Şablonlar tarih SAKLAMAZ (bkz. reportTemplates.js) — her uygulamada
// "bugünden geri 30 gün" taze hesaplanır, aksi halde dummy veri penceresinin
// (her zaman bugüne göre son 30 gün) dışına düşüp rapor boş görünürdü.
function applyTemplate(tpl) {
  applyDef({
    ...tpl.def,
    startDate: toISO(daysAgo(29)),
    endDate: toISO(new Date(today)),
  })
  drillStack.value = []
}

function persistSaved() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedReports.value))
  } catch {
    /* kota/gizli mod — sessiz geç */
  }
}

function saveCurrentReport() {
  const name = newReportName.value.trim()
  if (!name) return
  const entry = { name, def: currentDef() }
  const idx = savedReports.value.findIndex((r) => r.name === name)
  if (idx >= 0)
    savedReports.value[idx] = entry // aynı isim → üzerine yaz
  else savedReports.value.push(entry)
  persistSaved()
  savedSelection.value = name
  newReportName.value = ''
}

function loadSavedReport(name) {
  const entry = savedReports.value.find((r) => r.name === name)
  if (entry) applyDef(entry.def)
}

function deleteSavedReport() {
  if (!savedSelection.value) return
  savedReports.value = savedReports.value.filter((r) => r.name !== savedSelection.value)
  persistSaved()
  savedSelection.value = null
}

onMounted(() => {
  // Paylaşılabilir link: #r=<base64 currentDef()> hash'i varsa raporu ondan kur.
  // Router yok, hash sayfa yeniden yüklemeden okunabiliyor.
  const m = location.hash.match(/^#r=([A-Za-z0-9+/=]+)/)
  if (m) {
    try {
      applyDef(JSON.parse(atob(m[1])))
    } catch {
      /* bozuk/eski link — yok say, varsayılanlarla devam et */
    }
  }
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (raw) savedReports.value = JSON.parse(raw)
  } catch {
    /* bozuk veri — yok say */
  }
})
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">{{ t('page.title') }}</h1>
        <div class="lp-breadcrumb">{{ t('page.breadcrumb') }}</div>
      </div>
      <Button
        :label="builderOpen ? t('builder.hide') : t('builder.open')"
        icon="pi pi-sliders-h"
        @click="builderOpen = !builderOpen"
      />
    </div>

    <!-- ÜST SATIR: grafik tam genişlik; kriterler drawer'da -->
    <div class="cr-top">
      <!-- Grafikler -->
      <section class="cr-charts">
        <!-- Boş durum 1: hiç measure seçilmemiş -->
        <div v-if="selectedMeasures.length === 0" class="cr-empty lp-card">
          <i class="pi pi-sliders-h"></i>
          <p>{{ t('empty.noMeasure') }}</p>
          <Button
            :label="t('empty.openBuilder')"
            icon="pi pi-sliders-h"
            size="small"
            @click="builderOpen = true"
          />
        </div>

        <!-- Boş durum 2: measure var ama bu filtrelerle sonuç yok -->
        <div v-else-if="report.rows.length === 0" class="cr-empty lp-card">
          <i class="pi pi-filter-slash"></i>
          <p>{{ t('empty.noResult') }}</p>
          <Button
            :label="t('empty.resetFilters')"
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            size="small"
            @click="resetAll"
          />
        </div>

        <div v-else :class="['cr-compare-row', { 'cr-compare-row--split': compareEnabled }]">
          <div class="lp-card cr-card cr-charts-card">
            <div class="cr-card-head">
              <h3>{{ t('chart.title') }}{{ compareEnabled ? ' — A' : '' }}</h3>
              <div class="cr-chart-actions">
                <Button
                  v-if="drillStack.length"
                  :label="t('chart.drillBack')"
                  icon="pi pi-arrow-left"
                  severity="secondary"
                  size="small"
                  @click="drillBack"
                />
                <small v-if="donutNote" class="cr-warn">
                  {{ t('donut.note') }} — "{{ MEASURE_MAP[selectedMeasures[0]]?.label }}"
                </small>
                <small v-else-if="!drillStack.length && chartType !== 'donut'" class="cr-hint">
                  <i class="pi pi-arrow-down-left"></i> {{ t('chart.drillHint') }}
                </small>
                <Button
                  v-tooltip.top="linkCopied ? t('chart.copied') : t('share.copy')"
                  :icon="linkCopied ? 'pi pi-check' : 'pi pi-link'"
                  text
                  rounded
                  size="small"
                  :aria-label="t('share.copy')"
                  @click="shareLink"
                />
                <Button
                  v-tooltip.top="t('chart.png')"
                  icon="pi pi-image"
                  text
                  rounded
                  size="small"
                  :aria-label="t('chart.png')"
                  @click="downloadPng"
                />
                <Button
                  v-tooltip.top="copied ? t('chart.copied') : t('chart.copy')"
                  :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
                  text
                  rounded
                  size="small"
                  :aria-label="t('chart.copy')"
                  @click="copyPng"
                />
                <Button
                  v-if="chartType !== 'donut'"
                  v-tooltip.top="t('chart.zoomReset')"
                  icon="pi pi-refresh"
                  text
                  rounded
                  size="small"
                  :aria-label="t('chart.zoomReset')"
                  @click="resetZoom"
                />
              </div>
            </div>
            <div class="cr-chart">
              <Chart
                :type="chartJsType"
                :data="chartData"
                :options="chartOptions"
                :plugins="chartPlugins"
              />
            </div>
          </div>

          <!-- Karşılaştırma paneli (B): sade bir Chart — donut/drill-down/zoom yok,
             amaç hızlı görsel kıyas. B'nin kendi tarih/Hat filtresi olduğu için
             A'dan bağımsız olarak da tetiklenebilir. -->
          <div v-if="compareEnabled" class="lp-card cr-card cr-charts-card">
            <div class="cr-card-head">
              <h3>{{ t('chart.title') }} — B</h3>
            </div>
            <div v-if="!compareReport || compareReport.rows.length === 0" class="cr-empty">
              <p>{{ t('empty.noResult') }}</p>
            </div>
            <div v-else class="cr-chart">
              <Chart
                :type="compareChartJsType"
                :data="compareChartData"
                :options="compareChartOptions"
              />
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Kriter paneli: sağdan açılan drawer -->
    <Drawer
      v-model:visible="builderOpen"
      position="right"
      :header="t('builder.open')"
      :style="{ width: '340px', maxWidth: '90vw' }"
    >
      <div class="cr-config">
        <div class="cr-field">
          <label>{{ t('field.measures') }}</label>
          <MultiSelect
            v-model="selectedMeasures"
            :options="MEASURE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            optionGroupLabel="label"
            optionGroupChildren="items"
            filter
            :maxSelectedLabels="1"
            :selectedItemsLabel="t('sel.measures')"
            :placeholder="t('ph.measures')"
            class="cr-w"
          />
        </div>

        <div class="cr-field">
          <label>{{ t('field.dimensions') }}</label>
          <MultiSelect
            v-model="selectedDimensions"
            :options="dimensionOptions"
            optionLabel="label"
            optionValue="value"
            :maxSelectedLabels="2"
            :selectedItemsLabel="t('sel.dimensions')"
            :placeholder="t('ph.dimensions')"
            class="cr-w"
          />
        </div>

        <div v-if="showGranularity" class="cr-field">
          <label>{{ t('field.granularity') }}</label>
          <SelectButton
            v-model="dateGranularity"
            :options="DATE_GRANULARITIES"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
          />
        </div>

        <div class="cr-field">
          <label>{{ t('field.chartType') }}</label>
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
          <label>{{ t('field.startDate') }}</label>
          <DatePicker v-model="startDate" dateFormat="dd.mm.yy" showIcon class="cr-w" />
        </div>
        <div class="cr-field">
          <label>{{ t('field.endDate') }}</label>
          <DatePicker v-model="endDate" dateFormat="dd.mm.yy" showIcon class="cr-w" />
        </div>
        <div class="cr-field">
          <label>{{ t('field.line') }}</label>
          <MultiSelect
            v-model="selectedLines"
            :options="LINE_OPTIONS"
            optionLabel="label"
            optionValue="value"
            :maxSelectedLabels="2"
            :selectedItemsLabel="t('sel.lines')"
            :placeholder="t('ph.line')"
            class="cr-w"
          />
        </div>
        <div class="cr-field">
          <label>{{ t('field.machine') }}</label>
          <MultiSelect
            v-model="selectedMachines"
            :options="machineOptions"
            optionLabel="label"
            optionValue="value"
            :maxSelectedLabels="2"
            :selectedItemsLabel="t('sel.machines')"
            :placeholder="t('ph.machine')"
            class="cr-w"
          />
        </div>
        <div class="cr-field">
          <label>{{ t('field.product') }}</label>
          <MultiSelect
            v-model="selectedProducts"
            :options="productOptions"
            optionLabel="label"
            optionValue="value"
            :maxSelectedLabels="2"
            :selectedItemsLabel="t('sel.products')"
            :placeholder="t('ph.product')"
            class="cr-w"
          />
        </div>

        <div class="cr-divider"></div>

        <!-- Karşılaştırma modu: measures/dimensions/chartType/Machine/Product
             paylaşılır, sadece tarih + Hat B için bağımsız seçilir. -->
        <div class="cr-field cr-compare-toggle">
          <label>{{ t('compare.title') }}</label>
          <ToggleSwitch v-model="compareEnabled" />
        </div>
        <template v-if="compareEnabled">
          <div class="cr-field">
            <label>{{ t('compare.dateRange') }}</label>
            <div class="cr-compare-daterange">
              <DatePicker v-model="compareStartDate" dateFormat="dd.mm.yy" showIcon class="cr-w" />
              <DatePicker v-model="compareEndDate" dateFormat="dd.mm.yy" showIcon class="cr-w" />
            </div>
          </div>
          <div class="cr-field">
            <label>{{ t('compare.line') }}</label>
            <MultiSelect
              v-model="compareLines"
              :options="LINE_OPTIONS"
              optionLabel="label"
              optionValue="value"
              :maxSelectedLabels="2"
              :selectedItemsLabel="t('sel.lines')"
              :placeholder="t('ph.line')"
              class="cr-w"
            />
          </div>
        </template>

        <div class="cr-divider"></div>

        <Button
          :label="t('btn.reset')"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          size="small"
          @click="resetAll"
        />

        <div class="cr-divider"></div>

        <!-- Rapor şablonları -->
        <div class="cr-field">
          <label>{{ t('tpl.title') }}</label>
          <div class="cr-tpl-row">
            <Button
              v-for="tpl in REPORT_TEMPLATES"
              :key="tpl.key"
              :label="t(tpl.nameKey)"
              severity="secondary"
              outlined
              size="small"
              @click="applyTemplate(tpl)"
            />
          </div>
        </div>

        <div class="cr-divider"></div>

        <!-- Kaydedilmiş raporlar -->
        <div class="cr-field">
          <label>{{ t('saved.title') }}</label>
          <div class="cr-saved-row">
            <Select
              v-model="savedSelection"
              :options="savedOptions"
              optionLabel="label"
              optionValue="value"
              :placeholder="savedReports.length ? t('saved.pick') : t('saved.none')"
              :disabled="!savedReports.length"
              class="cr-w"
              @change="loadSavedReport(savedSelection)"
            />
            <Button
              v-tooltip.top="t('saved.delete')"
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              size="small"
              :disabled="!savedSelection"
              :aria-label="t('saved.delete')"
              @click="deleteSavedReport"
            />
          </div>
          <div class="cr-saved-row">
            <InputText
              v-model="newReportName"
              :placeholder="t('saved.name')"
              class="cr-w"
              @keyup.enter="saveCurrentReport"
            />
            <Button
              v-tooltip.top="t('saved.save')"
              icon="pi pi-save"
              size="small"
              :disabled="!newReportName.trim()"
              :aria-label="t('saved.save')"
              @click="saveCurrentReport"
            />
          </div>
        </div>
      </div>
    </Drawer>

    <!-- Kök neden özeti: rootCause null ise render edilmez -->
    <div v-if="rootCause" class="lp-card cr-card cr-rootcause" @click="applyRootCause">
      <div class="cr-card-head">
        <h3>{{ t('rootcause.title') }}</h3>
      </div>
      <p class="cr-rootcause-body">
        <b>{{ MEASURE_MAP[rootCause.measureKey]?.label }}</b>
        {{ t('rootcause.mostIn') }}
        <b>{{ DIMENSION_MAP[rootCause.dim]?.label }} = {{ rootCause.groupValue }}</b
        >:
        {{ formatValue(rootCause.measureValue, MEASURE_MAP[rootCause.measureKey]?.format) }}
        ({{ rootCause.delta >= 0 ? '+' : ''
        }}{{ formatValue(rootCause.delta, MEASURE_MAP[rootCause.measureKey]?.format) }}
        {{ t('rootcause.vsAvg') }})
      </p>
      <small class="cr-hint">{{ t('rootcause.hint') }}</small>
    </div>

    <!-- ALT SATIR: veri seti (tam genişlik, soldan sağa) -->
    <div v-if="hasData" class="lp-card cr-card cr-dataset">
      <div class="cr-card-head">
        <h3>{{ t('data.title') }}</h3>
        <div class="cr-ds-actions">
          <small>{{ report.rows.length }} {{ t('data.rows') }}</small>
          <Button
            :label="t('btn.excel')"
            icon="pi pi-file-excel"
            severity="success"
            outlined
            size="small"
            @click="exportExcel"
          />
          <Button
            :label="t('btn.pdf')"
            icon="pi pi-file-pdf"
            severity="danger"
            outlined
            size="small"
            @click="exportPdf"
          />
        </div>
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
.cr-compare-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.cr-compare-daterange {
  display: flex;
  gap: 0.5rem;
}
.cr-compare-daterange > * {
  flex: 1;
  min-width: 0;
}
.cr-compare-row {
  display: contents; /* kapalıyken kartlar normal dikey akışta kalsın */
}
.cr-compare-row--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}
.cr-rootcause {
  margin-top: 1.25rem;
  padding: 1rem 1.1rem;
  cursor: pointer;
  border: 1px dashed var(--lp-border);
  transition: border-color 0.15s;
}
.cr-rootcause:hover {
  border-color: var(--lp-primary, #3b82f6);
}
.cr-rootcause-body {
  margin: 0.3rem 0;
}
/* Kriter paneli artık drawer içinde: dikey akış */
.cr-config {
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
.cr-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.cr-field > label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--lp-text-muted); /* temaya duyarlı — sabit renk koyu temada okunmuyordu */
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.cr-w {
  width: 100%;
}
.cr-tpl-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.cr-saved-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.cr-saved-row .cr-w {
  min-width: 0;
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
.cr-ds-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
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
</style>
