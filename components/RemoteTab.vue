<template>
  <div class="tab-content">
    <h2>Remote Connection</h2>

    <!-- Connection Settings -->
    <div class="test-section">
      <h3>Connection Settings</h3>
      <form @submit.prevent="handleConnect">
        <div class="remote-form-grid">
          <div>
            <label for="remote-pi-select" class="remote-form-field">Select Pi:</label>
            <select
              id="remote-pi-select"
              v-model="connectionSettings.piNumber"
              :disabled="isConnected"
              class="remote-input"
            >
              <option v-for="pi in availablePis" :key="pi.number" :value="pi.number">
                Raspberry Pi {{ pi.number }}
              </option>
            </select>
          </div>
          <div>
            <label for="remote-connection-type" class="remote-form-field">Connection Type:</label>
            <select
              id="remote-connection-type"
              v-model="connectionSettings.connectionType"
              :disabled="isConnected"
              class="remote-input"
            >
              <option value="ssh">SSH</option>
              <option value="telnet">Telnet</option>
            </select>
          </div>
          <div>
            <label for="remote-network-type" class="remote-form-field">Network:</label>
            <select
              id="remote-network-type"
              v-model="connectionSettings.networkType"
              :disabled="isConnected"
              class="remote-input"
            >
              <option value="auto">Auto (Ethernet preferred)</option>
              <option value="ethernet">Ethernet</option>
              <option value="wifi">WiFi</option>
            </select>
          </div>
          <div>
            <label for="remote-username" class="remote-form-field">Username:</label>
            <input
              id="remote-username"
              v-model="connectionSettings.username"
              type="text"
              :disabled="isConnected"
              autocomplete="username"
              class="remote-input"
            />
          </div>
          <div>
            <label for="remote-password" class="remote-form-field">Password (optional):</label>
            <input
              id="remote-password"
              v-model="connectionSettings.password"
              type="password"
              :disabled="isConnected"
              placeholder="Leave empty for key auth"
              autocomplete="current-password"
              class="remote-input"
            />
          </div>
          <div>
            <label for="remote-key-path" class="remote-form-field">SSH Key Path (optional):</label>
            <input
              id="remote-key-path"
              v-model="connectionSettings.keyPath"
              type="text"
              :disabled="isConnected"
              placeholder="~/.ssh/id_rsa"
              autocomplete="off"
              class="remote-input"
            />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">
          {{ isConnected ? 'Disconnect' : 'Connect' }}
        </button>
        <div class="remote-status" :style="{ color: connectionStatusColor }">
          {{ connectionStatusText }}
        </div>
      </form>
    </div>

    <!-- Command Terminal -->
    <div class="test-section terminal-section">
      <h3>Command Terminal</h3>
      <div
        ref="terminalRef"
        class="terminal"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Remote terminal output"
        tabindex="0"
      >
        <div
          v-for="(line, index) in terminalLines"
          :key="index"
          class="terminal-line"
          :style="{ color: line.color }"
        >
          {{ line.text }}
        </div>
        <div v-if="terminalLines.length === 0" class="terminal-prompt">
          Remote Terminal - Select Pi and click Connect to start
        </div>
      </div>
      <div class="terminal-input-group">
        <label for="remote-command-input" class="sr-only">Command Input</label>
        <input
          id="remote-command-input"
          v-model="commandInput"
          type="text"
          placeholder="Enter command..."
          class="terminal-input"
          aria-label="Enter command to execute"
          autocomplete="off"
          spellcheck="false"
          :disabled="!isConnected"
          @keypress.enter="handleExecuteCommand"
        />
        <small id="command-hint" class="sr-only">
          Press Enter or click Execute to run the command
        </small>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!isConnected"
          @click="handleExecuteCommand"
        >
          Execute
        </button>
        <button type="button" class="btn btn-secondary" @click="clearTerminal">Clear</button>
      </div>
    </div>

    <!-- Quick Commands -->
    <div class="test-section quick-commands">
      <h3>Quick Commands</h3>
      <div class="quick-commands-grid">
        <button
          v-for="cmd in quickCommands"
          :key="cmd.command"
          type="button"
          class="btn btn-secondary quick-command-btn"
          :disabled="!isConnected"
          @click="runQuickCommand(cmd.command)"
        >
          {{ cmd.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRemoteConnection } from '~/composables/useRemoteConnection'
import { usePis } from '~/composables/usePis'

const {
  connectionState,
  terminalLines,
  commandInput,
  connectionSettings,
  connectionStatusText,
  connectionStatusColor,
  isConnected,
  connect,
  executeCommand,
  runQuickCommand,
  clearTerminal,
  updateSettings,
} = useRemoteConnection()

const { pis, loadPis } = usePis()

// Terminal ref for auto-scrolling
const terminalRef = ref<HTMLElement | null>(null)

// Quick commands list
const quickCommands = [
  { label: 'System Info', command: 'uname -a' },
  { label: 'Disk Usage', command: 'df -h' },
  { label: 'Memory Info', command: 'free -h' },
  { label: 'Uptime', command: 'uptime' },
  { label: 'Hostname', command: 'hostname' },
  { label: 'Network Config', command: 'ifconfig' },
  { label: 'SSH Status', command: 'sudo systemctl status ssh' },
  { label: 'Telnet Status', command: 'sudo systemctl status inetd' },
]

// Available Pis for dropdown
const availablePis = computed(() => {
  if (pis.value && pis.value.length > 0) {
    return pis.value
  }
  // Fallback to default options if no Pis loaded
  return [
    { number: '1', hostname: 'Raspberry Pi 1' },
    { number: '2', hostname: 'Raspberry Pi 2' },
  ]
})

// Auto-scroll terminal when new lines are added
watch(
  terminalLines,
  () => {
    nextTick(() => {
      if (terminalRef.value) {
        terminalRef.value.scrollTop = terminalRef.value.scrollHeight
      }
    })
  },
  { deep: true }
)

// Handle connect/disconnect
const handleConnect = async () => {
  await connect()
}

// Handle command execution
const handleExecuteCommand = async () => {
  await executeCommand()
}

// Load Pis on mount
onMounted(async () => {
  await loadPis()
})
</script>

<style scoped>
.tab-content {
  padding: 24px;
}

.test-section {
  margin-bottom: 32px;
}

.test-section h3 {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--win11-text-primary);
}

