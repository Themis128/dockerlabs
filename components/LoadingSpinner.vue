<template>
  <div class="loading-spinner" :class="{ 'loading-spinner--overlay': overlay }">
    <div class="spinner" :class="`spinner--${size}`">
      <div class="spinner-circle"></div>
    </div>
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message?: string
  size?: 'small' | 'medium' | 'large'
  overlay?: boolean
}

withDefaults(defineProps<Props>(), {
  message: undefined,
  size: 'medium',
  overlay: false,
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 16px;
}

.loading-spinner--overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9999;
}

.spinner {
  position: relative;
}

.spinner-circle {
  border: 3px solid var(--win11-border);
  border-top-color: var(--win11-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner--small .spinner-circle {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.spinner--medium .spinner-circle {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.spinner--large .spinner-circle {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

.loading-message {
  color: var(--win11-text-secondary);
  font-size: 14px;
  margin: 0;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
