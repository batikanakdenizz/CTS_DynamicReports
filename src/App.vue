<script setup>
import { ref, computed } from 'vue'
import AppSidebar from './layout/AppSidebar.vue'
import AppTopbar from './layout/AppTopbar.vue'
import LineDailyKpi from './views/LineDailyKpi.vue'
import CustomReport from './views/CustomReport.vue'

// Basit view yönlendirme (router yerine): sidebar 'active' anahtarını view'e eşler.
const active = ref('line-daily-kpi')

const VIEWS = {
  'line-daily-kpi': { comp: LineDailyKpi, title: 'Reports · Line Daily KPI' },
  'custom-report': { comp: CustomReport, title: 'Reports · Custom Report' },
}

const current = computed(() => VIEWS[active.value] || null)
const title = computed(() => current.value?.title || 'LinePulse')
</script>

<template>
  <div class="lp-layout">
    <AppSidebar v-model:active="active" />
    <div class="lp-main">
      <AppTopbar :title="title" />
      <main class="lp-content">
        <component :is="current.comp" v-if="current" />
        <div v-else class="lp-card lp-placeholder">
          <i class="pi pi-wrench"></i>
          <p>Bu ekran şablonda yok — <b>{{ active }}</b>.</p>
          <p class="lp-placeholder-sub">Demo kabuğunda sadece Line Daily KPI ve Custom Report bağlı.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
.lp-placeholder {
  padding: 3rem 1.5rem;
  text-align: center;
  color: var(--lp-text-muted);
}
.lp-placeholder .pi {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}
.lp-placeholder-sub {
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
</style>
