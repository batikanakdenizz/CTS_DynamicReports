// Custom Report Builder — measure & dimension kataloğu.
//
// Ham (raw) measure'lar shell'in ortak veri kaynağındaki (dummyData.js) alan
// adlarına birebir bağlıdır. Türetilmiş (derived) KPI'lar num/den (pay/payda)
// fonksiyonlarıyla tanımlanır; gruplarken yüzdeler ORTALANMAZ — önce pay ve
// payda satır satır toplanır, sonra oran hesaplanır (HowWorksReports.md E2).

// ---------------- HAM MEASURE'LAR ----------------
// (dummyData.js COLUMNS ile aynı alanlar; sadece sayısal/oransal olanlar ölçüm.)
const RAW = [
  { key: 'volume', label: 'Volume', format: 'int', group: 'Production' },
  { key: 'reject', label: 'Reject', format: 'int', group: 'Production' },
  { key: 'theoVolume', label: 'Theo. Volume', format: 'int', group: 'Production' },
  { key: 'targetVolume', label: 'Target Volume', format: 'int', group: 'Production' },
  { key: 'calendarTime', label: 'Calendar Time', format: 'min', group: 'Time' },
  { key: 'scheduledTime', label: 'Scheduled Time', format: 'min', group: 'Time' },
  { key: 'designTargetSpeed', label: 'Design Target Speed', format: 'int', group: 'Time', agg: 'avg' },
  { key: 'numberOfStops', label: 'Number of Stops', format: 'int', group: 'Stops' },
  { key: 'numberOfShortStops', label: 'Number of Short Stops', format: 'int', group: 'Stops' },
  { key: 'breakdown', label: 'Breakdown', format: 'int', group: 'Stops' },
  { key: 'processStops', label: 'Process Stops', format: 'int', group: 'Stops' },
  { key: 'noDefCode', label: 'No Definition Stoppage Code', format: 'int', group: 'Stops' },
  { key: 'plannedStops', label: 'Planned Stops', format: 'int', group: 'Stops' },
  { key: 'plannedStopDuration', label: 'Planned Stop Duration', format: 'min', group: 'Duration' },
  { key: 'unplannedStopDuration', label: 'Unplanned Stop Duration', format: 'min', group: 'Duration' },
  { key: 'noDataFlowDuration', label: 'No Data Flow Duration', format: 'min', group: 'Duration' },
  { key: 'noDemandDuration', label: 'No Demand Duration', format: 'min', group: 'Duration' },
  { key: 'runningDuration', label: 'Running Duration', format: 'min', group: 'Duration' },
  { key: 'lowSpeedDuration', label: 'Low Speed Duration', format: 'min', group: 'Duration' },
  { key: 'totalRuntime', label: 'Total Runtime', format: 'min', group: 'Duration' },
].map((m) => ({ ...m, kind: 'raw', agg: m.agg || 'sum' }));

// ---------------- TÜRETİLMİŞ KPI'LAR ----------------
// Beş loss kovasına ANLAMSAL renk verilir: Up Time yeşil (iyi), Rate/Reject sıcak
// tonlar, Planned nötr gri-mavi (planlı → alarm değil), Unplanned kırmızı (kötü).
// Böylece stacked grafik renkten okunur.
const DERIVED = [
  {
    key: 'upTime', label: 'Up Time %', format: 'pct', group: 'KPI', color: '#2aa46a',
    num: (r) => r.volume, den: (r) => r.theoVolume, scale: 100,
  },
  {
    key: 'rejectLoss', label: 'Reject Loss %', format: 'pct', group: 'KPI', color: '#e8683d',
    num: (r) => r.reject, den: (r) => r.theoVolume, scale: 100,
  },
  {
    key: 'plannedDowntimeLoss', label: 'Planned Downtime Loss %', format: 'pct', group: 'KPI', color: '#6b7f99',
    num: (r) => r.plannedStopDuration * r.designTargetSpeed, den: (r) => r.theoVolume, scale: 100,
  },
  {
    key: 'unplannedDowntimeLoss', label: 'Unplanned Downtime Loss %', format: 'pct', group: 'KPI', color: '#d6455d',
    num: (r) => r.unplannedStopDuration * r.designTargetSpeed, den: (r) => r.theoVolume, scale: 100,
  },
  {
    // Kalan kayıp — 5 kova tam %100'e tamamlanır.
    key: 'rateLoss', label: 'Rate Loss %', format: 'pct', group: 'KPI', color: '#e8a33d',
    num: (r) =>
      r.theoVolume - r.volume - r.reject -
      r.plannedStopDuration * r.designTargetSpeed -
      r.unplannedStopDuration * r.designTargetSpeed,
    den: (r) => r.theoVolume, scale: 100,
  },
  {
    key: 'availability', label: 'Availability %', format: 'pct', group: 'KPI', color: '#2aa9bf',
    num: (r) => r.totalRuntime, den: (r) => r.scheduledTime, scale: 100,
  },
  {
    key: 'totalLoss', label: 'Total Losses %', format: 'pct', group: 'KPI', color: '#c0392b',
    num: (r) => r.theoVolume - r.volume, den: (r) => r.theoVolume, scale: 100,
  },
  {
    key: 'mtbf', label: 'MTBF (min)', format: 'dec', group: 'KPI', color: '#6366f1',
    num: (r) => r.totalRuntime, den: (r) => r.numberOfStops, scale: 1,
  },
].map((m) => ({ ...m, kind: 'derived' }));

export const MEASURES = [...DERIVED, ...RAW];
export const MEASURE_MAP = Object.fromEntries(MEASURES.map((m) => [m.key, m]));

// Anlamsal rengi olmayan measure'lar (raw) ve donut kategorileri için modern,
// hafif kırık tonlu kategorik palet (yan yana uyumlu; neon/cıvık değil).
export const CHART_PALETTE = [
  '#5b8ff9', '#61ddaa', '#657798', '#f6bd16', '#7262fd',
  '#78d3f8', '#9661bc', '#f6903d', '#008685', '#f08bb4',
];

// MultiSelect için gruplu seçenek listesi
export const MEASURE_OPTIONS = (() => {
  const order = ['KPI', 'Production', 'Duration', 'Stops', 'Time'];
  const by = {};
  for (const m of MEASURES) (by[m.group] ||= []).push({ label: m.label, value: m.key });
  return order.filter((g) => by[g]).map((g) => ({ label: g, items: by[g] }));
})();

// ---------------- DIMENSION'LAR ----------------
// Shell veri kaynağında mevcut kırılımlar: Line, Date (dd.mm.yyyy string).
export const DIMENSIONS = [
  { key: 'line', label: 'Line', field: 'line' },
  { key: 'machine', label: 'Machine', field: 'machine' },
  { key: 'product', label: 'Product', field: 'product' },
  { key: 'date', label: 'Date', field: 'date', hasGranularity: true },
];
export const DIMENSION_MAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));

export const DATE_GRANULARITIES = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
];

export const CHART_TYPES = [
  { label: 'Bar', value: 'bar', icon: 'pi pi-chart-bar' },
  { label: 'Stacked', value: 'stacked', icon: 'pi pi-chart-bar' },
  { label: 'Line', value: 'line', icon: 'pi pi-chart-line' },
  { label: 'Donut', value: 'donut', icon: 'pi pi-chart-pie' },
];
