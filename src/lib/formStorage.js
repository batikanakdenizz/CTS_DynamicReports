// Doldurulmuş formların kalıcılığı — CustomReport'un 'cr-saved-reports'
// deseninin form tarafındaki karşılığı. Backend yok: her şey localStorage'da.
//
// Not: Date nesneleri JSON'a ISO string olarak yazılır. Geri okunduğunda
// yeniden Date'e çevirmiyoruz çünkü kayıtlar sadece salt-okunur gösteriliyor
// ve formEngine.formatAnswer string tarihleri de biliyor.

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

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    // Kota dolduysa (fotoğraflar yüzünden olabilir) sessizce başarısız olmak
    // yerine çağıranın kullanıcıyı uyarabilmesi için false dönüyoruz.
    return false
  }
}

export function saveResponse(record) {
  const list = loadResponses()
  list.unshift(record)
  return persist(list)
}

export function deleteResponse(id) {
  return persist(loadResponses().filter((r) => r.id !== id))
}

export function newResponseId() {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
