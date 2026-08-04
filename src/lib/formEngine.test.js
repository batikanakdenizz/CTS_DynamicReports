// formEngine birim testleri.
//
// Neden burada: formların riski render'da değil FORMÜLLERDE. "N/A paydadan
// düşer", "cevapsız soru skoru cezalandırmaz", "bayrak açılınca takip alanları
// zorunlulaşır" kuralları sessizce bozulursa denetim skoru yanlış çıkar ve
// bunu kimse fark etmez. reportEngine.test.js ile aynı yaklaşım: mock yok,
// gerçek questionTypes.js / formTemplates.js kullanılır.

import { describe, it, expect } from 'vitest'
import {
  flatQuestions,
  answerableQuestions,
  blankAnswers,
  isAnswered,
  isFlagged,
  activeFollowUps,
  countFlags,
  validateForm,
  scoreForm,
  progress,
  formatAnswer,
  noteKeyOf,
  photoKeyOf,
} from './formEngine.js'
import { QUESTION_TYPES, QUESTION_TYPE_GROUPS } from '../data/questionTypes.js'
import { FORM_TEMPLATES, FORM_MAP } from '../data/formTemplates.js'

// Tek bölümlük mini form fabrikası — her test sadece ilgilendiği soruyu verir.
function makeForm(questions, extra = {}) {
  return {
    key: 'test-form',
    titleKey: 'test',
    scored: true,
    sections: [{ key: 's1', titleKey: 's1', questions }],
    ...extra,
  }
}

const compliance = (over = {}) => ({
  key: 'c1',
  type: 'compliance',
  labelKey: 'c1',
  required: true,
  flagWhen: ['ng'],
  ...over,
})

describe('formEngine — şema gezinme', () => {
  it('flatQuestions tüm bölümlerin sorularını sırayla düzleştirir', () => {
    const form = {
      sections: [
        { key: 'a', questions: [{ key: 'q1', type: 'text' }] },
        { key: 'b', questions: [{ key: 'q2', type: 'text' }] },
      ],
    }
    expect(flatQuestions(form).map((q) => q.key)).toEqual(['q1', 'q2'])
  })

  it('answerableQuestions info tipini dışarıda bırakır', () => {
    const form = makeForm([
      { key: 'i', type: 'info', labelKey: 'i' },
      { key: 't', type: 'text', labelKey: 't' },
    ])
    expect(answerableQuestions(form).map((q) => q.key)).toEqual(['t'])
  })

  it('flatQuestions boş/eksik şemada patlamaz', () => {
    expect(flatQuestions(null)).toEqual([])
    expect(flatQuestions({})).toEqual([])
    expect(flatQuestions({ sections: [{ key: 'a' }] })).toEqual([])
  })
})

describe('formEngine — blankAnswers', () => {
  it('her tipin kendi boş değerini üretir', () => {
    const form = makeForm([
      { key: 'a', type: 'text', labelKey: 'a' },
      { key: 'b', type: 'multiselect', labelKey: 'b' },
      { key: 'c', type: 'checkbox', labelKey: 'c' },
      { key: 'd', type: 'number', labelKey: 'd' },
    ])
    expect(blankAnswers(form)).toEqual({ a: '', b: [], c: false, d: null })
  })

  it('slider/knob min değerinden başlar', () => {
    const form = makeForm([
      { key: 's', type: 'slider', labelKey: 's', min: 20, max: 80 },
      { key: 'k', type: 'knob', labelKey: 'k', min: 1, max: 5 },
    ])
    const blank = blankAnswers(form)
    expect(blank.s).toBe(20)
    expect(blank.k).toBe(1)
  })

  it('info tipi için cevap anahtarı üretmez', () => {
    const form = makeForm([{ key: 'i', type: 'info', labelKey: 'i' }])
    expect(blankAnswers(form)).toEqual({})
  })

  it('flagWhen olan soruya takip alanı anahtarlarını da ekler', () => {
    const blank = blankAnswers(makeForm([compliance()]))
    expect(blank[noteKeyOf('c1')]).toBe('')
    expect(blank[photoKeyOf('c1')]).toEqual([])
  })
})

