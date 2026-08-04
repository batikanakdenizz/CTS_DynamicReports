// Denetim formu şablonları — reportTemplates.js'in form tarafındaki karşılığı.
// Saf JSON şema: hiçbir bileşen/Vue referansı yok, motor bunları okur.
//
// Soru alanları:
//   key       cevap haritasındaki anahtar (form içinde benzersiz)
//   type      questionTypes.js registry anahtarı
//   labelKey  i18n anahtarı
//   required  zorunlu mu
//   options   seçim tipleri için [{ value, labelKey }]
//   min/max/step  sayısal + ölçekli tipler (min/max sayısalda tolerans demek)
//   weight    skorlu formda ağırlık (verilmezse 1)
//   flagWhen  bu cevaplar seçilirse altında açıklama + foto bloğu açılır
//   hintKey   opsiyonel ipucu metni
//   scored    false ise skorlu formda puana katılmaz

import { LINE_TOPOLOGY, ALL_MACHINES } from './lineTopology.js'
import { RESPONSE_SETS } from './questionTypes.js'

// Sahadaki kişiler — person tipindeki AutoComplete bunları önerir.
export const PEOPLE = [
  'Ahmet Yılmaz',
  'Ayşe Demir',
  'Mehmet Kaya',
  'Fatma Şahin',
  'Mustafa Çelik',
  'Zeynep Arslan',
  'Hasan Doğan',
  'Elif Aydın',
]

// Hat / makine seçenekleri gerçek topolojiden gelir — burada ikinci bir
// sabit liste tutmuyoruz ki hat eklendiğinde formlar da otomatik görsün.
const LINE_OPTIONS = LINE_TOPOLOGY.map((t) => ({ value: t.line, labelKey: t.line }))
const MACHINE_OPTIONS = ALL_MACHINES.map((m) => ({ value: m, labelKey: m }))

const AREA_OPTIONS = [
  { value: 'production', labelKey: 'opt.area.production' },
  { value: 'warehouse', labelKey: 'opt.area.warehouse' },
  { value: 'loading', labelKey: 'opt.area.loading' },
  { value: 'maintenance', labelKey: 'opt.area.maintenance' },
  { value: 'lab', labelKey: 'opt.area.lab' },
]

const PEOPLE_OPTIONS = PEOPLE.map((p) => ({ value: p, labelKey: p }))

// --- 1) Genel Fabrika Kontrol (KKD) ----------------------------------------
const ppeGeneral = {
  key: 'ppe-general',
  titleKey: 'form.ppe.title',
  descKey: 'form.ppe.desc',
  icon: 'pi pi-shield',
  scored: true,
  sections: [
    {
      key: 'header',
      titleKey: 'form.ppe.sec.header',
      questions: [
        { key: 'inspector', type: 'person', labelKey: 'q.inspector', required: true },
        { key: 'inspectedAt', type: 'datetime', labelKey: 'q.inspectedAt', required: true },
        {
          key: 'line',
          type: 'select',
          labelKey: 'q.line',
          required: true,
          options: LINE_OPTIONS,
        },
        {
          key: 'shift',
          type: 'selectbutton',
          labelKey: 'q.shift',
          required: true,
          options: RESPONSE_SETS.shift,
        },
        { key: 'station', type: 'text', labelKey: 'q.station', required: true },
        {
          key: 'headcount',
          type: 'number',
          labelKey: 'q.headcount',
          required: true,
          min: 1,
          max: 200,
          hintKey: 'q.headcount.hint',
        },
      ],
    },
    {
      key: 'ppe',
      titleKey: 'form.ppe.sec.ppe',
      questions: ['helmet', 'goggles', 'earplug', 'gloves', 'shoes', 'vest', 'mask', 'harness'].map(
        (k) => ({
          key: k,
          type: 'compliance',
          labelKey: `q.ppe.${k}`,
          required: true,
          options: RESPONSE_SETS.compliance,
          flagWhen: ['ng'],
        })
      ),
    },
    {
      key: 'area',
      titleKey: 'form.ppe.sec.area',
      questions: [
        {
          key: 'info',
          type: 'info',
          labelKey: 'q.ppe.info',
        },
        {
          key: 'housekeeping',
          type: 'rating',
          labelKey: 'q.ppe.housekeeping',
          required: true,
          max: 5,
          weight: 2,
        },
        {
          key: 'exitClear',
          type: 'yesno',
          labelKey: 'q.ppe.exitClear',
          required: true,
          options: RESPONSE_SETS.yesno,
          flagWhen: ['no'],
          weight: 3,
        },
        {
          key: 'firstAidKit',
          type: 'yesno',
          labelKey: 'q.ppe.firstAidKit',
          required: true,
          options: RESPONSE_SETS.yesno,
          flagWhen: ['no'],
        },
        { key: 'notes', type: 'textarea', labelKey: 'q.notes' },
        { key: 'sitePhoto', type: 'photo', labelKey: 'q.sitePhoto' },
        { key: 'signature', type: 'signature', labelKey: 'q.inspectorSign', required: true },
      ],
    },
  ],
}

