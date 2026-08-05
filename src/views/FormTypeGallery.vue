<script setup>
// Soru Tipi Galerisi — registry'nin canlı vitrini.
// Her tip kendi kartında: adı, hangi PrimeVue bileşenine bağlandığı, çalışan
// kontrolü ve o an ürettiği ham değer. Demo sorular buradan türetildiği için
// questionTypes.js'e yeni bir tip eklendiğinde galeri kendiliğinden büyür.
import { ref, computed } from 'vue'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import QuestionField from '../components/form/QuestionField.vue'
import { QUESTION_TYPE_GROUPS, QUESTION_TYPES, RESPONSE_SETS } from '../data/questionTypes.js'
import { t } from '../lib/i18n.js'

// Tipin bağlandığı PrimeVue bileşeni — sadece bilgi amaçlı etiket.
const BOUND_TO = {
  text: 'InputText',
  textarea: 'Textarea',
  number: 'InputNumber',
  decimal: 'InputNumber',
  date: 'DatePicker',
  time: 'DatePicker (timeOnly)',
  datetime: 'DatePicker (showTime)',
  yesno: 'SelectButton',
  compliance: 'SelectButton',
  radio: 'RadioButton',
  select: 'Select',
  selectbutton: 'SelectButton',
  multiselect: 'MultiSelect',
  checkbox: 'Checkbox',
  switch: 'ToggleSwitch',
  person: 'AutoComplete',
  slider: 'Slider',
  rating: 'Rating',
  knob: 'Knob + çentik',
  photo: 'input[file] + canvas',
  signature: 'canvas',
  info: 'Message',
}

// Tipe özel demo ayarları (seçenek listesi, ölçek aralığı).
const DEMO = {
  yesno: { options: RESPONSE_SETS.yesno },
  compliance: { options: RESPONSE_SETS.compliance, flagWhen: ['ng'] },
  selectbutton: { options: RESPONSE_SETS.shift },
  radio: {
    options: [
      { value: 'a', labelKey: 'gal.optA' },
      { value: 'b', labelKey: 'gal.optB' },
      { value: 'c', labelKey: 'gal.optC' },
    ],
  },
  select: {
    options: [
      { value: 'a', labelKey: 'gal.optA' },
      { value: 'b', labelKey: 'gal.optB' },
      { value: 'c', labelKey: 'gal.optC' },
    ],
  },
  multiselect: {
    options: [
      { value: 'a', labelKey: 'gal.optA' },
      { value: 'b', labelKey: 'gal.optB' },
      { value: 'c', labelKey: 'gal.optC' },
    ],
  },
  number: { min: 0, max: 500 },
  decimal: { min: 0, max: 100, step: 0.1 },
  slider: { min: 0, max: 100, step: 5 },
  rating: { max: 5 },
  knob: { min: 0, max: 10, step: 1 },
}

const demoQuestion = (type) => ({
  key: `demo_${type.key}`,
  type: type.key,
  labelKey: type.labelKey,
  hintKey: `qt.${type.key}.hint`,
  ...(DEMO[type.key] || {}),
})

const groups = computed(() =>
  QUESTION_TYPE_GROUPS.map((g) => ({
    ...g,
    items: g.types.map((type) => ({ type, question: demoQuestion(type) })),
  }))
)

const allQuestions = computed(() => groups.value.flatMap((g) => g.items.map((i) => i.question)))

function blankGallery() {
  const out = {}
  for (const q of allQuestions.value) {
    const type = QUESTION_TYPES[q.type]
    if (type.answerless) continue
    out[q.key] = type.blank(q)
    if (q.flagWhen) {
      out[`${q.key}__note`] = ''
      out[`${q.key}__photo`] = []
    }
  }
  return out
}

const answers = ref(blankGallery())
const onChange = (key, value) => (answers.value = { ...answers.value, [key]: value })
const resetAll = () => (answers.value = blankGallery())

// Ham değeri kartın altında göster: kullanıcı hangi tipin ne ürettiğini görsün.
function rawValue(q) {
  if (QUESTION_TYPES[q.type].answerless) return '—'
  const v = answers.value[q.key]
  if (q.type === 'signature') return v ? `"data:image/png;…" (${v.length} b)` : 'null'
  if (q.type === 'photo') return `[${(v || []).length} foto]`
  if (v instanceof Date) return v.toISOString()
  return JSON.stringify(v)
}

const total = computed(() => Object.keys(QUESTION_TYPES).length)
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">{{ t('gal.page.title') }}</h1>
        <div class="lp-breadcrumb">{{ t('gal.page.breadcrumb') }}</div>
      </div>
      <div class="gal-head-actions">
        <Tag severity="info" :value="t('gal.typeCount', total)" />
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          size="small"
          :label="t('frm.reset')"
          @click="resetAll"
        />
      </div>
    </div>

    <p class="gal-intro">{{ t('gal.intro') }}</p>

    <section v-for="group in groups" :key="group.key" class="gal-group">
      <h2 class="gal-group-title">{{ t(group.labelKey) }}</h2>

      <div class="gal-grid">
        <div v-for="item in group.items" :key="item.type.key" class="lp-card gal-card">
          <div class="gal-card-head">
            <i :class="item.type.icon"></i>
            <code class="gal-key">{{ item.type.key }}</code>
            <span class="gal-bound">{{ BOUND_TO[item.type.key] }}</span>
          </div>

          <QuestionField :question="item.question" :answers="answers" @change="onChange" />

          <div class="gal-value">
            <span class="gal-value-label">{{ t('gal.value') }}</span>
            <code>{{ rawValue(item.question) }}</code>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.gal-head-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.gal-intro {
  font-size: 0.85rem;
  color: var(--lp-text-muted);
  max-width: 78ch;
  margin: 0 0 1.25rem;
}
.gal-group {
  margin-bottom: 1.75rem;
}
.gal-group-title {
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--lp-text-muted);
  margin: 0 0 0.6rem;
}
.gal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 0.9rem;
}
.gal-card {
  padding: 0.9rem 1rem 0.75rem;
  display: flex;
  flex-direction: column;
}
.gal-card-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--lp-border);
}
.gal-card-head .pi {
  color: var(--p-primary-500);
  font-size: 0.9rem;
}
.gal-key {
  font-size: 0.78rem;
  font-weight: 700;
}
.gal-bound {
  margin-left: auto;
  font-size: 0.68rem;
  color: var(--lp-text-muted);
  white-space: nowrap;
}
.gal-value {
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--lp-border);
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  overflow: hidden;
}
.gal-value-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--lp-text-muted);
  flex-shrink: 0;
}
.gal-value code {
  font-size: 0.74rem;
  color: var(--p-primary-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
