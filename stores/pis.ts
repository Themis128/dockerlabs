/**
 * Pinia store for Raspberry Pi devices management
 */

import { defineStore } from 'pinia';
import type { RaspberryPi, PiSettings } from '~/types';

export interface PiState {
  pis: RaspberryPi[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  selectedPi: RaspberryPi | null;
}

export const usePisStore = defineStore('pis', {
  state: (): PiState => ({
    pis: [],
    loading: false,
    error: null,
    lastUpdated: null,
    selectedPi: null,
  }),

  getters: {
    /**
     * Get total number of Pis
     */
    totalPis: (state) => state.pis.length,

    /**
     * Get Pis by connection type
     */
    pisByConnection: (state) => (type: 'ethernet' | 'wifi') => {
      return state.pis.filter((pi) => {
        if (type === 'ethernet') {
          return pi.settings?.wifi === undefined || !pi.settings.wifi;
        }
        return pi.settings?.wifi !== undefined;
      });
    },

    /**
     * Get Pis by status
     */
    pisByStatus: (state) => (status: 'online' | 'offline' | 'unknown') => {
      return state.pis.filter((pi) => pi.status === status);
    },

    /**
     * Get Pi by number
     */
    getPiByNumber: (state) => (number: string) => {
      return state.pis.find((pi) => pi.number === number);
    },

    /**
     * Get online Pis count
     */
    onlineCount: (state) => {
      return state.pis.filter((pi) => pi.status === 'online').length;
    },

    /**
     * Get offline Pis count
     */
    offlineCount: (state) => {
      return state.pis.filter((pi) => pi.status === 'offline').length;
    },
  },

  actions: {
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

    /**
     * Set Pis list
     */
    setPis(pis: RaspberryPi[]) {
      this.pis = pis;
      this.lastUpdated = new Date();
      this.error = null;
    },

    /**
     * Add or update a Pi
     */
    upsertPi(pi: RaspberryPi) {
      const index = this.pis.findIndex((p) => p.number === pi.number);
      if (index >= 0) {
        this.pis[index] = { ...this.pis[index], ...pi };
      } else {
        this.pis.push(pi);
      }
      this.lastUpdated = new Date();
    },

    /**
     * Remove a Pi
     */
    removePi(piNumber: string) {
      const index = this.pis.findIndex((p) => p.number === piNumber);
      if (index >= 0) {
        this.pis.splice(index, 1);
        this.lastUpdated = new Date();
      }
    },

    /**
     * Update Pi settings
     */
    updatePiSettings(piNumber: string, settings: Partial<PiSettings>) {
      const pi = this.pis.find((p) => p.number === piNumber);
      if (pi) {
        pi.settings = { ...pi.settings, ...settings } as PiSettings;
        this.lastUpdated = new Date();
      }
    },

    /**
     * Update Pi status
     */
    updatePiStatus(piNumber: string, status: 'online' | 'offline' | 'unknown') {
      const pi = this.pis.find((p) => p.number === piNumber);
      if (pi) {
        pi.status = status;
        pi.lastSeen = new Date().toISOString();
        this.lastUpdated = new Date();
      }
    },

    /**
     * Set selected Pi
     */
    setSelectedPi(pi: RaspberryPi | null) {
      this.selectedPi = pi;
    },

    /**
     * Clear all Pis
     */
    clearPis() {
      this.pis = [];
      this.selectedPi = null;
      this.lastUpdated = null;
    },
  },
});
