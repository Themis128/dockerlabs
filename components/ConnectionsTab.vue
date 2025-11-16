<template>
  <div class="tab-content">
    <h2>Test Connections</h2>
    <div class="test-section">
      <h3>Test All Connections</h3>
      <p>Test connectivity to all Raspberry Pis (ping, SSH, telnet)</p>
      <button type="button" class="btn btn-primary" @click="testAllConnections">
        Test All Connections
      </button>
      <div v-if="testResults" class="test-results">
        <pre>{{ testResults }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { testConnections } = useApi()

const testResults = ref<string>('')

const testAllConnections = async () => {
  testResults.value = 'Testing connections...'

  try {
    const response = await testConnections()
    testResults.value = JSON.stringify(response, null, 2)
  } catch (error) {
    testResults.value = `Error: ${error}`
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

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  margin-top: 16px;
}

.btn-primary {
  background: var(--win11-accent);
  color: white;
}

.btn-primary:hover {
  background: var(--win11-accent-hover);
}

.test-results {
  margin-top: 16px;
  padding: 16px;
  background: var(--win11-bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--win11-border);
}

.test-results pre {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
