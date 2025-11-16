<template>
  <div class="tab-content">
    <div class="dashboard-header">
      <h2>Dashboard</h2>
      <div class="auto-refresh-control">
        <label class="toggle-label">
          <input
            type="checkbox"
            v-model="autoRefreshEnabled"
            @change="handleAutoRefreshToggle"
          />
          <span>Auto-refresh ({{ refreshInterval }}s)</span>
        </label>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Pis</h3>
        <p class="stat-value">{{ totalPis }}</p>
        <p class="stat-subtitle">Physical devices</p>
      </div>
      <div class="stat-card">
        <h3>Online</h3>
        <p class="stat-value online">{{ onlineCount }}</p>
        <p class="stat-subtitle">Currently live</p>
      </div>
      <div class="stat-card">
        <h3>Offline</h3>
        <p class="stat-value offline">{{ offlineCount }}</p>
        <p class="stat-subtitle">Not responding</p>
      </div>
      <div class="stat-card">
        <h3>Ethernet</h3>
        <p class="stat-value">{{ ethernetCount }}</p>
        <p class="stat-subtitle">Wired connections</p>
      </div>
      <div class="stat-card">
        <h3>WiFi</h3>
        <p class="stat-value">{{ wifiCount }}</p>
        <p class="stat-subtitle">Wireless connections</p>
      </div>
      <div class="stat-card">
        <h3>Last Update</h3>
        <p class="stat-value small">{{ lastUpdateTime }}</p>
        <p class="stat-subtitle">{{ status }}</p>
      </div>
    </div>

    <div class="devices-section">
      <h3>Device Status</h3>
      <div v-if="loading" class="loading-state">
        <p>Scanning network...</p>
      </div>
      <div v-else-if="devices.length === 0" class="empty-state">
        <p>No devices found</p>
      </div>
      <div v-else class="devices-list">
        <div
          v-for="device in devices"
          :key="device.id || device.ip"
          class="device-card"
          :class="{ online: device.isOnline, offline: !device.isOnline }"
        >
          <div class="device-header">
            <span class="status-indicator" :class="device.isOnline ? 'online' : 'offline'"></span>
            <h4>{{ device.name || device.id || 'Unknown Device' }}</h4>
          </div>
          <div class="device-details">
            <p><strong>IP:</strong> {{ device.ip || 'N/A' }}</p>
            <p><strong>MAC:</strong> {{ device.mac || 'N/A' }}</p>
            <p><strong>Connection:</strong> {{ device.connection || 'N/A' }}</p>
            <p v-if="device.isDiscovered" class="discovered-badge">
              <span class="badge discovered">🔍 Discovered</span>
            </p>
            <p v-if="device.isOnline" class="online-badge">
              <span class="badge">● Online</span>
              <span v-if="device.lastPing" class="ping-time">{{ Math.round(device.lastPing) }}ms</span>
            </p>
            <p v-else class="offline-badge">
              <span class="badge">○ Offline</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn btn-primary" @click="refreshDashboard" :disabled="loading">
        {{ loading ? 'Scanning...' : 'Refresh Now' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getPis, testConnections, scanNetwork } = useApi()

const totalPis = ref(0)
const onlineCount = ref(0)
const offlineCount = ref(0)
const ethernetCount = ref(0)
const wifiCount = ref(0)
const status = ref('Ready')
const loading = ref(false)
const devices = ref<any[]>([])
const lastUpdateTime = ref('Never')
const autoRefreshEnabled = ref(false)
const refreshInterval = ref(10) // seconds
let autoRefreshTimer: NodeJS.Timeout | null = null
let isLoadingDashboard = false // Guard to prevent multiple simultaneous loads

interface DeviceStatus {
  id: string
  name: string
  ip: string
  mac: string
  connection: string
  isOnline: boolean
  lastPing?: number
}

const loadDashboard = async () => {
  // Prevent multiple simultaneous calls
  if (isLoadingDashboard) {
    return
  }

  isLoadingDashboard = true
  loading.value = true
  status.value = 'Scanning network...'

  try {
    // Step 1: Scan network for real-time discovered devices
    status.value = 'Scanning network for devices...'
    const networkScanResponse = await scanNetwork()

    // Check for backend connection errors
    if (!networkScanResponse.success) {
      const errorMsg = networkScanResponse.error || 'Failed to scan network'
      if (errorMsg.includes('Cannot connect') || errorMsg.includes('Service Unavailable') || errorMsg.includes('503')) {
        status.value = 'Error - Python backend not running. Start with: npm run start:server'
        devices.value = []
        totalPis.value = 0
        onlineCount.value = 0
        offlineCount.value = 0
        ethernetCount.value = 0
        wifiCount.value = 0
        lastUpdateTime.value = new Date().toLocaleTimeString()
        return
      }
    }

    // Step 2: Get configured Pis from config file
    const pisResponse = await getPis()

    // Check for backend connection errors in Pis response
    if (!pisResponse.success) {
      const errorMsg = pisResponse.error || 'Failed to load Pis'
      if (errorMsg.includes('Cannot connect') || errorMsg.includes('Service Unavailable') || errorMsg.includes('503')) {
        status.value = 'Error - Python backend not running. Start with: npm run start:server'
        devices.value = []
        totalPis.value = 0
        onlineCount.value = 0
        offlineCount.value = 0
        ethernetCount.value = 0
        wifiCount.value = 0
        lastUpdateTime.value = new Date().toLocaleTimeString()
        return
      }
    }

    // Combine discovered devices with configured Pis
    const discoveredDevices: any[] = []
    const configuredPis: any[] = []

    // Process network scan results
    if (networkScanResponse.success && networkScanResponse.data) {
      const scanData = networkScanResponse.data

      // Add discovered Raspberry Pis
      if (scanData.raspberry_pis && Array.isArray(scanData.raspberry_pis)) {
        scanData.raspberry_pis.forEach((device: any) => {
          discoveredDevices.push({
            id: `discovered-${device.ip}`,
            name: device.name || `Raspberry Pi (${device.ip})`,
            ip: device.ip,
            mac: device.mac || 'Unknown',
            connection: device.connection_type || 'Detected',
            isOnline: device.is_online || false,
            lastPing: device.ping_time,
            isDiscovered: true, // Mark as discovered (not from config)
          })
        })
      }

      // Add other discovered devices (non-Raspberry Pi)
      if (scanData.devices && Array.isArray(scanData.devices)) {
        scanData.devices.forEach((device: any) => {
          // Skip if already added as Raspberry Pi
          if (!discoveredDevices.find(d => d.ip === device.ip)) {
            discoveredDevices.push({
              id: `discovered-${device.ip}`,
              name: device.name || `Device (${device.ip})`,
              ip: device.ip,
              mac: device.mac || 'Unknown',
              connection: device.connection_type || 'Detected',
              isOnline: device.is_online || false,
              lastPing: device.ping_time,
              isDiscovered: true,
            })
          }
        })
      }
    }

    // Process configured Pis
    if (pisResponse.success && pisResponse.data?.pis) {
      configuredPis.push(...pisResponse.data.pis)
    }

    // Step 3: Test connections for configured Pis
    status.value = 'Testing connections...'
    const connectionsResponse = await testConnections()

    // Check for backend connection errors in connections response
    if (!connectionsResponse.success) {
      const errorMsg = connectionsResponse.error || 'Failed to test connections'
      if (errorMsg.includes('Cannot connect') || errorMsg.includes('Service Unavailable') || errorMsg.includes('503')) {
        // Continue with available data, but mark connections as unknown
        status.value = 'Partial data - Connection tests unavailable (backend not running)'
      }
    }

    // Map connection test results
    const connectionResults: Record<string, any> = {}
    if (connectionsResponse.success && connectionsResponse.data) {
      const data = connectionsResponse.data

      if (data.results && Array.isArray(data.results)) {
        // New JSON format from updated test_connections.py
        data.results.forEach((result: any) => {
          if (result.ip) {
            connectionResults[result.ip] = {
              online: result.online || result.ping || false,
              pingTime: result.ping_time,
              sshOpen: result.ssh_open || false,
            }
          }
        })
      } else if (Array.isArray(data)) {
        data.forEach((result: any) => {
          if (result.ip) {
            connectionResults[result.ip] = result
          }
        })
      }
    }

    // Build device list: merge discovered and configured
    const allDevices: any[] = []

    // Add discovered devices first (real-time network scan)
    discoveredDevices.forEach(device => {
      allDevices.push(device)
    })

    // Add configured Pis (from config file)
    configuredPis.forEach((pi: any) => {
      // Check if this Pi is already in discovered devices
      const existingDevice = allDevices.find(d => d.ip === pi.ip)

      if (existingDevice) {
        // Update existing device with config info
        existingDevice.id = pi.id || existingDevice.id
        existingDevice.name = pi.name || existingDevice.name
        existingDevice.mac = pi.mac || existingDevice.mac
        existingDevice.connection = pi.connection || existingDevice.connection
        existingDevice.isDiscovered = false // Now it's from config
      } else {
        // Add new device from config
        const connectionResult = connectionResults[pi.ip]
        allDevices.push({
          id: pi.id || pi.number || `pi-${pi.ip}`,
          name: pi.name || `Pi ${pi.number || 'Unknown'}`,
          ip: pi.ip || 'N/A',
          mac: pi.mac || 'N/A',
          connection: pi.connection || 'Unknown',
          isOnline: connectionResult?.online || connectionResult?.ping || false,
          lastPing: connectionResult?.pingTime || connectionResult?.responseTime,
          isDiscovered: false,
        })
      }
    })

    devices.value = allDevices

    // Update counts
    totalPis.value = allDevices.length
    onlineCount.value = allDevices.filter(d => d.isOnline).length
    offlineCount.value = allDevices.filter(d => !d.isOnline).length
    ethernetCount.value = allDevices.filter((d: any) => d.connection === 'Wired').length
    wifiCount.value = allDevices.filter((d: any) => d.connection === '2.4G').length

    // Update timestamp
    lastUpdateTime.value = new Date().toLocaleTimeString()
    status.value = 'Ready'
  } catch (error: any) {
    status.value = 'Error - Backend server not running'
    const errorMsg = error.message || error.data?.error || 'Failed to scan network'

    // Check if it's a connection error
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('Cannot connect')) {
      status.value = 'Error - Start Python backend with: npm run start:server'
    }

    console.error('Error loading dashboard:', errorMsg)
    console.error('Full error:', error)
  } finally {
    loading.value = false
    isLoadingDashboard = false
  }
}

