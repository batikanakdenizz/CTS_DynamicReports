<script setup>
// LinePulse sol menüsü (gerçek uygulamadaki sırayla).
// active/navigasyon App.vue'de yönetilir (v-model:active).
defineProps({
  active: { type: String, default: 'line-daily-kpi' },
})
const emit = defineEmits(['update:active'])
const select = (key) => emit('update:active', key)

const menu = [
  { key: 'dashboard', label: 'Dashboard', icon: 'pi pi-th-large' },
  { key: 'timeline', label: 'Time Line', icon: 'pi pi-clock' },
  { key: 'loss-tree', label: 'Loss Tree', icon: 'pi pi-sitemap' },
  { key: 'operator', label: 'Operator Dashboard', icon: 'pi pi-user' },
  { key: 'orders', label: 'Orders', icon: 'pi pi-shopping-cart' },
]

const reportsAnalysis = [
  { key: 'pr-losses', label: 'Uptime & Losses' },
  { key: 'unplanned-downtime', label: 'Unplanned Downtime' },
  { key: 'planned-downtime', label: 'Planned Downtime' },
  { key: 'mtbf-up-stops', label: 'MTBF & Up Stops' },
]

const reportsGeneral = [
  { key: 'line-daily-kpi', label: 'Line Daily KPI' },
  { key: 'custom-report', label: 'Custom Report' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'detail', label: 'Detail' },
  { key: 'machine-timeline', label: 'Machine Timeline' },
]

// Saha denetim formları — şema tabanlı form motoru (bkz. lib/formEngine.js)
// Etiketler menünün geri kalanıyla aynı dilde (İngilizce) — sidebar i18n'e
// bağlı değil, sabit metin. Sayfa içerikleri TR/EN olarak çevriliyor.
const forms = [
  { key: 'forms-inspection', label: 'Inspection Forms' },
  { key: 'forms-gallery', label: 'Question Type Gallery' },
  { key: 'forms-responses', label: 'Saved Responses' },
]

const bottom = [
  { key: 'alarms', label: 'Alarms', icon: 'pi pi-bell' },
  { key: 'definitions', label: 'Definitions', icon: 'pi pi-cog' },
  { key: 'auth', label: 'Auth', icon: 'pi pi-lock' },
]
</script>

<template>
  <aside class="lp-sidebar">
    <div class="lp-logo">
      <span class="lp-logo-mark"><i class="pi pi-bolt"></i></span>
      LinePulse
    </div>

    <nav class="lp-nav">
      <div
        v-for="item in menu"
        :key="item.key"
        class="lp-nav-item"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">Reports · Analysis</div>
      <div
        v-for="item in reportsAnalysis"
        :key="item.key"
        class="lp-nav-item lp-nav-sub"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">Reports · General</div>
      <div
        v-for="item in reportsGeneral"
        :key="item.key"
        class="lp-nav-item lp-nav-sub"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">Forms</div>
      <div
        v-for="item in forms"
        :key="item.key"
        class="lp-nav-item lp-nav-sub"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <span>{{ item.label }}</span>
      </div>

      <div class="lp-nav-section">System</div>
      <div
        v-for="item in bottom"
        :key="item.key"
        class="lp-nav-item"
        :class="{ active: active === item.key }"
        @click="select(item.key)"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
      </div>
    </nav>
  </aside>
</template>
