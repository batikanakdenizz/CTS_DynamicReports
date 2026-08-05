// localStorage adaptörü — bugünkü varsayılan.
//
// Mevcut formStorage.js'in üzerine ince bir Promise sarmalı. Senkron olduğu
// hâlde async imza veriyor ki HTTP adaptörüyle aynı sözleşmeyi paylaşsın ve
// ekranlar API'ye geçerken değişmesin.

import { loadResponses, persistResponses } from '../formStorage.js'
import { normalizeRecord, markVoid } from '../formRecord.js'

const read = () => loadResponses().map(normalizeRecord).filter(Boolean)

export const localAdapter = {
  name: 'local',

  async list() {
    return read()
  },

  async get(id) {
    return read().find((r) => r.id === id) ?? null
  },

  async create(record) {
    const list = read()
    list.unshift(record)
    if (!persistResponses(list)) throw new Error('QUOTA_EXCEEDED')
    return record
  },

  async void(id, { user, reason }) {
    const list = read()
    const i = list.findIndex((r) => r.id === id)
    if (i === -1) throw new Error('NOT_FOUND')
    list[i] = markVoid(list[i], { user, reason })
    if (!persistResponses(list)) throw new Error('QUOTA_EXCEEDED')
    return list[i]
  },

  async remove(id) {
    const next = read().filter((r) => r.id !== id)
    if (!persistResponses(next)) throw new Error('QUOTA_EXCEEDED')
  },
}