const refreshDashboard = () => {
  loadDashboard()
}

const handleAutoRefreshToggle = () => {
  if (autoRefreshEnabled.value) {
    // Start auto-refresh
    autoRefreshTimer = setInterval(() => {
      loadDashboard()
    }, refreshInterval.value * 1000)
  } else {
    // Stop auto-refresh
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer)
      autoRefreshTimer = null
    }
  }
}

// Watch for tab activation and load data only when this tab is active
const uiStore = useUIStore()
const isActive = computed(() => uiStore.activeTab === 'dashboard')

// Load data when tab becomes active
watch(isActive, (active) => {
  if (process.dev) {
    console.log('[DashboardTab] Tab active state changed:', active, 'isLoading:', isLoadingDashboard);
  }
  if (active && !isLoadingDashboard) {
    if (process.dev) {
      console.log('[DashboardTab] Loading dashboard data...');
    }
    loadDashboard()
  }
}, { immediate: true })

// Also load on mount if already active
onMounted(() => {
  if (isActive.value && !isLoadingDashboard) {
    loadDashboard()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
  }
})
</script>

<style scoped>
.tab-content {
  padding: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--win11-bg-secondary);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--win11-border);
}

.stat-card h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--win11-text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: var(--win11-accent);
  margin: 8px 0;
}

