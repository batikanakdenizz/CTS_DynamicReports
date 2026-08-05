<script setup>
// Denetim formu doldurma ekranı. Şablon seç -> doldur -> doğrula -> kaydet.
// Formların içeriği bu dosyada DEĞİL (data/formTemplates.js); burası sadece
// kabuk: seçici, aksiyon çubuğu, kalıcılık ve dışa aktarım.
import { ref, computed, reactive, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import FormRenderer from '../components/form/FormRenderer.vue'
import { FORM_TEMPLATES } from '../data/formTemplates.js'
import { blankAnswers, validateForm, scoreForm, countFlags } from '../lib/formEngine.js'
import { exportFormPdf, pdfFileName } from '../lib/formPdf.js'
import { createResponse } from '../lib/formRepository.js'
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

const saving = ref(false)

// Kaydetme depoya (formRepository) gider; hangi adaptörün çalıştığını bu ekran
// bilmez. Bugün localStorage, yarın LinePulse API'si — burada kod değişmez.
async function save() {
  const result = validateForm(form.value, answers.value)
  errors.value = result.errors
  if (!result.valid) {
    banner.severity = 'error'
    banner.text = t('frm.saveInvalid', result.missing)
    return
  }

  saving.value = true
  try {
    await createResponse({
      form: form.value,
      answers: answers.value,
      score: form.value.scored ? score.value.pct : null,
      flagCount: countFlags(form.value, answers.value),
    })
    banner.severity = 'success'
    banner.text = t('frm.saved')
    clearAnswers()
  } catch (err) {
    banner.severity = 'error'
    banner.text = err?.message === 'QUOTA_EXCEEDED' ? t('frm.saveQuotaFull') : t('frm.saveError')
  } finally {
    saving.value = false
  }
}

// --- Dışa aktarım ---------------------------------------------------------
const fileName = () => pdfFileName(form.value.key)

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

// PDF üretimi Kayıtlı Yanıtlar ekranıyla ortak — bkz. lib/formPdf.js
const exportPdf = () =>
  exportFormPdf(form.value, answers.value, {
    score: form.value.scored ? score.value.pct : null,
    fileName: fileName(),
  })
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
        <Button icon="pi pi-save" :label="t('frm.save')" :loading="saving" @click="save" />
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
