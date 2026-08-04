// Soru tipi kataloğu — denetim formlarının "measure catalog"u.
// reportCatalog.js ile aynı disiplin: burası SADECE veri + saf yardımcı
// fonksiyon. Hangi PrimeVue bileşeninin çizileceği bu dosyanın işi DEĞİL
// (bkz. components/form/QuestionField.vue). Böylece motor Vue'suz test edilir.
//
// Bir tip girişi:
//   key       registry anahtarı (şablonlardaki question.type buna işaret eder)
//   labelKey  i18n anahtarı (galeri sayfasında tipin adı)
//   icon      primeicons sınıfı
//   group     galeri sayfasının bölümlemesi
//   blank()   boş/varsayılan cevap
//   isEmpty(v)  "cevaplanmadı" testi — zorunlu alan doğrulaması buna dayanır
//   scorable  skorlu formlarda puana katılır mı
//   score(q,v)  { earned, max } | null  (null = bu cevap paydadan düşer, ör. N/A)

// --- Skorlama yardımcıları -------------------------------------------------
// Ağırlık (weight) her soruda opsiyonel; verilmezse 1 kabul edilir.
const w = (q) => q.weight ?? 1
// İkili (evet/hayır tarzı) sorular: doğru cevap 1 puan, yanlış 0.
const binaryScore = (q, hit) => ({ earned: hit ? w(q) : 0, max: w(q) })
// Ölçekli sorular: 0..max aralığındaki değerin kendisi puandır.
const scaleScore = (q, v, fallbackMax) => {
  const max = q.max ?? fallbackMax
  return { earned: (Number(v) || 0) * w(q), max: max * w(q) }
}

const isBlankText = (v) => v == null || !String(v).trim()
const isBlankNumber = (v) => v == null || v === '' || Number.isNaN(Number(v))