.stat-subtitle {
  font-size: 12px;
  color: var(--win11-text-secondary);
  margin: 0;
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

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.auto-refresh-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--win11-text-secondary);
}

.toggle-label input[type="checkbox"] {
  cursor: pointer;
}

.devices-section {
  margin-top: 32px;
}

.devices-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--win11-text);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--win11-text-secondary);
}

.devices-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.device-card {
  background: var(--win11-bg-secondary);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--win11-border);
  transition: all 0.2s;
}

.device-card.online {
  border-left: 4px solid #28a745;
}

.device-card.offline {
  border-left: 4px solid #dc3545;
  opacity: 0.7;
}

.device-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.device-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--win11-text);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.online {
  background: #28a745;
  box-shadow: 0 0 8px rgba(40, 167, 69, 0.5);
}

.status-indicator.offline {
  background: #dc3545;
}

.device-details {
  font-size: 14px;
}

.device-details p {
  margin: 6px 0;
  color: var(--win11-text-secondary);
}

.device-details strong {
  color: var(--win11-text);
  margin-right: 8px;
}

.online-badge,
.offline-badge {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
}

.online-badge .badge {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.offline-badge .badge {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.ping-time {
  font-size: 11px;
  color: var(--win11-text-secondary);
}

.discovered-badge {
  margin-top: 8px;
  margin-bottom: 4px;
}

.discovered-badge .badge.discovered {
  background: rgba(0, 120, 212, 0.1);
  color: #0078d4;
  font-size: 11px;
}

.stat-value.online {
  color: #28a745;
}

.stat-value.offline {
  color: #dc3545;
}

.stat-value.small {
  font-size: 18px;
}

.actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}
</style>
