// LinePulse API adaptörü — İSKELET.
//
// Uç nokta adları LinePulse'ın gözlenen düzenine göre önerildi
// (Controller/PascalCaseAction, hepsi POST — bkz. docs/HowWorksReports.md):
//   InspectionForm/GetUserFormResponses
//   InspectionForm/GetFormResponse
//   InspectionForm/SaveFormResponse
//   InspectionForm/VoidFormResponse
//   InspectionForm/DeleteFormResponse
// Bunlar HENÜZ TEYİT EDİLMEDİ; backend ekibiyle netleşince düzeltilecek.
//
// Kimlik doğrulama cookie/session ile taşındığı için `credentials: 'include'`
// şart ve istek aynı origin'den çıkmalı (bkz. apiConfig.js'teki kısıt notu).
//
// Yetki kuralları burada DEĞİL sunucuda uygulanmalı; formPolicy sadece
// arayüzün ne göstereceğine karar verir.

import { API_BASE } from '../apiConfig.js'
import { normalizeRecord } from '../formRecord.js'

async function post(action, body) {
  if (!API_BASE) throw new Error('API_NOT_CONFIGURED')
  const res = await fetch(`${API_BASE}/${action}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`API_${res.status}`)
  return res.json()
}

export const httpAdapter = {
  name: 'http',

  async list(filter = {}) {
    const data = await post('InspectionForm/GetUserFormResponses', filter)
    return (Array.isArray(data) ? data : (data?.items ?? [])).map(normalizeRecord).filter(Boolean)
  },

  async get(id) {
    return normalizeRecord(await post('InspectionForm/GetFormResponse', { id }))
  },

  async create(record) {
    return normalizeRecord(await post('InspectionForm/SaveFormResponse', record))
  },

  async void(id, { reason }) {
    // İptal eden kullanıcıyı sunucu oturumdan belirler — istemciye güvenilmez.
    return normalizeRecord(await post('InspectionForm/VoidFormResponse', { id, reason }))
  },

  async remove(id) {
    await post('InspectionForm/DeleteFormResponse', { id })
  },
}
