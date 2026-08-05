// PDF'lerin sağ üstüne firma logosu.
//
// Neden fetch: logoyu base64 olarak bir .js dosyasına gömmek, hiç PDF
// indirmeyen kullanıcıya da ~35KB bindirirdi. Vite görseli ayrı asset olarak
// yayınlar, burada ilk PDF anında bir kez çekilip modülde önbelleklenir.
//
// Kaynak görsel `docs/Cts_logo.png`'den kırpıldı: markanın etrafındaki
// asimetrik gölge tuvalde 17px yatay / 16px dikey kaymaya yol açıyordu.
// src/assets/cts-logo.png gölgesiz, beyaza düzleştirilmiş ve ortalanmış
// hâlidir (105x125). Düzleştirme aynı zamanda jsPDF'te alfa riskini kaldırır.

import logoUrl from '../assets/cts-logo.png'

const LOGO_RATIO = 105 / 125

let cachedDataUrl = null

async function logoDataUrl() {
  if (cachedDataUrl) return cachedDataUrl
  const res = await fetch(logoUrl)
  if (!res.ok) throw new Error(`logo ${res.status}`)
  const blob = await res.blob()
  cachedDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  return cachedDataUrl
}

/**
 * Logoyu geçerli sayfanın sağ üstüne basar. Genişlik yükseklikten oranla
 * türetilir — tek yerde durduğu için görsel asla ezilmez.
 *
 * Logo yüklenemezse sessizce atlanır: markasız bir PDF, hiç PDF'ten iyidir.
 *
 * @param {Object} doc jsPDF örneği
 * @param {Object} [opts]
 * @param {number} [opts.top]    üst kenardan mm
 * @param {number} [opts.height] logo yüksekliği mm
 * @param {number} [opts.margin] sağ kenardan mm (metin marjıyla aynı olmalı)
 */
export async function addPdfLogo(doc, opts = {}) {
  const { top = 10, height = 14, margin = 14 } = opts
  try {
    const data = await logoDataUrl()
    const width = height * LOGO_RATIO
    const x = doc.internal.pageSize.getWidth() - margin - width
    doc.addImage(data, 'PNG', x, top, width, height)
  } catch {
    /* logo yoksa PDF yine üretilsin */
  }
}