describe('formEngine — isAnswered', () => {
  it('boş metin cevap sayılmaz, dolu metin sayılır', () => {
    const q = { key: 'a', type: 'text' }
    expect(isAnswered(q, '   ')).toBe(false)
    expect(isAnswered(q, 'x')).toBe(true)
  })

  it('rating 0 "seçilmedi" demektir', () => {
    const q = { key: 'r', type: 'rating', max: 5 }
    expect(isAnswered(q, 0)).toBe(false)
    expect(isAnswered(q, 1)).toBe(true)
  })

  it('slider 0 geçerli bir cevaptır (rating ile farkı bu)', () => {
    expect(isAnswered({ key: 's', type: 'slider' }, 0)).toBe(true)
  })

  it('switch her zaman cevaplanmış sayılır', () => {
    expect(isAnswered({ key: 'w', type: 'switch' }, false)).toBe(true)
  })

  it('checkbox sadece işaretliyse cevaplanmış sayılır', () => {
    expect(isAnswered({ key: 'c', type: 'checkbox' }, false)).toBe(false)
    expect(isAnswered({ key: 'c', type: 'checkbox' }, true)).toBe(true)
  })

  it('info tipi daima cevaplanmış sayılır', () => {
    expect(isAnswered({ key: 'i', type: 'info' }, null)).toBe(true)
  })
})

describe('formEngine — bayrak (koşullu blok)', () => {
  it('flagWhen eşleşince bayrak kalkar', () => {
    const q = compliance()
    expect(isFlagged(q, 'ng')).toBe(true)
    expect(isFlagged(q, 'ok')).toBe(false)
    expect(isFlagged(q, 'na')).toBe(false)
  })

  it('flagWhen tanımsızsa asla bayrak kalkmaz', () => {
    expect(isFlagged({ key: 'a', type: 'compliance' }, 'ng')).toBe(false)
  })

  it('çoklu seçimde listedeki tek bir değer bile bayrağı kaldırır', () => {
    const q = { key: 'm', type: 'multiselect', flagWhen: ['breakdown'] }
    expect(isFlagged(q, ['cleaning', 'breakdown'])).toBe(true)
    expect(isFlagged(q, ['cleaning'])).toBe(false)
  })

  it('activeFollowUps ve countFlags açık blokları sayar', () => {
    const form = makeForm([compliance(), compliance({ key: 'c2' })])
    const answers = { c1: 'ng', c2: 'ok' }
    expect(activeFollowUps(form, answers).map((q) => q.key)).toEqual(['c1'])
    expect(countFlags(form, answers)).toBe(1)
  })
})

describe('formEngine — validateForm', () => {
  it('boş zorunlu alan hata verir', () => {
    const form = makeForm([{ key: 'a', type: 'text', labelKey: 'a', required: true }])
    const out = validateForm(form, { a: '' })
    expect(out.valid).toBe(false)
    expect(out.errors.a).toBe('frm.err.required')
    expect(out.missing).toBe(1)
  })

  it('zorunlu olmayan boş alan hata vermez', () => {
    const form = makeForm([{ key: 'a', type: 'text', labelKey: 'a' }])
    expect(validateForm(form, { a: '' }).valid).toBe(true)
  })

  it('tolerans dışı sayısal değer hata verir, içi vermez', () => {
    const form = makeForm([
      { key: 'p', type: 'decimal', labelKey: 'p', required: true, min: 5.5, max: 7.5 },
    ])
    expect(validateForm(form, { p: 4 }).errors.p).toBe('frm.err.range')
    expect(validateForm(form, { p: 9 }).errors.p).toBe('frm.err.range')
    expect(validateForm(form, { p: 6.2 }).valid).toBe(true)
  })

  it('tolerans sadece sayısal tiplerde çalışır — slider min/max ölçek demektir', () => {
    const form = makeForm([{ key: 's', type: 'slider', labelKey: 's', min: 0, max: 5 }])
    expect(validateForm(form, { s: 5 }).valid).toBe(true)
  })

  it('bayrak açıldığında açıklama ve fotoğraf zorunlu olur', () => {
    const form = makeForm([compliance()])
    const out = validateForm(form, { c1: 'ng' })
    expect(out.valid).toBe(false)
    expect(out.errors[noteKeyOf('c1')]).toBe('frm.err.required')
    expect(out.errors[photoKeyOf('c1')]).toBe('frm.err.photoRequired')
  })

  it('bayrak açıkken takip alanları doluysa form geçerlidir', () => {
    const form = makeForm([compliance()])
    const out = validateForm(form, {
      c1: 'ng',
      [noteKeyOf('c1')]: 'Baret takmıyordu',
      [photoKeyOf('c1')]: ['data:image/png;base64,xxx'],
    })
    expect(out.valid).toBe(true)
  })

  it('bayrak kapalıyken takip alanları boş olsa da form geçerlidir', () => {
    const form = makeForm([compliance()])
    expect(validateForm(form, { c1: 'ok' }).valid).toBe(true)
  })

  it('işaretlenmemiş zorunlu onay kutusu hata verir', () => {
    const form = makeForm([{ key: 'c', type: 'checkbox', labelKey: 'c', required: true }])
    expect(validateForm(form, { c: false }).valid).toBe(false)
    expect(validateForm(form, { c: true }).valid).toBe(true)
  })
})

