// Hafif i18n — vue-i18n bağımlılığı olmadan. `locale` reactive bir ref; `t(key)`
// çeviriyi döndürür ve locale.value okuduğu için şablonlarda locale değişince
// otomatik yeniden render olur. Tercih localStorage'da saklanır.
import { ref } from 'vue'

const KEY = 'cr-lang'
export const locale = ref('tr')

export const LOCALES = [
  { label: 'TR', value: 'tr' },
  { label: 'EN', value: 'en' },
]

const messages = {
  tr: {
    'page.title': 'Özel Rapor',
    'page.breadcrumb': 'Raporlar · Özel Rapor Oluşturucu',
    'builder.open': 'Rapor Oluşturucu',
    'builder.hide': 'Kriterleri Gizle',
    'field.measures': 'Ölçümler',
    'field.dimensions': 'Kırılımlar',
    'field.granularity': 'Tarih Kırılımı',
    'field.chartType': 'Grafik Tipi',
    'field.startDate': 'Başlangıç',
    'field.endDate': 'Bitiş',
    'field.line': 'Hat',
    'field.machine': 'Makine',
    'field.product': 'Ürün',
    'ph.measures': 'Ölçüm seç',
    'ph.dimensions': 'Kırılım seç',
    'ph.line': 'Tümü',
    'ph.machine': 'Tümü',
    'ph.product': 'Tümü',
    'sel.measures': '{0} ölçüm seçili',
    'sel.dimensions': '{0} kırılım',
    'sel.lines': '{0} hat seçili',
    'sel.machines': '{0} makine seçili',
    'sel.products': '{0} ürün seçili',
    'btn.reset': 'Sıfırla',
    'saved.title': 'Kaydedilmiş Raporlar',
    'saved.pick': 'Rapor seç',
    'saved.none': 'Kayıt yok',
    'saved.name': 'Rapor adı',
    'saved.delete': 'Seçili raporu sil',
    'saved.save': 'Mevcut kurguyu kaydet',
    'chart.title': 'Grafik',
    'chart.zoomHint': 'Scroll: yakınlaş · sürükle: kaydır',
    'chart.zoomReset': 'Zoom sıfırla',
    'chart.png': 'PNG indir',
    'chart.copy': 'Grafiği kopyala',
    'chart.copied': 'Kopyalandı',
    'chart.drillHint': 'İpucu: bir bara tıkla → o hattın günlük trendine in',
    'chart.drillBack': 'Geri',
    'donut.note': 'Donut tek ölçüm gösterir',
    'empty.noMeasure': 'Rapora başlamak için en az bir Ölçüm seç.',
    'empty.openBuilder': "Rapor Oluşturucu'yu Aç",
    'empty.noResult': 'Bu filtrelerle eşleşen kayıt yok. Tarih aralığını genişlet veya hat seçimini gevşet.',
    'empty.resetFilters': 'Filtreleri Sıfırla',
    'data.title': 'Veri Seti',
    'data.rows': 'satır',
    'btn.excel': 'Excel',
    'btn.pdf': 'PDF',
    'topbar.lang': 'Dil',
    'topbar.dark': 'Koyu tema',
    'topbar.light': 'Açık tema',
  },
  en: {
    'page.title': 'Custom Report',
    'page.breadcrumb': 'Reports · Custom Report Builder',
    'builder.open': 'Report Builder',
    'builder.hide': 'Hide Criteria',
    'field.measures': 'Measures',
    'field.dimensions': 'Dimensions',
    'field.granularity': 'Date Granularity',
    'field.chartType': 'Chart Type',
    'field.startDate': 'Start Date',
    'field.endDate': 'End Date',
    'field.line': 'Line',
    'field.machine': 'Machine',
    'field.product': 'Product',
    'ph.measures': 'Select measure',
    'ph.dimensions': 'Select dimension',
    'ph.line': 'All',
    'ph.machine': 'All',
    'ph.product': 'All',
    'sel.measures': '{0} measures selected',
    'sel.dimensions': '{0} dimensions',
    'sel.lines': '{0} lines selected',
    'sel.machines': '{0} machines selected',
    'sel.products': '{0} products selected',
    'btn.reset': 'Reset',
    'saved.title': 'Saved Reports',
    'saved.pick': 'Pick a report',
    'saved.none': 'No saved reports',
    'saved.name': 'Report name',
    'saved.delete': 'Delete selected report',
    'saved.save': 'Save current setup',
    'chart.title': 'Chart',
    'chart.zoomHint': 'Scroll: zoom · drag: pan',
    'chart.zoomReset': 'Reset zoom',
    'chart.png': 'Download PNG',
    'chart.copy': 'Copy chart',
    'chart.copied': 'Copied',
    'chart.drillHint': 'Tip: click a bar → drill into that line’s daily trend',
    'chart.drillBack': 'Back',
    'donut.note': 'Donut shows a single measure',
    'empty.noMeasure': 'Select at least one Measure to start.',
    'empty.openBuilder': 'Open Report Builder',
    'empty.noResult': 'No records match these filters. Widen the date range or relax the line selection.',
    'empty.resetFilters': 'Reset Filters',
    'data.title': 'Data Set',
    'data.rows': 'rows',
    'btn.excel': 'Excel',
    'btn.pdf': 'PDF',
    'topbar.lang': 'Language',
    'topbar.dark': 'Dark theme',
    'topbar.light': 'Light theme',
  },
}

export function t(key, ...args) {
  let s = messages[locale.value]?.[key] ?? messages.tr[key] ?? key
  args.forEach((a, i) => { s = s.replace(`{${i}}`, a) })
  return s
}

export function setLocale(l) {
  locale.value = l
  try {
    localStorage.setItem(KEY, l)
  } catch { /* yok say */ }
}

export function initI18n() {
  try {
    const s = localStorage.getItem(KEY)
    if (s === 'tr' || s === 'en') locale.value = s
  } catch { /* yok say */ }
}
