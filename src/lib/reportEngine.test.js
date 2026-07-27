// reportEngine.js için birim testleri.
//
// Bu dosya bilinçli olarak reportCatalog.js'teki GERÇEK measure tanımlarını
// kullanır (mock/stub değil) — çünkü asıl risk motorun kendisinde değil,
// "5 kova %100 tamamlar" ve "yüzde asla ortalanmaz, num/den ayrı toplanır"
// gibi iş kurallarının reportCatalog.js'teki formüllerle birlikte doğru
// çalışmasında. Motoru mock measure'larla test etmek bu riski kaçırırdı.
//
// NOT: Bu dosya CustomReport-DevExtreme/src/lib/reportEngine.test.js ile
// bilinçli olarak birebir aynı — iki projedeki reportEngine.js/reportCatalog.js
// measure tanımları (key/num/den/format) özdeş (bkz. proje mimarisi notları),
// bu yüzden aynı test seti her iki motoru da gerçek anlamda kapsıyor.
import { describe, it, expect } from 'vitest'
import { runReport, formatValue, parseDate } from './reportEngine.js'

// Testte kullanılan tüm ham alanları makul varsayılanlarla dolduran satır
// üreteci — her test sadece ilgilendiği alanı override eder.
function makeRow(overrides = {}) {
  return {
    date: '01.01.2026',
    line: 'Line A',
    machine: 'M1',
    product: 'P1',
    volume: 0,
    reject: 0,
    theoVolume: 100,
    targetVolume: 100,
    calendarTime: 1440,
    scheduledTime: 1440,
    designTargetSpeed: 10,
    numberOfStops: 0,
    numberOfShortStops: 0,
    breakdown: 0,
    processStops: 0,
    noDefCode: 0,
    plannedStops: 0,
    plannedStopDuration: 0,
    unplannedStopDuration: 0,
    noDataFlowDuration: 0,
    noDemandDuration: 0,
    runningDuration: 0,
    lowSpeedDuration: 0,
    totalRuntime: 0,
    ...overrides,
  }
}

describe('parseDate', () => {
  it('dd.mm.yyyy formatını doğru parse eder', () => {
    const d = parseDate('05.03.2026')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // Mart = index 2
    expect(d.getDate()).toBe(5)
  })
})

