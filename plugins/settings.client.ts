/**
 * Plugin to initialize settings from localStorage on app startup
 */

export default defineNuxtPlugin(() => {
  const settingsStore = useSettingsStore();

  // Load settings from localStorage
  settingsStore.loadSettings();
});
