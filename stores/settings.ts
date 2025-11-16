/**
 * Pinia store for application settings
 * Manages user preferences and application configuration
 */

import { defineStore } from 'pinia';
import {
  DEFAULT_API_BASE,
  DEFAULT_PYTHON_SERVER_URL,
  DEFAULT_REFRESH_INTERVAL,
  DEFAULT_USERNAME,
  DEFAULT_SSH_PORT,
  DEFAULT_TELNET_PORT,
} from '~/utils/constants';

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  apiBaseUrl: string;
  pythonServerUrl: string;
  autoRefresh: boolean;
  refreshInterval: number;
  defaultUsername: string;
  defaultSshPort: number;
  defaultTelnetPort: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

export interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  language: 'en',
  // Use relative path to go through Nuxt proxy/server routes (which handle CORS)
  // In production, this should be set via environment variable and use HTTPS
  apiBaseUrl: DEFAULT_API_BASE,
  // Python backend server URL - defaults to localhost for development
  // In production, this should be set via PYTHON_SERVER_URL environment variable
  // and should use HTTPS to secure data transmission
  pythonServerUrl: DEFAULT_PYTHON_SERVER_URL,
  autoRefresh: true,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  defaultUsername: DEFAULT_USERNAME,
  defaultSshPort: DEFAULT_SSH_PORT,
  defaultTelnetPort: DEFAULT_TELNET_PORT,
  notificationsEnabled: true,
  soundEnabled: false,
};

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    settings: { ...defaultSettings },
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * Check if auto-refresh is enabled
     */
    isAutoRefreshEnabled: (state) => state.settings.autoRefresh,

    /**
     * Get refresh interval in milliseconds
     */
    refreshIntervalMs: (state) => state.settings.refreshInterval,
  },

  actions: {
    /**
     * Load settings from localStorage
     */
    loadSettings() {
      if (process.client) {
        try {
          const stored = localStorage.getItem('app-settings');
          if (stored) {
            const parsed = JSON.parse(stored);
            this.settings = { ...defaultSettings, ...parsed };
          }
        } catch (error) {
          console.error('Failed to load settings from localStorage:', error);
          this.error = 'Failed to load settings';
        }
      }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
      if (process.client) {
        try {
          localStorage.setItem('app-settings', JSON.stringify(this.settings));
        } catch (error) {
          console.error('Failed to save settings to localStorage:', error);
          this.error = 'Failed to save settings';
        }
      }
    },

    /**
     * Update a setting
     */
    updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
      this.settings[key] = value;
      this.saveSettings();
    },

    /**
     * Update multiple settings
     */
    updateSettings(updates: Partial<AppSettings>) {
      this.settings = { ...this.settings, ...updates };
      this.saveSettings();
    },

    /**
     * Reset settings to defaults
     */
    resetSettings() {
      this.settings = { ...defaultSettings };
      this.saveSettings();
    },

    /**
     * Set loading state
     */
    setLoading(loading: boolean) {
      this.loading = loading;
    },

    /**
     * Set error message
     */
    setError(error: string | null) {
      this.error = error;
    },
  },
});
