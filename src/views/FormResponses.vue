<script setup>
// Kayıtlı form yanıtları. localStorage'daki kayıtları listeler; satır açılınca
// aynı FormRenderer salt-okunur modda yanıtın tamamını gösterir.
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import FormRenderer from '../components/form/FormRenderer.vue'
import { FORM_MAP } from '../data/formTemplates.js'
import { QUESTION_TYPES } from '../data/questionTypes.js'
import { flatQuestions, formatAnswer } from '../lib/formEngine.js'
import { loadResponses, deleteResponse } from '../lib/formStorage.js'
import { t } from '../lib/i18n.js'

const rows = ref([])
const expanded = ref({})

onMounted(() => (rows.value = loadResponses()))

const formOf = (r) => FORM_MAP[r.formKey]

function remove(r) {
  deleteResponse(r.id)
  rows.value = loadResponses()
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const scoreSeverity = (pct) => (pct >= 85 ? 'success' : pct >= 60 ? 'warn' : 'danger')

const total = computed(() => rows.value.length)

// Excel: her yanıt bir satır olacak şekilde düzleştirilemez (formlar farklı
// soru setine sahip), bu yüzden seçili formun soruları kolon olur ve sadece
// o forma ait yanıtlar dışa aktarılır.
async function exportExcel(formKey) {
  const XLSX = await import('xlsx')
  const form = FORM_MAP[formKey]
  const questions = flatQuestions(form).filter(
    (q) => !QUESTION_TYPES[q.type]?.answerless && q.type !== 'photo' && q.type !== 'signature'
  )
  const subset = rows.value.filter((r) => r.formKey === formKey)
  const aoa = [
    [t('resp.savedAt'), t('resp.filledBy'), t('frm.score'), ...questions.map((q) => t(q.labelKey))],
    ...subset.map((r) => [
      fmtDate(r.savedAt),
      r.filledBy,
      r.score == null ? '-' : `${r.score.toFixed(0)}%`,
      ...questions.map((q) => formatAnswer(q, r.answers[q.key], t)),
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, formKey.slice(0, 30))
  XLSX.writeFile(wb, `${formKey}-responses.xlsx`)
}

// Hangi formlardan kayıt var — Excel butonları bunlara göre çizilir.
const presentForms = computed(() => [...new Set(rows.value.map((r) => r.formKey))])
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">{{ t('resp.page.title') }}</h1>
        <div class="lp-breadcrumb">{{ t('resp.page.breadcrumb') }}</div>
      </div>
      <div class="resp-actions">
        <Button
          v-for="key in presentForms"
          :key="key"
          size="small"
          severity="secondary"
          outlined
          icon="pi pi-file-excel"
          :label="t(FORM_MAP[key].titleKey)"
          @click="exportExcel(key)"
        />
      </div>
    </div>

    <div v-if="!total" class="lp-card resp-empty">
      <i class="pi pi-inbox"></i>
      <p>{{ t('resp.empty') }}</p>
      <p class="resp-empty-sub">{{ t('resp.emptyHint') }}</p>
    </div>

    <div v-else class="lp-card">
      <DataTable
        v-model:expandedRows="expanded"
        :value="rows"
        data-key="id"
        paginator
        :rows="10"
        :rows-per-page-options="[10, 25, 50]"
      >
        <Column expander style="width: 3rem" />
        <Column :header="t('resp.form')">
          <template #body="{ data }">
            <span class="resp-form">
              <i :class="formOf(data)?.icon"></i>
              {{ t(data.titleKey) }}
            </span>
          </template>
        </Column>
        <Column :header="t('resp.savedAt')">
          <template #body="{ data }">{{ fmtDate(data.savedAt) }}</template>
        </Column>
        <Column field="filledBy" :header="t('resp.filledBy')" />
        <Column :header="t('frm.score')">
          <template #body="{ data }">
            <Tag
              v-if="data.score != null"
              :severity="scoreSeverity(data.score)"
              :value="`${data.score.toFixed(0)}%`"
            />
            <span v-else class="resp-dash">-</span>
          </template>
        </Column>
        <Column :header="t('resp.flags')">
          <template #body="{ data }">
            <Tag
              v-if="data.flagCount"
              severity="danger"
              icon="pi pi-flag"
              :value="String(data.flagCount)"
            />
            <span v-else class="resp-dash">-</span>
          </template>
        </Column>
        <Column style="width: 4rem">
          <template #body="{ data }">
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              :aria-label="t('resp.delete')"
              @click="remove(data)"
            />
          </template>
        </Column>

        <template #expansion="{ data }">
          <div class="resp-detail">
            <FormRenderer
              v-if="formOf(data)"
              :form="formOf(data)"
              :answers="data.answers"
              readonly
            />
            <p v-else class="resp-dash">{{ t('resp.unknownForm') }}</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<style scoped>
.resp-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.resp-empty {
  padding: 3rem 1.5rem;
  text-align: center;
  color: var(--lp-text-muted);
}
.resp-empty .pi {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}
.resp-empty p {
  margin: 0;
}
.resp-empty-sub {
  font-size: 0.85rem;
  margin-top: 0.25rem !important;
}
.resp-form {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 500;
}
.resp-form .pi {
  color: var(--p-primary-500);
}
.resp-dash {
  color: var(--lp-text-muted);
}
.resp-detail {
  padding: 1rem 1.25rem;
  background: var(--lp-bg);
}
</style>
