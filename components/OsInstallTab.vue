<template>
  <div class="tab-content os-install-tab">
    <div class="os-install-header">
      <h2>📦 OS Installation</h2>
      <p class="subtitle">Install Raspberry Pi OS or custom images to your SD card</p>
    </div>

    <form @submit.prevent="handleInstall" class="os-install-form">
      <!-- Step 1: SD Card Selection -->
      <div class="install-card">
        <div class="card-header">
          <div class="step-number">1</div>
          <div class="card-title-group">
            <h3>Select SD Card</h3>
            <p class="card-subtitle">Choose the SD card where you want to install the OS</p>
          </div>
        </div>
        <div class="card-content">
          <div class="select-wrapper">
            <select
              v-model="selectedDeviceId"
              aria-label="Select SD Card"
              class="modern-select"
              :class="{ 'has-error': !selectedDeviceId && showErrors }"
              :disabled="loading"
            >
              <option value="">-- Select SD Card --</option>
              <option
                v-for="card in sdcards"
                :key="card.deviceId"
                :value="card.deviceId"
              >
                💾 {{ card.name }} ({{ card.sizeFormatted || `${(card.size / (1024 * 1024 * 1024)).toFixed(2)} GB` }})
              </option>
            </select>
            <div v-if="!selectedDeviceId && showErrors" class="error-message">
              Please select an SD card
            </div>
          </div>
        </div>
      </div>

      <!-- Step 2: OS Image Source -->
      <div class="install-card">
        <div class="card-header">
          <div class="step-number">2</div>
          <div class="card-title-group">
            <h3>Select OS Image Source</h3>
            <p class="card-subtitle">Choose to download an official image or use your own</p>
          </div>
        </div>
        <div class="card-content">
          <div class="radio-cards">
            <label class="radio-card" :class="{ active: osSource === 'download' }">
              <input
                type="radio"
                v-model="osSource"
                value="download"
                @change="handleSourceChange"
                class="radio-input"
              />
              <div class="radio-card-content">
                <div class="radio-icon">⬇️</div>
                <div class="radio-text">
                  <strong>Download OS Image</strong>
                  <span>Download from official sources</span>
                </div>
              </div>
            </label>
            <label class="radio-card" :class="{ active: osSource === 'custom' }">
              <input
                type="radio"
                v-model="osSource"
                value="custom"
                @change="handleSourceChange"
                class="radio-input"
              />
              <div class="radio-card-content">
                <div class="radio-icon">📁</div>
                <div class="radio-text">
                  <strong>Use Custom Image</strong>
                  <span>Upload your own image file</span>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Step 3: OS Selection -->
      <div v-show="osSource === 'download'" class="install-card">
        <div class="card-header">
          <div class="step-number">3</div>
          <div class="card-title-group">
            <h3>Choose OS Image</h3>
            <p class="card-subtitle">Select the operating system to install</p>
          </div>
        </div>
        <div class="card-content">
          <div class="select-wrapper">
            <select
              v-model="selectedOSVersion"
              @change="updateOSDescription"
              aria-label="Select OS Image"
              class="modern-select"
              :class="{ 'has-error': !selectedOSVersion && showErrors && osSource === 'download' }"
              :disabled="loading"
              id="os-version-select"
            >
              <optgroup label="🍓 Raspberry Pi OS - Official (32-bit)">
                <option
                  value="raspios_lite_armhf"
                  data-url="https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-latest/"
                  data-desc="Minimal Raspberry Pi OS without desktop environment. Perfect for headless servers, IoT projects, and applications where you don't need a GUI. Uses less resources and boots faster."
                >
                  Raspberry Pi OS Lite (32-bit)
                </option>
                <option
                  value="raspios_armhf"
                  data-url="https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-latest/"
                  data-desc="Raspberry Pi OS with desktop environment (PIXEL). Ideal for general computing, programming, web browsing, and educational use. Includes essential software but not all recommended packages."
                >
                  Raspberry Pi OS with Desktop (32-bit)
                </option>
                <option
                  value="raspios_full_armhf"
                  data-url="https://downloads.raspberrypi.org/raspios_full_armhf/images/raspios_full_armhf-latest/"
                  data-desc="Full Raspberry Pi OS with desktop and all recommended software pre-installed. Best for beginners who want everything ready to use, including office suite, programming tools, and educational software."
                >
                  Raspberry Pi OS Full (32-bit)
                </option>
              </optgroup>
              <optgroup label="🍓 Raspberry Pi OS - Official (64-bit)">
                <option
                  value="raspios_lite_arm64"
                  data-url="https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-latest/"
                  data-desc="64-bit minimal Raspberry Pi OS without desktop. Better performance on Pi 4/5, supports more RAM, and runs 64-bit applications. Perfect for servers and headless projects."
                >
                  Raspberry Pi OS Lite (64-bit)
                </option>
                <option
                  value="raspios_arm64"
                  data-url="https://downloads.raspberrypi.org/raspios_arm64/images/raspios_arm64-latest/"
                  data-desc="64-bit Raspberry Pi OS with desktop environment. Takes advantage of 64-bit architecture for better performance on Pi 4/5. Ideal for modern applications and development."
                >
                  Raspberry Pi OS with Desktop (64-bit)
                </option>
                <option
                  value="raspios_full_arm64"
                  data-url="https://downloads.raspberrypi.org/raspios_full_arm64/images/raspios_full_arm64-latest/"
                  data-desc="Complete 64-bit Raspberry Pi OS with all software pre-installed. Best performance and compatibility for Pi 4/5 with full software suite ready to use."
                >
                  Raspberry Pi OS Full (64-bit)
                </option>
              </optgroup>
              <optgroup label="🐧 Ubuntu - Official">
                <option
                  value="ubuntu_server_24.04"
                  data-url="https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz"
                  data-desc="Ubuntu Server 24.04 LTS - Enterprise-grade server OS with long-term support. Perfect for web servers, databases, containers, and cloud applications. Includes latest packages and security updates."
                >
                  Ubuntu Server 24.04 LTS (64-bit)
                </option>
                <option
                  value="ubuntu_server_22.04"
                  data-url="https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04-preinstalled-server-arm64+raspi.img.xz"
                  data-desc="Ubuntu Server 22.04 LTS - Stable server OS with proven reliability. Ideal for production environments, Docker hosts, and enterprise deployments requiring stability."
                >
                  Ubuntu Server 22.04 LTS (64-bit)
                </option>
                <option
                  value="ubuntu_desktop_24.04"
                  data-url="https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-desktop-arm64+raspi.img.xz"
                  data-desc="Ubuntu Desktop 24.04 LTS - Full desktop environment with GNOME. Great for general computing, development, and users familiar with Ubuntu. Includes office suite and multimedia apps."
                >
                  Ubuntu Desktop 24.04 LTS (64-bit)
                </option>
                <option
                  value="ubuntu_desktop_22.04"
                  data-url="https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04-preinstalled-desktop-arm64+raspi.img.xz"
                  data-desc="Ubuntu Desktop 22.04 LTS - Stable desktop OS with long-term support. Perfect for users who need a reliable, well-supported desktop environment."
                >
                  Ubuntu Desktop 22.04 LTS (64-bit)
                </option>
              </optgroup>
            </select>
            <div v-if="!selectedOSVersion && showErrors && osSource === 'download'" class="error-message">
              Please select an OS image
            </div>
          </div>
          <div v-if="osDescription" class="os-description-card">
            <div class="description-icon">ℹ️</div>
            <p class="os-description-text">{{ osDescription }}</p>
          </div>
          <div class="info-box">
            <strong>📥 Note:</strong> Images will be downloaded from official sources.
            Some images may require manual URL resolution for the latest version.
          </div>
        </div>
      </div>

      <!-- Step 3: Custom Image -->
      <div v-show="osSource === 'custom'" class="install-card">
        <div class="card-header">
          <div class="step-number">3</div>
          <div class="card-title-group">
            <h3>Upload Custom Image</h3>
            <p class="card-subtitle">Select your custom OS image file</p>
          </div>
        </div>
        <div class="card-content">
          <div class="file-upload-wrapper">
            <label for="os-custom-file" class="file-upload-label">
              <div class="file-upload-content">
                <div class="file-upload-icon">📁</div>
                <div class="file-upload-text">
                  <strong v-if="!customFile">Click to select image file</strong>
                  <strong v-else>{{ customFile.name }}</strong>
                  <span>Supports .img and .zip files</span>
                </div>
              </div>
            </label>
            <input
              type="file"
              id="os-custom-file"
              ref="customFileInput"
              accept=".img,.zip"
              class="file-input-hidden"
              aria-label="Select custom OS image file"
              @change="handleCustomFileChange"
            />
            <div v-if="!customFile && showErrors && osSource === 'custom'" class="error-message">
              Please select a custom image file
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4: Configuration Options -->
      <div class="install-card config-card">
        <div class="card-header">
          <div class="step-number">4</div>
          <div class="card-title-group">
            <h3>Configuration Options</h3>
            <p class="card-subtitle">Customize your OS installation (optional)</p>
          </div>
        </div>
        <div class="card-content">
          <!-- Boot Settings -->
          <details class="config-details">
            <summary class="config-summary">
              <span class="config-icon">⚙️</span>
              Boot Settings
            </summary>
            <div class="config-details-content">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="config.boot.enable_ssh"
                  id="os-enable-ssh"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Enable SSH</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="config.boot.enable_serial"
                  id="os-enable-serial"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Enable Serial Console</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="config.boot.disable_overscan"
                  id="os-disable-overscan"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Disable Overscan</span>
              </label>
              <label class="form-label-inline">
                <span class="label-text">GPU Memory (MB):</span>
                <input
                  type="number"
                  v-model.number="config.boot.gpu_memory"
                  id="os-gpu-memory"
                  min="16"
                  max="512"
                  step="16"
                  class="form-input-number"
                />
                <small class="form-hint">16-512, typically 64 or 128</small>
              </label>
            </div>
          </details>

          <!-- System Settings -->
          <details class="config-details">
            <summary class="config-summary">
              <span class="config-icon">🖥️</span>
              System Settings
            </summary>
            <div class="config-details-content">
              <label class="form-label-block">
                <span class="label-text">Hostname:</span>
                <input
                  type="text"
                  v-model="config.system.hostname"
                  id="os-hostname"
                  class="form-input-full"
                  pattern="[a-zA-Z0-9\-]+"
                  minlength="1"
                  maxlength="63"
                  placeholder="raspberrypi"
                />
                <small class="form-hint">Valid characters: letters, numbers, and hyphens (1-63 characters)</small>
              </label>
              <label class="form-label-block">
                <span class="label-text">Timezone:</span>
                <select v-model="config.system.timezone" id="os-timezone" class="form-input-full">
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Denver">America/Denver (MST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </label>
              <label class="form-label-block">
                <span class="label-text">Locale:</span>
                <select v-model="config.system.locale" id="os-locale" class="form-input-full">
                  <option value="en_US.UTF-8">English (US)</option>
                  <option value="en_GB.UTF-8">English (UK)</option>
                  <option value="fr_FR.UTF-8">French</option>
                  <option value="de_DE.UTF-8">German</option>
                  <option value="es_ES.UTF-8">Spanish</option>
                  <option value="it_IT.UTF-8">Italian</option>
                  <option value="ja_JP.UTF-8">Japanese</option>
                </select>
              </label>
              <div class="nested-section">
                <span class="nested-label">Hardware Interfaces:</span>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.system.enable_camera"
                    id="os-enable-camera"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">Enable Camera</span>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.system.enable_spi"
                    id="os-enable-spi"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">Enable SPI</span>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.system.enable_i2c"
                    id="os-enable-i2c"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">Enable I2C</span>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.system.enable_serial_hw"
                    id="os-enable-serial-hw"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">Enable Serial (Hardware)</span>
                </label>
              </div>
            </div>
          </details>

          <!-- Network Settings -->
          <details class="config-details">
            <summary class="config-summary">
              <span class="config-icon">🌐</span>
              Network Settings
            </summary>
            <div class="config-details-content">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="config.network.enable_ethernet"
                  id="os-enable-ethernet"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Enable Ethernet</span>
              </label>
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="config.network.enable_wifi"
                  id="os-enable-wifi"
                  @change="handleWifiToggle"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Enable WiFi</span>
              </label>
              <div v-show="config.network.enable_wifi" class="nested-section">
                <label class="form-label-block">
                  <span class="label-text">Network Name (SSID):</span>
                  <div class="input-with-button">
                    <input
                      type="text"
                      v-model="config.network.wifi_ssid"
                      id="os-wifi-ssid"
                      class="form-input-full"
                      placeholder="Your WiFi network name"
                    />
                    <button
                      type="button"
                      @click="scanWifiNetworks"
                      class="btn-scan"
                      :disabled="scanningWifi"
                    >
                      {{ scanningWifi ? '⏳ Scanning...' : '🔍 Scan' }}
                    </button>
                  </div>
                </label>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- Warning Box -->
      <div class="warning-box">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <strong>Warning:</strong> This will erase all data on the selected SD card.
          This action cannot be undone. Make sure you have backed up any important data.
        </div>
      </div>

      <!-- Install Button -->
      <button
        type="submit"
        class="btn-install"
        :class="{ loading: loading, disabled: !canInstall }"
        :disabled="!canInstall || loading"
      >
        <span v-if="loading" class="btn-spinner"></span>
        <span class="btn-text">
          {{ loading ? 'Installing OS...' : '🚀 Install OS to SD Card' }}
        </span>
      </button>

      <!-- Progress Display -->
      <div v-if="progress.status !== 'idle'" class="progress-card">
        <div class="progress-header">
          <h4>Installation Progress</h4>
          <span class="progress-percent">{{ progress.percent || 0 }}%</span>
        </div>
        <div class="progress-bar-wrapper">
          <div
            class="progress-bar"
            :class="progress.status"
            :style="{ width: `${progress.percent || 0}%` }"
          ></div>
        </div>
        <p class="progress-message" :class="{ error: progress.status === 'error' }">
          {{ progress.message || 'Processing...' }}
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '~/composables/useApi'
import { useSdcards } from '~/composables/useSdcards'
import { useProgress } from '~/composables/useProgress'
import { useNotifications } from '~/composables/useNotifications'

