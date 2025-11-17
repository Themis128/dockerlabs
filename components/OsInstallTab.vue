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
                💾 {{ card.name }} ({{ card.sizeFormatted || (card.size ? `${(card.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'Unknown size') }})
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

              <!-- SSH Settings Section -->
              <div class="nested-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--win11-border);">
                <span class="nested-label" style="font-weight: 600; margin-bottom: 12px; display: block;">🔐 SSH Configuration</span>
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
                <div v-show="config.boot.enable_ssh" class="nested-section" style="margin-left: 24px; margin-top: 12px;">
                  <label class="form-label-block">
                    <span class="label-text">SSH Port:</span>
                    <input
                      type="number"
                      v-model.number="config.boot.ssh_port"
                      id="os-ssh-port"
                      min="1"
                      max="65535"
                      class="form-input-full"
                      placeholder="22"
                    />
                    <small class="form-hint">Default: 22 (1-65535)</small>
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      v-model="config.boot.ssh_enable_password_auth"
                      id="os-ssh-password-auth"
                      class="checkbox-input"
                    />
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Enable Password Authentication</span>
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      v-model="config.boot.ssh_disable_root_login"
                      id="os-ssh-disable-root"
                      class="checkbox-input"
                    />
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Disable Root Login (Recommended)</span>
                  </label>
                  <label class="form-label-block">
                    <span class="label-text">SSH Authorized Keys (one per line):</span>
                    <textarea
                      v-model="sshAuthorizedKeysText"
                      @input="updateSSHAuthorizedKeys"
                      id="os-ssh-authorized-keys"
                      class="form-input-full"
                      rows="4"
                      placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQ..."
                      style="font-family: monospace; font-size: 12px;"
                    ></textarea>
                    <small class="form-hint">Paste your public SSH keys here (one per line)</small>
                  </label>
                </div>
              </div>

              <!-- Telnet Settings Section -->
              <div class="nested-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--win11-border);">
                <span class="nested-label" style="font-weight: 600; margin-bottom: 12px; display: block;">📡 Telnet Configuration</span>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.boot.enable_telnet"
                    id="os-enable-telnet"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">Enable Telnet</span>
                </label>
                <div v-show="config.boot.enable_telnet" class="nested-section" style="margin-left: 24px; margin-top: 12px;">
                  <label class="form-label-block">
                    <span class="label-text">Telnet Port:</span>
                    <input
                      type="number"
                      v-model.number="config.boot.telnet_port"
                      id="os-telnet-port"
                      min="1"
                      max="65535"
                      class="form-input-full"
                      placeholder="23"
                    />
                    <small class="form-hint">Default: 23 (1-65535)</small>
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      v-model="config.boot.telnet_enable_login"
                      id="os-telnet-enable-login"
                      class="checkbox-input"
                    />
                    <span class="checkbox-custom"></span>
                    <span class="checkbox-text">Enable Login Authentication</span>
                  </label>
                  <div v-show="config.boot.telnet_enable_login">
                    <label class="form-label-block">
                      <span class="label-text">Telnet Username:</span>
                      <input
                        type="text"
                        v-model="config.boot.telnet_username"
                        id="os-telnet-username"
                        class="form-input-full"
                        placeholder="pi"
                        autocomplete="off"
                      />
                      <small class="form-hint">Username for Telnet login</small>
                    </label>
                    <label class="form-label-block">
                      <span class="label-text">Telnet Password:</span>
                      <input
                        type="password"
                        v-model="config.boot.telnet_password"
                        id="os-telnet-password"
                        class="form-input-full"
                        placeholder="Enter password"
                        autocomplete="new-password"
                      />
                      <small class="form-hint">Password for Telnet login</small>
                    </label>
                  </div>
                </div>
              </div>
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
                  autocomplete="off"
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
                  <option value="el_GR.UTF-8">Greek (Greece)</option>
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
                      autocomplete="off"
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
                  <div v-if="wifiNetworks.length > 0" class="wifi-networks-list">
                    <p class="form-hint">Select a network:</p>
                    <div class="wifi-network-item" v-for="network in wifiNetworks" :key="network.ssid">
                      <button
                        type="button"
                        @click="selectWifiNetwork(network)"
                        class="wifi-network-btn"
                      >
                        <span class="wifi-ssid">{{ network.ssid }}</span>
                        <span class="wifi-info">
                          <span v-if="network.signal !== undefined" class="wifi-signal">Signal: {{ network.signal }}%</span>
                          <span v-if="network.security" class="wifi-security">{{ network.security }}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </label>
                <label class="form-label-block">
                  <span class="label-text">Password:</span>
                  <input
                    type="password"
                    v-model="config.network.wifi_password"
                    id="os-wifi-password"
                    class="form-input-full"
                    placeholder="WiFi password"
                    autocomplete="new-password"
                  />
                </label>
                <label class="form-label-block">
                  <span class="label-text">Country Code:</span>
                  <select v-model="config.network.wifi_country" id="os-wifi-country" class="form-input-full">
                    <option value="US">US - United States</option>
                    <option value="GB">GB - United Kingdom</option>
                    <option value="DE">DE - Germany</option>
                    <option value="FR">FR - France</option>
                    <option value="ES">ES - Spain</option>
                    <option value="IT">IT - Italy</option>
                    <option value="JP">JP - Japan</option>
                    <option value="CA">CA - Canada</option>
                    <option value="AU">AU - Australia</option>
                    <option value="GR">GR - Greece</option>
                  </select>
                </label>
                <label class="form-label-block">
                  <span class="label-text">Security Type:</span>
                  <select v-model="config.network.wifi_security_type" id="os-wifi-security" class="form-input-full">
                    <option value="WPA3_Personal">WPA3-Personal (SAE) - Recommended</option>
                    <option value="WPA2_Personal">WPA2-Personal (PSK)</option>
                    <option value="WPA3_Enterprise">WPA3-Enterprise</option>
                    <option value="WPA2_Enterprise">WPA2-Enterprise</option>
                    <option value="OWE">OWE (Opportunistic Wireless Encryption)</option>
                    <option value="Open">Open (No Security)</option>
                  </select>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.network.wifi_transition_mode"
                    id="os-wifi-transition"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">WPA2/WPA3 Transition Mode (Best Compatibility)</span>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="config.network.wifi_hidden"
                    id="os-wifi-hidden"
                    class="checkbox-input"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text">Hidden Network</span>
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

        <!-- Detailed Progress Log -->
        <div v-if="progressLogs?.length > 0" class="progress-log-container">
          <div class="progress-log-header">
            <h5>Detailed Log</h5>
            <button
              type="button"
              class="btn-clear-log"
              @click="clearProgressLog"
              title="Clear log"
            >
              Clear
            </button>
          </div>
          <div class="progress-log">
            <div
              v-for="(log, index) in (progressLogs || [])"
              :key="index"
              class="progress-log-entry"
              :class="log.type"
            >
              <span class="log-timestamp">{{ log.timestamp }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
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
import { useUIStore } from '~/stores/ui'

const { installOS, scanWifi: scanWifiApi } = useApi()
const { sdcards, loadSdcards } = useSdcards()
const { progress, start, update, complete, fail, reset } = useProgress()
const notifications = useNotifications()

// Progress log state
interface ProgressLogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

const progressLogs = ref<ProgressLogEntry[]>([])

const addProgressLog = (message: string, type: ProgressLogEntry['type'] = 'info') => {
  const timestamp = new Date().toLocaleTimeString()
  progressLogs.value.push({ timestamp, message, type })
  // Keep only last 100 log entries
  if (progressLogs.value.length > 100) {
    progressLogs.value.shift()
  }
}

const clearProgressLog = () => {
  progressLogs.value = []
}

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
const sshAuthorizedKeysText = ref('')

// Configuration state type
interface OSInstallConfig {
  boot: {
    enable_ssh: boolean
    enable_serial: boolean
    disable_overscan: boolean
    gpu_memory: number
    ssh_port: number
    ssh_enable_password_auth: boolean
    ssh_disable_root_login: boolean
    ssh_authorized_keys: string[]
    enable_telnet: boolean
    telnet_port: number
    telnet_username: string
    telnet_password: string
    telnet_enable_login: boolean
  }
  system: {
    hostname: string
    timezone: string
    locale: string
    enable_camera: boolean
    enable_spi: boolean
    enable_i2c: boolean
    enable_serial_hw: boolean
  }
  network: {
    enable_ethernet: boolean
    enable_wifi: boolean
    wifi_ssid: string
    wifi_password: string
    wifi_country: string
    wifi_security_type: string
    wifi_transition_mode: boolean
    wifi_hidden: boolean
  }
  users: {
    default_password: string
    additional_users: any[]
  }
  ssh: {
    port: number
    enable_password_auth: boolean
    disable_root_login: boolean
    authorized_keys: string[]
  }
  packages: {
    update_package_list: boolean
    upgrade_packages: boolean
    packages_to_install: string[]
  }
  scripts: {
    pre_install: string[]
    post_install: string[]
    first_boot: string[]
  }
}

// Configuration state
const config = ref<OSInstallConfig>({
  boot: {
    enable_ssh: true,
    enable_serial: false,
    disable_overscan: true,
    gpu_memory: 64,
    ssh_port: 22,
    ssh_enable_password_auth: true,
    ssh_disable_root_login: true,
    ssh_authorized_keys: [],
    enable_telnet: false,
    telnet_port: 23,
    telnet_username: 'pi',
    telnet_password: '',
    telnet_enable_login: true,
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
    wifi_hidden: false,
  },
  users: {
    default_password: '',
    additional_users: [],
  },
  ssh: {
    port: 22,
    enable_password_auth: true,
    disable_root_login: true,
    authorized_keys: [],
  },
  packages: {
    update_package_list: true,
    upgrade_packages: false,
    packages_to_install: [],
  },
  scripts: {
    pre_install: [],
    post_install: [],
    first_boot: [],
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

const updateSSHAuthorizedKeys = () => {
  // Split by newlines and filter out empty lines
  config.value.boot.ssh_authorized_keys = sshAuthorizedKeysText.value
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
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

const wifiNetworks = ref<Array<{ ssid: string; signal?: number; security?: string }>>([])

// Convert dBm to percentage (approximate)
const dbmToPercentage = (dbm: number): number => {
  // dBm range: -100 (weakest) to -30 (strongest)
  // Convert to percentage: 0% = -100 dBm, 100% = -30 dBm
  if (dbm >= -30) return 100
  if (dbm <= -100) return 0
  // Linear conversion: percentage = ((dbm + 100) / 70) * 100
  return Math.round(((dbm + 100) / 70) * 100)
}

const scanWifiNetworks = async () => {
  scanningWifi.value = true
  wifiNetworks.value = []
  try {
    const response = await scanWifiApi()
    // Handle both response.networks (direct) and response.data.networks (wrapped) formats
    const networks = response.networks || response.data?.networks || []
    if (response.success && networks.length > 0) {
      wifiNetworks.value = networks.map((net: any) => {
        let signalPercent = 0
        const signalValue = net.signal_strength || net.signal || 0

        // If signal is negative, it's in dBm - convert to percentage
        if (signalValue < 0) {
          signalPercent = dbmToPercentage(signalValue)
        } else if (signalValue > 0 && signalValue <= 100) {
          // Already a percentage
          signalPercent = signalValue
        }

        return {
          ssid: net.ssid || '',
          signal: signalPercent,
          security: net.security || 'Unknown',
        }
      })
      notifications.success(`Found ${wifiNetworks.value.length} WiFi networks`)
    } else {
      const errorMsg = response.error || 'Failed to scan WiFi networks'
      notifications.error(errorMsg)
      console.error('[WiFi Scan] Error:', response)
    }
  } catch (error: any) {
    const errorMsg = error.message || 'WiFi scan error'
    notifications.error(errorMsg)
    console.error('[WiFi Scan] Exception:', error)
  } finally {
    scanningWifi.value = false
  }
}

const selectWifiNetwork = (network: { ssid: string; signal?: number; security?: string }) => {
  config.value.network.wifi_ssid = network.ssid
  notifications.success(`Selected network: ${network.ssid}`)
}

// Helper function to format SD card with streaming
const formatSdcardWithStreaming = async (deviceId: string, piModel: string = 'pi5'): Promise<boolean> => {
  const runtimeConfig = useRuntimeConfig()
  const apiBase = runtimeConfig.public.apiBase || '/api'

  update(0, 'Formatting SD card...')

  const response = await fetch(`${apiBase}/format-sdcard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      device_id: deviceId,
      pi_model: piModel,
      stream: true,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Formatting request failed' }))
    fail(errorData.error || 'Formatting failed', 'Formatting failed')
    notifications.error(errorData.error || 'Formatting failed')
    return false
  }

  // Handle streaming response
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  if (!reader) {
    throw new Error('Response body is not readable')
  }

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const jsonStr = line.substring(6).trim()
          if (!jsonStr) continue // Skip empty data lines
          const data = JSON.parse(jsonStr)

          if (data.type === 'progress') {
            // Update progress from backend (scale to 0-50% for formatting phase)
            const percent = data.percent !== null && data.percent !== undefined ? data.percent : null
            const message = data.message || ''
            if (percent !== null) {
              // Formatting takes first 50% of total progress
              update(Math.floor(percent * 0.5), `Formatting: ${message}`)
              addProgressLog(`[${percent}%] ${message}`, 'info')
            } else if (message) {
              update(progress.value.percent || 0, `Formatting: ${message}`)
              addProgressLog(message, 'info')
            }
          } else if (data.success !== undefined) {
            // Final result
            if (data.success) {
              update(50, 'SD card formatted successfully')
              addProgressLog('SD card formatted successfully', 'success')
              return true
            } else {
              let errorMsg = data.error || 'Formatting failed'
              // Provide helpful guidance for Windows admin errors
              if (errorMsg.includes('Administrator') || errorMsg.includes('privileges')) {
                errorMsg = `${errorMsg}\n\nTo fix this on Windows:\n1. Stop the current server\n2. Right-click PowerShell and select "Run as administrator"\n3. Navigate to the project directory\n4. Run: python web-gui/server.py\n\nOr use: .\\scripts\\powershell\\start-server-as-admin.ps1`
              }
              fail(errorMsg, 'Formatting failed')
              addProgressLog(errorMsg, 'error')
              notifications.error(errorMsg)
              return false
            }
          }
        } catch (parseError) {
          console.error('[Format] Failed to parse progress data:', parseError, line)
        }
      }
    }
  }

  // If we get here without a final result, something went wrong
  fail('Formatting ended without completion status', 'Formatting error')
  notifications.error('Formatting ended unexpectedly')
  return false
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
  progressLogs.value = [] // Clear previous logs
  addProgressLog('Starting installation process...', 'info')
  start('Preparing installation...')

  try {
    // Step 1: Format the SD card first
    update(0, 'Step 1: Formatting SD card to correct format...')
    addProgressLog('Step 1: Formatting SD card...', 'info')
    const formatSuccess = await formatSdcardWithStreaming(selectedDeviceId.value, 'pi5')

    if (!formatSuccess) {
      // Formatting failed, stop here
      loading.value = false
      return
    }

    // Step 2: Proceed with OS installation
    update(50, 'Step 2: Starting OS installation...')
    addProgressLog('Step 2: Starting OS installation...', 'info')

    // Get selected OS version and download URL
    let osVersion: string | undefined
    let downloadUrl: string | undefined

    if (osSource.value === 'download' && selectedOSVersion.value) {
      osVersion = selectedOSVersion.value
      const select = document.getElementById('os-version-select') as HTMLSelectElement
      if (select) {
        const selectedOption = select.options[select.selectedIndex]
        downloadUrl = selectedOption?.getAttribute('data-url') || undefined

        // Validate that download URL exists
        if (!downloadUrl) {
          const errorMsg = 'Download URL not found. Please select a valid OS version.'
          fail(errorMsg, 'Configuration error')
          addProgressLog(errorMsg, 'error')
          notifications.error(errorMsg)
          loading.value = false
          return
        }
      } else {
        const errorMsg = 'OS version select element not found. Please refresh the page.'
        fail(errorMsg, 'Configuration error')
        addProgressLog(errorMsg, 'error')
        notifications.error(errorMsg)
        loading.value = false
        return
      }
    } else if (osSource.value === 'download') {
      const errorMsg = 'Please select an OS version to download.'
      fail(errorMsg, 'Configuration error')
      addProgressLog(errorMsg, 'error')
      notifications.error(errorMsg)
      loading.value = false
      return
    }

    const requestData = {
      device_id: selectedDeviceId.value,
      os_version: osVersion,
      download_url: downloadUrl,
      custom_image: osSource.value === 'custom' && customFile.value ? customFile.value.name : (undefined as string | undefined),
      configuration: config.value,
      stream: true, // Request streaming progress
    }

    // Use streaming installation with SSE
    const runtimeConfig = useRuntimeConfig()
    const apiBase = runtimeConfig.public.apiBase || '/api'

    const response = await fetch(`${apiBase}/install-os`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Installation request failed' }))
      fail(errorData.error || 'Installation failed', 'Installation failed')
      notifications.error(errorData.error || 'Installation failed')
      return
    }

    // Handle streaming response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) {
      throw new Error('Response body is not readable')
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6).trim()
            if (!jsonStr) continue // Skip empty data lines
            const data = JSON.parse(jsonStr)

            if (data.type === 'progress') {
              // Update progress from backend (scale to 50-100% for installation phase)
              const percent = data.percent !== null && data.percent !== undefined ? data.percent : null
              const message = data.message || ''
              if (percent !== null) {
                // Installation takes last 50% of total progress (50-100%)
                update(50 + Math.floor(percent * 0.5), `Installing: ${message}`)
                addProgressLog(`[${percent}%] ${message}`, 'info')
              } else if (message) {
                update(progress.value.percent || 50, `Installing: ${message}`)
                addProgressLog(message, 'info')
              }
            } else if (data.type === 'error_debug') {
              // Handle verbose error debugging information
              let debugMessage = data.message || 'Debug information'

              // Add exception type if available
              if (data.exception_type) {
                debugMessage += ` [${data.exception_type}]`
              }

              // Add traceback if available
              if (data.traceback) {
                addProgressLog(debugMessage, 'error')
                // Split traceback into lines for better readability
                const tracebackLines = data.traceback.split('\n').filter((line: string) => line.trim())
                tracebackLines.forEach((line: string) => {
                  addProgressLog(`  ${line}`, 'error')
                })
              } else {
                addProgressLog(debugMessage, 'error')
              }

              // Add context information if available
              if (data.context) {
                const contextStr = JSON.stringify(data.context, null, 2)
                const contextLines = contextStr.split('\n')
                contextLines.forEach((line: string) => {
                  addProgressLog(`  ${line}`, 'warning')
                })
              }
            } else if (data.success !== undefined) {
              // Final result
              if (data.success) {
                const successMsg = data.message || 'OS installation completed!'
                complete(successMsg)
                addProgressLog(successMsg, 'success')
                notifications.success(successMsg)
                showErrors.value = false
              } else {
                // Ensure error message is a string, not a boolean or other type
                let errorMsg = 'Installation failed'
                if (data.error !== undefined && data.error !== null) {
                  if (typeof data.error === 'string') {
                    errorMsg = data.error
                  } else if (typeof data.error === 'boolean') {
                    errorMsg = data.error ? 'Installation failed (unknown error)' : 'Installation was cancelled'
                  } else {
                    errorMsg = String(data.error)
                  }
                }
                fail(errorMsg, 'Installation failed')
                addProgressLog(errorMsg, 'error')

                // Display verbose debug information if available
                if (data.debug_info) {
                  addProgressLog('--- Debug Information ---', 'error')

                  if (data.debug_info.exception_type) {
                    addProgressLog(`Exception Type: ${data.debug_info.exception_type}`, 'error')
                  }

                  if (data.debug_info.traceback) {
                    addProgressLog('Traceback:', 'error')
                    const tracebackLines = data.debug_info.traceback.split('\n').filter((line: string) => line.trim())
                    tracebackLines.forEach((line: string) => {
                      addProgressLog(`  ${line}`, 'error')
                    })
                  }

                  if (data.debug_info.returncode !== undefined) {
                    addProgressLog(`Return Code: ${data.debug_info.returncode}`, 'error')
                  }

                  if (data.debug_info.command) {
                    addProgressLog(`Command: ${data.debug_info.command}`, 'error')
                  }

                  if (data.debug_info.stdout) {
                    addProgressLog('STDOUT:', 'error')
                    const stdoutLines = data.debug_info.stdout.split('\n').filter((line: string) => line.trim())
                    stdoutLines.forEach((line: string) => {
                      addProgressLog(`  ${line}`, 'error')
                    })
                  }

                  if (data.debug_info.stderr) {
                    addProgressLog('STDERR:', 'error')
                    const stderrLines = data.debug_info.stderr.split('\n').filter((line: string) => line.trim())
                    stderrLines.forEach((line: string) => {
                      addProgressLog(`  ${line}`, 'error')
                    })
                  }

                  addProgressLog('--- End Debug Information ---', 'error')
                }

                notifications.error(errorMsg)
              }
              loading.value = false
              return
            }
          } catch (parseError) {
            console.error('[Install] Failed to parse progress data:', parseError, line)
          }
        }
      }
    }

    // If we get here without a final result, something went wrong
    if (progress.value.status === 'running') {
      fail('Installation ended without completion status', 'Installation error')
      notifications.error('Installation ended unexpectedly')
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error'
    fail(errorMsg, 'Installation error')
    addProgressLog(`Error: ${errorMsg}`, 'error')
    notifications.error(`Installation error: ${errorMsg}`)
  } finally {
    loading.value = false
  }
}

