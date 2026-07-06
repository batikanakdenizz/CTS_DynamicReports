// Basit dark-mode durumu (reactive). PrimeVue darkModeSelector '.dark-mode'
// olduğu için <html>'e bu sınıfı ekleyip çıkarırız; ayrıca style.css'teki lp-*
// değişkenleri de .dark-mode altında override edilir. Tercih localStorage'da tutulur.
import { ref } from 'vue'

const KEY = 'cr-dark'
export const isDark = ref(false)

export function applyDark(v) {
  isDark.value = v
  document.documentElement.classList.toggle('dark-mode', v)
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch { /* gizli mod / kota — sessiz geç */ }
}

export function toggleDark() {
  applyDark(!isDark.value)
}

// İlk açılış: kayıtlı tercih varsa onu, yoksa işletim sistemi tercihini uygula.
export function initTheme() {
  let v = false
  try {
    const s = localStorage.getItem(KEY)
    if (s === '1') v = true
    else if (s === null) v = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch { /* yok say */ }
  applyDark(v)
}
