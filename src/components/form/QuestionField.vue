<script setup>
// Tek bir sorunun tamamı: etiket + kontrol + ipucu + hata + koşullu takip bloğu.
//
// Registry'deki tipi PrimeVue bileşenine bağlayan TEK yer burasıdır. Yeni bir
// soru tipi eklerken dokunulacak iki dosya: data/questionTypes.js (tanım) ve
// bu dosya (çizim). Motor ve şablonlar değişmez.
import { computed, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import MultiSelect from 'primevue/multiselect'
import RadioButton from 'primevue/radiobutton'
import Checkbox from 'primevue/checkbox'
import ToggleSwitch from 'primevue/toggleswitch'
import Slider from 'primevue/slider'
import Rating from 'primevue/rating'
import AutoComplete from 'primevue/autocomplete'
import Message from 'primevue/message'
import PhotoField from './PhotoField.vue'
import SignaturePad from './SignaturePad.vue'
import ScaleKnob from './ScaleKnob.vue'

import { PEOPLE } from '../../data/formTemplates.js'
import { isFlagged, noteKeyOf, photoKeyOf, formatAnswer } from '../../lib/formEngine.js'
import { t, locale } from '../../lib/i18n.js'

// InputNumber yereli aksi hâlde TARAYICI diline düşer: uygulama EN'e alınsa
// bile ondalık ayracı virgül kalırdı. Uygulama diline bağlıyoruz.
const numberLocale = computed(() => (locale.value === 'tr' ? 'tr-TR' : 'en-US'))

const props = defineProps({
  question: { type: Object, required: true },
  // Tüm cevap haritası: takip alanlarına (q__note / q__photo) da erişmek için
  // tek tek v-model yerine bütünü alıyoruz.
  answers: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['change'])

const q = computed(() => props.question)
const value = computed(() => props.answers[q.value.key])
const error = computed(() => props.errors[q.value.key])

const flagged = computed(() => isFlagged(q.value, value.value))
const noteKey = computed(() => noteKeyOf(q.value.key))
const photoKey = computed(() => photoKeyOf(q.value.key))

const set = (v) => emit('change', q.value.key, v)
const setKey = (k, v) => emit('change', k, v)

// Seçenek etiketleri şablonlarda i18n anahtarı olarak durur; çeviri render
// anında yapılır ki dil değişince listeler de değişsin.
const options = computed(() => (q.value.options || []).map((o) => ({ ...o, label: t(o.labelKey) })))

const readonlyText = computed(() => formatAnswer(q.value, value.value, t))

// AutoComplete (person) — basit içerir-filtresi
const personSuggestions = ref([...PEOPLE])
const searchPerson = (e) => {
  const s = (e.query || '').toLocaleLowerCase('tr')
  personSuggestions.value = PEOPLE.filter((p) => p.toLocaleLowerCase('tr').includes(s))
}

const complianceSeverity = (v) =>
  ({ ok: 'frm-opt--ok', ng: 'frm-opt--ng', na: 'frm-opt--na' })[v] || ''
</script>

<template>
  <div class="frm-q" :class="{ 'frm-q--flagged': flagged, 'frm-q--info': q.type === 'info' }">
    <!-- info: cevabı olmayan talimat kutusu -->
    <Message v-if="q.type === 'info'" severity="info" :closable="false">
      {{ t(q.labelKey) }}
    </Message>

    <template v-else>
      <label class="frm-q-label" :for="q.key">
        {{ t(q.labelKey) }}
        <!-- Zorunluluk yıldızı sadece doldurma modunda: kayıt görüntülerken
             artık doldurulacak bir şey yok, yıldız gürültü olur. -->
        <span v-if="q.required && !readonly" class="frm-req">*</span>
      </label>
      <small v-if="q.hintKey" class="frm-q-hint">{{ t(q.hintKey) }}</small>

      <!-- Salt okunur mod: metinleşmiş cevap, medya alanları kendi görünümüyle -->
      <template v-if="readonly">
        <PhotoField v-if="q.type === 'photo'" :model-value="value || []" readonly />
        <SignaturePad v-else-if="q.type === 'signature'" :model-value="value" readonly />
        <div v-else class="frm-q-ro">{{ readonlyText }}</div>
      </template>

      <template v-else>
        <InputText
          v-if="q.type === 'text'"
          :id="q.key"
          :model-value="value"
          :invalid="!!error"
          class="frm-w"
          @update:modelValue="set"
        />

        <Textarea
          v-else-if="q.type === 'textarea'"
          :id="q.key"
          :model-value="value"
          :invalid="!!error"
          rows="3"
          auto-resize
          class="frm-w"
          @update:modelValue="set"
        />

        <!-- min/max BİLEREK bileşene verilmiyor: InputNumber onları kırpar ve
             tolerans dışı bir ölçüm (ör. 95 °C) sessizce 90'a çekilirdi. Saha
             formunda aralık dışı değer gizlenmemeli, kaydedilip uyarılmalı —
             kontrolü formEngine.validateForm yapıyor (frm.err.range). -->
        <InputNumber
          v-else-if="q.type === 'number' || q.type === 'decimal'"
          :id="q.key"
          :model-value="value"
          :invalid="!!error"
          :locale="numberLocale"
          :min-fraction-digits="q.type === 'decimal' ? 1 : 0"
          :max-fraction-digits="q.type === 'decimal' ? 2 : 0"
          :step="q.step || 1"
          show-buttons
          button-layout="horizontal"
          increment-button-icon="pi pi-plus"
          decrement-button-icon="pi pi-minus"
          class="frm-w"
          @update:modelValue="set"
        />

        <DatePicker
          v-else-if="q.type === 'date'"
          :id="q.key"
          :model-value="value"
          :invalid="!!error"
          date-format="dd.mm.yy"
          show-icon
          class="frm-w"
          @update:modelValue="set"
        />

        <DatePicker
          v-else-if="q.type === 'time'"
          :id="q.key"
          :model-value="value"
          :invalid="!!error"
          time-only
          show-icon
          icon-display="input"
          class="frm-w"
          @update:modelValue="set"
        />

        <DatePicker
          v-else-if="q.type === 'datetime'"
          :id="q.key"
          :model-value="value"
          :invalid="!!error"
          date-format="dd.mm.yy"
          show-time
          hour-format="24"
          show-icon
          class="frm-w"
          @update:modelValue="set"
        />

        <!-- compliance: renk kodlu buton grubu (Uygun / Uygun Değil / N-A) -->
        <SelectButton
          v-else-if="q.type === 'compliance'"
          :model-value="value"
          :options="options"
          option-label="label"
          option-value="value"
          :invalid="!!error"
          class="frm-compliance"
          @update:modelValue="set"
        >
          <template #option="{ option }">
            <span :class="complianceSeverity(option.value)">{{ option.label }}</span>
          </template>
        </SelectButton>

        <SelectButton
          v-else-if="q.type === 'yesno' || q.type === 'selectbutton'"
          :model-value="value"
          :options="options"
          option-label="label"
          option-value="value"
          :invalid="!!error"
          @update:modelValue="set"
        />

        <div v-else-if="q.type === 'radio'" class="frm-radio-list">
          <div v-for="o in options" :key="o.value" class="frm-radio">
            <RadioButton
              :input-id="`${q.key}_${o.value}`"
              :model-value="value"
              :value="o.value"
              :invalid="!!error"
              @update:modelValue="set"
            />
            <label :for="`${q.key}_${o.value}`">{{ o.label }}</label>
          </div>
        </div>

        <Select
          v-else-if="q.type === 'select'"
          :id="q.key"
          :model-value="value"
          :options="options"
          option-label="label"
          option-value="value"
          :invalid="!!error"
          :placeholder="t('frm.choose')"
          show-clear
          class="frm-w"
          @update:modelValue="set"
        />

        <MultiSelect
          v-else-if="q.type === 'multiselect'"
          :id="q.key"
          :model-value="value"
          :options="options"
          option-label="label"
          option-value="value"
          :invalid="!!error"
          :placeholder="t('frm.chooseMulti')"
          :max-selected-labels="2"
          :selected-items-label="t('frm.selectedCount', '{0}')"
          display="chip"
          class="frm-w"
          @update:modelValue="set"
        />

        <div v-else-if="q.type === 'checkbox'" class="frm-inline">
          <Checkbox
            :input-id="q.key"
            :model-value="value"
            binary
            :invalid="!!error"
            @update:modelValue="set"
          />
          <label :for="q.key">{{ t('frm.confirm') }}</label>
        </div>

        <div v-else-if="q.type === 'switch'" class="frm-inline">
          <ToggleSwitch :model-value="value" @update:modelValue="set" />
          <span class="frm-switch-state">{{ t(value ? 'opt.yes' : 'opt.no') }}</span>
        </div>

        <AutoComplete
          v-else-if="q.type === 'person'"
          :id="q.key"
          :model-value="value"
          :suggestions="personSuggestions"
          :invalid="!!error"
          :placeholder="t('frm.typeName')"
          dropdown
          class="frm-w"
          @complete="searchPerson"
          @update:modelValue="set"
        />

        <div v-else-if="q.type === 'slider'" class="frm-slider">
          <Slider
            :model-value="value"
            :min="q.min ?? 0"
            :max="q.max ?? 100"
            :step="q.step || 1"
            class="frm-slider-track"
            @update:modelValue="set"
          />
          <span class="frm-slider-val">{{ value }}</span>
        </div>

        <div v-else-if="q.type === 'rating'" class="frm-inline">
          <Rating :model-value="value" :stars="q.max ?? 5" @update:modelValue="set" />
          <span class="frm-slider-val">{{ value ?? '-' }}</span>
        </div>

        <ScaleKnob
          v-else-if="q.type === 'knob'"
          :model-value="value"
          :min="q.min ?? 0"
          :max="q.max ?? 100"
          :step="q.step || 1"
          :size="96"
          :invalid="!!error"
          @update:modelValue="set"
        />

        <PhotoField
          v-else-if="q.type === 'photo'"
          :model-value="value || []"
          :invalid="!!error"
          @update:modelValue="set"
        />

        <SignaturePad
          v-else-if="q.type === 'signature'"
          :model-value="value"
          :invalid="!!error"
          @update:modelValue="set"
        />

        <div v-else class="frm-q-ro">{{ t('frm.unknownType', q.type) }}</div>
      </template>

      <small v-if="error" class="frm-err">{{ t(error) }}</small>

      <!-- Koşullu takip bloğu: riskli cevapta açıklama + fotoğraf zorunlu.
           Tek koşul kuralımız bu (genel showIf DSL'i yok). -->
      <div v-if="flagged" class="frm-followup">
        <div class="frm-followup-head">
          <i class="pi pi-flag-fill"></i>
          <span>{{ t('frm.followUp') }}</span>
        </div>

        <label class="frm-q-label" :for="noteKey">
          {{ t('frm.followUpNote') }}<span class="frm-req">*</span>
        </label>
        <template v-if="readonly">
          <div class="frm-q-ro">{{ answers[noteKey] || '-' }}</div>
        </template>
        <Textarea
          v-else
          :id="noteKey"
          :model-value="answers[noteKey]"
          :invalid="!!errors[noteKey]"
          rows="2"
          auto-resize
          class="frm-w"
          @update:modelValue="(v) => setKey(noteKey, v)"
        />
        <small v-if="errors[noteKey]" class="frm-err">{{ t(errors[noteKey]) }}</small>

        <label class="frm-q-label">
          {{ t('frm.followUpPhoto') }}<span class="frm-req">*</span>
        </label>
        <PhotoField
          :model-value="answers[photoKey] || []"
          :readonly="readonly"
          :invalid="!!errors[photoKey]"
          @update:modelValue="(v) => setKey(photoKey, v)"
        />
        <small v-if="errors[photoKey]" class="frm-err">{{ t(errors[photoKey]) }}</small>
      </div>
    </template>
  </div>
</template>

<style scoped>
.frm-q {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 0;
  border-bottom: 1px dashed var(--lp-border);
}
.frm-q:last-child {
  border-bottom: 0;
}
.frm-q--info {
  padding: 0.5rem 0;
}
/* DİKKAT: style.css gövdeyi 14px yapıyor, yani 1rem = 14px (16px DEĞİL).
   Buradaki ölçüler ona göre. Soru metni sahada tablet üzerinden okunuyor,
   14px'in altına inmemeli; uzun 5S cümleleri için line-height şart. */
.frm-q-label {
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 600;
  color: var(--lp-text);
}
.frm-req {
  color: var(--p-red-500);
  margin-left: 0.15rem;
}
.frm-q-hint {
  font-size: 0.86rem;
  line-height: 1.4;
  color: var(--lp-text-muted);
  margin-top: -0.1rem;
}
.frm-q-ro {
  font-size: 1rem;
  line-height: 1.45;
  color: var(--lp-text-muted);
  padding: 0.15rem 0;
}
.frm-err {
  font-size: 0.86rem;
  color: var(--p-red-500);
}
.frm-w {
  width: 100%;
  max-width: 420px;
}
.frm-inline {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.frm-inline label,
.frm-switch-state {
  font-size: 0.95rem;
}
.frm-radio-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.25rem;
}
.frm-radio {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.frm-radio label {
  font-size: 0.95rem;
  cursor: pointer;
}
.frm-slider {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  max-width: 420px;
}
.frm-slider-track {
  flex: 1;
}
.frm-slider-val {
  min-width: 2.2rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.95rem;
  color: var(--lp-text-muted);
}
/* SelectButton varsayılan olarak kapsayıcıyı doldurur; invalid çerçevesi de
   sayfa boyunca uzuyordu. Butonlar kadar daralt, taşarsa alt satıra insin. */
.frm-q :deep(.p-selectbutton) {
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
}
.frm-compliance :deep(.p-togglebutton-checked) .frm-opt--ok {
  color: var(--p-green-500);
}
.frm-compliance :deep(.p-togglebutton-checked) .frm-opt--ng {
  color: var(--p-red-500);
}
.frm-q--flagged {
  background: color-mix(in srgb, var(--p-red-500) 6%, transparent);
  border-radius: 8px;
  padding-left: 0.6rem;
  padding-right: 0.6rem;
}
.frm-followup {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
  padding: 0.7rem;
  border-left: 3px solid var(--p-red-400);
  border-radius: 0 8px 8px 0;
  background: var(--lp-surface);
}
.frm-followup-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.86rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--p-red-500);
}
</style>
