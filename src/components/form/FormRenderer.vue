<script setup>
// Şema -> ekran. Bölümleri açılır panellerde çizer, üstte ilerleme ve
// (skorlu formlarda) canlı skor gösterir. Kendi state'i yok: cevaplar
// dışarıdan gelir, değişiklikler 'change' ile dışarı çıkar — böylece aynı
// bileşen hem doldurma hem salt-okunur görüntüleme için kullanılabiliyor.
import { computed } from 'vue'
import Panel from 'primevue/panel'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import QuestionField from './QuestionField.vue'
import { scoreForm, progress, countFlags } from '../../lib/formEngine.js'
import { t } from '../../lib/i18n.js'

const props = defineProps({
  form: { type: Object, required: true },
  answers: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['change'])

const score = computed(() => scoreForm(props.form, props.answers))
const prog = computed(() => progress(props.form, props.answers))
const flags = computed(() => countFlags(props.form, props.answers))
const errorCount = computed(() => Object.keys(props.errors).length)

const sectionScore = (key) => score.value.sections.find((s) => s.key === key)

// Skor rozetinin rengi: 85+ yeşil, 60+ turuncu, altı kırmızı. Denetim
// yazılımlarının yaygın eşikleri.
const scoreSeverity = (pct) => (pct >= 85 ? 'success' : pct >= 60 ? 'warn' : 'danger')
const pct = (n) => `${n.toFixed(0)}%`
</script>

<template>
  <div class="frm-renderer">
    <div class="frm-head">
      <div class="frm-head-main">
        <h3>
          <i :class="form.icon"></i>
          {{ t(form.titleKey) }}
        </h3>
        <p v-if="form.descKey">{{ t(form.descKey) }}</p>
      </div>
      <div class="frm-head-stats">
        <Tag v-if="flags" severity="danger" :value="t('frm.flagCount', flags)" icon="pi pi-flag" />
        <!-- Henüz puanlanabilir cevap yokken skor rozeti gösterilmez: boş bir
             formda "Skor: %0" yanıltıcı olurdu (bölüm rozetleriyle aynı kural). -->
        <Tag
          v-if="form.scored && score.max"
          :severity="scoreSeverity(score.pct)"
          :value="`${t('frm.score')}: ${pct(score.pct)}`"
        />
      </div>
    </div>

    <div v-if="!readonly" class="frm-progress">
      <ProgressBar :value="prog.pct" :show-value="false" />
      <span>{{ t('frm.progress', prog.answered, prog.total) }}</span>
    </div>

    <Message v-if="errorCount" severity="error" :closable="false" class="frm-summary">
      {{ t('frm.errSummary', errorCount) }}
    </Message>

    <Panel
      v-for="section in form.sections"
      :key="section.key"
      toggleable
      class="frm-section"
      :pt="{ header: { class: 'frm-section-head' } }"
    >
      <template #header>
        <div class="frm-section-title">
          <span>{{ t(section.titleKey) }}</span>
          <Tag
            v-if="form.scored && sectionScore(section.key)?.max"
            :severity="scoreSeverity(sectionScore(section.key).pct)"
            :value="pct(sectionScore(section.key).pct)"
            class="frm-section-score"
          />
        </div>
      </template>

      <QuestionField
        v-for="question in section.questions"
        :key="question.key"
        :question="question"
        :answers="answers"
        :errors="errors"
        :readonly="readonly"
        @change="(k, v) => emit('change', k, v)"
      />
    </Panel>
  </div>
</template>

<style scoped>
.frm-renderer {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.frm-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.frm-head-main h3 {
  margin: 0;
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.frm-head-main p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--lp-text-muted);
  max-width: 60ch;
}
.frm-head-stats {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.frm-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.frm-progress :deep(.p-progressbar) {
  flex: 1;
  height: 8px;
}
.frm-progress span {
  font-size: 0.76rem;
  color: var(--lp-text-muted);
  white-space: nowrap;
}
.frm-summary {
  margin: 0;
}
.frm-section-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  font-size: 0.9rem;
}
.frm-section-score {
  font-variant-numeric: tabular-nums;
}
</style>
