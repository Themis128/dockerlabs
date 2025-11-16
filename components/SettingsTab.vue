<template>
  <div class="tab-content settings-tab">
    <h2>Pi Configuration</h2>

    <!-- Pi Selection -->
    <div class="settings-section">
      <h3>Select Raspberry Pi</h3>
      <select
        v-model="selectedPiNumber"
        class="select-full-width"
        :disabled="loading"
        @change="loadPiSettings"
      >
        <option value="">-- Select Pi --</option>
        <option v-for="pi in pis" :key="pi.number" :value="pi.number">
          Raspberry Pi {{ pi.number }} {{ pi.hostname ? `(${pi.hostname})` : '' }}
        </option>
      </select>
    </div>

    <!-- Settings Form -->
    <form v-if="selectedPiNumber" @submit.prevent="handleSaveSettings" class="settings-form">
      <!-- System Settings -->
      <div class="settings-section">
        <h3>System Settings</h3>
        <div class="form-grid">
          <div class="form-group">
            <label for="settings-hostname" class="form-label">Hostname:</label>
            <input
              id="settings-hostname"
              v-model="settings.hostname"
              type="text"
              class="form-input-full"
              placeholder="raspberrypi"
              pattern="[a-zA-Z0-9\-]+"
              minlength="1"
              maxlength="63"
            />
            <small class="form-hint">Valid hostname characters: letters, numbers, and hyphens</small>
          </div>

          <div class="form-group">
            <label for="settings-timezone" class="form-label">Timezone:</label>
            <select id="settings-timezone" v-model="settings.timezone" class="form-input-full">
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Denver">America/Denver (MST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="settings-locale" class="form-label">Locale:</label>
            <select id="settings-locale" v-model="settings.locale" class="form-input-full">
              <option value="en_US.UTF-8">English (US)</option>
              <option value="en_GB.UTF-8">English (UK)</option>
              <option value="fr_FR.UTF-8">French</option>
              <option value="de_DE.UTF-8">German</option>
              <option value="es_ES.UTF-8">Spanish</option>
              <option value="it_IT.UTF-8">Italian</option>
              <option value="ja_JP.UTF-8">Japanese</option>
            </select>
          </div>
        </div>
      </div>

      <!-- SSH Settings -->
      <div class="settings-section">
        <h3>SSH Settings</h3>
        <div class="form-group">
          <label class="form-label">
            <input
              type="checkbox"
              v-model="settings.sshEnabled"
              id="settings-ssh-enabled"
            />
            Enable SSH
          </label>
        </div>
      </div>

      <!-- WiFi Settings -->
      <div class="settings-section">
        <h3>WiFi Settings</h3>
        <div class="form-group">
          <label for="settings-wifi-ssid" class="form-label">Network Name (SSID):</label>
          <div class="flex-row">
            <input
              id="settings-wifi-ssid"
              v-model="settings.wifi.ssid"
              type="text"
              class="form-input-full"
              placeholder="Your WiFi network name"
              autocomplete="off"
            />
            <button
              type="button"
              @click="scanWifiNetworks"
              class="btn btn-secondary"
              :disabled="scanningWifi || loading"
            >
              {{ scanningWifi ? 'Scanning...' : '🔍 Scan' }}
            </button>
          </div>
        </div>

        <div v-if="wifiNetworks.length > 0" class="wifi-networks-list">
          <p class="form-hint">Select a network:</p>
          <div class="wifi-network-item" v-for="network in wifiNetworks" :key="network.ssid">
            <button
              type="button"
              @click="selectWifiNetwork(network)"
              class="wifi-network-btn"
            >
              <span class="wifi-ssid">{{ network.ssid }}</span>
              <span class="wifi-signal">Signal: {{ network.signal }}%</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="settings-wifi-password" class="form-label">Password:</label>
          <input
            id="settings-wifi-password"
            v-model="settings.wifi.password"
            type="password"
            class="form-input-full"
            placeholder="WiFi password"
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="settings-wifi-country" class="form-label">Country Code:</label>
          <select id="settings-wifi-country" v-model="settings.wifi.country" class="form-input-full">
            <option value="US">US - United States</option>
            <option value="GB">GB - United Kingdom</option>
            <option value="DE">DE - Germany</option>
            <option value="FR">FR - France</option>
            <option value="ES">ES - Spain</option>
            <option value="IT">IT - Italy</option>
            <option value="JP">JP - Japan</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">
            <input
              type="checkbox"
              v-model="settings.wifi.hidden"
              id="settings-wifi-hidden"
            />
            Hidden Network
          </label>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="settings-actions">
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="loading || !selectedPiNumber"
        >
          {{ loading ? 'Saving...' : 'Save Settings' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="resetSettings"
          :disabled="loading"
        >
          Reset
        </button>
      </div>

      <!-- Status Message -->
      <div v-if="statusMessage" class="status-message" :class="statusType">
        {{ statusMessage }}
      </div>
    </form>

    <!-- No Pi Selected Message -->
    <div v-else class="no-selection-message">
      <p>Please select a Raspberry Pi to configure its settings.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePis } from '~/composables/usePis'
import { useApi } from '~/composables/useApi'
import { useNotifications } from '~/composables/useNotifications'
import type { PiSettings, WiFiConfig } from '~/types'

const { pis, loadPis, configurePiSettings, loadPiInfo } = usePis()
const { scanWifi } = useApi()
const notifications = useNotifications()

// State
const selectedPiNumber = ref<string>('')
const loading = ref(false)
const scanningWifi = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error' | ''>('')
const wifiNetworks = ref<Array<{ ssid: string; signal: number; security: string }>>([])

// Settings state - ensure wifi is always defined
const settings = ref<PiSettings & { wifi: WiFiConfig }>({
  hostname: 'raspberrypi',
  sshEnabled: true,
  timezone: 'UTC',
  locale: 'en_US.UTF-8',
  wifi: {
    ssid: '',
    password: '',
    country: 'US',
    hidden: false,
  },
})

// Load Pi settings when Pi is selected
const loadPiSettings = async () => {
  if (!selectedPiNumber.value) {
    resetSettings()
    return
  }

  loading.value = true
  statusMessage.value = ''

  try {
    const piInfo = await loadPiInfo(selectedPiNumber.value)
    if (piInfo && piInfo.settings) {
      settings.value = {
        hostname: piInfo.settings.hostname || 'raspberrypi',
        sshEnabled: piInfo.settings.sshEnabled !== false,
        timezone: piInfo.settings.timezone || 'UTC',
        locale: piInfo.settings.locale || 'en_US.UTF-8',
        wifi: {
          ssid: piInfo.settings.wifi?.ssid || '',
          password: piInfo.settings.wifi?.password || '',
          country: piInfo.settings.wifi?.country || 'US',
          hidden: piInfo.settings.wifi?.hidden || false,
        },
      } as PiSettings & { wifi: WiFiConfig }
    } else {
      // Use defaults if no settings found
      resetSettings()
    }
  } catch (error: any) {
    notifications.error(`Failed to load settings: ${error.message}`)
    statusMessage.value = `Error: ${error.message}`
    statusType.value = 'error'
  } finally {
    loading.value = false
  }
}

// Reset settings to defaults
const resetSettings = () => {
  settings.value = {
    hostname: 'raspberrypi',
    sshEnabled: true,
    timezone: 'UTC',
    locale: 'en_US.UTF-8',
    wifi: {
      ssid: '',
      password: '',
      country: 'US',
      hidden: false,
    },
  } as PiSettings & { wifi: WiFiConfig }
  statusMessage.value = ''
  statusType.value = ''
}

// Scan WiFi networks
const scanWifiNetworks = async () => {
  scanningWifi.value = true
  wifiNetworks.value = []

  try {
    const response = await scanWifi()
    if (response.success && response.data?.networks) {
      wifiNetworks.value = response.data.networks.map((net: any) => ({
        ssid: net.ssid || '',
        signal: net.signal || 0,
        security: net.security || 'Unknown',
      }))
      notifications.success(`Found ${wifiNetworks.value.length} WiFi networks`)
    } else {
      notifications.error(response.error || 'Failed to scan WiFi networks')
    }
  } catch (error: any) {
    notifications.error(`WiFi scan error: ${error.message}`)
  } finally {
    scanningWifi.value = false
  }
}

// Select WiFi network
const selectWifiNetwork = (network: { ssid: string; signal: number; security: string }) => {
  settings.value.wifi = {
    ...settings.value.wifi,
    ssid: network.ssid,
  }
  notifications.success(`Selected network: ${network.ssid}`)
}

// Save settings
const handleSaveSettings = async () => {
  if (!selectedPiNumber.value) {
    notifications.error('Please select a Raspberry Pi')
    return
  }

  loading.value = true
  statusMessage.value = ''
  statusType.value = ''

  try {
    const success = await configurePiSettings(selectedPiNumber.value, settings.value)
    if (success) {
      statusMessage.value = 'Settings saved successfully!'
      statusType.value = 'success'
    } else {
      statusMessage.value = 'Failed to save settings'
      statusType.value = 'error'
    }
  } catch (error: any) {
    statusMessage.value = `Error: ${error.message}`
    statusType.value = 'error'
    notifications.error(`Failed to save settings: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// Load Pis on mount
onMounted(async () => {
  await loadPis()
})
</script>

<style scoped>
.settings-tab {
  padding: 24px;
  max-width: 800px;
}

.settings-section {
  margin-bottom: 32px;
  padding: 20px;
  background: var(--win11-bg-secondary, #f9f9f9);
  border-radius: 8px;
  border: 1px solid var(--win11-border, #e0e0e0);
}

.settings-section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--win11-text-primary, #333);
}

.settings-form {
  margin-top: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 14px;
  color: var(--win11-text-primary, #333);
}

.form-input-full {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--win11-bg-primary, #fff);
  color: var(--win11-text-primary, #333);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input-full:focus {
  outline: none;
  border-color: var(--win11-accent, #0078d4);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.1);
}

.form-input-full:disabled {
  background: var(--win11-bg-secondary, #f0f0f0);
  color: var(--win11-text-secondary, #666);
  cursor: not-allowed;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--win11-text-secondary, #666);
}

.select-full-width {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--win11-bg-primary, #fff);
  color: var(--win11-text-primary, #333);
}

.flex-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.flex-row .form-input-full {
  flex: 1;
}

.wifi-networks-list {
  margin: 16px 0;
  padding: 12px;
  background: var(--win11-bg-primary, #fff);
  border-radius: 4px;
  border: 1px solid var(--win11-border, #ddd);
}

.wifi-network-item {
  margin-bottom: 8px;
}

.wifi-network-btn {
  width: 100%;
  padding: 12px;
  text-align: left;
  background: var(--win11-bg-secondary, #f9f9f9);
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.wifi-network-btn:hover {
  background: var(--win11-bg-tertiary, #f0f0f0);
}

.wifi-ssid {
  font-weight: 500;
  color: var(--win11-text-primary, #333);
}

.wifi-signal {
  font-size: 12px;
  color: var(--win11-text-secondary, #666);
}

.settings-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--win11-border, #ddd);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.btn-primary {
  background: var(--win11-accent, #0078d4);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--win11-accent-hover, #106ebe);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--win11-bg-tertiary, #f0f0f0);
  color: var(--win11-text-primary, #333);
  border: 1px solid var(--win11-border, #ddd);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--win11-border-hover, #e0e0e0);
}

.status-message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
}

.status-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.no-selection-message {
  margin-top: 24px;
  padding: 24px;
  text-align: center;
  color: var(--win11-text-secondary, #666);
  background: var(--win11-bg-secondary, #f9f9f9);
  border-radius: 8px;
  border: 1px solid var(--win11-border, #ddd);
}
</style>
