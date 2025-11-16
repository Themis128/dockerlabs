/**
 * Composable for managing notifications
 * Wraps the UI store notification methods for easier use
 */

export const useNotifications = () => {
  const uiStore = useUIStore()

  return {
    /**
     * Show success notification
     */
    success: (message: string, title?: string, duration?: number) => {
      return uiStore.showSuccess(message, title, duration)
    },

    /**
     * Show error notification
     */
    error: (message: string, title?: string, duration?: number) => {
      return uiStore.showError(message, title, duration)
    },

    /**
     * Show warning notification
     */
    warning: (message: string, title?: string, duration?: number) => {
      return uiStore.showWarning(message, title, duration)
    },

    /**
     * Show info notification
     */
    info: (message: string, title?: string, duration?: number) => {
      return uiStore.showInfo(message, title, duration)
    },

    /**
     * Remove notification
     */
    remove: (id: string) => {
      uiStore.removeNotification(id)
    },

    /**
     * Clear all notifications
     */
    clear: () => {
      uiStore.clearNotifications()
    },

    /**
     * Get active notifications
     */
    active: computed(() => uiStore.activeNotifications),
  }
}