const { installOS, scanWifi: scanWifiApi } = useApi()
const { sdcards, loadSdcards } = useSdcards()
const { progress, start, update, complete, fail, reset } = useProgress()
const notifications = useNotifications()

// State
const selectedDeviceId = ref('')
const osSource = ref<'download' | 'custom'>('download')
const selectedOSVersion = ref('')
const osDescription = ref('')
const customFile = ref<File | undefined>(undefined)
const customFileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const scanningWifi = ref(false)
const showErrors = ref(false)

// Configuration state
const config = ref({
  boot: {
    enable_ssh: true,
    enable_serial: false,
    disable_overscan: true,
    gpu_memory: 64,
  },
  system: {
    hostname: 'raspberrypi',
    timezone: 'UTC',
    locale: 'en_US.UTF-8',
    enable_camera: false,
    enable_spi: false,
    enable_i2c: false,
    enable_serial_hw: false,
  },
  network: {
    enable_ethernet: true,
    enable_wifi: false,
    wifi_ssid: '',
    wifi_password: '',
    wifi_country: 'US',
    wifi_security_type: 'WPA3_Personal',
    wifi_transition_mode: true,
  },
  users: {
    default_password: '',
    additional_users: [] as any[],
  },
  ssh: {
    port: 22,
    enable_password_auth: true,
    disable_root_login: true,
    authorized_keys: [] as string[],
  },
  packages: {
    update_package_list: true,
    upgrade_packages: false,
    packages_to_install: [] as string[],
  },
  scripts: {
    pre_install: [] as string[],
    post_install: [] as string[],
    first_boot: [] as string[],
  },
})

