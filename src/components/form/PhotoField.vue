<script setup>
// Fotoğraf alanı. Değer: data URL dizisi.
//
// Ham dosyayı base64'e çevirip saklamak localStorage'ın ~5MB kotasını tek
// fotoğrafta patlatır. Bu yüzden her görsel canvas ile MAX_EDGE'e küçültülüp
// JPEG kalite 0.7 ile yeniden kodlanır (tipik 2MB foto -> ~80KB).
import { ref } from 'vue'
import Button from 'primevue/button'
import { t } from '../../lib/i18n.js'

const MAX_EDGE = 800
const MAX_COUNT = 3
const QUALITY = 0.7

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const input = ref(null)
const busy = ref(false)

function downscale(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        const cx = c.getContext('2d')
        // Şeffaf PNG'ler JPEG'e siyah zeminle geçmesin diye önce beyaz bas.
        cx.fillStyle = '#ffffff'
        cx.fillRect(0, 0, c.width, c.height)
        cx.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', QUALITY))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function onPick(e) {
  const files = [...(e.target.files || [])]
  if (!files.length) return
  busy.value = true
  const room = MAX_COUNT - props.modelValue.length
  const next = [...props.modelValue]
  for (const f of files.slice(0, room)) {
    try {
      next.push(await downscale(f))
    } catch {
      /* okunamayan dosyayı atla */
    }
  }
  busy.value = false
  emit('update:modelValue', next)
  // Aynı dosyayı tekrar seçebilmek için input'u sıfırla.
  e.target.value = ''
}

const removeAt = (i) =>
  emit(
    'update:modelValue',
    props.modelValue.filter((_, j) => j !== i)
  )
</script>

<template>
  <div class="frm-photo" :class="{ 'frm-photo--invalid': invalid }">
    <div v-if="modelValue.length" class="frm-photo-grid">
      <div v-for="(src, i) in modelValue" :key="i" class="frm-photo-item">
        <img :src="src" alt="" />
        <button v-if="!readonly" type="button" class="frm-photo-del" @click="removeAt(i)">
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <template v-if="!readonly">
      <input
        ref="input"
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        @change="onPick"
      />
      <Button
        size="small"
        severity="secondary"
        outlined
        icon="pi pi-camera"
        :label="t('frm.addPhoto')"
        :loading="busy"
        :disabled="modelValue.length >= MAX_COUNT"
        @click="input.click()"
      />
      <span class="frm-photo-hint">{{ t('frm.photoLimit', MAX_COUNT) }}</span>
    </template>
    <span v-else-if="!modelValue.length" class="frm-photo-hint">-</span>
  </div>
</template>

<style scoped>
.frm-photo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
}
.frm-photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.frm-photo-item {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--lp-border);
}
.frm-photo--invalid .frm-photo-item {
  border-color: var(--p-red-400);
}
.frm-photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.frm-photo-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.6rem;
  padding: 0;
}
.frm-photo-hint {
  font-size: 0.72rem;
  color: var(--lp-text-muted);
}
</style>