// --- 2) 5S / Tertip-Düzen Denetimi -----------------------------------------
// Her S bir bölüm; sorular 0-5 puanlıdır.
//
// Neden hepsi 'rating' ve hiçbiri 'slider' değil: slider'ın "cevaplanmadı"
// hâli yoktur (varsayılanı min'dir), bu yüzden skorlu bir formda dokunulmamış
// sorular bile paydaya 0 puanla girer ve boş form yanlışlıkla düşük bir skor
// gösterir. Rating'in boş hâli null olduğu için cevapsız soru paydadan düşer.
// Slider yine de shift-handover (skorsuz) formunda ve galeride vitrinde.
const fiveSItem = (sKey, key, control, weight) => ({
  key: `${sKey}_${key}`,
  type: control,
  labelKey: `q.5s.${sKey}.${key}`,
  required: true,
  min: 0,
  max: 5,
  step: 1,
  weight,
})

const fiveSAudit = {
  key: '5s-audit',
  titleKey: 'form.5s.title',
  descKey: 'form.5s.desc',
  icon: 'pi pi-sparkles',
  scored: true,
  sections: [
    {
      key: 'header',
      titleKey: 'form.5s.sec.header',
      questions: [
        { key: 'auditor', type: 'person', labelKey: 'q.auditor', required: true },
        { key: 'auditDate', type: 'date', labelKey: 'q.auditDate', required: true },
        {
          key: 'area',
          type: 'select',
          labelKey: 'q.area',
          required: true,
          options: AREA_OPTIONS,
        },
        { key: 'intro', type: 'info', labelKey: 'q.5s.intro' },
      ],
    },
    {
      key: 'seiri',
      titleKey: 'form.5s.sec.seiri',
      questions: [
        fiveSItem('seiri', 'unused', 'rating', 1),
        fiveSItem('seiri', 'redTag', 'rating', 1),
        fiveSItem('seiri', 'aisle', 'rating', 2),
      ],
    },
    {
      key: 'seiton',
      titleKey: 'form.5s.sec.seiton',
      questions: [
        fiveSItem('seiton', 'labels', 'rating', 1),
        fiveSItem('seiton', 'shadowBoard', 'rating', 1),
        fiveSItem('seiton', 'floorMarks', 'rating', 2),
      ],
    },
    {
      key: 'seiso',
      titleKey: 'form.5s.sec.seiso',
      questions: [
        fiveSItem('seiso', 'floor', 'rating', 1),
        fiveSItem('seiso', 'machines', 'rating', 2),
        fiveSItem('seiso', 'waste', 'rating', 1),
      ],
    },
    {
      key: 'seiketsu',
      titleKey: 'form.5s.sec.seiketsu',
      questions: [
        fiveSItem('seiketsu', 'standards', 'rating', 1),
        fiveSItem('seiketsu', 'visualControls', 'rating', 1),
        fiveSItem('seiketsu', 'schedule', 'rating', 1),
      ],
    },
    {
      key: 'shitsuke',
      titleKey: 'form.5s.sec.shitsuke',
      questions: [
        fiveSItem('shitsuke', 'training', 'rating', 1),
        fiveSItem('shitsuke', 'audits', 'rating', 1),
        fiveSItem('shitsuke', 'improvement', 'rating', 2),
      ],
    },
    {
      key: 'closing',
      titleKey: 'form.5s.sec.closing',
      questions: [
        { key: 'findings', type: 'textarea', labelKey: 'q.5s.findings', required: true },
        { key: 'photo', type: 'photo', labelKey: 'q.5s.photo' },
        {
          key: 'owner',
          type: 'select',
          labelKey: 'q.owner',
          required: true,
          options: PEOPLE_OPTIONS,
        },
        { key: 'dueDate', type: 'date', labelKey: 'q.dueDate', required: true },
        { key: 'auditorSign', type: 'signature', labelKey: 'q.auditorSign', required: true },
      ],
    },
  ],
}

