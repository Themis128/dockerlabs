<template>
  <div class="tab-content sdcard-tab">
    <div class="sdcard-header">
      <h2>💾 SD Card Management</h2>
      <p class="subtitle">Manage and format your SD cards for Raspberry Pi</p>
    </div>

    <!-- Controls Bar -->
    <div class="controls-bar">
      <div class="controls-left">
        <button
          type="button"
          class="btn btn-primary"
          @click="refreshSdcards"
          :disabled="loading"
        >
          <span v-if="loading">🔄 Refreshing...</span>
          <span v-else>🔄 Refresh SD Cards</span>
        </button>
        <label class="auto-refresh-toggle">
          <input
            type="checkbox"
            v-model="autoRefresh"
            @change="handleAutoRefreshChange"
          />
          <span>Auto-refresh (30s)</span>
        </label>
      </div>
      <div class="controls-right" v-if="sdcards.length > 1">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="🔍 Search SD cards..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Error message -->
    <ErrorMessage v-if="error" :message="error" />

    <!-- Loading state -->
    <div class="loading-container" v-if="loading && sdcards.length === 0">
      <div class="loading-spinner"></div>
      <p class="loading-text">Detecting SD cards...</p>
    </div>

    <!-- Empty state -->
    <div class="empty-state" v-else-if="filteredCards.length === 0 && !error">
      <div class="empty-icon">💾</div>
      <h3>No SD Cards Detected</h3>
      <p>Insert an SD card and click "Refresh SD Cards" to scan for devices.</p>
      <button
        type="button"
        class="btn btn-primary"
        @click="refreshSdcards"
        :disabled="loading"
      >
        🔄 Refresh Now
      </button>
    </div>

    <!-- SD Cards Grid -->
    <div class="sdcards-grid" v-else-if="filteredCards.length > 0">
      <div
        v-for="card in filteredCards"
        :key="card.deviceId || card.device_id"
        class="sdcard-card"
        :class="{ expanded: expandedCard === (card.deviceId || card.device_id) }"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="card-icon">
            <span class="icon">💾</span>
            <div class="status-indicator" :class="getStatusClass(card)"></div>
          </div>
          <div class="card-title-section">
            <h3>{{ card.name || card.label || card.deviceId || card.device_id || 'Unknown Device' }}</h3>
            <p class="card-subtitle">{{ card.deviceId || card.device_id }}</p>
          </div>
          <div class="card-actions">
            <button
              type="button"
              class="btn-icon"
              @click="toggleExpand(card)"
              :title="expandedCard === (card.deviceId || card.device_id) ? 'Collapse' : 'Expand'"
            >
              {{ expandedCard === (card.deviceId || card.device_id) ? '▼' : '▶' }}
            </button>
          </div>
        </div>

        <!-- Card Content -->
        <div class="card-content">
          <!-- Quick Info -->
          <div class="quick-info">
            <div class="info-item">
              <span class="info-label">Size</span>
              <span class="info-value">{{ formatSize(card.size) || card.sizeFormatted || 'Unknown' }}</span>
            </div>
            <div class="info-item" v-if="card.fileSystem || card.filesystem">
              <span class="info-label">Filesystem</span>
              <span class="info-value">{{ card.fileSystem || card.filesystem }}</span>
            </div>
            <div class="info-item" v-if="card.available !== undefined">
              <span class="info-label">Status</span>
              <span class="info-value" :class="card.available ? 'status-available' : 'status-unavailable'">
                {{ card.available ? '✓ Available' : '✗ Unavailable' }}
              </span>
            </div>
          </div>

          <!-- Expanded Details -->
          <div class="expanded-details" v-if="expandedCard === (card.deviceId || card.device_id)">
            <div class="details-grid">
              <div class="detail-item" v-if="card.size || card.sizeFormatted">
                <strong>Total Size:</strong>
                <span>{{ formatSize(card.size) || card.sizeFormatted }}</span>
              </div>
              <div class="detail-item" v-if="card.label">
                <strong>Label:</strong>
                <span>{{ card.label }}</span>
              </div>
              <div class="detail-item" v-if="card.fileSystem || card.filesystem">
                <strong>Filesystem:</strong>
                <span>{{ card.fileSystem || card.filesystem }}</span>
              </div>
              <div class="detail-item" v-if="card.mountPoint">
                <strong>Mount Point:</strong>
                <span>{{ card.mountPoint }}</span>
              </div>
              <div class="detail-item" v-if="card.removable !== undefined">
                <strong>Removable:</strong>
                <span>{{ card.removable ? 'Yes' : 'No' }}</span>
              </div>
              <div class="detail-item" v-if="card.deviceId || card.device_id">
                <strong>Device ID:</strong>
                <span class="device-id">{{ card.deviceId || card.device_id }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="card-actions-bar">
            <button
              type="button"
              class="btn btn-secondary"
              @click="handleFormat(card)"
              :disabled="formattingCard === (card.deviceId || card.device_id) || loading"
            >
              <span v-if="formattingCard === (card.deviceId || card.device_id)">
                ⏳ Formatting...
              </span>
              <span v-else>🔧 Format for Pi</span>
            </button>
            <button
              type="button"
              class="btn btn-outline"
              @click="viewDetails(card)"
            >
              📋 View Details
            </button>
          </div>

          <!-- Format Progress -->
          <div
            class="format-progress"
            v-if="formattingCard === (card.deviceId || card.device_id) && formatProgress"
          >
            <div class="progress-bar-container">
              <div
                class="progress-bar"
                :style="{ width: `${formatProgress.percent || 0}%` }"
              ></div>
            </div>
            <p class="progress-text">{{ formatProgress.message || 'Formatting...' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Format Dialog -->
    <div class="modal-overlay" v-if="showFormatDialog" @click="closeFormatDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>⚠️ Format SD Card</h3>
          <button type="button" class="btn-close" @click="closeFormatDialog">×</button>
        </div>
        <div class="modal-body">
          <p><strong>Warning:</strong> This will erase all data on the selected SD card.</p>
          <div class="format-info">
            <p><strong>Device:</strong> {{ selectedCardForFormat?.name || selectedCardForFormat?.deviceId || 'Unknown' }}</p>
            <p><strong>Size:</strong> {{ selectedCardForFormat ? formatSize(selectedCardForFormat.size) : 'Unknown' }}</p>
          </div>
          <div class="form-group">
            <label for="pi-model-select">Raspberry Pi Model:</label>
            <select id="pi-model-select" v-model="selectedPiModel" class="form-input-full">
              <option value="pi5">Raspberry Pi 5</option>
              <option value="pi4">Raspberry Pi 4</option>
              <option value="pi3b">Raspberry Pi 3B</option>
              <option value="pi3b+">Raspberry Pi 3B+</option>
              <option value="pi2">Raspberry Pi 2</option>
              <option value="pi1">Raspberry Pi 1</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" @click="closeFormatDialog">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-danger"
            @click="confirmFormat"
            :disabled="formattingCard !== null"
          >
            {{ formattingCard ? 'Formatting...' : 'Format SD Card' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useSdcards } from '~/composables/useSdcards'
import { useUIStore } from '~/stores/ui'
import { useNotifications } from '~/composables/useNotifications'

const {
  sdcards,
  loading,
  error,
  loadSdcards,
  refreshSdcards,
} = useSdcards()

const notifications = useNotifications()
const uiStore = useUIStore()
const isActive = computed(() => uiStore.activeTab === 'sdcard')

// State
const searchQuery = ref('')
const autoRefresh = ref(false)
const expandedCard = ref<string | null>(null)
const showFormatDialog = ref(false)
const selectedCardForFormat = ref<any>(null)
const selectedPiModel = ref('pi5')
const formattingCard = ref<string | null>(null)
const formatProgress = ref<{ percent: number; message: string } | null>(null)
let autoRefreshInterval: NodeJS.Timeout | null = null

// Computed
const filteredCards = computed(() => {
  if (!searchQuery.value) return sdcards.value
  const query = searchQuery.value.toLowerCase()
  return sdcards.value.filter((card) => {
    const name = (card.name || card.label || card.deviceId || card.device_id || '').toLowerCase()
    const deviceId = (card.deviceId || card.device_id || '').toLowerCase()
    return name.includes(query) || deviceId.includes(query)
  })
})

// Methods
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

const getStatusClass = (card: any): string => {
  if (card.available === false) return 'status-error'
  if (card.removable === false) return 'status-warning'
  return 'status-success'
}

const toggleExpand = (card: any) => {
  const cardId = card.deviceId || card.device_id
  expandedCard.value = expandedCard.value === cardId ? null : cardId
}

const handleFormat = (card: any) => {
  selectedCardForFormat.value = card
  showFormatDialog.value = true
}

const closeFormatDialog = () => {
  if (formattingCard.value) return // Don't close while formatting
  showFormatDialog.value = false
  selectedCardForFormat.value = null
}

const confirmFormat = async () => {
  if (!selectedCardForFormat.value) return

  const deviceId = selectedCardForFormat.value.deviceId || selectedCardForFormat.value.device_id
  if (!deviceId) {
    notifications.error('Invalid device ID')
    return
  }

  formattingCard.value = deviceId
  formatProgress.value = { percent: 0, message: 'Initializing...' }
  showFormatDialog.value = false

  try {
    const runtimeConfig = useRuntimeConfig()
    const apiBase = runtimeConfig.public.apiBase || '/api'

    const response = await fetch(`${apiBase}/format-sdcard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        device_id: deviceId,
        pi_model: selectedPiModel.value,
        stream: true,
      }),
    })

    // Check if response is OK and has a readable body
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        try {
          const errorText = await response.text()
          if (errorText) {
            errorMessage = errorText.substring(0, 500)
          }
        } catch {
          // Use default error message
        }
      }
      throw new Error(errorMessage)
    }

    // Handle streaming response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) {
      throw new Error('Response body is not readable. The server may have returned an invalid response.')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6).trim()
            if (!jsonStr) continue
            const data = JSON.parse(jsonStr)

            if (data.type === 'progress') {
              formatProgress.value = {
                percent: data.percent || 0,
                message: data.message || 'Formatting...',
              }
            } else if (data.success !== undefined) {
              if (data.success) {
                formatProgress.value = { percent: 100, message: 'Formatting completed!' }
                notifications.success(data.message || 'SD card formatted successfully')
                setTimeout(() => {
                  formattingCard.value = null
                  formatProgress.value = null
                  refreshSdcards()
                }, 2000)
              } else {
                throw new Error(data.error || 'Formatting failed')
              }
              return
            }
          } catch (parseError) {
            console.error('[Format] Failed to parse progress data:', parseError)
          }
        }
      }
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Formatting failed'
    notifications.error(`Formatting error: ${errorMsg}`)
    formattingCard.value = null
    formatProgress.value = null
  }
}

const viewDetails = (card: any) => {
  toggleExpand(card)
  // Could also open a detailed modal here
}

const handleAutoRefreshChange = () => {
  if (autoRefresh.value) {
    autoRefreshInterval = setInterval(() => {
      if (isActive.value && !loading.value) {
        refreshSdcards()
      }
    }, 30000) // 30 seconds
  } else {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
      autoRefreshInterval = null
    }
  }
}

// Watch for tab activation
watch(isActive, (active) => {
  if (process.dev) {
    console.log('[SdcardTab] Tab active state changed:', active)
  }
  if (active && !loading.value) {
    if (process.dev) {
      console.log('[SdcardTab] Loading SD cards data...')
    }
    loadSdcards()
  }
}, { immediate: true })

// Load on mount if already active
onMounted(() => {
  if (isActive.value && !loading.value) {
    loadSdcards()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
})
</script>

<style scoped>
.sdcard-tab {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.sdcard-header {
  margin-bottom: 24px;
}

.sdcard-header h2 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--win11-accent);
}

.subtitle {
  color: var(--win11-text-secondary);
  font-size: 14px;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.controls-right {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--win11-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--win11-bg-secondary);
  color: var(--win11-text);
}

.auto-refresh-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--win11-text-secondary);
}

.auto-refresh-toggle input[type="checkbox"] {
  cursor: pointer;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--win11-border);
  border-top-color: var(--win11-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--win11-text-secondary);
  font-size: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--win11-text);
}

.empty-state p {
  color: var(--win11-text-secondary);
  margin-bottom: 24px;
}

.sdcards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.sdcard-card {
  background: var(--win11-bg-secondary);
  border: 1px solid var(--win11-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.sdcard-card:hover {
  border-color: var(--win11-accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.sdcard-card.expanded {
  border-color: var(--win11-accent);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-icon {
  position: relative;
  font-size: 32px;
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--win11-bg-secondary);
}

.status-indicator.status-success {
  background: #4caf50;
}

.status-indicator.status-warning {
  background: #ff9800;
}

.status-indicator.status-error {
  background: #f44336;
}

.card-title-section {
  flex: 1;
}

.card-title-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--win11-text);
}

.card-subtitle {
  font-size: 12px;
  color: var(--win11-text-secondary);
  font-family: monospace;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--win11-text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--win11-bg-tertiary);
  color: var(--win11-text);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: var(--win11-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--win11-text);
}

.status-available {
  color: #4caf50;
}

.status-unavailable {
  color: #f44336;
}

.expanded-details {
  padding: 16px;
  background: var(--win11-bg-tertiary);
  border-radius: 8px;
  margin-top: 8px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.detail-item strong {
  color: var(--win11-text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.device-id {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.card-actions-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: var(--win11-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--win11-accent-hover);
}

.btn-secondary {
  background: var(--win11-bg-tertiary);
  color: var(--win11-text);
  border: 1px solid var(--win11-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--win11-bg);
  border-color: var(--win11-accent);
}

.btn-outline {
  background: transparent;
  color: var(--win11-text);
  border: 1px solid var(--win11-border);
}

.btn-outline:hover:not(:disabled) {
  background: var(--win11-bg-tertiary);
  border-color: var(--win11-accent);
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.format-progress {
  margin-top: 12px;
  padding: 12px;
  background: var(--win11-bg-tertiary);
  border-radius: 8px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--win11-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background: var(--win11-accent);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--win11-text-secondary);
  margin: 0;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--win11-bg);
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--win11-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: var(--win11-text);
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--win11-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--win11-bg-tertiary);
  color: var(--win11-text);
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin-bottom: 16px;
  color: var(--win11-text);
}

.format-info {
  background: var(--win11-bg-secondary);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.format-info p {
  margin: 4px 0;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--win11-text);
}

.form-input-full {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--win11-border);
  border-radius: 6px;
  font-size: 14px;
  background: var(--win11-bg-secondary);
  color: var(--win11-text);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--win11-border);
}

@media (max-width: 768px) {
  .sdcards-grid {
    grid-template-columns: 1fr;
  }

  .controls-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .controls-right {
    max-width: 100%;
  }
}
</style>
