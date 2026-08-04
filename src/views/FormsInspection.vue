<script setup>
// Denetim formu doldurma ekranı. Şablon seç -> doldur -> doğrula -> kaydet.
// Formların içeriği bu dosyada DEĞİL (data/formTemplates.js); burası sadece
// kabuk: seçici, aksiyon çubuğu, kalıcılık ve dışa aktarım.
import { ref, computed, reactive, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import FormRenderer from '../components/form/FormRenderer.vue'
import { FORM_TEMPLATES } from '../data/formTemplates.js'
import { QUESTION_TYPES } from '../data/questionTypes.js'
import {
  blankAnswers,
  validateForm,
  scoreForm,
  countFlags,
  flatQuestions,
  formatAnswer,
} from '../lib/formEngine.js'
import { saveResponse, newResponseId } from '../lib/formStorage.js'
import { t } from '../lib/i18n.js'

const selectedKey = ref(FORM_TEMPLATES[0].key)
const form = computed(() => FORM_TEMPLATES.find((f) => f.key === selectedKey.value))

const answers = ref(blankAnswers(form.value))
const errors = ref({})
const banner = reactive({ text: '', severity: 'success' })

// Form değişince cevaplar sıfırlanır — iki farklı şemanın cevapları
// karışmasın (anahtarlar çakışabilir, ör. iki formda da 'line' var).
watch(selectedKey, () => {
  answers.value = blankAnswers(form.value)
  errors.value = {}
  banner.text = ''
})

const score = computed(() => scoreForm(form.value, answers.value))

function onChange(key, value) {
  answers.value = { ...answers.value, [key]: value }
  // Kullanıcı düzeltmeye başlayınca o alanın hatası anında kalksın.
  if (errors.value[key]) {
    const next = { ...errors.value }
    delete next[key]
    errors.value = next
  }
}

// Cevapları boşaltır ama bildirim şeridine dokunmaz — kaydetme sonrası formu
// temizlerken "Form kaydedildi." mesajının ekranda kalması gerekiyor.
function clearAnswers() {
  answers.value = blankAnswers(form.value)
  errors.value = {}
}

function resetForm() {
  clearAnswers()
  banner.text = ''
}

// Kaydedilen kaydın listede kim tarafından doldurulduğunu göstermek için ilk
// 'person' tipli cevabı kullanıyoruz (denetçi / operatör / bildiren).
function filledBy() {
  const q = flatQuestions(form.value).find((x) => x.type === 'person')
  return (q && answers.value[q.key]) || '-'
}

function save() {
  const result = validateForm(form.value, answers.value)
  errors.value = result.errors
  if (!result.valid) {
    banner.severity = 'error'
    banner.text = t('frm.saveInvalid', result.missing)
    return
  }
  const ok = saveResponse({
    id: newResponseId(),
    formKey: form.value.key,
    titleKey: form.value.titleKey,
    savedAt: new Date().toISOString(),
    filledBy: filledBy(),
    answers: answers.value,
    score: form.value.scored ? score.value.pct : null,
    flagCount: countFlags(form.value, answers.value),
  })
  banner.severity = ok ? 'success' : 'error'
  banner.text = ok ? t('frm.saved') : t('frm.saveQuotaFull')
  if (ok) clearAnswers()
}

// --- Dışa aktarım ---------------------------------------------------------
function fileName() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${form.value.key}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function exportJson() {
  const blob = new Blob(
    [JSON.stringify({ form: form.value.key, answers: answers.value }, null, 2)],
    {
      type: 'application/json',
    }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// jsPDF'in gömülü fontları cp1252 kodlar: ç/ö/ü çalışır ama ş/ğ/ı/İ bozulur.
// Tam çözüm TTF gömmek olurdu (~300KB base64); rapor tarafı da gömmediği için
// aynı yolu izleyip sadece sorunlu harfleri sadeleştiriyoruz.
const PDF_MAP = { ş: 's', Ş: 'S', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I' }
const pdfSafe = (s) => String(s ?? '').replace(/[şŞğĞıİ]/g, (c) => PDF_MAP[c])

async function exportPdf() {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()
  const margin = 14

  doc.setFontSize(14)
  doc.text(pdfSafe(t(form.value.titleKey)), margin, 16)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(pdfSafe(new Date().toLocaleString()), margin, 22)
  if (form.value.scored) {
    doc.text(pdfSafe(`${t('frm.score')}: ${score.value.pct.toFixed(0)}%`), margin, 27)
  }
  doc.setTextColor(0)

  const body = []
  for (const section of form.value.sections) {
    for (const q of section.questions) {
      if (QUESTION_TYPES[q.type]?.answerless) continue
      if (q.type === 'photo' || q.type === 'signature') continue
      body.push([
        pdfSafe(t(section.titleKey)),
        pdfSafe(t(q.labelKey)),
        pdfSafe(formatAnswer(q, answers.value[q.key], t)),
      ])
    }
  }

  autoTable(doc, {
    startY: form.value.scored ? 32 : 27,
    head: [
      [pdfSafe(t('frm.pdf.section')), pdfSafe(t('frm.pdf.question')), pdfSafe(t('frm.pdf.answer'))],
    ],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 78 } },
  })

  // İmzalar tablonun altına görsel olarak eklenir.
  let y = doc.lastAutoTable.finalY + 8
  for (const q of flatQuestions(form.value)) {
    if (q.type !== 'signature' || !answers.value[q.key]) continue
    if (y > 250) {
      doc.addPage()
      y = 20
    }
    doc.setFontSize(9)
    doc.text(pdfSafe(t(q.labelKey)), margin, y)
    doc.addImage(answers.value[q.key], 'PNG', margin, y + 2, 60, 24)
    y += 34
  }

  doc.save(`${fileName()}.pdf`)
}
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">{{ t('forms.page.title') }}</h1>
        <div class="lp-breadcrumb">{{ t('forms.page.breadcrumb') }}</div>
      </div>
    </div>

    <!-- Şablon seçici -->
    <div class="frm-picker">
      <button
        v-for="tpl in FORM_TEMPLATES"
        :key="tpl.key"
        type="button"
        class="frm-picker-item lp-card"
        :class="{ active: tpl.key === selectedKey }"
        @click="selectedKey = tpl.key"
      >
        <i :class="tpl.icon"></i>
        <span class="frm-picker-title">{{ t(tpl.titleKey) }}</span>
        <span class="frm-picker-desc">{{ t(tpl.descKey) }}</span>
      </button>
    </div>

    <Message v-if="banner.text" :severity="banner.severity" :closable="false" class="frm-banner">
      {{ banner.text }}
    </Message>

    <div class="lp-card frm-card">
      <FormRenderer :form="form" :answers="answers" :errors="errors" @change="onChange" />

      <div class="frm-actions">
        <Button icon="pi pi-save" :label="t('frm.save')" @click="save" />
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :label="t('frm.reset')"
          @click="resetForm"
        />
        <span class="frm-actions-spacer"></span>
        <Button
          icon="pi pi-file-pdf"
          severity="secondary"
          outlined
          :label="t('btn.pdf')"
          @click="exportPdf"
        />
        <Button icon="pi pi-code" severity="secondary" outlined label="JSON" @click="exportJson" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.frm-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.frm-picker-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.85rem 1rem;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: var(--lp-text);
  transition:
    border-color 0.15s,
    background 0.15s;
}
.frm-picker-item:hover {
  border-color: var(--p-primary-400);
}
.frm-picker-item.active {
  border-color: var(--p-primary-500);
  background: color-mix(in srgb, var(--p-primary-500) 8%, var(--lp-surface));
}
.frm-picker-item .pi {
  font-size: 1.1rem;
  color: var(--p-primary-500);
}
.frm-picker-title {
  font-weight: 600;
  font-size: 0.9rem;
}
.frm-picker-desc {
  font-size: 0.75rem;
  color: var(--lp-text-muted);
  line-height: 1.35;
}
.frm-banner {
  margin-bottom: 0.75rem;
}
.frm-card {
  padding: 1.1rem 1.25rem;
}
.frm-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1.1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--lp-border);
}
.frm-actions-spacer {
  flex: 1;
}
</style>