describe('runReport — 5 kova %100 invariant', () => {
  // Bu, projenin en kritik iş kuralı: UpTime%+RateLoss%+RejectLoss%+
  // PlannedDT%+UnplannedDT% HER ZAMAN tam 100 olmalı (RateLoss kalan/residual
  // olarak hesaplanır). Farklı satır kombinasyonlarında (tek satır, çoklu
  // satır, sıfır üretim) bu invariant'ın bozulmadığını doğrular.
  const BUCKETS = [
    'upTime',
    'rejectLoss',
    'plannedDowntimeLoss',
    'unplannedDowntimeLoss',
    'rateLoss',
  ]

  function sumBuckets(rows) {
    const def = { measures: BUCKETS, dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    const row = out[0]
    return BUCKETS.reduce((acc, k) => acc + row[k], 0)
  }

  it('tek satırda tam 100 verir', () => {
    const rows = [
      makeRow({
        volume: 700,
        reject: 50,
        theoVolume: 1000,
        plannedStopDuration: 5,
        unplannedStopDuration: 10,
        designTargetSpeed: 10,
      }),
    ]
    expect(sumBuckets(rows)).toBeCloseTo(100, 9)
  })

  it('birden çok, birbirinden farklı satırda toplandığında da tam 100 verir', () => {
    const rows = [
      makeRow({
        volume: 700,
        reject: 50,
        theoVolume: 1000,
        plannedStopDuration: 5,
        unplannedStopDuration: 10,
        designTargetSpeed: 10,
      }),
      makeRow({
        volume: 300,
        reject: 120,
        theoVolume: 800,
        plannedStopDuration: 8,
        unplannedStopDuration: 20,
        designTargetSpeed: 15,
      }),
      makeRow({
        volume: 900,
        reject: 10,
        theoVolume: 950,
        plannedStopDuration: 0,
        unplannedStopDuration: 3,
        designTargetSpeed: 8,
      }),
    ]
    expect(sumBuckets(rows)).toBeCloseTo(100, 9)
  })

  it('planlı/plansız duruş sıfırsa ve tüm hacim üretilmişse UpTime %100, diğerleri 0 olur', () => {
    const rows = [
      makeRow({
        volume: 1000,
        reject: 0,
        theoVolume: 1000,
        plannedStopDuration: 0,
        unplannedStopDuration: 0,
      }),
    ]
    const def = { measures: BUCKETS, dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out[0].upTime).toBeCloseTo(100, 9)
    expect(out[0].rejectLoss).toBeCloseTo(0, 9)
    expect(out[0].plannedDowntimeLoss).toBeCloseTo(0, 9)
    expect(out[0].unplannedDowntimeLoss).toBeCloseTo(0, 9)
    expect(out[0].rateLoss).toBeCloseTo(0, 9)
  })
})

describe('runReport — türetilmiş (derived) ölçüler ortalanmaz, num/den ayrı toplanır', () => {
  // Bu davranış olmasaydı (yanlışlıkla "yüzdelerin ortalamasını al" yazılsaydı)
  // aşağıdaki iki satır durumunda yanlış sonuç sessizce üretilirdi:
  // satır A: volume=10/theo=100  → %10 (küçük hacim)
  // satır B: volume=900/theo=1000 → %90 (10 kat büyük hacim)
  // Basit ortalama (yanlış):  (10+90)/2 = 50
  // Doğru (num/den, hacim-ağırlıklı): (10+900)/(100+1000) ≈ 82.73
  it('farklı hacimli iki satırın oranı, yüzdelerin basit ortalaması değil (hacim-ağırlıklı)', () => {
    const rows = [
      makeRow({ volume: 10, theoVolume: 100 }),
      makeRow({ volume: 900, theoVolume: 1000 }),
    ]
    const def = { measures: ['upTime'], dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out[0].upTime).toBeCloseTo(((10 + 900) / (100 + 1000)) * 100, 9)
    expect(out[0].upTime).not.toBeCloseTo(50, 0) // basit ortalama olsaydı bu çıkardı
  })

  it('eşit ağırlıklı olmayan gruplarda oran satır sayısına değil hacme göre ağırlıklanır', () => {
    const rows = [
      ...Array.from({ length: 9 }, () => makeRow({ volume: 10, theoVolume: 100 })),
      makeRow({ volume: 900, theoVolume: 1000 }), // aynı %90 ama 10x büyük hacim
    ]
    const def = { measures: ['upTime'], dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out[0].upTime).toBeCloseTo(((9 * 10 + 900) / (9 * 100 + 1000)) * 100, 6)
    expect(out[0].upTime).not.toBeCloseTo(18, 0)
  })
})

describe('runReport — payda sıfır koruması', () => {
  // Kök-neden özeti bu davranışa dayanıyor: payda=0 olunca motor sessizce 0
  // döner (NaN/Infinity değil) — bu, kök-neden'in "gerçek sapma" ile "veri
  // yokluğu" durumunu ayırt edebilmesinin ön koşulu.
  it('theoVolume=0 olduğunda pct ölçü NaN/Infinity değil 0 döner', () => {
    const rows = [makeRow({ volume: 5, theoVolume: 0 })]
    const def = { measures: ['upTime'], dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out[0].upTime).toBe(0)
    expect(Number.isFinite(out[0].upTime)).toBe(true)
  })
})

describe('runReport — ham (raw) ölçü toplama', () => {
  it('varsayılan agg sum: birden çok satırda toplanır', () => {
    const rows = [makeRow({ volume: 100 }), makeRow({ volume: 250 })]
    const def = { measures: ['volume'], dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out[0].volume).toBe(350)
  })

  it('agg=avg olan ölçü (designTargetSpeed) toplanmaz, ortalanır', () => {
    const rows = [makeRow({ designTargetSpeed: 10 }), makeRow({ designTargetSpeed: 20 })]
    const def = { measures: ['designTargetSpeed'], dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out[0].designTargetSpeed).toBe(15)
  })
})

describe('runReport — gruplama (dimensions)', () => {
  it('dimension yoksa tüm satırlar tek "Total" grubunda toplanır', () => {
    const rows = [makeRow({ line: 'Line A', volume: 10 }), makeRow({ line: 'Line B', volume: 20 })]
    const def = { measures: ['volume'], dimensions: [], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out).toHaveLength(1)
    expect(out[0].volume).toBe(30)
  })

  it('kayıt yoksa (filtre her şeyi eledi) Total grubu bile oluşmaz — boş dizi döner', () => {
    const def = { measures: ['volume'], dimensions: [], filters: { lines: ['Nonexistent Line'] } }
    const { rows: out } = runReport(def, [makeRow({ line: 'Line A' })])
    expect(out).toHaveLength(0)
  })

  it('tek dimension: her farklı değer ayrı satır olur', () => {
    const rows = [
      makeRow({ line: 'Line A', volume: 10 }),
      makeRow({ line: 'Line A', volume: 5 }),
      makeRow({ line: 'Line B', volume: 20 }),
    ]
    const def = { measures: ['volume'], dimensions: ['line'], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out).toHaveLength(2)
    const byLine = Object.fromEntries(out.map((r) => [r.line, r.volume]))
    expect(byLine['Line A']).toBe(15)
    expect(byLine['Line B']).toBe(20)
  })

  it('çoklu dimension: Line×Machine kombinasyonu ayrı satır üretir, birleştirmez', () => {
    const rows = [
      makeRow({ line: 'Line A', machine: 'M1', volume: 10 }),
      makeRow({ line: 'Line A', machine: 'M2', volume: 20 }),
      makeRow({ line: 'Line B', machine: 'M1', volume: 30 }),
    ]
    const def = { measures: ['volume'], dimensions: ['line', 'machine'], filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out).toHaveLength(3)
  })
})

describe('runReport — filtreler', () => {
  it('dateFrom/dateTo aralığı iki uçta da dahildir (inclusive)', () => {
    const rows = [
      makeRow({ date: '01.01.2026', volume: 1 }),
      makeRow({ date: '15.01.2026', volume: 2 }),
      makeRow({ date: '31.01.2026', volume: 4 }),
    ]
    const def = {
      measures: ['volume'],
      dimensions: [],
      filters: { dateFrom: new Date(2026, 0, 1), dateTo: new Date(2026, 0, 31) },
    }
    const { rows: out } = runReport(def, rows)
    expect(out[0].volume).toBe(7) // üç satır da aralık içinde (uç noktalar dahil)
  })

  it('aralık dışındaki tarihler elenir', () => {
    const rows = [
      makeRow({ date: '01.01.2026', volume: 1 }),
      makeRow({ date: '01.02.2026', volume: 100 }), // aralık dışı
    ]
    const def = {
      measures: ['volume'],
      dimensions: [],
      filters: { dateFrom: new Date(2026, 0, 1), dateTo: new Date(2026, 0, 31) },
    }
    const { rows: out } = runReport(def, rows)
    expect(out[0].volume).toBe(1)
  })

  it('boş filtre dizisi ([]) "hiç kısıtlama yok" anlamına gelir', () => {
    const rows = [makeRow({ line: 'Line A' }), makeRow({ line: 'Line B' })]
    const def = { measures: ['volume'], dimensions: [], filters: { lines: [] } }
    const { rows: out } = runReport(def, rows)
    expect(out).toHaveLength(1) // her iki hat da dahil, tek Total grubu
  })

  it('lines/machines/products filtreleri AND mantığıyla birlikte uygulanır', () => {
    const rows = [
      makeRow({ line: 'Line A', machine: 'M1', product: 'P1', volume: 1 }),
      makeRow({ line: 'Line A', machine: 'M1', product: 'P2', volume: 10 }), // product uymuyor
      makeRow({ line: 'Line A', machine: 'M2', product: 'P1', volume: 100 }), // machine uymuyor
      makeRow({ line: 'Line B', machine: 'M1', product: 'P1', volume: 1000 }), // line uymuyor
    ]
    const def = {
      measures: ['volume'],
      dimensions: [],
      filters: { lines: ['Line A'], machines: ['M1'], products: ['P1'] },
    }
    const { rows: out } = runReport(def, rows)
    expect(out[0].volume).toBe(1)
  })
})

describe('runReport — tarih kırılımı (granularity) ve sıralama', () => {
  it('month granülünde aynı ay farklı günler tek satırda birleşir', () => {
    const rows = [
      makeRow({ date: '05.01.2026', volume: 10 }),
      makeRow({ date: '20.01.2026', volume: 20 }),
      makeRow({ date: '01.02.2026', volume: 100 }),
    ]
    const def = {
      measures: ['volume'],
      dimensions: ['date'],
      dateGranularity: 'month',
      filters: {},
    }
    const { rows: out } = runReport(def, rows)
    expect(out).toHaveLength(2)
    const jan = out.find((r) => r.date === '2026-01')
    expect(jan.volume).toBe(30)
  })

  it('day granülünde satırlar kronolojik sıralanır (string sırası değil)', () => {
    const rows = [
      makeRow({ date: '05.01.2026', volume: 1 }),
      makeRow({ date: '20.12.2025', volume: 2 }),
      makeRow({ date: '01.02.2026', volume: 3 }),
    ]
    const def = { measures: ['volume'], dimensions: ['date'], dateGranularity: 'day', filters: {} }
    const { rows: out } = runReport(def, rows)
    expect(out.map((r) => r.date)).toEqual(['20.12.2025', '05.01.2026', '01.02.2026'])
  })
})

describe('runReport — kolonlar', () => {
  it('dimension kolonları önce, measure kolonları sonra gelir; format/isDimension doğru işaretlenir', () => {
    const def = { measures: ['upTime'], dimensions: ['line'], filters: {} }
    const { columns } = runReport(def, [makeRow()])
    expect(columns.map((c) => c.key)).toEqual(['line', 'upTime'])
    expect(columns[0].isDimension).toBe(true)
    expect(columns[1].isDimension).toBe(false)
    expect(columns[1].format).toBe('pct')
  })
})

describe('formatValue', () => {
  it('null/undefined/NaN için "-" döner', () => {
    expect(formatValue(null, 'pct')).toBe('-')
    expect(formatValue(undefined, 'int')).toBe('-')
    expect(formatValue(NaN, 'dec')).toBe('-')
  })

  it('pct iki ondalıkla ve % işaretiyle biçimlenir', () => {
    expect(formatValue(45.678, 'pct')).toBe('45.68 %')
  })

  it('int yuvarlanır ve binlik ayraç kullanır', () => {
    expect(formatValue(1234.6, 'int')).toBe('1,235')
  })
})
