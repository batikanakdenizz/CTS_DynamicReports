// Kayıt şeması ve sürüm göçü.
//
// v1 (ilk sürüm): { id, formKey, titleKey, savedAt, filledBy, answers,
//                   score, flagCount }
// v2: kim doldurdu (kimlik), durum (iptal edilebilirlik) ve senkron alanı.
//
// normalizeRecord() OKUMA anında çalışır — depoda duran eski kayıtlar
// dokunulmadan yeni alanlarla görünür hâle gelir. Böylece göç betiği
// gerekmiyor ve kullanıcı kayıt kaybetmiyor.

export const SCHEMA_VERSION = 2

export const STATUS = { ACTIVE: 'active', VOID: 'void' }

// Çevrimdışı kuyruk henüz yok; alan sözleşmede yer tutuyor ki API bağlandığında
// şema değişmesin. Yerel modda her kayıt 'local'.
export const SYNC = { LOCAL: 'local', PENDING: 'pending', SYNCED: 'synced' }

export function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null
  const rec = { ...raw }

  rec.schemaVersion = rec.schemaVersion ?? 1

  if (!rec.createdAt) rec.createdAt = rec.savedAt ?? new Date(0).toISOString()
  if (!rec.createdBy) {
    // v1'de sadece görünen ad vardı; kimlik yoktu. id'yi null bırakıyoruz —
    // formPolicy.isOwner null id'yi asla eşleştirmez, yani eski kayıtlar
    // yanlışlıkla birinin "kendi kaydı" sayılmaz.
    rec.createdBy = { id: null, name: rec.filledBy ?? '-' }
  }
  if (!rec.status) rec.status = STATUS.ACTIVE
  if (!rec.syncState) rec.syncState = SYNC.LOCAL

  rec.voidedAt = rec.voidedAt ?? null
  rec.voidedBy = rec.voidedBy ?? null
  rec.voidReason = rec.voidReason ?? null
  rec.answers = rec.answers ?? {}
  rec.score = rec.score ?? null
  rec.flagCount = rec.flagCount ?? 0

  return rec
}

/** Yeni kayıt iskeleti — kaydetme akışının tek kaynağı. */
export function makeRecord({ id, form, answers, score, flagCount, user }) {
  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    formKey: form.key,
    titleKey: form.titleKey,
    createdAt: new Date().toISOString(),
    createdBy: { id: user?.id ?? null, name: user?.name ?? '-' },
    answers,
    score: score ?? null,
    flagCount: flagCount ?? 0,
    status: STATUS.ACTIVE,
    voidedAt: null,
    voidedBy: null,
    voidReason: null,
    syncState: SYNC.LOCAL,
  }
}

/** İptal damgası — kayıt silinmez, üzerine kim/ne zaman/neden yazılır. */
export function markVoid(record, { user, reason }) {
  return {
    ...record,
    status: STATUS.VOID,
    voidedAt: new Date().toISOString(),
    voidedBy: { id: user?.id ?? null, name: user?.name ?? '-' },
    voidReason: reason ?? null,
  }
}
