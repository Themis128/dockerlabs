<template>
  <TransitionGroup
    name="notification"
    tag="div"
    class="notification-container"
  >
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="notification"
      :class="`notification--${notification.type}`"
      @click="remove(notification.id)"
    >
      <div class="notification-icon">
        <svg
          v-if="notification.type === 'success'"
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <svg
          v-else-if="notification.type === 'error'"
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
        <svg
          v-else-if="notification.type === 'warning'"
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <svg
          v-else
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
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>
      <div class="notification-content">
        <p v-if="notification.title" class="notification-title">
          {{ notification.title }}
        </p>
        <p class="notification-message">{{ notification.message }}</p>
      </div>
      <button
        type="button"
        class="notification-close"
        @click.stop="remove(notification.id)"
        aria-label="Close notification"
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
  </TransitionGroup>
</template>

<script setup lang="ts">
// Only use store on client side
const uiStore = useUIStore()
const notifications = computed(() => {
  if (process.client) {
    return uiStore.activeNotifications
  }
  return []
})

const remove = (id: string) => {
  if (process.client) {
    uiStore.removeNotification(id)
  }
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--win11-bg-primary);
  border: 1px solid var(--win11-border);
  border-radius: 8px;
  box-shadow: var(--win11-shadow-lg);
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
  min-width: 300px;
}

.notification:hover {
  transform: translateX(-4px);
  box-shadow: var(--win11-shadow-xl);
}

.notification--success {
  border-left: 4px solid #4caf50;
}

.notification--error {
  border-left: 4px solid #f44336;
}

.notification--warning {
  border-left: 4px solid #ff9800;
}

.notification--info {
  border-left: 4px solid var(--win11-accent);
}

.notification-icon {
  flex-shrink: 0;
  color: var(--win11-text-secondary);
}

.notification--success .notification-icon {
  color: #4caf50;
}

.notification--error .notification-icon {
  color: #f44336;
}

.notification--warning .notification-icon {
  color: #ff9800;
}

.notification--info .notification-icon {
  color: var(--win11-accent);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--win11-text-primary);
}

.notification-message {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--win11-text-secondary);
}

.notification-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--win11-text-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}
</style>
