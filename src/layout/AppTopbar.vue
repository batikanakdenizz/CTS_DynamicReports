<script setup>
defineProps({
  title: { type: String, default: 'Reports' }
})
</script>

<template>
  <header class="lp-topbar">
    <div class="lp-topbar-title">{{ title }}</div>
    <div class="lp-topbar-right">
      <button class="lp-icon-btn" title="Search"><i class="pi pi-search"></i></button>
      <button class="lp-icon-btn" title="Notifications"><i class="pi pi-bell"></i></button>
      <button class="lp-icon-btn" title="Settings"><i class="pi pi-cog"></i></button>
      <div class="lp-avatar">AD</div>
    </div>
  </header>
</template>
