// Oturumdaki kullanıcı.
//
// Gerçek LinePulse'da kimlik cookie/session ile taşınıyor ve roller
// `RoleMenu/GetUserRoleMenus` ucundan geliyor. API bağlanana kadar sabit bir
// demo kullanıcı dönüyoruz; bağlandığında değişecek TEK yer burası.
//
// Rol adları LinePulse'takilerle hizalanmalı — şimdilik varsayım:
//   operator   : kendi doldurduklarını görür
//   supervisor : kendi hattının kayıtlarını görür
//   admin      : hepsini görür, kalıcı silebilir

import { ref, computed } from 'vue'

export const ROLES = {
  OPERATOR: 'operator',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
}

// Demo kullanıcı. formTemplates.PEOPLE listesindeki bir isimle eşleşiyor ki
// "kendi kayıtlarım" filtresi demo verisinde de anlamlı çalışsın.
const DEMO_USER = {
  id: 'u-demo',
  name: 'Ayşe Demir',
  roles: [ROLES.SUPERVISOR],
  lines: ['Link-up 38'],
}

const user = ref(DEMO_USER)

export const currentUser = computed(() => user.value)

export const hasRole = (role) => user.value?.roles?.includes(role) ?? false

/**
 * Kullanıcıyı değiştirir. Bugün sadece demo/test için; API bağlandığında
 * oturum yanıtını buraya yazacak.
 */
export function setCurrentUser(next) {
  user.value = next
}