// Computed
const canInstall = computed(() => {
  return (
    selectedDeviceId.value &&
    (osSource.value === 'download'
      ? selectedOSVersion.value
      : customFile.value !== undefined)
  )
})

// Methods
const handleSourceChange = () => {
  if (osSource.value === 'custom') {
    selectedOSVersion.value = ''
    osDescription.value = ''
  } else {
    customFile.value = undefined
    if (customFileInput.value) {
      customFileInput.value.value = ''
    }
  }
}

const updateOSDescription = () => {
  if (osSource.value === 'download' && selectedOSVersion.value) {
    const select = document.getElementById('os-version-select') as HTMLSelectElement
    if (select) {
      const selectedOption = select.options[select.selectedIndex]
      const description = selectedOption?.getAttribute('data-desc') || ''
      osDescription.value = description
    }
  } else {
    osDescription.value = ''
  }
}

const handleCustomFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    customFile.value = target.files[0]
  } else {
    customFile.value = undefined
  }
}

const handleWifiToggle = () => {
  // WiFi settings visibility is handled by v-show
}

const scanWifiNetworks = async () => {
  scanningWifi.value = true
  try {
    const response = await scanWifiApi()
    if (response.success && response.data?.networks) {
      notifications.success(`Found ${response.data.networks.length} networks`)
    } else {
      notifications.error(response.error || 'Failed to scan WiFi networks')
    }
  } catch (error: any) {
    notifications.error(`WiFi scan error: ${error.message}`)
  } finally {
    scanningWifi.value = false
  }
}