// --- 3) Ramak Kala / Olay Bildirimi ----------------------------------------
const nearMiss = {
  key: 'near-miss',
  titleKey: 'form.nm.title',
  descKey: 'form.nm.desc',
  icon: 'pi pi-exclamation-triangle',
  scored: false,
  sections: [
    {
      key: 'what',
      titleKey: 'form.nm.sec.what',
      questions: [
        { key: 'warn', type: 'info', labelKey: 'q.nm.warn' },
        {
          key: 'eventType',
          type: 'radio',
          labelKey: 'q.nm.eventType',
          required: true,
          options: [
            { value: 'slip', labelKey: 'opt.nm.slip' },
            { value: 'equipment', labelKey: 'opt.nm.equipment' },
            { value: 'chemical', labelKey: 'opt.nm.chemical' },
            { value: 'electrical', labelKey: 'opt.nm.electrical' },
            { value: 'ppe', labelKey: 'opt.nm.ppe' },
            { value: 'other', labelKey: 'opt.nm.other' },
          ],
        },
        { key: 'occurredAt', type: 'datetime', labelKey: 'q.nm.occurredAt', required: true },
        {
          key: 'area',
          type: 'select',
          labelKey: 'q.area',
          required: true,
          options: AREA_OPTIONS,
        },
        {
          key: 'machine',
          type: 'select',
          labelKey: 'q.machine',
          options: MACHINE_OPTIONS,
        },
        {
          key: 'severity',
          type: 'knob',
          labelKey: 'q.nm.severity',
          required: true,
          min: 1,
          max: 5,
          step: 1,
          hintKey: 'q.nm.severity.hint',
        },
      ],
    },
    {
      key: 'detail',
      titleKey: 'form.nm.sec.detail',
      questions: [
        { key: 'hadWitness', type: 'switch', labelKey: 'q.nm.hadWitness' },
        {
          key: 'affected',
          type: 'multiselect',
          labelKey: 'q.nm.affected',
          options: PEOPLE_OPTIONS,
        },
        {
          key: 'injury',
          type: 'yesno',
          labelKey: 'q.nm.injury',
          required: true,
          options: RESPONSE_SETS.yesno,
          flagWhen: ['yes'],
        },
        {
          key: 'stopped',
          type: 'yesno',
          labelKey: 'q.nm.stopped',
          required: true,
          options: RESPONSE_SETS.yesno,
        },
        { key: 'story', type: 'textarea', labelKey: 'q.nm.story', required: true },
        { key: 'immediateAction', type: 'textarea', labelKey: 'q.nm.action', required: true },
      ],
    },
    {
      key: 'proof',
      titleKey: 'form.nm.sec.proof',
      questions: [
        { key: 'photo', type: 'photo', labelKey: 'q.nm.photo' },
        { key: 'reporter', type: 'person', labelKey: 'q.nm.reporter', required: true },
        { key: 'reportTime', type: 'time', labelKey: 'q.nm.reportTime', required: true },
        { key: 'reporterSign', type: 'signature', labelKey: 'q.nm.reporterSign', required: true },
      ],
    },
  ],
}

