// Denetim formları — doğrulama / skor / koşul katmanı.
// form şeması + cevap haritası -> { valid, errors } | { earned, max, pct } | ...
//
// reportEngine.js ile aynı sözleşme: saf fonksiyon, Vue importu yok, tek
// bağımlılığı soru tipi kataloğu. Böylece formüller (skor payda/pay mantığı)
// UI'dan bağımsız test edilebilir.

import { QUESTION_TYPES } from '../data/questionTypes.js'

// Bayraklı bir sorunun altında açılan takip alanlarının cevap anahtarları.
// Ayrı bir soru nesnesi üretmek yerine anahtar türetiyoruz: şablonlar sade
// kalıyor, motor da bu anahtarları tanıyor.
export const noteKeyOf = (qKey) => `${qKey}__note`
export const photoKeyOf = (qKey) => `${qKey}__photo`

/** Tüm bölümlerin sorularını tek düz diziye açar (bölüm sırası korunur). */
export function flatQuestions(form) {
  return (form?.sections || []).flatMap((s) => s.questions || [])
}

/** Cevabı olan sorular — 'info' gibi answerless tipler dışarıda kalır. */
export function answerableQuestions(form) {
  return flatQuestions(form).filter((q) => !QUESTION_TYPES[q.type]?.answerless)
}

/** Şemadan boş cevap haritası üretir (her tipin blank()'i). */
export function blankAnswers(form) {
  const out = {}
  for (const q of flatQuestions(form)) {
    const type = QUESTION_TYPES[q.type]
    if (!type || type.answerless) continue
    out[q.key] = type.blank(q)
    // Takip alanları her zaman haritada durur; sadece görünürlükleri koşullu.
    if (q.flagWhen) {
      out[noteKeyOf(q.key)] = ''
      out[photoKeyOf(q.key)] = []
    }
  }
  return out
}

export function isAnswered(question, value) {
  const type = QUESTION_TYPES[question.type]
  if (!type || type.answerless) return true
  return !type.isEmpty(value)
}

/**
 * Riskli cevap mı? flagWhen listesindeki değerlerden biri seçilmişse evet.
 * Tek koşul kuralımız bu — genel bir showIf DSL'i bilinçli olarak yok.
 */
export function isFlagged(question, value) {
  if (!question.flagWhen?.length) return false
  if (Array.isArray(value)) return value.some((v) => question.flagWhen.includes(v))
  return question.flagWhen.includes(value)
}

/** Şu an açık olan takip blokları (bayrak tetiklenmiş sorular). */
export function activeFollowUps(form, answers = {}) {
  return flatQuestions(form).filter((q) => isFlagged(q, answers[q.key]))
}

export function countFlags(form, answers = {}) {
  return activeFollowUps(form, answers).length
}

/**
 * @param {Object} form   form şeması (formTemplates.js)
 * @param {Object} answers cevap haritası { [questionKey]: value }
 * @returns {{ valid:boolean, errors:Object, missing:number }}
 *          errors: { [cevapAnahtarı]: i18n mesaj anahtarı }
 */
export function validateForm(form, answers = {}) {
  const errors = {}

  for (const q of answerableQuestions(form)) {
    const type = QUESTION_TYPES[q.type]
    if (!type) continue
    const value = answers[q.key]
    const empty = type.isEmpty(value)

    if (q.required && empty) {
      errors[q.key] = 'frm.err.required'
      continue
    }

    // Tolerans kontrolü: min/max verilmiş sayısal alan aralık dışındaysa uyar.
    // Aralık dışı bir ölçüm (ör. hava basıncı) formu geçersiz kılar; operatör
    // ya değeri düzeltir ya da gerçekten arıza vardır.
    if (!empty && (q.type === 'number' || q.type === 'decimal')) {
      const n = Number(value)
      if ((q.min != null && n < q.min) || (q.max != null && n > q.max)) {
        errors[q.key] = 'frm.err.range'
      }
    }

    // Bayrak tetiklendiyse açıklama + fotoğraf zorunlu.
    if (isFlagged(q, value)) {
      if (QUESTION_TYPES.textarea.isEmpty(answers[noteKeyOf(q.key)])) {
        errors[noteKeyOf(q.key)] = 'frm.err.required'
      }
      if (QUESTION_TYPES.photo.isEmpty(answers[photoKeyOf(q.key)])) {
        errors[photoKeyOf(q.key)] = 'frm.err.photoRequired'
      }
    }
  }

  const missing = Object.keys(errors).length
  return { valid: missing === 0, errors, missing }
}

