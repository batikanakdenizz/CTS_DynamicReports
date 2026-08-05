// Yetki ve kayıt şeması testleri.
//
// Neden burada: bu kurallar sessizce bozulduğunda kimse fark etmez —
// operatör başkasının denetimini görür, ya da silinmemesi gereken bir kayıt
// gider. Saf fonksiyon oldukları için tarayıcısız test edilebiliyorlar.
//
// formEngine.test.js konvansiyonu: Türkçe test adları, mock yok.

import { describe, it, expect } from 'vitest'
import { isOwner, canView, canVoid, canDelete, visibleTo } from './formPolicy.js'
import { ROLES } from './currentUser.js'
import { normalizeRecord, makeRecord, markVoid, STATUS, SYNC } from './formRecord.js'

const operator = { id: 'u1', name: 'Operatör', roles: [ROLES.OPERATOR] }
const supervisor = { id: 'u2', name: 'Amir', roles: [ROLES.SUPERVISOR], lines: ['Link-up 38'] }
const admin = { id: 'u3', name: 'Yönetici', roles: [ROLES.ADMIN] }

const rec = (over = {}) => ({
  id: 'r1',
  formKey: 'ppe-general',
  createdBy: { id: 'u1', name: 'Operatör' },
  answers: {},
  status: STATUS.ACTIVE,
  ...over,
})

describe('formPolicy — sahiplik', () => {
  it('kaydı dolduran kişi sahibidir', () => {
    expect(isOwner(operator, rec())).toBe(true)
  })

  it('başkasının kaydının sahibi değildir', () => {
    expect(isOwner(supervisor, rec())).toBe(false)
  })

  it('kimliksiz eski kayıt kimsenin sayılmaz', () => {
    // v1 kayıtlarında createdBy.id null; null === null tuzağına düşmemeli.
    const legacy = rec({ createdBy: { id: null, name: 'Operatör' } })
    expect(isOwner({ id: null, name: 'x', roles: [] }, legacy)).toBe(false)
  })
})

describe('formPolicy — canView', () => {
  it('operatör sadece kendi kaydını görür', () => {
    expect(canView(operator, rec())).toBe(true)
    expect(canView(operator, rec({ createdBy: { id: 'u9', name: 'Başkası' } }))).toBe(false)
  })

  it('vardiya amiri kendi hattındaki kaydı görür, başka hattı görmez', () => {
    const own = rec({ createdBy: { id: 'u9' }, answers: { line: 'Link-up 38' } })
    const other = rec({ createdBy: { id: 'u9' }, answers: { line: 'Link-Up-37' } })
    expect(canView(supervisor, own)).toBe(true)
    expect(canView(supervisor, other)).toBe(false)
  })

  it('hat bilgisi olmayan kayıt vardiya amirine açıktır', () => {
    // 5S alan bazlı; hat sorusu yok. Görünmezse denetim kaybolur.
    expect(canView(supervisor, rec({ createdBy: { id: 'u9' }, answers: {} }))).toBe(true)
  })

  it('yönetici her kaydı görür', () => {
    expect(canView(admin, rec({ createdBy: { id: 'u9' }, answers: { line: 'X' } }))).toBe(true)
  })

  it('oturum yoksa hiçbir kayıt görünmez', () => {
    expect(canView(null, rec())).toBe(false)
  })

  it('visibleTo listeyi süzer', () => {
    const list = [rec({ id: 'a' }), rec({ id: 'b', createdBy: { id: 'u9' } })]
    expect(visibleTo(operator, list).map((r) => r.id)).toEqual(['a'])
  })
})

