<script setup>
import SelectButton from 'primevue/selectbutton'
import { locale, setLocale, LOCALES, t } from '../lib/i18n.js'
import { isDark, toggleDark } from '../lib/theme.js'

defineProps({
  title: { type: String, default: 'Reports' }
})

function onLang(val) {
  if (val) setLocale(val)
}
</script>

<template>
  <header class="lp-topbar">
    <div class="lp-topbar-title">{{ title }}</div>
    <div class="lp-topbar-right">
      <SelectButton
        :modelValue="locale"
        :options="LOCALES"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        @update:modelValue="onLang"
        :aria-label="t('topbar.lang')"
        class="lp-lang"
      />
      <button
        class="lp-icon-btn"
        :title="isDark ? t('topbar.light') : t('topbar.dark')"
        :aria-label="isDark ? t('topbar.light') : t('topbar.dark')"
        @click="toggleDark"
      >
        <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
      </button>
      <button class="lp-icon-btn" title="Notifications"><i class="pi pi-bell"></i></button>
      <div class="lp-avatar">AD</div>
    </div>
  </header>
</template>

<style scoped>
.lp-lang :deep(.p-togglebutton) {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
