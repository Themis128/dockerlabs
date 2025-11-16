<template>
  <div class="tab-content">
    <h2>SD Card Management</h2>
    <div class="test-section">
      <h3>Detected SD Cards</h3>
      <div class="button-group">
        <button type="button" class="btn btn-primary" @click="refreshSdcards" :disabled="loading">
          <span v-if="loading">Loading...</span>
          <span v-else>Refresh SD Cards</span>
        </button>
      </div>

      <!-- Error message -->
      <ErrorMessage v-if="error" :message="error" />

      <!-- Loading state -->
      <div class="pi-list" v-if="loading">
        <p class="loading">Loading SD cards...</p>
      </div>

      <!-- Empty state -->
      <div class="pi-list" v-else-if="sdcards.length === 0 && !error">
        <p class="empty">No SD cards detected. Click "Refresh SD Cards" to scan.</p>
      </div>

      <!-- SD Cards list -->
      <div class="pi-list" v-else-if="sdcards.length > 0">
        <div v-for="card in sdcards" :key="card.deviceId || card.device_id" class="pi-card">
          <h3>{{ card.name || card.deviceId || card.device_id || 'Unknown Device' }}</h3>
          <div class="pi-details">
            <p v-if="card.deviceId || card.device_id">
              <strong>Device ID:</strong> {{ card.deviceId || card.device_id }}
            </p>
            <p v-if="card.size || card.sizeFormatted">
              <strong>Size:</strong> {{ formatSize(card.size) || card.sizeFormatted || card.size }}
            </p>
            <p v-if="card.label">
              <strong>Label:</strong> {{ card.label }}
            </p>
            <p v-if="card.fileSystem || card.filesystem">
              <strong>Filesystem:</strong> {{ card.fileSystem || card.filesystem }}
            </p>
            <p v-if="card.mountPoint">
              <strong>Mount Point:</strong> {{ card.mountPoint }}
            </p>
            <p v-if="card.available !== undefined">
              <strong>Available:</strong>
              <span :class="card.available ? 'status-available' : 'status-unavailable'">
                {{ card.available ? 'Yes' : 'No' }}
              </span>
            </p>
            <p v-if="card.removable !== undefined">
              <strong>Removable:</strong> {{ card.removable ? 'Yes' : 'No' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Use the useSdcards composable which properly manages state through Pinia store
const {
  sdcards,
  loading,
  error,
  loadSdcards,
  refreshSdcards,
} = useSdcards()

// Watch for tab activation and load data only when this tab is active
const uiStore = useUIStore()
const isActive = computed(() => uiStore.activeTab === 'sdcard')

// Load data when tab becomes active
watch(isActive, (active) => {
  if (process.dev) {
    console.log('[SdcardTab] Tab active state changed:', active);
  }
  if (active && !loading.value) {
    if (process.dev) {
      console.log('[SdcardTab] Loading SD cards data...');
    }
    loadSdcards()
  }
}, { immediate: true })

// Also load on mount if already active
onMounted(() => {
  if (isActive.value && !loading.value) {
    loadSdcards()
  }
})

// Format size in bytes to human-readable format
const formatSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}
</script>

<style scoped>
.tab-content {
  padding: 24px;
}

.test-section {
  margin-bottom: 24px;
}

.button-group {
  margin-bottom: 16px;
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

.pi-list {
  margin-top: 16px;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-available {
  color: #4caf50;
  font-weight: 500;
}

.status-unavailable {
  color: #f44336;
  font-weight: 500;
}
</style>
