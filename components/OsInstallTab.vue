<template>
  <div class="tab-content os-install-tab">
    <h2>OS Installation</h2>
    <form @submit.prevent="handleInstall" class="test-section">
      <fieldset>
        <legend><h3>Select SD Card</h3></legend>
        <select
          v-model="selectedDeviceId"
          aria-label="Select SD Card"
          class="select-full-width"
          :disabled="loading"
        >
          <option value="">-- Select SD Card --</option>
          <option
            v-for="card in sdcards"
            :key="card.device_id"
            :value="card.device_id"
          >
            {{ card.label }} ({{ card.size_gb }} GB)
          </option>
        </select>
      </fieldset>

      <fieldset>
        <legend><h3>Select OS Image</h3></legend>
        <div class="radio-group">
          <label>
            <input
              type="radio"
              v-model="osSource"
              value="download"
              @change="handleSourceChange"
            />
            Download OS Image
          </label>
          <br />
          <label>
            <input
              type="radio"
              v-model="osSource"
              value="custom"
              @change="handleSourceChange"
            />
            Use Custom Image File
          </label>
        </div>
      </fieldset>

      <fieldset v-show="osSource === 'download'" id="os-download-section">
        <legend><h3>OS Image Selection</h3></legend>
        <select
          v-model="selectedOSVersion"
          @change="updateOSDescription"
          aria-label="Select OS Image"
          class="select-full-width"
          :disabled="loading"
        >
          <optgroup label="Raspberry Pi OS - Official (32-bit)">
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
          <optgroup label="Raspberry Pi OS - Official (64-bit)">
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
          <optgroup label="Ubuntu - Official">
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
            <option
              value="ubuntu_core_24"
              data-url="https://cdimage.ubuntu.com/ubuntu-core/24/stable/current/ubuntu-core-24-arm64+raspi.img.xz"
              data-desc="Ubuntu Core 24 - Minimal, transactional OS designed for IoT and embedded devices. Features atomic updates, snap packages, and enhanced security. Ideal for production IoT deployments."
            >
              Ubuntu Core 24 (64-bit)
            </option>
          </optgroup>
          <!-- Additional OS options would continue here - truncated for brevity -->
        </select>
        <div v-if="osDescription" class="os-description">
          <p class="os-description-text">{{ osDescription }}</p>
        </div>
        <p class="os-note">
          <strong>Note:</strong> Images will be downloaded from official sources.
          Some images may require manual URL resolution for the latest version.
        </p>
      </fieldset>

      <fieldset v-show="osSource === 'custom'" id="os-custom-section">
        <legend><h3>Custom Image File</h3></legend>
        <label for="os-custom-file" class="form-label">Custom Image File:</label>
        <input
          type="file"
          id="os-custom-file"
          ref="customFileInput"
          accept=".img,.zip"
          class="file-input-full"
          aria-label="Select custom OS image file"
          @change="handleCustomFileChange"
        />
      </fieldset>

      <!-- Configuration Options -->
      <div class="config-section">
        <h3>Configuration Options</h3>
        <p class="config-description">Configure the OS before installation</p>

        <!-- Boot Settings -->
        <details class="details-section">
          <summary class="details-summary">Boot Settings</summary>
          <div class="details-content">
            <label class="form-label">
              <input
                type="checkbox"
                v-model="config.boot.enable_ssh"
                id="os-enable-ssh"
              />
              Enable SSH
            </label>
            <label class="form-label">
              <input
                type="checkbox"
                v-model="config.boot.enable_serial"
                id="os-enable-serial"
              />
              Enable Serial Console
            </label>
            <label class="form-label">
              <input
                type="checkbox"
                v-model="config.boot.disable_overscan"
                id="os-disable-overscan"
              />
              Disable Overscan
            </label>
            <label class="form-label">
              GPU Memory (MB):
              <input
                type="number"
                v-model.number="config.boot.gpu_memory"
                id="os-gpu-memory"
                min="16"
                max="512"
                step="16"
                class="form-input-number"
              />
              <small class="form-hint"
                >GPU memory in MB (16-512, typically 64 or 128)</small
              >
            </label>
          </div>
        </details>

        <!-- System Settings -->
        <details class="details-section">
          <summary class="details-summary">System Settings</summary>
          <div class="details-content">
            <label class="form-label">
              Hostname:
              <input
                type="text"
                v-model="config.system.hostname"
                id="os-hostname"
                class="form-input-full"
                pattern="[a-zA-Z0-9\-]+"
                minlength="1"
                maxlength="63"
              />
              <small class="form-hint"
                >Valid hostname characters: letters, numbers, and hyphens
                (1-63 characters)</small
              >
            </label>
            <label class="form-label">
              Timezone:
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
            <label class="form-label">
              Locale:
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
              <label class="form-label-small">Hardware Interfaces:</label>
              <label class="form-label-small">
                <input
                  type="checkbox"
                  v-model="config.system.enable_camera"
                  id="os-enable-camera"
                />
                Enable Camera
              </label>
              <label class="form-label-small">
                <input
                  type="checkbox"
                  v-model="config.system.enable_spi"
                  id="os-enable-spi"
                />
                Enable SPI
              </label>
              <label class="form-label-small">
                <input
                  type="checkbox"
                  v-model="config.system.enable_i2c"
                  id="os-enable-i2c"
                />
                Enable I2C
              </label>
              <label class="form-label-small">
                <input
                  type="checkbox"
                  v-model="config.system.enable_serial_hw"
                  id="os-enable-serial-hw"
                />
                Enable Serial (Hardware)
              </label>
            </div>
          </div>
        </details>

        <!-- Network Settings - This is a large section, will be simplified for now -->
        <details class="details-section">
          <summary class="details-summary">Network Settings</summary>
          <div class="details-content">
            <label class="form-label">
              <input
                type="checkbox"
                v-model="config.network.enable_ethernet"
                id="os-enable-ethernet"
              />
              Enable Ethernet
            </label>
            <label class="form-label">
              <input
                type="checkbox"
                v-model="config.network.enable_wifi"
                id="os-enable-wifi"
                @change="handleWifiToggle"
              />
              Enable WiFi
            </label>
            <div v-show="config.network.enable_wifi" id="os-wifi-settings" class="nested-section">
              <!-- WiFi configuration will be added in next iteration -->
              <label class="form-label">
                Network Name (SSID):
                <div class="flex-row">
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
                    class="btn-secondary white-space-nowrap"
                    :disabled="scanningWifi"
                  >
                    {{ scanningWifi ? 'Scanning...' : '🔍 Scan' }}
                  </button>
                </div>
              </label>
              <!-- Additional WiFi fields would continue here -->
            </div>
          </div>
        </details>

        <!-- Additional configuration sections would continue here -->
        <!-- User Settings, SSH Settings, Package Settings, Custom Scripts -->
      </div>

      <button
        type="submit"
        class="btn btn-primary install-button"
        :disabled="!canInstall || loading"
      >
        {{ loading ? 'Installing...' : 'Install OS to SD Card' }}
      </button>
      <p class="sr-only" role="alert">
        Warning: This will erase all data on the selected SD card. This action
        cannot be undone.
      </p>

      <div v-if="progress.status !== 'idle'" id="os-install-progress" class="progress-container">
        <div class="progress-bar-wrapper">
          <div
            class="progress-bar"
            :style="{ width: `${progress.percent || 0}%` }"
          ></div>
        </div>
        <p class="status-text" :class="{ error: progress.status === 'error' }">
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
    // ... additional WiFi config fields
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
      // Handle WiFi scan results
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
  if (!canInstall.value) {
    notifications.error('Please select an SD card and OS image')
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

// Watch for SD card changes to update dropdown
watch(sdcards, (newCards) => {
  // SD cards are already reactive, no additional action needed
})

// Also load on mount if already active
onMounted(async () => {
  if (isActive.value) {
    await loadSdcards()
  }
})
</script>

<style scoped>
.os-install-tab {
  padding: 24px;
}

.os-install-tab fieldset {
  margin: 24px 0;
  padding: 16px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
  background: var(--win11-bg-secondary, #f9f9f9);
}

.os-install-tab fieldset legend {
  padding: 0 8px;
  font-weight: 500;
}

.os-install-tab fieldset legend h3 {
  margin: 0;
  font-size: 1.1em;
}

.radio-group {
  margin: 16px 0;
}

.radio-group label {
  display: block;
  margin: 8px 0;
}

.os-description {
  margin: 16px 0;
  padding: 12px;
  background: var(--win11-bg-secondary, #f3f3f3);
  border-radius: 4px;
}

.os-description-text {
  margin: 0;
  color: var(--win11-text-secondary, #666);
  font-size: 0.9em;
  line-height: 1.5;
}

.os-note {
  margin: 12px 0;
  font-size: 0.9em;
  color: var(--win11-text-secondary, #666);
}

.config-section {
  margin: 24px 0;
}

.details-section {
  margin: 16px 0;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
}

.details-summary {
  padding: 12px;
  cursor: pointer;
  font-weight: 500;
  background: var(--win11-bg-secondary, #f9f9f9);
  user-select: none;
}

.details-summary:hover {
  background: var(--win11-bg-tertiary, #f0f0f0);
}

.details-content {
  padding: 16px;
}

.nested-section {
  margin-top: 16px;
  padding-left: 16px;
  border-left: 2px solid var(--win11-border, #ddd);
}

.progress-container {
  margin-top: 24px;
  display: none;
}

.progress-container:has(.progress-bar) {
  display: block;
}

.progress-bar-wrapper {
  width: 100%;
  height: 24px;
  background: var(--win11-bg-secondary, #f0f0f0);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background: var(--win11-accent, #0078d4);
  transition: width 0.3s ease;
}

.status-text {
  margin: 8px 0;
  color: var(--win11-text, #333);
}

.status-text.error {
  color: var(--win11-error, #dc3545);
}

.install-button {
  margin-top: 24px;
  width: 100%;
}

.flex-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-label {
  display: block;
  margin: 12px 0;
}

.form-label-small {
  display: block;
  margin: 8px 0;
  font-size: 0.9em;
}

.form-input-full {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
  font-size: 14px;
}

.form-input-number {
  width: 120px;
  padding: 8px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  color: var(--win11-text-secondary, #666);
}

.select-full-width {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
  font-size: 14px;
}

.file-input-full {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--win11-border, #ddd);
  border-radius: 4px;
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
  background: var(--win11-bg-secondary, #f3f3f3);
  color: var(--win11-text, #333);
  border: 1px solid var(--win11-border, #ddd);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--win11-bg-tertiary, #e8e8e8);
}

.white-space-nowrap {
  white-space: nowrap;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
