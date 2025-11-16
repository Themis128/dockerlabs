<template>
  <div class="error-container">
    <div class="error-content">
      <h1 v-if="error.statusCode">{{ error.statusCode }}</h1>
      <h1 v-else>Error</h1>
      <p class="error-message">{{ error.message || 'An error occurred' }}</p>
      <button @click="handleError" class="error-button">
        Go Home
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ErrorProps {
  error: {
    statusCode?: number
    message?: string
    statusMessage?: string
  }
}

const props = defineProps<ErrorProps>()

const handleError = () => {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: var(--win11-bg-secondary);
}

.error-content {
  text-align: center;
  background: var(--win11-bg-primary);
  padding: 48px;
  border-radius: 8px;
  box-shadow: var(--win11-shadow-lg);
  max-width: 500px;
}

.error-content h1 {
  font-size: 72px;
  font-weight: 700;
  color: var(--win11-accent);
  margin-bottom: 16px;
}

.error-message {
  font-size: 18px;
  color: var(--win11-text-secondary);
  margin-bottom: 32px;
}

.error-button {
  padding: 12px 24px;
  background: var(--win11-accent);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.error-button:hover {
  background: var(--win11-accent-hover);
}
</style>
