// Kayıt deposunun TEK giriş noktası.
//
// Ekranlar yalnızca bu modülü tanır; hangi adaptörün çalıştığını bilmezler.
// API bağlandığında değişen tek şey apiConfig'teki taban adres olur — burada
// ve ekranlarda kod değişmez. "İleride update olunca çalışamaz duruma
// gelmesin" gereksinimi bu sınırla karşılanıyor.
//
// Yetki süzgeci burada uygulanıyor ki her ekran ayrı ayrı hatırlamak zorunda
// kalmasın. Bu bir güvenlik sınırı DEĞİL — gerçek kısıtlama sunucuda olmalı.

import { isApiMode } from './apiConfig.js'
import { localAdapter } from './repositories/localAdapter.js'
import { httpAdapter } from './repositories/httpAdapter.js'
import { currentUser } from './currentUser.js'
import { canVoid, canDelete, visibleTo } from './formPolicy.js'
import { makeRecord } from './formRecord.js'
import { newResponseId } from './formStorage.js'

const adapter = () => (isApiMode() ? httpAdapter : localAdapter)

export const activeAdapterName = () => adapter().name

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.includeVoided] iptal edilmiş kayıtlar da gelsin mi
 */
export async function listResponses(opts = {}) {
  const { includeVoided = false } = opts
  const all = await adapter().list({ includeVoided })
  const mine = visibleTo(currentUser.value, all)
  return includeVoided ? mine : mine.filter((r) => r.status !== 'void')
}

export async function getResponse(id) {
  const rec = await adapter().get(id)
  return rec && visibleTo(currentUser.value, [rec]).length ? rec : null
}

/** Form + cevaplardan kayıt üretip saklar. */
export async function createResponse({ form, answers, score, flagCount }) {
  const record = makeRecord({
    id: newResponseId(),
    form,
    answers,
    score,
    flagCount,
    user: currentUser.value,
  })
  return adapter().create(record)
}

/** İptal: kayıt durur, üzerine kim/ne zaman/neden yazılır. */
export async function voidResponse(id, reason) {
  const rec = await adapter().get(id)
  if (!canVoid(currentUser.value, rec)) throw new Error('FORBIDDEN')
  return adapter().void(id, { user: currentUser.value, reason })
}

/** Kalıcı silme — yalnızca yönetici. */
export async function deleteResponse(id) {
  const rec = await adapter().get(id)
  if (!canDelete(currentUser.value, rec)) throw new Error('FORBIDDEN')
  return adapter().remove(id)
}