const handleInstall = async () => {
  showErrors.value = true

  if (!canInstall.value) {
    notifications.error('Please complete all required fields')
    return
  }

  if (!selectedDeviceId.value) {
    notifications.error('Please select an SD card')
    return
  }

  loading.value = true
  start('Starting OS installation...')

  try {
    // Get selected OS version and download URL
    let osVersion: string | undefined
    let downloadUrl: string | undefined

    if (osSource.value === 'download' && selectedOSVersion.value) {
      osVersion = selectedOSVersion.value
      const select = document.getElementById('os-version-select') as HTMLSelectElement
      if (select) {
        const selectedOption = select.options[select.selectedIndex]
        downloadUrl = selectedOption?.getAttribute('data-url') || undefined
      }
    }

    const requestData = {
      device_id: selectedDeviceId.value,
      os_version: osVersion,
      download_url: downloadUrl,
      custom_image: osSource.value === 'custom' && customFile.value ? customFile.value.name : (undefined as string | undefined),
      configuration: config.value,
    }

    update(10, 'Sending installation request...')
    const response = await installOS(requestData)

    if (response.success) {
      update(100, response.data?.message || 'OS installation completed!')
      complete(response.data?.message || 'OS installation completed!')
      notifications.success('OS installation completed successfully')
      showErrors.value = false
    } else {
      fail(response.error || 'Installation failed', 'Installation failed')
      notifications.error(response.error || 'Installation failed')
    }
  } catch (error: any) {
    fail(error.message || 'Unknown error', 'Installation error')
    notifications.error(`Installation error: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// Watch for tab activation and load data only when this tab is active
const uiStore = useUIStore()
const isActive = computed(() => uiStore.activeTab === 'osinstall')

// Load data when tab becomes active
watch(isActive, async (active) => {
  if (process.dev) {
    console.log('[OsInstallTab] Tab active state changed:', active);
  }
  if (active) {
    if (process.dev) {
      console.log('[OsInstallTab] Loading SD cards data...');
    }
    await loadSdcards()
  }
}, { immediate: true })

// Also load on mount if already active
onMounted(async () => {
  if (isActive.value) {
    await loadSdcards()
  }
})
</script>

<style scoped>
.os-install-tab {
  padding: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.os-install-header {
  margin-bottom: 32px;
  text-align: center;
}

.os-install-header h2 {
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--win11-text, #1a1a1a);
}

.subtitle {
  color: var(--win11-text-secondary, #666);
  font-size: 1rem;
  margin: 0;
}

.os-install-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.install-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--win11-border, #e0e0e0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.2s ease;
}

.install-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 1px solid var(--win11-border, #e0e0e0);
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.card-title-group {
  flex: 1;
}

.card-title-group h3 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--win11-text, #1a1a1a);
}

.card-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--win11-text-secondary, #666);
}

.card-content {
  padding: 24px;
}

.select-wrapper {
  position: relative;
}

.modern-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--win11-border, #e0e0e0);
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
  line-height: 1.6;
}

.modern-select:hover {
  border-color: var(--win11-accent, #0078d4);
}

.modern-select:focus {
  outline: none;
  border-color: var(--win11-accent, #0078d4);
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
}

.modern-select.has-error {
  border-color: #dc3545;
}

.modern-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Style optgroups in the OS image dropdown */
.modern-select optgroup {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--win11-text, #1a1a1a);
  font-style: normal;
  text-transform: none;
}

/* Style options within optgroups for better readability */
.modern-select option {
  padding: 8px 12px;
  font-size: 0.95rem;
  color: var(--win11-text, #1a1a1a);
  font-weight: normal;
}

.error-message {
  margin-top: 8px;
  color: #dc3545;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.radio-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.radio-card {
  display: block;
  border: 2px solid var(--win11-border, #e0e0e0);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.radio-card:hover {
  border-color: var(--win11-accent, #0078d4);
  box-shadow: 0 2px 8px rgba(0, 120, 212, 0.1);
}

.radio-card.active {
  border-color: var(--win11-accent, #0078d4);
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(0, 120, 212, 0.15);
}

.radio-input {
  display: none;
}

.radio-card-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.radio-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.radio-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-text strong {
  font-size: 1rem;
  color: var(--win11-text, #1a1a1a);
}

.radio-text span {
  font-size: 0.875rem;
  color: var(--win11-text-secondary, #666);
}

.os-description-card {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
  border-left: 4px solid var(--win11-accent, #0078d4);
  border-radius: 8px;
  display: flex;
  gap: 12px;
}

.description-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.os-description-text {
  margin: 0;
  color: var(--win11-text, #1a1a1a);
  line-height: 1.6;
  font-size: 0.95rem;
}

.info-box {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff9e6;
  border: 1px solid #ffd700;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #856404;
}

.file-upload-wrapper {
  position: relative;
}

.file-upload-label {
  display: block;
  border: 2px dashed var(--win11-border, #e0e0e0);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
}

.file-upload-label:hover {
  border-color: var(--win11-accent, #0078d4);
  background: #f0f7ff;
}

.file-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.file-upload-icon {
  font-size: 2.5rem;
}

.file-upload-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-upload-text strong {
  color: var(--win11-text, #1a1a1a);
  font-size: 1rem;
}

.file-upload-text span {
  color: var(--win11-text-secondary, #666);
  font-size: 0.875rem;
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.config-details {
  margin-bottom: 16px;
  border: 1px solid var(--win11-border, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
}

.config-summary {
  padding: 16px 20px;
  cursor: pointer;
  font-weight: 500;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  gap: 12px;
  user-select: none;
  list-style: none;
  transition: background 0.2s ease;
}

.config-summary::-webkit-details-marker {
  display: none;
}

.config-summary:hover {
  background: #f0f0f0;
}

.config-icon {
  font-size: 1.25rem;
}

.config-details-content {
  padding: 20px;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid var(--win11-border, #ddd);
  border-radius: 4px;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox-input:checked + .checkbox-custom {
  background: var(--win11-accent, #0078d4);
  border-color: var(--win11-accent, #0078d4);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.checkbox-text {
  color: var(--win11-text, #1a1a1a);
}

.form-label-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.label-text {
  font-weight: 500;
  color: var(--win11-text, #1a1a1a);
  min-width: 120px;
}

.form-input-full {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input-full:focus {
  outline: none;
  border-color: var(--win11-accent, #0078d4);
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
}

.form-input-number {
  width: 100px;
  padding: 10px 12px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 6px;
  font-size: 1rem;
}

.form-hint {
  font-size: 0.85rem;
  color: var(--win11-text-secondary, #666);
  margin-top: 4px;
}

.nested-section {
  margin-top: 16px;
  padding-left: 20px;
  border-left: 3px solid var(--win11-border, #e0e0e0);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nested-label {
  font-weight: 600;
  color: var(--win11-text, #1a1a1a);
  margin-bottom: 8px;
}

.input-with-button {
  display: flex;
  gap: 8px;
}

.btn-scan {
  padding: 10px 16px;
  background: var(--win11-bg-secondary, #f3f3f3);
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-scan:hover:not(:disabled) {
  background: var(--win11-bg-tertiary, #e8e8e8);
}

.btn-scan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.warning-box {
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-content {
  color: #856404;
  line-height: 1.6;
}

.btn-install {
  width: 100%;
  padding: 16px 24px;
  background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 120, 212, 0.3);
}

.btn-install:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 120, 212, 0.4);
}

.btn-install:active:not(:disabled) {
  transform: translateY(0);
}

.btn-install:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-install.loading {
  background: linear-gradient(135deg, #106ebe 0%, #0078d4 100%);
}

.btn-spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-card {
  background: white;
  border: 1px solid var(--win11-border, #e0e0e0);
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--win11-text, #1a1a1a);
}

.progress-percent {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--win11-accent, #0078d4);
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #0078d4 0%, #106ebe 100%);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-bar.error {
  background: linear-gradient(90deg, #dc3545 0%, #c82333 100%);
}

.progress-message {
  margin: 0;
  color: var(--win11-text, #1a1a1a);
  font-size: 0.95rem;
}

.progress-message.error {
  color: #dc3545;
}

@media (max-width: 768px) {
  .os-install-tab {
    padding: 16px;
  }

  .radio-cards {
    grid-template-columns: 1fr;
  }

  .input-with-button {
    flex-direction: column;
  }

  .btn-scan {
    width: 100%;
  }
}
</style>
