<script setup>
// Kayıtlı form yanıtları. Depodan (formRepository) okur — hangi adaptörün
// çalıştığını bilmez. Satır açılınca aynı FormRenderer salt-okunur modda
// yanıtın tamamını gösterir.
//
// Silme iki farklı iştir: normal kullanıcı kaydı İPTAL eder (kayıt durur,
// denetim izi korunur), yönetici KALICI silebilir. Hangisinin görüneceğine
// formPolicy karar verir.
import { ref, computed, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ToggleSwitch from 'primevue/toggleswitch'
import ConfirmPopup from 'primevue/confirmpopup'
import InputText from 'primevue/inputtext'
import { useConfirm } from 'primevue/useconfirm'
import FormRenderer from '../components/form/FormRenderer.vue'
import { FORM_MAP } from '../data/formTemplates.js'
import { QUESTION_TYPES } from '../data/questionTypes.js'
import { flatQuestions, formatAnswer } from '../lib/formEngine.js'
import { exportFormPdf, pdfFileName } from '../lib/formPdf.js'
import { listResponses, voidResponse, deleteResponse } from '../lib/formRepository.js'
import { currentUser } from '../lib/currentUser.js'
import { canVoid, canDelete } from '../lib/formPolicy.js'
import { t } from '../lib/i18n.js'

const confirm = useConfirm()

const rows = ref([])
const expanded = ref({})
const loading = ref(false)
const loadError = ref('')
const showVoided = ref(false)
const voidReason = ref('')

const formOf = (r) => FORM_MAP[r.formKey]

async function reload() {
  loading.value = true
  loadError.value = ''
  try {
    rows.value = await listResponses({ includeVoided: showVoided.value })
  } catch {
    loadError.value = t('frm.loadError')
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(reload)

const mayVoid = (r) => canVoid(currentUser.value, r)
const mayDelete = (r) => canDelete(currentUser.value, r)

// İptal: sebep zorunlu, onay kutusunun içinde soruluyor.
function askVoid(event, r) {
  voidReason.value = ''
  confirm.require({
    target: event.currentTarget,
    // DİKKAT: `group` kullanılmaz — PrimeVue onu isteği group="..." tanımlı bir
    // ConfirmPopup örneğine yönlendirmek için kullanır ve öyle bir örnek yok,
    // istek sessizce kaybolurdu. Ayrım için kendi alanımız: mode.
    mode: 'void',
    message: t('resp.confirmVoid'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('frm.cancel'), severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: t('resp.void'), severity: 'warn', size: 'small' },
    accept: async () => {
      await voidResponse(r.id, voidReason.value.trim())
      await reload()
    },
  })
}

function askDelete(event, r) {
  confirm.require({
    target: event.currentTarget,
    message: t('resp.confirmDelete'),
    icon: 'pi pi-trash',
    rejectProps: { label: t('frm.cancel'), severity: 'secondary', outlined: true, size: 'small' },
    acceptProps: { label: t('frm.delete'), severity: 'danger', size: 'small' },
    accept: async () => {
      await deleteResponse(r.id)
      await reload()
    },
  })
}

const fmtDate = (iso) => {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const scoreSeverity = (pct) => (pct >= 85 ? 'success' : pct >= 60 ? 'warn' : 'danger')

// Kaydın PDF'i doldurma ekranındakiyle aynı fonksiyondan üretilir; tek fark
// zaman damgasının "şimdi" değil kaydın kendi tarihi olması.
function exportRowPdf(r) {
  const form = formOf(r)
  if (!form) return
  return exportFormPdf(form, r.answers, {
    score: r.score,
    savedAt: r.createdAt,
    fileName: pdfFileName(r.formKey, r.createdAt),
  })
}

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
      fmtDate(r.createdAt),
      r.createdBy?.name ?? '-',
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
        <div class="resp-voided-toggle">
          <ToggleSwitch v-model="showVoided" input-id="showVoided" @update:modelValue="reload" />
          <label for="showVoided">{{ t('resp.showVoided') }}</label>
        </div>
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

    <ConfirmPopup>
      <template #message="slotProps">
        <div class="resp-confirm">
          <div class="resp-confirm-head">
            <i :class="slotProps.message.icon"></i>
            <span>{{ slotProps.message.message }}</span>
          </div>
          <!-- İptal sebebi denetim izinin parçası: kaydın üstüne yazılıyor. -->
          <template v-if="slotProps.message.mode === 'void'">
            <label class="resp-confirm-label" for="voidReason">{{ t('resp.voidReason') }}</label>
            <InputText id="voidReason" v-model="voidReason" class="resp-confirm-input" />
          </template>
        </div>
      </template>
    </ConfirmPopup>

    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>

    <div v-if="loading" class="lp-card resp-empty">
      <ProgressSpinner style="width: 2.5rem; height: 2.5rem" stroke-width="4" />
      <p>{{ t('frm.loading') }}</p>
    </div>

    <div v-else-if="!total" class="lp-card resp-empty">
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
            <span class="resp-form" :class="{ 'resp-form--void': data.status === 'void' }">
              <i :class="formOf(data)?.icon"></i>
              {{ t(data.titleKey) }}
              <Tag
                v-if="data.status === 'void'"
                v-tooltip.top="data.voidReason || ''"
                severity="secondary"
                :value="t('resp.voided')"
              />
            </span>
          </template>
        </Column>
        <Column :header="t('resp.savedAt')">
          <template #body="{ data }">{{ fmtDate(data.createdAt) }}</template>
        </Column>
        <Column :header="t('resp.filledBy')">
          <template #body="{ data }">{{ data.createdBy?.name ?? '-' }}</template>
        </Column>
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
        <Column style="width: 7rem">
          <template #body="{ data }">
            <div class="resp-row-actions">
              <Button
                v-tooltip.top="t('btn.pdf')"
                icon="pi pi-file-pdf"
                severity="secondary"
                text
                rounded
                :aria-label="t('btn.pdf')"
                @click="exportRowPdf(data)"
              />
              <Button
                v-if="mayVoid(data)"
                v-tooltip.top="t('resp.void')"
                icon="pi pi-ban"
                severity="warn"
                text
                rounded
                :aria-label="t('resp.void')"
                @click="askVoid($event, data)"
              />
              <Button
                v-if="mayDelete(data)"
                v-tooltip.top="t('frm.delete')"
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                :aria-label="t('frm.delete')"
                @click="askDelete($event, data)"
              />
            </div>
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
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.resp-voided-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.resp-voided-toggle label {
  font-size: 0.95rem;
  color: var(--lp-text-muted);
  cursor: pointer;
}
.resp-confirm {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 280px;
}
.resp-confirm-head {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.95rem;
  line-height: 1.4;
}
.resp-confirm-label {
  font-size: 0.86rem;
  font-weight: 600;
}
.resp-confirm-input {
  width: 100%;
}
/* İptal edilmiş kayıt listede kalır ama geri planda durur. */
.resp-form--void {
  opacity: 0.6;
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
.resp-row-actions {
  display: flex;
  gap: 0.1rem;
}
.resp-detail {
  padding: 1rem 1.25rem;
  background: var(--lp-bg);
}
</style>