export const QUESTION_TYPES = {
  // --- Metin & Sayı --------------------------------------------------------
  text: {
    key: 'text',
    labelKey: 'qt.text',
    icon: 'pi pi-pencil',
    group: 'basic',
    blank: () => '',
    isEmpty: isBlankText,
    scorable: false,
  },
  textarea: {
    key: 'textarea',
    labelKey: 'qt.textarea',
    icon: 'pi pi-align-left',
    group: 'basic',
    blank: () => '',
    isEmpty: isBlankText,
    scorable: false,
  },
  number: {
    key: 'number',
    labelKey: 'qt.number',
    icon: 'pi pi-hashtag',
    group: 'basic',
    blank: () => null,
    isEmpty: isBlankNumber,
    scorable: false,
  },
  decimal: {
    key: 'decimal',
    labelKey: 'qt.decimal',
    icon: 'pi pi-percentage',
    group: 'basic',
    blank: () => null,
    isEmpty: isBlankNumber,
    scorable: false,
  },

  // --- Tarih & Saat --------------------------------------------------------
  date: {
    key: 'date',
    labelKey: 'qt.date',
    icon: 'pi pi-calendar',
    group: 'datetime',
    blank: () => null,
    isEmpty: (v) => v == null || v === '',
    scorable: false,
  },
  time: {
    key: 'time',
    labelKey: 'qt.time',
    icon: 'pi pi-clock',
    group: 'datetime',
    blank: () => null,
    isEmpty: (v) => v == null || v === '',
    scorable: false,
  },
  datetime: {
    key: 'datetime',
    labelKey: 'qt.datetime',
    icon: 'pi pi-calendar-clock',
    group: 'datetime',
    blank: () => null,
    isEmpty: (v) => v == null || v === '',
    scorable: false,
  },

  // --- Seçim ---------------------------------------------------------------
  yesno: {
    key: 'yesno',
    labelKey: 'qt.yesno',
    icon: 'pi pi-check-circle',
    group: 'choice',
    blank: () => null,
    isEmpty: (v) => v == null,
    scorable: true,
    score: (q, v) => binaryScore(q, v === 'yes'),
  },
  // Denetim formlarının bel kemiği. 'na' (uygulanamaz) puanlamada paydadan
  // düşer — SafetyCulture/5S denetim standardı: olmayan bir ekipmanın
  // eksikliği skoru cezalandırmamalı.
  compliance: {
    key: 'compliance',
    labelKey: 'qt.compliance',
    icon: 'pi pi-verified',
    group: 'choice',
    blank: () => null,
    isEmpty: (v) => v == null,
    scorable: true,
    score: (q, v) => (v === 'na' ? null : binaryScore(q, v === 'ok')),
  },
  radio: {
    key: 'radio',
    labelKey: 'qt.radio',
    icon: 'pi pi-circle',
    group: 'choice',
    blank: () => null,
    isEmpty: (v) => v == null,
    scorable: false,
  },
  select: {
    key: 'select',
    labelKey: 'qt.select',
    icon: 'pi pi-chevron-down',
    group: 'choice',
    blank: () => null,
    isEmpty: (v) => v == null,
    scorable: false,
  },
  selectbutton: {
    key: 'selectbutton',
    labelKey: 'qt.selectbutton',
    icon: 'pi pi-th-large',
    group: 'choice',
    blank: () => null,
    isEmpty: (v) => v == null,
    scorable: false,
  },
  multiselect: {
    key: 'multiselect',
    labelKey: 'qt.multiselect',
    icon: 'pi pi-list',
    group: 'choice',
    blank: () => [],
    isEmpty: (v) => !Array.isArray(v) || v.length === 0,
    scorable: false,
  },
  // Onay kutusu genelde bir taahhüt/teyit alanıdır ("devri onaylıyorum"),
  // bu yüzden required=true ise İŞARETLİ olması beklenir.
  checkbox: {
    key: 'checkbox',
    labelKey: 'qt.checkbox',
    icon: 'pi pi-check-square',
    group: 'choice',
    blank: () => false,
    isEmpty: (v) => v !== true,
    scorable: true,
    score: (q, v) => binaryScore(q, v === true),
  },
  // Switch'in her zaman bir durumu vardır (açık/kapalı) — "cevapsız" hâli yok,
  // bu yüzden isEmpty daima false. Zorunluluk işaretlemek anlamsız olurdu.
  switch: {
    key: 'switch',
    labelKey: 'qt.switch',
    icon: 'pi pi-power-off',
    group: 'choice',
    blank: () => false,
    isEmpty: () => false,
    scorable: true,
    score: (q, v) => binaryScore(q, v === true),
  },
  person: {
    key: 'person',
    labelKey: 'qt.person',
    icon: 'pi pi-user',
    group: 'choice',
    blank: () => null,
    isEmpty: isBlankText,
    scorable: false,
  },

  // --- Ölçek & Puan --------------------------------------------------------
  // Slider/Knob varsayılan olarak min değerinde başlar; "cevapsız" hâli yoktur.
  // 5S denetiminde 0 puan geçerli bir cevaptır (başarısız), boşluk değil.
  slider: {
    key: 'slider',
    labelKey: 'qt.slider',
    icon: 'pi pi-sliders-h',
    group: 'scale',
    blank: (q) => q?.min ?? 0,
    isEmpty: isBlankNumber,
    scorable: true,
    score: (q, v) => scaleScore(q, v, 100),
  },
  // Rating'in 0/null hâli "seçilmedi" demektir — skorlu formlarda tercih
  // sebebi: cevaplanmamış soru paydadan düşebilsin.
  rating: {
    key: 'rating',
    labelKey: 'qt.rating',
    icon: 'pi pi-star',
    group: 'scale',
    blank: () => null,
    isEmpty: (v) => v == null || v === 0,
    scorable: true,
    score: (q, v) => scaleScore(q, v, 5),
  },
  knob: {
    key: 'knob',
    labelKey: 'qt.knob',
    icon: 'pi pi-circle-fill',
    group: 'scale',
    blank: (q) => q?.min ?? 0,
    isEmpty: isBlankNumber,
    scorable: true,
    score: (q, v) => scaleScore(q, v, 100),
  },

  // --- Medya & Diğer -------------------------------------------------------
  photo: {
    key: 'photo',
    labelKey: 'qt.photo',
    icon: 'pi pi-camera',
    group: 'media',
    blank: () => [],
    isEmpty: (v) => !Array.isArray(v) || v.length === 0,
    scorable: false,
  },
  signature: {
    key: 'signature',
    labelKey: 'qt.signature',
    icon: 'pi pi-pencil',
    group: 'media',
    blank: () => null,
    isEmpty: (v) => !v,
    scorable: false,
  },
  // Cevabı olmayan tip: sadece talimat/uyarı metni gösterir. İlerleme
  // sayacına ve doğrulamaya girmez (bkz. formEngine.flatQuestions).
  info: {
    key: 'info',
    labelKey: 'qt.info',
    icon: 'pi pi-info-circle',
    group: 'media',
    answerless: true,
    blank: () => null,
    isEmpty: () => false,
    scorable: false,
  },
}

export const QUESTION_TYPE_LIST = Object.values(QUESTION_TYPES)

// Galeri sayfasının bölümleri — sıra burada belirlenir.
export const QUESTION_TYPE_GROUPS = [
  { key: 'basic', labelKey: 'qtg.basic' },
  { key: 'datetime', labelKey: 'qtg.datetime' },
  { key: 'choice', labelKey: 'qtg.choice' },
  { key: 'scale', labelKey: 'qtg.scale' },
  { key: 'media', labelKey: 'qtg.media' },
].map((g) => ({ ...g, types: QUESTION_TYPE_LIST.filter((t) => t.group === g.key) }))

// --- Ortak seçenek setleri (SafetyCulture'daki "global response set" karşılığı)
// Şablonlar options'ı elle yazmak yerine buradan referans alır.
export const RESPONSE_SETS = {
  yesno: [
    { value: 'yes', labelKey: 'opt.yes' },
    { value: 'no', labelKey: 'opt.no' },
  ],
  compliance: [
    { value: 'ok', labelKey: 'opt.ok', severity: 'success' },
    { value: 'ng', labelKey: 'opt.ng', severity: 'danger' },
    { value: 'na', labelKey: 'opt.na', severity: 'secondary' },
  ],
  shift: [
    { value: 'A', labelKey: 'opt.shiftA' },
    { value: 'B', labelKey: 'opt.shiftB' },
    { value: 'C', labelKey: 'opt.shiftC' },
  ],
}
