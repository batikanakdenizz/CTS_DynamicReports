// Custom Report Builder — aggregation / transform katmanı.
// report definition + satırlar -> { columns, rows }
//
// Veri kaynağından bağımsızdır: dummyData.generateRows() yerine gerçek API
// geldiğinde sadece kaynak değişir, bu mantık aynı kalır.

import { MEASURE_MAP, DIMENSION_MAP } from '../data/reportCatalog.js';

// Shell tarih formatı: 'dd.mm.yyyy'
function parseDate(str) {
  const [d, m, y] = str.split('.').map(Number);
  return new Date(y, m - 1, d);
}

function isoWeek(date) {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return { year: t.getUTCFullYear(), week };
}

function bucketDate(str, granularity) {
  const d = parseDate(str);
  switch (granularity) {
    case 'week': {
      const { year, week } = isoWeek(d);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    case 'quarter':
      return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
    case 'year':
      return `${d.getFullYear()}`;
    case 'day':
    default:
      // gün: sıralama için ISO'ya çevir ama görüntüde orijinali koru
      return str;
  }
}

// Gün kovası için sıralanabilir anahtar
function sortKeyForDate(str) {
  const d = parseDate(str);
  return d.getTime();
}

function dimValue(record, dimKey, dateGranularity) {
  const dim = DIMENSION_MAP[dimKey];
  if (!dim) return '';
  if (dim.key === 'date') return bucketDate(record[dim.field], dateGranularity);
  return record[dim.field];
}

/**
 * @param {Object} def { measures, dimensions, dateGranularity, filters:{ dateFrom, dateTo, lines } }
 * @param {Array}  records ham satırlar (generateRows çıktısı)
 */
export function runReport(def, records) {
  const { measures = [], dimensions = [], dateGranularity = 'day', filters = {} } = def;
  const { dateFrom, dateTo, lines } = filters;

  // 1) FİLTRELE
  const fromT = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
  const toT = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
  const filtered = records.filter((r) => {
    const t = parseDate(r.date).getTime();
    if (fromT != null && t < fromT) return false;
    if (toT != null && t > toT) return false;
    if (lines && lines.length && !lines.includes(r.line)) return false;
    return true;
  });

  // 2) GRUPLA
  const groups = new Map();
  for (const r of filtered) {
    const keyParts = dimensions.map((dk) => dimValue(r, dk, dateGranularity));
    const gkey = keyParts.join(' ‖ ');
    if (!groups.has(gkey)) groups.set(gkey, { keyParts, rows: [] });
    groups.get(gkey).rows.push(r);
  }
  if (dimensions.length === 0 && filtered.length) {
    groups.set('__total__', { keyParts: ['Total'], rows: filtered });
  }

  // 3) MEASURE HESABI
  const dateIdx = dimensions.indexOf('date');
  const out = [];
  for (const { keyParts, rows: grp } of groups.values()) {
    const row = {};
    dimensions.forEach((dk, i) => (row[dk] = keyParts[i]));

    for (const mkey of measures) {
      const m = MEASURE_MAP[mkey];
      if (!m) continue;
      if (m.kind === 'raw') {
        let sum = 0;
        for (const r of grp) sum += r[mkey] || 0;
        row[mkey] = m.agg === 'avg' ? sum / grp.length : sum;
      } else {
        let num = 0, den = 0;
        for (const r of grp) { num += m.num(r); den += m.den(r); }
        row[mkey] = den === 0 ? 0 : (num / den) * (m.scale || 1);
      }
    }
    // gün granülü tarih için sıralama anahtarı
    if (dateIdx !== -1 && dateGranularity === 'day') {
      row.__dateSort = sortKeyForDate(keyParts[dateIdx]);
    }
    out.push(row);
  }

  // Sırala (tarih varsa tarihe göre, yoksa ilk dimension'a göre)
  if (dateIdx !== -1) {
    out.sort((a, b) =>
      dateGranularity === 'day'
        ? a.__dateSort - b.__dateSort
        : String(a.date).localeCompare(String(b.date))
    );
  } else if (dimensions.length) {
    out.sort((a, b) => String(a[dimensions[0]]).localeCompare(String(b[dimensions[0]])));
  }

  // 4) KOLONLAR
  const columns = [
    ...dimensions.map((dk) => ({ key: dk, label: DIMENSION_MAP[dk].label, isDimension: true })),
    ...measures.map((mk) => ({
      key: mk, label: MEASURE_MAP[mk].label, isDimension: false, format: MEASURE_MAP[mk].format,
    })),
  ];

  return { columns, rows: out };
}

const nf = new Intl.NumberFormat('en-US');
export function formatValue(value, format) {
  if (value == null || Number.isNaN(value)) return '-';
  switch (format) {
    case 'pct':
      return value.toFixed(2) + ' %';
    case 'dec':
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    case 'min':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    case 'int':
    default:
      return nf.format(Math.round(value));
  }
}
