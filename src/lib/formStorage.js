// Doldurulmuş formların localStorage katmanı — CustomReport'un
// 'cr-saved-reports' deseninin form tarafındaki karşılığı.
//
// Bu dosya artık doğrudan ekranlardan çağrılmıyor: repositories/localAdapter
// üzerinden formRepository'ye bağlanıyor. API geldiğinde ekranlar değişmeden
// adaptör değişecek (bkz. lib/formRepository.js).
//
// Not: Date nesneleri JSON'a ISO string olarak yazılır. Geri okunduğunda
// yeniden Date'e çevrilmiyor çünkü kayıtlar salt-okunur gösteriliyor ve
// formEngine.formatAnswer string tarihleri de biliyor.

const KEY = 'cr-form-responses'

export function loadResponses() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/**
 * Listeyi olduğu gibi yazar. Kota dolduysa (fotoğraflar yüzünden olabilir)
 * sessizce başarısız olmak yerine false döner — çağıran kullanıcıyı uyarır.
 */
export function persistResponses(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function newResponseId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
