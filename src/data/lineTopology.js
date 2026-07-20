// Ortak Hat/Makine/Ürün topolojisi — Custom Report'un bağlı (cascading)
// Line->Machine->Product filtresi bu gerçek ilişkiye dayanır (uydurma bir
// hiyerarşi değil): her Hat sabit bir Makine setine sahiptir; her Makine
// sadece belirli Ürünleri (SKU) üretebilir.
export const LINE_TOPOLOGY = [
  { line: 'Link-up 38', machines: ['Filler', 'Packer', 'Palletizer'] },
  { line: 'Link-Up-37', machines: ['Filler', 'Labeler'] },
]

export const MACHINE_SPEED = { Filler: 8400, Packer: 7800, Palletizer: 6900, Labeler: 7200 }

export const MACHINE_PRODUCTS = {
  Filler: ['SKU-Alpha', 'SKU-Beta'],
  Packer: ['SKU-Alpha', 'SKU-Gamma'],
  Palletizer: ['SKU-Alpha', 'SKU-Beta', 'SKU-Gamma'],
  Labeler: ['SKU-Gamma'],
}

export const ALL_MACHINES = [...new Set(LINE_TOPOLOGY.flatMap((t) => t.machines))]
export const ALL_PRODUCTS = [...new Set(Object.values(MACHINE_PRODUCTS).flat())]

export function machinesForLines(lineNames) {
  if (!lineNames?.length) return ALL_MACHINES
  const set = new Set()
  for (const t of LINE_TOPOLOGY) if (lineNames.includes(t.line)) t.machines.forEach((m) => set.add(m))
  return [...set]
}

export function productsForMachines(machineNames) {
  if (!machineNames?.length) return ALL_PRODUCTS
  const set = new Set()
  for (const m of machineNames) (MACHINE_PRODUCTS[m] || []).forEach((p) => set.add(p))
  return [...set]
}
