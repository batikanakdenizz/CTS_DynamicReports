// Hazır rapor şablonları — drawer'da tek tıkla yüklenir.
// Kaydedilmiş raporlardan (cr-saved-reports) farkı: kod içinde seed'lenmiş,
// salt-okunur, tarih aralığı SAKLAMAZ (CustomReport.vue applyTemplate() her
// uygulamada "bugünden geri 30 gün" taze hesaplar — dummy veri her zaman o
// pencerede üretildiği için sabit tarih zamanla veri dışına düşerdi).
export const REPORT_TEMPLATES = [
  {
    key: 'downtime',
    nameKey: 'tpl.downtime',
    def: {
      measures: ['plannedDowntimeLoss', 'unplannedDowntimeLoss', 'rejectLoss', 'rateLoss'],
      dimensions: ['line'],
      granularity: 'day',
      chartType: 'stacked',
      lines: [],
      machines: [],
      products: [],
    },
  },
  {
    key: 'lineCompare',
    nameKey: 'tpl.lineCompare',
    def: {
      measures: ['upTime'],
      dimensions: ['line'],
      granularity: 'day',
      chartType: 'bar',
      lines: [],
      machines: [],
      products: [],
    },
  },
  {
    key: 'machinePerf',
    nameKey: 'tpl.machinePerf',
    def: {
      measures: ['upTime', 'rejectLoss'],
      dimensions: ['machine'],
      granularity: 'day',
      chartType: 'bar',
      lines: [],
      machines: [],
      products: [],
    },
  },
]
