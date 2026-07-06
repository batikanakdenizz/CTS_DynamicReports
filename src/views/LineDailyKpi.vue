<script setup>
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { FilterMatchMode } from '@primevue/core/api'
import { generateRows, COLUMNS, LINE_OPTIONS } from '../data/dummyData.js'

const startDate = ref(new Date(2026, 5, 6))
const endDate = ref(new Date(2026, 6, 5))
const selectedLines = ref(LINE_OPTIONS.map((o) => o.value))

const allRows = ref(generateRows(30))
const rows = ref([])

// Kolon bazlı filtreler
const filters = ref(buildFilters())
function buildFilters() {
  const f = { global: { value: null, matchMode: FilterMatchMode.CONTAINS } }
  for (const c of COLUMNS) {
    f[c.field] = { value: null, matchMode: c.type === 'text' ? FilterMatchMode.CONTAINS : FilterMatchMode.EQUALS }
  }
  return f
}

function generate() {
  const lines = selectedLines.value
  rows.value = allRows.value.filter((r) => lines.includes(r.line))
}
generate() // ilk yüklemede dolu gelsin

const columns = COLUMNS

const nf = new Intl.NumberFormat('en-US')
function fmt(val, type) {
  if (val === null || val === undefined) return ''
  if (type === 'pct') return Number(val).toFixed(2)
  if (type === 'num') return nf.format(val)
  return val
}

const totalRecords = computed(() => rows.value.length)
</script>

<template>
  <div>
    <div class="lp-page-head">
      <div>
        <h1 class="lp-page-title">Line Daily KPI</h1>
        <div class="lp-breadcrumb">Reports · General Reports · Line Daily KPI</div>
      </div>
    </div>

    <!-- Filtre çubuğu -->
    <div class="lp-filter-bar">
      <div class="lp-field">
        <label>Start Date</label>
        <DatePicker v-model="startDate" dateFormat="dd.mm.yy" showIcon :style="{ width: '170px' }" />
      </div>
      <div class="lp-field">
        <label>End Date</label>
        <DatePicker v-model="endDate" dateFormat="dd.mm.yy" showIcon :style="{ width: '170px' }" />
      </div>
      <div class="lp-field">
        <label>Line</label>
        <MultiSelect
          v-model="selectedLines"
          :options="LINE_OPTIONS"
          optionLabel="label"
          optionValue="value"
          placeholder="Select lines"
          :maxSelectedLabels="2"
          :style="{ width: '240px' }"
        />
      </div>
      <div class="lp-filter-actions">
        <Button label="Generate Report" icon="pi pi-play" @click="generate" />
        <Button
          icon="pi pi-file-excel"
          severity="success"
          v-tooltip.top="'Export Excel'"
          aria-label="Export"
        />
        <Button icon="pi pi-filter-slash" severity="secondary" outlined aria-label="Clear filters" />
      </div>
    </div>

    <!-- Tablo -->
    <div class="lp-card">
      <div class="lp-table-toolbar">
        <h3>{{ totalRecords }} records</h3>
        <span class="p-input-icon-left">
          <InputText v-model="filters.global.value" placeholder="Search all..." :style="{ width: '220px' }" />
        </span>
      </div>

      <DataTable
        :value="rows"
        v-model:filters="filters"
        :globalFilterFields="columns.map((c) => c.field)"
        paginator
        :rows="15"
        :rowsPerPageOptions="[10, 15, 25, 50]"
        removableSort
        scrollable
        scrollHeight="flex"
        showGridlines
        size="small"
        filterDisplay="menu"
        :style="{ fontSize: '0.82rem' }"
      >
        <Column
          v-for="col in columns"
          :key="col.field"
          :field="col.field"
          :header="col.header"
          sortable
          :style="{ minWidth: col.type === 'text' ? '130px' : '120px', whiteSpace: 'nowrap' }"
        >
          <template #body="{ data }">
            <span :style="{ fontVariantNumeric: 'tabular-nums' }">{{ fmt(data[col.field], col.type) }}</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
