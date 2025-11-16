<template>
  <div class="layout-container">
    <header>
      <h1>🍓 Raspberry Pi Manager</h1>
      <p>Manage your Raspberry Pi devices</p>
    </header>

    <nav class="tabs" aria-label="Main navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
        :aria-selected="activeTab === tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <main>
      <!-- Tab content based on active tab -->
      <!-- Use v-show instead of v-if to keep components mounted and prevent recreation -->
      <DashboardTab v-show="activeTab === 'dashboard'" />
      <PisTab v-show="activeTab === 'pis'" />
      <SdcardTab v-show="activeTab === 'sdcard'" />
      <OsInstallTab v-show="activeTab === 'osinstall'" />
      <SettingsTab v-show="activeTab === 'settings'" />
      <ConnectionsTab v-show="activeTab === 'connections'" />
      <RemoteTab v-show="activeTab === 'remote'" />
      <OllamaTab v-show="activeTab === 'ollama'" />

      <!-- Page content slot (for future use) -->
      <slot />
    </main>

    <footer role="contentinfo">
      <p>Raspberry Pi Management System</p>
      <p><small>&copy; 2025 Raspberry Pi Manager. All rights reserved.</small></p>
    </footer>
  </div>
</template>

<script setup lang="ts">
const uiStore = useUIStore()

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pis', label: 'Raspberry Pis' },
  { id: 'sdcard', label: 'SD Card' },
  { id: 'osinstall', label: 'OS Install' },
  { id: 'settings', label: 'Settings' },
  { id: 'connections', label: 'Test Connections' },
  { id: 'remote', label: 'Remote Connection' },
  { id: 'ollama', label: 'Ollama AI' },
]

const activeTab = computed({
  get: () => uiStore.activeTab,
  set: (value) => uiStore.setActiveTab(value),
})
</script>

<style scoped>
.layout-container {
  max-width: 1200px;
  margin: 0 auto;
  background: var(--win11-bg-primary);
  border-radius: 8px;
  box-shadow: var(--win11-shadow-lg);
  overflow: hidden;
}

header {
  background: linear-gradient(135deg, var(--win11-accent) 0%, #005A9E 100%);
  color: white;
  padding: 32px;
  text-align: center;
}

header h1 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tabs {
  display: flex;
  background: var(--win11-bg-primary);
  border-bottom: 1px solid var(--win11-border);
  padding: 0 8px;
  flex-wrap: wrap;
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--win11-text-secondary);
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-button:hover {
  background: var(--win11-bg-secondary);
  color: var(--win11-text-primary);
}

.tab-button.active {
  color: var(--win11-accent);
  border-bottom-color: var(--win11-accent);
}

footer {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--win11-border);
  color: var(--win11-text-secondary);
}
</style>
