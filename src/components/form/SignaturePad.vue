<script setup>
// İmza alanı — PrimeVue'da karşılığı olmadığı için elle yazıldı.
// Değer bir PNG data URL'i; localStorage'a ve PDF'e olduğu gibi gider.
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Button from 'primevue/button'
import { t } from '../../lib/i18n.js'

const props = defineProps({
  modelValue: { type: String, default: null },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const canvas = ref(null)
const wrap = ref(null)
let ctx = null
let drawing = false
let dirty = false

// Kâğıt her zaman beyaz, kalem her zaman koyu: koyu temada da imza okunur
// kalsın ve PDF'e basıldığında zemin kaybolmasın diye tema takip edilmiyor.
const PAPER = '#ffffff'
const INK = '#1e293b'

function setupCanvas() {
  const el = canvas.value
  if (!el || !wrap.value) return
  const dpr = window.devicePixelRatio || 1
  const w = wrap.value.clientWidth
  const h = 150
  el.width = w * dpr
  el.height = h * dpr
  el.style.width = `${w}px`
  el.style.height = `${h}px`
  ctx = el.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = INK
  paintBackground(w, h)
  if (props.modelValue) restore()
}

function paintBackground(w, h) {
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = INK
}

function restore() {
  const img = new Image()
  img.onload = () => {
    const el = canvas.value
    if (!el) return
    ctx.drawImage(img, 0, 0, el.width / (window.devicePixelRatio || 1), 150)
  }
  img.src = props.modelValue
}

const pos = (e) => {
  const r = canvas.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function start(e) {
  if (props.readonly) return
  drawing = true
  canvas.value.setPointerCapture(e.pointerId)
  const { x, y } = pos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  // Tek dokunuş da nokta bıraksın (imza atmadan sadece tıklayanlar için)
  ctx.lineTo(x + 0.1, y)
  ctx.stroke()
  dirty = true
}

function move(e) {
  if (!drawing) return
  const { x, y } = pos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function end(e) {
  if (!drawing) return
  drawing = false
  try {
    canvas.value.releasePointerCapture(e.pointerId)
  } catch {
    /* yok say */
  }
  if (dirty) emit('update:modelValue', canvas.value.toDataURL('image/png'))
}

function clear() {
  const el = canvas.value
  if (!el) return
  paintBackground(el.width / (window.devicePixelRatio || 1), 150)
  dirty = false
  emit('update:modelValue', null)
}

// Dışarıdan sıfırlanırsa (form Reset) tuvali de temizle.
watch(
  () => props.modelValue,
  (v) => {
    if (!v && ctx && !drawing) {
      const el = canvas.value
      paintBackground(el.width / (window.devicePixelRatio || 1), 150)
      dirty = false
    }
  }
)

let ro = null
onMounted(() => {
  setupCanvas()
  // Sidebar/drawer açılıp kapanınca genişlik değişir; yeniden ölçeklemezsek
  // çizim kayar. Tuval boyutu değişimi içeriği sıfırladığı için imza varken
  // yeniden yükleniyor (restore).
  ro = new ResizeObserver(() => setupCanvas())
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="wrap" class="frm-sign" :class="{ 'frm-sign--invalid': invalid }">
    <!-- İmzasız kayıtta boş <img> kırık görsel gibi durur; tire göster. -->
    <img v-if="readonly && modelValue" :src="modelValue" class="frm-sign-img" alt="" />
    <span v-else-if="readonly" class="frm-sign-empty">-</span>
    <template v-else>
      <canvas
        ref="canvas"
        class="frm-sign-canvas"
        @pointerdown="start"
        @pointermove="move"
        @pointerup="end"
        @pointerleave="end"
      ></canvas>
      <div class="frm-sign-bar">
        <span class="frm-sign-hint">{{ t('frm.signHint') }}</span>
        <Button
          size="small"
          severity="secondary"
          text
          icon="pi pi-eraser"
          :label="t('frm.clear')"
          @click="clear"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.frm-sign {
  width: 100%;
}
.frm-sign-canvas {
  display: block;
  width: 100%;
  border: 1px solid var(--lp-border);
  border-radius: 8px;
  background: #fff;
  touch-action: none;
  cursor: crosshair;
}
.frm-sign--invalid .frm-sign-canvas {
  border-color: var(--p-red-400);
}
.frm-sign-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.25rem;
}
.frm-sign-hint {
  font-size: 0.75rem;
  color: var(--lp-text-muted);
}
.frm-sign-empty {
  font-size: 0.88rem;
  color: var(--lp-text-muted);
}
.frm-sign-img {
  max-width: 260px;
  border: 1px solid var(--lp-border);
  border-radius: 8px;
  background: #fff;
}
</style>
