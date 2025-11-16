/**
 * Pinia store for UI state management
 */

import { defineStore } from 'pinia';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
  timestamp: Date;
}

export interface UIState {
  activeTab: string;
  sidebarOpen: boolean;
  notifications: Notification[];
  loading: boolean;
  loadingMessage: string | null;
}

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    activeTab: 'dashboard',
    sidebarOpen: false,
    notifications: [],
    loading: false,
    loadingMessage: null,
  }),

  getters: {
    /**
     * Get active notifications
     */
    activeNotifications: (state) => {
      return state.notifications.filter((n) => {
        const age = Date.now() - n.timestamp.getTime();
        const duration = n.duration || 5000;
        return age < duration;
      });
    },

    /**
     * Check if there are unread notifications
     */
    hasUnreadNotifications: (state) => {
      const active = state.notifications.filter((n) => {
        const age = Date.now() - n.timestamp.getTime();
        const duration = n.duration || 5000;
        return age < duration;
      });
      return active.length > 0;
    },
  },

  actions: {
    /**
     * Set active tab
     */
    setActiveTab(tab: string) {
      this.activeTab = tab;
    },

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },

    /**
     * Set sidebar state
     */
    setSidebarOpen(open: boolean) {
      this.sidebarOpen = open;
    },

    /**
     * Add notification
     */
    addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        id,
        timestamp: new Date(),
        duration: 5000,
        ...notification,
      };
      this.notifications.push(newNotification);

      // Auto-remove after duration
      if (newNotification.duration) {
        setTimeout(() => {
          this.removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },

    /**
     * Remove notification
     */
    removeNotification(id: string) {
      const index = this.notifications.findIndex((n) => n.id === id);
      if (index >= 0) {
        this.notifications.splice(index, 1);
      }
    },

    /**
     * Clear all notifications
     */
    clearNotifications() {
      this.notifications = [];
    },

    /**
     * Show success notification
     */
    showSuccess(message: string, title?: string, duration?: number) {
      return this.addNotification({
        type: 'success',
        message,
        title,
        duration,
      });
    },

    /**
     * Show error notification
     */
    showError(message: string, title?: string, duration?: number) {
      return this.addNotification({
        type: 'error',
        message,
        title,
        duration: duration || 10000, // Errors stay longer by default
      });
    },

    /**
     * Show warning notification
     */
    showWarning(message: string, title?: string, duration?: number) {
      return this.addNotification({
        type: 'warning',
        message,
        title,
        duration,
      });
    },

    /**
     * Show info notification
     */
    showInfo(message: string, title?: string, duration?: number) {
      return this.addNotification({
        type: 'info',
        message,
        title,
        duration,
      });
    },

    /**
     * Set loading state
     */
    setLoading(loading: boolean, message?: string) {
      this.loading = loading;
      this.loadingMessage = message || null;
    },
  },
});
