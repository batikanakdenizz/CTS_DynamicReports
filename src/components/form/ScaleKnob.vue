<script setup>
// Çentikli kadran. PrimeVue Knob'un ölçek etiketi desteği yok: kullanıcı
// seçim yapmadan hangi sayının nerede olduğunu göremiyor. Knob'u aynen
// kullanıp üstüne çentik + sayı çizen bir SVG bindiriyoruz.
//
// Geometri Knob'un kendi kaynağından alındı (primevue/knob):
//   viewBox 0 0 100 100, merkez (50,50), yarıçap 40
//   minRadians = 4π/3, maxRadians = -π/3  → saat yönünde 300° süpürme
//   nokta: x = 50 + cos(a)·r , y = 50 - sin(a)·r   (SVG'de y aşağı büyür)
// Aynı sabitler kullanılmazsa çentikler yayla hizalanmaz.
import { computed } from 'vue'
import Knob from 'primevue/knob'

const MIN_RAD = (4 * Math.PI) / 3
const MAX_RAD = -Math.PI / 3

// Etiketlerin sığması için kadranın her yanında bırakılan boşluk (px).
const PAD = 26
// Etiket punto hedefi (px) — viewBox birimine çevriliyor, kadran boyutu
// değişse de ekranda aynı büyüklükte kalsın diye.
const LABEL_PX = 12
// Bundan fazla çentikte her sayıyı yazmak okunmaz hâle geliyor.
const MAX_LABELS = 11

const props = defineProps({
  modelValue: { type: Number, default: null },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  size: { type: Number, default: 96 },
  invalid: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const boxPx = computed(() => props.size + PAD * 2)
// viewBox birimi = size/100 px. Boşluğu da birime çevirince ölçek korunur.
const vbPad = computed(() => (PAD * 100) / props.size)
const viewBox = computed(
  () => `${-vbPad.value} ${-vbPad.value} ${100 + 2 * vbPad.value} ${100 + 2 * vbPad.value}`
)
const labelSize = computed(() => (LABEL_PX * 100) / props.size)

const angleOf = (v) => {
  const span = props.max - props.min
  const ratio = span === 0 ? 0 : (v - props.min) / span
  return MIN_RAD + ratio * (MAX_RAD - MIN_RAD)
}
const pointAt = (a, r) => ({ x: 50 + Math.cos(a) * r, y: 50 - Math.sin(a) * r })

const ticks = computed(() => {
  const out = []
  const step = props.step > 0 ? props.step : 1
  const count = Math.floor((props.max - props.min) / step) + 1
  // Çok fazla çentik varsa sayıları seyrelt; çizgiler yine hepsinde kalır.
  const labelEvery = count <= MAX_LABELS ? 1 : Math.ceil(count / MAX_LABELS)

  for (let i = 0; i < count; i++) {
    const value = props.min + i * step
    const a = angleOf(value)
    const inner = pointAt(a, 44)
    const outer = pointAt(a, 49)
    const label = pointAt(a, 58)
    out.push({
      value,
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      lx: label.x,
      ly: label.y,
      showLabel: i % labelEvery === 0 || i === count - 1,
    })
  }
  return out
})
</script>

<template>
  <div class="frm-knob" :class="{ 'frm-knob--invalid': invalid }" :style="{ width: `${boxPx}px` }">
    <svg class="frm-knob-scale" :viewBox="viewBox" aria-hidden="true">
      <g v-for="tick in ticks" :key="tick.value">
        <line
          :x1="tick.x1"
          :y1="tick.y1"
          :x2="tick.x2"
          :y2="tick.y2"
          :class="{ on: tick.value === modelValue }"
        />
        <text
          v-if="tick.showLabel"
          :x="tick.lx"
          :y="tick.ly"
          :font-size="labelSize"
          text-anchor="middle"
          dominant-baseline="central"
          :class="{ on: tick.value === modelValue }"
        >
          {{ tick.value }}
        </text>
      </g>
    </svg>

    <Knob
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :size="size"
      class="frm-knob-dial"
      @update:modelValue="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.frm-knob {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
}
/* Ölçek altta durur ve tıklamayı yutmaz — kadranı sürüklemek serbest kalsın. */
.frm-knob-scale {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* --lp-border (#e2e8f0) bu incelikteki çizgide beyaz zeminde kayboluyordu;
   çentikler etiketlerle aynı gri tonda olmalı ki ölçek okunsun. */
.frm-knob-scale line {
  stroke: var(--lp-text-muted);
  stroke-width: 1.5;
  stroke-linecap: round;
}
.frm-knob-scale line.on {
  stroke: var(--p-primary-500);
  stroke-width: 2.5;
}
.frm-knob-scale text {
  fill: var(--lp-text-muted);
  font-variant-numeric: tabular-nums;
}
.frm-knob-scale text.on {
  fill: var(--p-primary-500);
  font-weight: 700;
}
.frm-knob--invalid .frm-knob-scale line {
  stroke: var(--p-red-400);
}
.frm-knob-dial {
  position: relative;
}
</style>
