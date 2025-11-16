<template>
  <div class="tab-content">
    <h2>Raspberry Pi Devices</h2>
    <div class="pi-list" v-if="loading">
      <p class="loading">Loading Raspberry Pis...</p>
    </div>
    <div class="pi-list" v-else-if="pis.length === 0">
      <p class="empty">No Raspberry Pis found</p>
    </div>
    <div class="pi-list" v-else>
      <div v-for="pi in pis" :key="pi.number" class="pi-card">
        <h3>{{ pi.hostname || `Pi ${pi.number}` }}</h3>
        <div class="pi-details">
          <p><strong>IP:</strong> {{ pi.ip || 'N/A' }}</p>
          <p><strong>MAC:</strong> {{ pi.mac || 'N/A' }}</p>
          <p><strong>Status:</strong> {{ pi.status || 'unknown' }}</p>
          <p v-if="pi.model"><strong>Model:</strong> {{ pi.model }}</p>
        </div>
      </div>
    </div>
    <button type="button" class="btn btn-primary" @click="refreshPis">
      Refresh List
    </button>
  </div>
</template>

<script setup lang="ts">
// Use the usePis composable which properly manages state through Pinia store
const { pis, loading, loadPis, refreshPis } = usePis()

// Watch for tab activation and load data only when this tab is active
const uiStore = useUIStore()
const isActive = computed(() => uiStore.activeTab === 'pis')

// Load data when tab becomes active
watch(isActive, (active) => {
  if (process.dev) {
    console.log('[PisTab] Tab active state changed:', active);
  }
  if (active && !loading.value) {
    if (process.dev) {
      console.log('[PisTab] Loading Pis data...');
    }
    loadPis()
  }
}, { immediate: true })

// Also load on mount if already active
onMounted(() => {
  if (isActive.value && !loading.value) {
    loadPis()
  }
})
</script>

<style scoped>
.tab-content {
  padding: 24px;
}

.pi-list {
  margin-bottom: 24px;
}

.loading,
.empty {
  text-align: center;
  padding: 40px;
  color: var(--win11-text-secondary);
}

.pi-card {
  background: var(--win11-bg-secondary);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--win11-border);
  margin-bottom: 16px;
}

.pi-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--win11-accent);
}

.pi-details p {
  margin: 8px 0;
  font-size: 14px;
}

.pi-details strong {
  color: var(--win11-text-secondary);
  margin-right: 8px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--win11-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--win11-accent-hover);
}
</style>