/**
 * Ağırlıklı skor. İki kural kritik:
 *  - N/A cevabı (type.score -> null) paydadan tamamen düşer.
 *  - Cevaplanmamış soru da paydadan düşer; aksi hâlde yarım dolu bir form
 *    haksız yere düşük skor gösterirdi.
 * Payda 0 ise 0 döner (NaN/Infinity değil) — reportEngine.js:108 ile aynı kural.
 */
export function scoreForm(form, answers = {}) {
  const sections = []
  let earned = 0
  let max = 0

  for (const s of form?.sections || []) {
    let sEarned = 0
    let sMax = 0
    for (const q of s.questions || []) {
      const type = QUESTION_TYPES[q.type]
      if (!type?.scorable || q.scored === false) continue
      const value = answers[q.key]
      if (type.isEmpty(value)) continue
      const sc = type.score(q, value)
      if (!sc) continue
      sEarned += sc.earned
      sMax += sc.max
    }
    sections.push({
      key: s.key,
      titleKey: s.titleKey,
      earned: sEarned,
      max: sMax,
      pct: sMax === 0 ? 0 : (sEarned / sMax) * 100,
    })
    earned += sEarned
    max += sMax
  }

  return { sections, earned, max, pct: max === 0 ? 0 : (earned / max) * 100 }
}

/**
 * İlerleme: cevaplanan / toplam. Açık takip blokları da sayıya dahildir —
 * "Uygun Değil" işaretleyen kullanıcı, yüzdenin geri düşmesini görmeli.
 */
export function progress(form, answers = {}) {
  let answered = 0
  let total = 0

  for (const q of answerableQuestions(form)) {
    total++
    if (isAnswered(q, answers[q.key])) answered++
    if (!isFlagged(q, answers[q.key])) continue
    total += 2
    if (!QUESTION_TYPES.textarea.isEmpty(answers[noteKeyOf(q.key)])) answered++
    if (!QUESTION_TYPES.photo.isEmpty(answers[photoKeyOf(q.key)])) answered++
  }

  return { answered, total, pct: total === 0 ? 0 : (answered / total) * 100 }
}

/**
 * Cevabı okunur metne çevirir (tablo / PDF). i18n'e bağımlı olmamak için
 * t dışarıdan enjekte edilir — motor saf kalır.
 */
export function formatAnswer(question, value, t = (k) => k) {
  const type = QUESTION_TYPES[question.type]
  if (!type || type.answerless) return ''
  if (type.isEmpty(value)) return '-'

  switch (question.type) {
    case 'multiselect':
      return value.map((v) => t(labelOfOption(question, v))).join(', ')
    case 'yesno':
    case 'compliance':
    case 'radio':
    case 'select':
    case 'selectbutton':
      return t(labelOfOption(question, value))
    case 'checkbox':
    case 'switch':
      return t(value ? 'opt.yes' : 'opt.no')
    case 'date':
      return formatDate(value)
    case 'time':
      return formatTime(value)
    case 'datetime':
      return `${formatDate(value)} ${formatTime(value)}`
    case 'photo':
      return t('frm.photoCount', value.length)
    case 'signature':
      return t('frm.signed')
    default:
      return String(value)
  }
}

function labelOfOption(question, value) {
  const opt = (question.options || []).find((o) => o.value === value)
  return opt?.labelKey || String(value)
}

// Shell'in tarih formatı 'dd.mm.yyyy' (reportEngine.parseDate ile simetrik).
function formatDate(v) {
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function formatTime(v) {
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}
