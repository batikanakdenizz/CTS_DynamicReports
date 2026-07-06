// Dummy veri üreteci — Line Daily KPI raporu için.
// Formüller HowWorksReports.md (E2) bölümünden, gerçek verilerle doğrulanmış hâlleriyle
// uygulanmıştır; böylece UpTime% + RateLoss% + RejectLoss% + PlannedDT% + UnplannedDT% = %100.

const LINES = ['Link-up 38', 'Link-Up-37']
const DESIGN_SPEED = 8400 // adet/dk

// Seed'li PRNG — deterministik dummy data (her yüklemede/HMR'de aynı sonuç üretir).
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260706)

function rand(min, max) {
  return rng() * (max - min) + min
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1))
}

// tarih üret (bugünden geriye doğru n gün) — veri her zaman "bugün"de biter
function buildDates(days) {
  const out = []
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() - i)
    out.push(d)
  }
  return out
}

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function makeRow(line, date) {
  const scheduled = 1440
  const calendar = 1440
  const theoVolume = Math.round(DESIGN_SPEED * scheduled * rand(0.98, 1.05))

  // Beş kova — toplamı 1.0 olacak şekilde
  const uptimeFrac = rand(0.2, 0.75)
  const rejectFrac = rand(0.03, 0.06)
  const plannedFrac = rng() < 0.6 ? 0 : rand(0.0, 0.03)
  const unplannedFrac = rand(0.08, 0.18)
  const rateFrac = Math.max(0, 1 - uptimeFrac - rejectFrac - plannedFrac - unplannedFrac)

  const volume = Math.round(uptimeFrac * theoVolume)
  const reject = Math.round(rejectFrac * theoVolume)
  const targetVolume = Math.round(theoVolume * 0.955)

  const plannedStopDur = +(plannedFrac * theoVolume / DESIGN_SPEED).toFixed(2)
  const unplannedStopDur = +(unplannedFrac * theoVolume / DESIGN_SPEED).toFixed(2)

  const runningDuration = +(volume / DESIGN_SPEED).toFixed(2)
  const lowSpeedDuration = +(rateFrac * scheduled).toFixed(2)
  const totalRuntime = +(runningDuration + lowSpeedDuration).toFixed(2)

  const numberOfStops = randInt(12, 45)
  const numberOfShortStops = randInt(4, numberOfStops - 2)
  const breakdown = randInt(0, 3)
  const processStops = randInt(0, 6)
  const noDefCode = randInt(0, 10)
  const plannedStops = plannedFrac > 0 ? randInt(1, 4) : 0

  const mtbf = +(totalRuntime / numberOfStops).toFixed(2)

  return {
    line,
    date: fmtDate(date),
    calendarTime: calendar,
    scheduledTime: scheduled,
    volume,
    reject,
    theoVolume,
    targetVolume,
    upTime: +(uptimeFrac * 100).toFixed(2),
    rateLoss: +(rateFrac * 100).toFixed(2),
    rejectLoss: +(rejectFrac * 100).toFixed(2),
    plannedDowntimeLoss: +(plannedFrac * 100).toFixed(2),
    unplannedDowntimeLoss: +(unplannedFrac * 100).toFixed(2),
    numberOfStops,
    numberOfShortStops,
    breakdown,
    processStops,
    noDefCode,
    plannedStops,
    mtbf,
    designTargetSpeed: DESIGN_SPEED,
    plannedStopDuration: plannedStopDur,
    unplannedStopDuration: unplannedStopDur,
    noDataFlowDuration: +rand(0, 30).toFixed(2),
    noDemandDuration: +rand(0, 40).toFixed(2),
    runningDuration,
    lowSpeedDuration,
    totalRuntime
  }
}

export function generateRows(days = 30) {
  const dates = buildDates(days)
  const rows = []
  for (const date of dates) {
    for (const line of LINES) {
      rows.push(makeRow(line, date))
    }
  }
  return rows
}

// 28 kolonun ekrandaki sırayla tanımı
export const COLUMNS = [
  { field: 'line', header: 'Line', type: 'text' },
  { field: 'date', header: 'Date', type: 'text' },
  { field: 'calendarTime', header: 'Calendar Time', type: 'num' },
  { field: 'scheduledTime', header: 'Scheduled Time', type: 'num' },
  { field: 'volume', header: 'Volume', type: 'num' },
  { field: 'reject', header: 'Reject', type: 'num' },
  { field: 'theoVolume', header: 'Theo. volume', type: 'num' },
  { field: 'targetVolume', header: 'Target Volume', type: 'num' },
  { field: 'upTime', header: 'Up Time %', type: 'pct' },
  { field: 'rateLoss', header: 'Rate Loss %', type: 'pct' },
  { field: 'rejectLoss', header: 'Reject Loss %', type: 'pct' },
  { field: 'plannedDowntimeLoss', header: 'Planned Downtime Loss %', type: 'pct' },
  { field: 'unplannedDowntimeLoss', header: 'Unplanned Downtime Loss %', type: 'pct' },
  { field: 'numberOfStops', header: 'Number of Stops', type: 'num' },
  { field: 'numberOfShortStops', header: 'Number of Short Stops', type: 'num' },
  { field: 'breakdown', header: 'Breakdown', type: 'num' },
  { field: 'processStops', header: 'Process Stops', type: 'num' },
  { field: 'noDefCode', header: 'No Definition Stoppage Code', type: 'num' },
  { field: 'plannedStops', header: 'Planned Stops', type: 'num' },
  { field: 'mtbf', header: 'MTBF', type: 'num' },
  { field: 'designTargetSpeed', header: 'Design Target Speed', type: 'num' },
  { field: 'plannedStopDuration', header: 'Planned Stop Duration', type: 'num' },
  { field: 'unplannedStopDuration', header: 'Unplanned Stop Duration', type: 'num' },
  { field: 'noDataFlowDuration', header: 'No Data Flow Duration', type: 'num' },
  { field: 'noDemandDuration', header: 'No Demand Duration', type: 'num' },
  { field: 'runningDuration', header: 'Running Duration', type: 'num' },
  { field: 'lowSpeedDuration', header: 'Low Speed Duration', type: 'num' },
  { field: 'totalRuntime', header: 'Total Runtime', type: 'num' }
]

export const LINE_OPTIONS = LINES.map((l) => ({ label: l, value: l }))
