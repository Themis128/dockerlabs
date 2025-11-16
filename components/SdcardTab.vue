<template>
  <div class="tab-content">
    <h2>SD Card Management</h2>
    <div class="test-section">
      <h3>Detected SD Cards</h3>
      <div class="button-group">
        <button type="button" class="btn btn-primary" @click="refreshSdcards">
          Refresh SD Cards
        </button>
      </div>
      <div class="pi-list" v-if="loading">
        <p class="loading">Loading SD cards...</p>
      </div>
      <div class="pi-list" v-else-if="sdcards.length === 0">
        <p class="empty">No SD cards detected. Click "Refresh SD Cards" to scan.</p>
      </div>
      <div class="pi-list" v-else>
        <div v-for="card in sdcards" :key="card.device_id" class="pi-card">
          <h3>{{ card.device_id }}</h3>
          <div class="pi-details">
            <p v-if="card.size"><strong>Size:</strong> {{ card.size }}</p>
            <p v-if="card.label"><strong>Label:</strong> {{ card.label }}</p>
            <p v-if="card.filesystem"><strong>Filesystem:</strong> {{ card.filesystem }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { listSdcards } = useApi()

const sdcards = ref<any[]>([])
const loading = ref(false)
let isLoadingSdcards = false // Guard to prevent multiple simultaneous loads

const refreshSdcards = async () => {
  // Prevent multiple simultaneous calls
  if (isLoadingSdcards) {
    return
  }

  isLoadingSdcards = true
  loading.value = true

  try {
    const response = await listSdcards()

    // Handle both response formats: {success, data: {sdcards}} and {success, sdcards}
    if (response.success) {
      const sdcardsData = response.data?.sdcards || response.sdcards || []
      if (Array.isArray(sdcardsData)) {
        sdcards.value = sdcardsData
      } else {
        console.error('Failed to load SD cards: Invalid response format - sdcards data not found')
        sdcards.value = []
      }
    } else {
      const errorMsg = response.error || 'Failed to load SD cards'
      console.error('Failed to load SD cards:', errorMsg)
      sdcards.value = []
    }
  } catch (error) {
    console.error('Error loading SD cards:', error)
    sdcards.value = []
  } finally {
    loading.value = false
    isLoadingSdcards = false
  }
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
</style>
