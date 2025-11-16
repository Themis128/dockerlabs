<template>
  <div v-if="message" class="error-message" :class="`error-message--${variant}`">
    <div class="error-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <div class="error-content">
      <p v-if="title" class="error-title">{{ title }}</p>
      <p class="error-text">{{ message }}</p>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="error-dismiss"
      @click="$emit('dismiss')"
      aria-label="Dismiss error"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message: string
  title?: string
  variant?: 'default' | 'compact' | 'inline'
  dismissible?: boolean
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  variant: 'default',
  dismissible: false,
})

defineEmits<{
  dismiss: []
}>()
</script>

<style scoped>
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c33;
}

.error-message--compact {
  padding: 8px 12px;
  font-size: 14px;
}

.error-message--inline {
  padding: 4px 8px;
  font-size: 12px;
  display: inline-flex;
}

.error-icon {
  flex-shrink: 0;
  color: #c33;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-weight: 600;
  margin: 0 0 4px 0;
  font-size: 14px;
}

.error-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.error-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #c33;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.error-dismiss:hover {
  opacity: 1;
}
</style>
