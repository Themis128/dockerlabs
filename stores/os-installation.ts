/**
 * Pinia store for OS Installation management
 * Tracks download progress, installation state, and available OS images
 */

import { defineStore } from 'pinia';

export interface OSImage {
  id: string;
  name: string;
  version: string;
  url: string;
  description?: string;
  size?: number;
  cached?: boolean;
  cachePath?: string;
}

export interface DownloadProgress {
  url: string;
  progress: number;
  downloaded: number;
  total: number;
  speed?: number;
  status: 'idle' | 'downloading' | 'completed' | 'error' | 'paused';
  error?: string;
}

export interface InstallationProgress {
  deviceId: string;
  progress: number;
  stage: 'formatting' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'error';
  message: string;
  logs: Array<{ timestamp: Date; level: 'info' | 'success' | 'error' | 'warning'; message: string }>;
}

export interface OSInstallationState {
  // Available OS images
  availableImages: OSImage[];
  loadingImages: boolean;
  imagesError: string | null;

  // Download management
  downloads: Map<string, DownloadProgress>;
  activeDownload: string | null; // URL of currently active download

  // Installation management
  installations: Map<string, InstallationProgress>;
  activeInstallation: string | null; // Device ID of currently active installation

  // Cache management
  cachedImages: string[]; // List of cached image URLs
}

export const useOSInstallationStore = defineStore('os-installation', {
  state: (): OSInstallationState => ({
    availableImages: [],
    loadingImages: false,
    imagesError: null,
    downloads: new Map(),
    activeDownload: null,
    installations: new Map(),
    activeInstallation: null,
    cachedImages: [],
  }),

  getters: {
    /**
     * Get download progress for a specific URL
     */
    getDownloadProgress: (state) => (url: string) => {
      return state.downloads.get(url) || null;
    },

    /**
     * Get installation progress for a specific device
     */
    getInstallationProgress: (state) => (deviceId: string) => {
      return state.installations.get(deviceId) || null;
    },

    /**
     * Check if an image is cached
     */
    isImageCached: (state) => (url: string) => {
      return state.cachedImages.includes(url);
    },

    /**
     * Get all active downloads
     */
    activeDownloads: (state) => {
      return Array.from(state.downloads.values()).filter(
        (d) => d.status === 'downloading' || d.status === 'paused'
      );
    },

    /**
     * Get all active installations
     */
    activeInstallations: (state) => {
      return Array.from(state.installations.values()).filter(
        (i) => i.stage !== 'completed' && i.stage !== 'error'
      );
    },
  },

  actions: {
    /**
     * Set available OS images
     */
    setAvailableImages(images: OSImage[]) {
      this.availableImages = images;
      this.loadingImages = false;
      this.imagesError = null;
    },

    /**
     * Set loading state for images
     */
    setLoadingImages(loading: boolean) {
      this.loadingImages = loading;
    },

    /**
     * Set error for images loading
     */
    setImagesError(error: string | null) {
      this.imagesError = error;
      this.loadingImages = false;
    },

    /**
     * Start a download
     */
    startDownload(url: string, total?: number) {
      const download: DownloadProgress = {
        url,
        progress: 0,
        downloaded: 0,
        total: total || 0,
        status: 'downloading',
      };
      this.downloads.set(url, download);
      this.activeDownload = url;
    },

    /**
     * Update download progress
     */
    updateDownloadProgress(url: string, progress: Partial<DownloadProgress>) {
      const download = this.downloads.get(url);
      if (download) {
        Object.assign(download, progress);
        this.downloads.set(url, download);
      }
    },

    /**
     * Complete a download
     */
    completeDownload(url: string, cachePath?: string) {
      const download = this.downloads.get(url);
      if (download) {
        download.status = 'completed';
        download.progress = 100;
        this.downloads.set(url, download);
        if (cachePath) {
          this.cachedImages.push(url);
        }
      }
      if (this.activeDownload === url) {
        this.activeDownload = null;
      }
    },

    /**
     * Fail a download
     */
    failDownload(url: string, error: string) {
      const download = this.downloads.get(url);
      if (download) {
        download.status = 'error';
        download.error = error;
        this.downloads.set(url, download);
      }
      if (this.activeDownload === url) {
        this.activeDownload = null;
      }
    },

    /**
     * Remove a download
     */
    removeDownload(url: string) {
      this.downloads.delete(url);
      if (this.activeDownload === url) {
        this.activeDownload = null;
      }
    },

    /**
     * Start an installation
     */
    startInstallation(deviceId: string) {
      const installation: InstallationProgress = {
        deviceId,
        progress: 0,
        stage: 'formatting',
        message: 'Starting installation...',
        logs: [],
      };
      this.installations.set(deviceId, installation);
      this.activeInstallation = deviceId;
    },

    /**
     * Update installation progress
     */
    updateInstallationProgress(deviceId: string, progress: Partial<InstallationProgress>) {
      const installation = this.installations.get(deviceId);
      if (installation) {
        Object.assign(installation, progress);
        this.installations.set(deviceId, installation);
      }
    },

    /**
     * Add installation log entry
     */
    addInstallationLog(deviceId: string, level: 'info' | 'success' | 'error' | 'warning', message: string) {
      const installation = this.installations.get(deviceId);
      if (installation) {
        installation.logs.push({
          timestamp: new Date(),
          level,
          message,
        });
        // Keep only last 1000 log entries
        if (installation.logs.length > 1000) {
          installation.logs = installation.logs.slice(-1000);
        }
      }
    },

    /**
     * Complete an installation
     */
    completeInstallation(deviceId: string) {
      const installation = this.installations.get(deviceId);
      if (installation) {
        installation.stage = 'completed';
        installation.progress = 100;
        installation.message = 'Installation completed successfully';
        this.installations.set(deviceId, installation);
      }
      if (this.activeInstallation === deviceId) {
        this.activeInstallation = null;
      }
    },

    /**
     * Fail an installation
     */
    failInstallation(deviceId: string, error: string) {
      const installation = this.installations.get(deviceId);
      if (installation) {
        installation.stage = 'error';
        installation.message = error;
        this.installations.set(deviceId, installation);
      }
      if (this.activeInstallation === deviceId) {
        this.activeInstallation = null;
      }
    },

    /**
     * Remove an installation
     */
    removeInstallation(deviceId: string) {
      this.installations.delete(deviceId);
      if (this.activeInstallation === deviceId) {
        this.activeInstallation = null;
      }
    },

    /**
     * Add cached image
     */
    addCachedImage(url: string) {
      if (!this.cachedImages.includes(url)) {
        this.cachedImages.push(url);
      }
    },

    /**
     * Remove cached image
     */
    removeCachedImage(url: string) {
      const index = this.cachedImages.indexOf(url);
      if (index >= 0) {
        this.cachedImages.splice(index, 1);
      }
    },

    /**
     * Clear all state
     */
    clearAll() {
      this.downloads.clear();
      this.installations.clear();
      this.activeDownload = null;
      this.activeInstallation = null;
    },
  },
});
