// Kayıt yetkileri — saf fonksiyonlar, kullanıcı dışarıdan enjekte edilir.
//
// Neden ayrı dosya: yetki kuralları sessizce bozulduğunda kimse fark etmez
// (operatör başkasının kaydını görür ya da silinmemesi gereken kayıt gider).
// Vue'suz tutulunca Vitest ile tam kapsanabiliyor.
//
// API bağlandığında bu kurallar SUNUCUDA da uygulanmalı — burası sadece
// arayüzün ne göstereceğine karar verir, güvenlik sınırı değildir.

import { ROLES } from './currentUser.js'

const roles = (user) => user?.roles ?? []
const isAdmin = (user) => roles(user).includes(ROLES.ADMIN)
const isSupervisor = (user) => roles(user).includes(ROLES.SUPERVISOR)

const ownerIdOf = (record) => record?.createdBy?.id ?? null

/** Kaydı kendisi mi doldurmuş? */
export function isOwner(user, record) {
  const owner = ownerIdOf(record)
  return owner != null && owner === user?.id
}

/**
 * Listede/detayda görebilir mi?
 *  admin      : hepsi
 *  supervisor : kendi hatlarındaki kayıtlar + kendi doldurdukları
 *  operator   : sadece kendi doldurdukları
 */
export function canView(user, record) {
  if (!user) return false
  if (isAdmin(user)) return true
  if (isOwner(user, record)) return true
  if (isSupervisor(user)) {
    const line = record?.answers?.line
    // Hat bilgisi olmayan kayıt (ör. 5S alan bazlı) vardiya amirine açıktır.
    if (!line) return true
    return (user.lines ?? []).includes(line)
  }
  return false
}

/**
 * İptal edebilir mi? Zaten iptal edilmiş kayıt tekrar iptal edilemez.
 * Operatör yalnızca kendi kaydını iptal eder.
 */
export function canVoid(user, record) {
  if (!user || record?.status === 'void') return false
  if (isAdmin(user) || isSupervisor(user)) return canView(user, record)
  return isOwner(user, record)
}

/**
 * Kalıcı silme yalnızca yöneticide. Denetim izi gereği normal akış iptaldir;
 * kalıcı silme kaçak/yanlış kayıtları temizlemek için bir kaçış kapağıdır.
 */
export function canDelete(user, record) {
  return !!user && isAdmin(user) && !!record
}

/** Listeyi kullanıcının görebilecekleriyle sınırlar. */
export function visibleTo(user, records = []) {
  return records.filter((r) => canView(user, r))
}