describe('formPolicy — canVoid', () => {
  it('operatör kendi kaydını iptal edebilir, başkasınınkini edemez', () => {
    expect(canVoid(operator, rec())).toBe(true)
    expect(canVoid(operator, rec({ createdBy: { id: 'u9' } }))).toBe(false)
  })

  it('vardiya amiri görebildiği kaydı iptal edebilir', () => {
    const r = rec({ createdBy: { id: 'u9' }, answers: { line: 'Link-up 38' } })
    expect(canVoid(supervisor, r)).toBe(true)
  })

  it('zaten iptal edilmiş kayıt tekrar iptal edilemez', () => {
    expect(canVoid(admin, rec({ status: STATUS.VOID }))).toBe(false)
  })
})

describe('formPolicy — canDelete', () => {
  it('kalıcı silme yalnızca yöneticide', () => {
    expect(canDelete(admin, rec())).toBe(true)
    expect(canDelete(supervisor, rec())).toBe(false)
    expect(canDelete(operator, rec())).toBe(false)
  })

  it('yönetici iptal edilmiş kaydı da kalıcı silebilir', () => {
    expect(canDelete(admin, rec({ status: STATUS.VOID }))).toBe(true)
  })
})

describe('formRecord — normalizeRecord (v1 -> v2 göçü)', () => {
  const v1 = {
    id: 'old1',
    formKey: 'near-miss',
    titleKey: 'form.nm.title',
    savedAt: '2026-07-01T10:00:00.000Z',
    filledBy: 'Ahmet Yılmaz',
    answers: { a: 1 },
    score: null,
    flagCount: 2,
  }

  it('eski kaydı kırmadan yeni alanlarla tamamlar', () => {
    const out = normalizeRecord(v1)
    expect(out.createdAt).toBe(v1.savedAt)
    expect(out.createdBy).toEqual({ id: null, name: 'Ahmet Yılmaz' })
    expect(out.status).toBe(STATUS.ACTIVE)
    expect(out.syncState).toBe(SYNC.LOCAL)
    expect(out.answers).toEqual({ a: 1 })
    expect(out.flagCount).toBe(2)
  })

  it('mevcut v2 alanlarının üzerine yazmaz', () => {
    const out = normalizeRecord({ ...v1, status: STATUS.VOID, createdBy: { id: 'u5', name: 'X' } })
    expect(out.status).toBe(STATUS.VOID)
    expect(out.createdBy.id).toBe('u5')
  })

  it('bozuk girdide null döner', () => {
    expect(normalizeRecord(null)).toBeNull()
    expect(normalizeRecord('metin')).toBeNull()
  })

  it('normalize edilmiş eski kayıt operatöre görünmez (kimlik yok)', () => {
    // Göçün yetkiyle birlikte doğru davrandığını garanti eder.
    expect(canView(operator, normalizeRecord(v1))).toBe(false)
    expect(canView(admin, normalizeRecord(v1))).toBe(true)
  })
})

describe('formRecord — makeRecord / markVoid', () => {
  const form = { key: 'ppe-general', titleKey: 'form.ppe.title' }

  it('yeni kayıt v2 şemasıyla ve kullanıcı damgasıyla üretilir', () => {
    const r = makeRecord({ id: 'x', form, answers: { a: 1 }, score: 80, flagCount: 1, user: admin })
    expect(r).toMatchObject({
      id: 'x',
      schemaVersion: 2,
      formKey: 'ppe-general',
      status: STATUS.ACTIVE,
      score: 80,
      flagCount: 1,
    })
    expect(r.createdBy).toEqual({ id: 'u3', name: 'Yönetici' })
    expect(r.voidedAt).toBeNull()
  })

  it('markVoid kaydı silmez, üzerine iptal damgası basar', () => {
    const r = makeRecord({ id: 'x', form, answers: {}, user: operator })
    const v = markVoid(r, { user: admin, reason: 'Yanlış hat seçilmiş' })
    expect(v.status).toBe(STATUS.VOID)
    expect(v.voidReason).toBe('Yanlış hat seçilmiş')
    expect(v.voidedBy.id).toBe('u3')
    expect(v.answers).toEqual(r.answers) // cevaplar korunur
    expect(v.id).toBe(r.id)
  })
})