// Watch for tab activation and load data only when this tab is active
const uiStore = useUIStore()
const isActive = computed(() => uiStore.activeTab === 'osinstall')

// Sync SSH authorized keys textarea with array
watch(() => config.value.boot.ssh_authorized_keys, (keys) => {
  if (keys && keys.length > 0) {
    sshAuthorizedKeysText.value = keys.join('\n')
  } else if (!sshAuthorizedKeysText.value) {
    sshAuthorizedKeysText.value = ''
  }
}, { deep: true })

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

.wifi-network-item:last-child {
  margin-bottom: 0;
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
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.wifi-network-btn:hover {
  background: var(--win11-bg-tertiary, #f0f0f0);
}

.wifi-ssid {
  font-weight: 500;
  color: var(--win11-text-primary, #333);
}

.wifi-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: 0.85rem;
}

.wifi-signal {
  color: var(--win11-text-secondary, #666);
}

.wifi-security {
  color: var(--win11-text-secondary, #666);
  font-size: 0.8rem;
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

.progress-log-container {
  margin-top: 20px;
  border-top: 1px solid var(--win11-border, #e0e0e0);
  padding-top: 16px;
}

.progress-log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-log-header h5 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--win11-text, #1a1a1a);
}

.btn-clear-log {
  background: transparent;
  border: 1px solid var(--win11-border, #e0e0e0);
  color: var(--win11-text-secondary, #666);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear-log:hover {
  background: var(--win11-bg-hover, #f5f5f5);
  border-color: var(--win11-accent, #0078d4);
  color: var(--win11-accent, #0078d4);
}

.progress-log {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border: 1px solid var(--win11-border, #e0e0e0);
  border-radius: 4px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
}

.progress-log-entry {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.progress-log-entry:last-child {
  border-bottom: none;
}

.progress-log-entry.info {
  color: #1a1a1a;
}

.progress-log-entry.success {
  color: #28a745;
}

.progress-log-entry.error {
  color: #dc3545;
}

.progress-log-entry.warning {
  color: #ffc107;
}

.log-timestamp {
  color: #666;
  font-weight: 500;
  min-width: 80px;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  word-break: break-word;
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