describe('formEngine — scoreForm', () => {
  it('N/A cevabı paydadan tamamen düşer', () => {
    const form = makeForm([compliance({ key: 'a' }), compliance({ key: 'b' })])
    const out = scoreForm(form, { a: 'ok', b: 'na' })
    expect(out.earned).toBe(1)
    expect(out.max).toBe(1) // b hiç sayılmadı
    expect(out.pct).toBeCloseTo(100, 9)
  })

  it('cevaplanmamış soru paydadan düşer', () => {
    const form = makeForm([compliance({ key: 'a' }), compliance({ key: 'b' })])
    const out = scoreForm(form, { a: 'ok' })
    expect(out.max).toBe(1)
    expect(out.pct).toBeCloseTo(100, 9)
  })

  it('ağırlık hem paya hem paydaya uygulanır', () => {
    const form = makeForm([
      compliance({ key: 'a', weight: 3 }),
      compliance({ key: 'b', weight: 1 }),
    ])
    const out = scoreForm(form, { a: 'ng', b: 'ok' })
    expect(out.earned).toBe(1)
    expect(out.max).toBe(4)
    expect(out.pct).toBeCloseTo(25, 9)
  })

  it('ölçekli soruda değerin kendisi puandır', () => {
    const form = makeForm([{ key: 'r', type: 'rating', labelKey: 'r', max: 5, weight: 2 }])
    const out = scoreForm(form, { r: 4 })
    expect(out.earned).toBe(8)
    expect(out.max).toBe(10)
    expect(out.pct).toBeCloseTo(80, 9)
  })

  it('puanlanamaz tipler skora hiç girmez', () => {
    const form = makeForm([{ key: 't', type: 'text', labelKey: 't' }, compliance({ key: 'a' })])
    const out = scoreForm(form, { t: 'bir şey', a: 'ok' })
    expect(out.max).toBe(1)
  })

  it('scored:false olan soru skora girmez', () => {
    const form = makeForm([compliance({ key: 'a' }), compliance({ key: 'b', scored: false })])
    expect(scoreForm(form, { a: 'ok', b: 'ng' }).max).toBe(1)
  })

  it('payda sıfırken 0 döner — NaN değil', () => {
    const form = makeForm([{ key: 't', type: 'text', labelKey: 't' }])
    const out = scoreForm(form, { t: 'x' })
    expect(out.max).toBe(0)
    expect(out.pct).toBe(0)
    expect(Number.isNaN(out.pct)).toBe(false)
  })

  it('bölüm skorları ayrı ayrı hesaplanır ve toplamı genel skoru verir', () => {
    const form = {
      scored: true,
      sections: [
        { key: 'a', questions: [compliance({ key: 'a1' }), compliance({ key: 'a2' })] },
        { key: 'b', questions: [compliance({ key: 'b1', weight: 2 })] },
      ],
    }
    const out = scoreForm(form, { a1: 'ok', a2: 'ng', b1: 'ok' })
    expect(out.sections.map((s) => s.key)).toEqual(['a', 'b'])
    expect(out.sections[0]).toMatchObject({ earned: 1, max: 2 })
    expect(out.sections[1]).toMatchObject({ earned: 2, max: 2 })
    expect(out.earned).toBe(3)
    expect(out.max).toBe(4)
    expect(out.pct).toBeCloseTo(75, 9)
  })
})

describe('formEngine — progress', () => {
  it('cevaplanan / toplam oranını verir', () => {
    const form = makeForm([
      { key: 'a', type: 'text', labelKey: 'a' },
      { key: 'b', type: 'text', labelKey: 'b' },
    ])
    expect(progress(form, { a: 'x', b: '' })).toMatchObject({ answered: 1, total: 2, pct: 50 })
  })

  it('info tipi sayaca girmez', () => {
    const form = makeForm([
      { key: 'i', type: 'info', labelKey: 'i' },
      { key: 'a', type: 'text', labelKey: 'a' },
    ])
    expect(progress(form, { a: 'x' })).toMatchObject({ answered: 1, total: 1 })
  })

  it('bayrak açılınca toplam 2 artar (açıklama + foto) ve yüzde düşer', () => {
    const form = makeForm([compliance()])
    const before = progress(form, { c1: 'ok' })
    const after = progress(form, { c1: 'ng' })
    expect(before).toMatchObject({ answered: 1, total: 1, pct: 100 })
    expect(after).toMatchObject({ answered: 1, total: 3 })
    expect(after.pct).toBeLessThan(before.pct)
  })

  it('boş formda 0 döner — NaN değil', () => {
    expect(progress(makeForm([]), {})).toMatchObject({ answered: 0, total: 0, pct: 0 })
  })
})