.remote-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.remote-form-field {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  font-size: 14px;
  color: var(--win11-text-primary);
}

.remote-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--win11-bg-primary);
  color: var(--win11-text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.remote-input:focus {
  outline: none;
  border-color: var(--win11-accent);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.1);
}

.remote-input:disabled {
  background: var(--win11-bg-secondary);
  color: var(--win11-text-secondary);
  cursor: not-allowed;
}

.remote-status {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
}

.terminal-section {
  margin-top: 20px;
}

.terminal {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.5;
  border: 1px solid #3e3e3e;
}

.terminal-line {
  margin-bottom: 2px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.terminal-prompt {
  color: #4ec9b0;
}

.terminal-input-group {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.terminal-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  font-family: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  background: var(--win11-bg-primary);
  color: var(--win11-text-primary);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.terminal-input:focus {
  outline: none;
  border-color: var(--win11-accent);
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.1);
}

.terminal-input:disabled {
  background: var(--win11-bg-secondary);
  color: var(--win11-text-secondary);
  cursor: not-allowed;
}

.quick-commands {
  margin-top: 20px;
}

.quick-commands-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-command-btn {
  min-width: 120px;
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

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.btn-primary {
  background: var(--win11-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--win11-accent-hover);
}

.btn-primary:active:not(:disabled) {
  background: var(--win11-accent-pressed);
  transform: scale(0.98);
}

.btn-secondary {
  background: var(--win11-bg-tertiary);
  color: var(--win11-text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--win11-border-hover);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