// --- 4) Vardiya Devir + Makine Ön Kontrol ----------------------------------
const shiftHandover = {
  key: 'shift-handover',
  titleKey: 'form.sh.title',
  descKey: 'form.sh.desc',
  icon: 'pi pi-refresh',
  scored: false,
  sections: [
    {
      key: 'header',
      titleKey: 'form.sh.sec.header',
      questions: [
        { key: 'fromOperator', type: 'person', labelKey: 'q.sh.fromOperator', required: true },
        { key: 'toOperator', type: 'person', labelKey: 'q.sh.toOperator', required: true },
        {
          key: 'shift',
          type: 'selectbutton',
          labelKey: 'q.shift',
          required: true,
          options: RESPONSE_SETS.shift,
        },
        { key: 'date', type: 'date', labelKey: 'q.date', required: true },
        { key: 'handoverTime', type: 'time', labelKey: 'q.sh.handoverTime', required: true },
        {
          key: 'line',
          type: 'select',
          labelKey: 'q.line',
          required: true,
          options: LINE_OPTIONS,
        },
      ],
    },
    {
      key: 'machine',
      titleKey: 'form.sh.sec.machine',
      questions: [
        {
          key: 'machine',
          type: 'select',
          labelKey: 'q.machine',
          required: true,
          options: MACHINE_OPTIONS,
        },
        {
          key: 'oilLevel',
          type: 'compliance',
          labelKey: 'q.sh.oilLevel',
          required: true,
          options: RESPONSE_SETS.compliance,
          flagWhen: ['ng'],
        },
        {
          key: 'airPressure',
          type: 'decimal',
          labelKey: 'q.sh.airPressure',
          required: true,
          min: 5.5,
          max: 7.5,
          step: 0.1,
          hintKey: 'q.sh.airPressure.hint',
        },
        {
          key: 'temperature',
          type: 'number',
          labelKey: 'q.sh.temperature',
          required: true,
          min: 0,
          max: 90,
          hintKey: 'q.sh.temperature.hint',
        },
        {
          key: 'guards',
          type: 'yesno',
          labelKey: 'q.sh.guards',
          required: true,
          options: RESPONSE_SETS.yesno,
          flagWhen: ['no'],
        },
        { key: 'estopTested', type: 'checkbox', labelKey: 'q.sh.estopTested', required: true },
      ],
    },
    {
      key: 'production',
      titleKey: 'form.sh.sec.production',
      questions: [
        { key: 'produced', type: 'number', labelKey: 'q.sh.produced', required: true, min: 0 },
        { key: 'scrap', type: 'number', labelKey: 'q.sh.scrap', min: 0 },
        { key: 'downtimeMin', type: 'number', labelKey: 'q.sh.downtimeMin', min: 0, max: 480 },
        {
          key: 'downtimeReasons',
          type: 'multiselect',
          labelKey: 'q.sh.downtimeReasons',
          options: [
            { value: 'breakdown', labelKey: 'opt.dt.breakdown' },
            { value: 'changeover', labelKey: 'opt.dt.changeover' },
            { value: 'material', labelKey: 'opt.dt.material' },
            { value: 'quality', labelKey: 'opt.dt.quality' },
            { value: 'cleaning', labelKey: 'opt.dt.cleaning' },
          ],
        },
        { key: 'lineSpeed', type: 'slider', labelKey: 'q.sh.lineSpeed', min: 0, max: 100, step: 5 },
      ],
    },
    {
      key: 'handover',
      titleKey: 'form.sh.sec.handover',
      questions: [
        { key: 'openItems', type: 'textarea', labelKey: 'q.sh.openItems' },
        { key: 'machinePhoto', type: 'photo', labelKey: 'q.sh.machinePhoto' },
        { key: 'confirm', type: 'checkbox', labelKey: 'q.sh.confirm', required: true },
        { key: 'fromSign', type: 'signature', labelKey: 'q.sh.fromSign', required: true },
        { key: 'toSign', type: 'signature', labelKey: 'q.sh.toSign', required: true },
      ],
    },
  ],
}

export const FORM_TEMPLATES = [ppeGeneral, fiveSAudit, nearMiss, shiftHandover]

export const FORM_MAP = Object.fromEntries(FORM_TEMPLATES.map((f) => [f.key, f]))
