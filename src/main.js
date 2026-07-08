import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import { initTheme } from './lib/theme.js'
import { initI18n } from './lib/i18n.js'

// Kayıtlı tema / dil tercihini mount'tan önce uygula (flash olmasın)
initTheme()
initI18n()

// LinePulse teması: PrimeVue Aura tabanı, blue primary + slate surface.
// Renkler LinePulse'un gerçek CSS'inden (index-CBK92lIB.css) alınmıştır.
const LinePulsePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        }
      },
      // Koyu tema yüzeyleri kabuğun lacivert tonlarıyla hizalı (style.css .dark-mode):
      // 950 = --lp-bg, 900 = --lp-surface, 700 = --lp-border. Tanımlanmazsa Aura
      // varsayılan nötr griye düşer ve Drawer/panel'ler kabukla uyumsuz görünür.
      dark: {
        surface: {
          0: '#ffffff',
          50: '#f1f5fa',
          100: '#e2e8f2',
          200: '#c6d1e2',
          300: '#9fb0c9',
          400: '#7189a8',
          500: '#4d6890',
          600: '#375179',
          700: '#243449',
          800: '#1a2740',
          900: '#131c2e',
          950: '#0b1220'
        }
      }
    }
  }
})

const app = createApp(App)
app.use(PrimeVue, {
  theme: {
    preset: LinePulsePreset,
    options: { darkModeSelector: '.dark-mode' }
  }
})
app.directive('tooltip', Tooltip)
app.mount('#app')
