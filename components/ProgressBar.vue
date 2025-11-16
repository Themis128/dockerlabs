<template>
  <div v-if="show" class="progress-bar">
    <div class="progress-header">
      <p v-if="message" class="progress-message">{{ message }}</p>
      <span v-if="showPercent" class="progress-percent">{{ percent }}%</span>
    </div>
    <div class="progress-track">
      <div
        class="progress-fill"
        :class="{
          'progress-fill--indeterminate': indeterminate,
          [`progress-fill--${variant}`]: variant,
        }"
        :style="{ width: indeterminate ? '100%' : `${percent}%` }"
      ></div>
    </div>
    <p v-if="error" class="progress-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  percent?: number | null
  message?: string | null
  error?: string | null
  variant?: 'default' | 'success' | 'warning' | 'error'
  indeterminate?: boolean
  showPercent?: boolean
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  percent: 0,
  message: undefined,
  error: undefined,
  variant: 'default',
  indeterminate: false,
  showPercent: true,
  show: true,
})
</script>

<style scoped>
.progress-bar {
  width: 100%;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-message {
  margin: 0;
  font-size: 14px;
  color: var(--win11-text-primary);
  font-weight: 500;
}

.progress-percent {
  font-size: 12px;
  color: var(--win11-text-secondary);
  font-weight: 500;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--win11-bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: var(--win11-accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-fill--success {
  background: #4caf50;
}

.progress-fill--warning {
  background: #ff9800;
}

.progress-fill--error {
  background: #f44336;
}

.progress-fill--indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
  width: 30% !important;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(300%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.progress-error {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #f44336;
}
</style>