describe('formEngine — formatAnswer', () => {
  const t = (k) => k

  it('boş cevabı tire ile gösterir', () => {
    expect(formatAnswer({ key: 'a', type: 'text' }, '', t)).toBe('-')
  })

  it('seçim tipinde seçeneğin etiket anahtarını döndürür', () => {
    const q = { key: 'a', type: 'select', options: [{ value: 'x', labelKey: 'opt.x' }] }
    expect(formatAnswer(q, 'x', t)).toBe('opt.x')
  })

  it('çoklu seçimi virgülle birleştirir', () => {
    const q = {
      key: 'a',
      type: 'multiselect',
      options: [
        { value: 'x', labelKey: 'X' },
        { value: 'y', labelKey: 'Y' },
      ],
    }
    expect(formatAnswer(q, ['x', 'y'], t)).toBe('X, Y')
  })

  it('tarihi dd.mm.yyyy formatında verir (shell formatıyla aynı)', () => {
    expect(formatAnswer({ key: 'd', type: 'date' }, new Date(2026, 0, 9), t)).toBe('09.01.2026')
  })

  it('saati HH:mm formatında verir', () => {
    expect(formatAnswer({ key: 'h', type: 'time' }, new Date(2026, 0, 9, 7, 5), t)).toBe('07:05')
  })

  it('info tipi için boş string döner', () => {
    expect(formatAnswer({ key: 'i', type: 'info' }, null, t)).toBe('')
  })
})

describe('formTemplates — şema bütünlüğü', () => {
  it('4 şablon tanımlı ve FORM_MAP ile tutarlı', () => {
    expect(FORM_TEMPLATES).toHaveLength(4)
    expect(Object.keys(FORM_MAP).sort()).toEqual(
      ['5s-audit', 'near-miss', 'ppe-general', 'shift-handover'].sort()
    )
  })

  it.each(FORM_TEMPLATES.map((f) => [f.key, f]))(
    "%s: her sorunun tipi registry'de tanımlı",
    (_key, form) => {
      for (const q of flatQuestions(form)) {
        expect(QUESTION_TYPES[q.type], `bilinmeyen tip: ${q.type} (${q.key})`).toBeDefined()
      }
    }
  )

  it.each(FORM_TEMPLATES.map((f) => [f.key, f]))(
    '%s: soru anahtarları form içinde benzersiz',
    (_key, form) => {
      const keys = flatQuestions(form).map((q) => q.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  )

  it.each(FORM_TEMPLATES.map((f) => [f.key, f]))(
    '%s: seçim tipli her sorunun options listesi var',
    (_key, form) => {
      const needsOptions = ['radio', 'select', 'selectbutton', 'multiselect', 'yesno', 'compliance']
      for (const q of flatQuestions(form)) {
        if (!needsOptions.includes(q.type)) continue
        expect(q.options?.length, `options eksik: ${q.key}`).toBeGreaterThan(0)
      }
    }
  )

  it.each(FORM_TEMPLATES.map((f) => [f.key, f]))(
    '%s: boş cevaplarla doğrulama zorunlu alanları yakalar',
    (_key, form) => {
      const blank = blankAnswers(form)
      const out = validateForm(form, blank)
      // Slider/switch gibi "boş hâli olmayan" tipler zorunlu olsa da başlangıçta
      // cevaplanmış sayılır — beklenen sayıyı bu yüzden isAnswered'dan türetiyoruz.
      const expected = answerableQuestions(form).filter(
        (q) => q.required && !isAnswered(q, blank[q.key])
      ).length
      expect(out.valid).toBe(false)
      expect(out.missing).toBe(expected)
    }
  )

  // Regresyon: 5S formu başlangıçta slider kullanıyordu. Slider'ın "cevapsız"
  // hâli olmadığı için dokunulmamış sorular paydaya 0 puanla giriyor ve boş
  // form "Skor: %18" gösteriyordu. Skorlu şablonlar bu tuzağa düşmemeli.
  it.each(FORM_TEMPLATES.filter((f) => f.scored).map((f) => [f.key, f]))(
    '%s: boş formun skoru 0/0 — hayalet skor üretmez',
    (_key, form) => {
      const out = scoreForm(form, blankAnswers(form))
      expect(out.max).toBe(0)
      expect(out.pct).toBe(0)
    }
  )

  it('her soru tipi en az bir şablonda kullanılmış (galeri = canlı kapsam)', () => {
    const used = new Set(FORM_TEMPLATES.flatMap((f) => flatQuestions(f).map((q) => q.type)))
    const all = Object.keys(QUESTION_TYPES)
    expect([...all].filter((t) => !used.has(t))).toEqual([])
  })

  it("galeri grupları registry'deki tüm tipleri kapsar", () => {
    const grouped = QUESTION_TYPE_GROUPS.flatMap((g) => g.types.map((t) => t.key))
    expect(grouped.sort()).toEqual(Object.keys(QUESTION_TYPES).sort())
  })
})
