/**
 * Pinia store for SD Card management
 */

import { defineStore } from 'pinia';
import type { SDCard, SDCardFormatOptions, SDCardWriteOptions } from '~/types';

export interface SDCardState {
  sdcards: SDCard[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  selectedCard: SDCard | null;
  formatting: boolean;
  writing: boolean;
  formatProgress: number;
  writeProgress: number;
}

export const useSdcardsStore = defineStore('sdcards', {
  state: (): SDCardState => ({
    sdcards: [],
    loading: false,
    error: null,
    lastUpdated: null,
    selectedCard: null,
    formatting: false,
    writing: false,
    formatProgress: 0,
    writeProgress: 0,
  }),

  getters: {
    /**
     * Get total number of SD cards
     */
    totalCards: (state) => state.sdcards.length,

    /**
     * Get available SD cards (not in use)
     */
    availableCards: (state) => {
      return state.sdcards.filter((card) => card.available !== false);
    },

    /**
     * Get SD card by device ID
     */
    getCardById: (state) => (deviceId: string) => {
      return state.sdcards.find(
        (card) => card.deviceId === deviceId || (card as any).device_id === deviceId
      );
    },

    /**
     * Get largest SD card
     */
    largestCard: (state) => {
      if (state.sdcards.length === 0) return null;
      return state.sdcards.reduce((largest, card) => {
        return card.size > (largest?.size || 0) ? card : largest;
      }, state.sdcards[0]);
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
     * Set SD cards list
     */
    setSdcards(sdcards: SDCard[] | any[]) {
      // Normalize device_id to deviceId
      this.sdcards = sdcards.map((card) => ({
        ...card,
        deviceId: card.deviceId || card.device_id,
      }));
      this.lastUpdated = new Date();
      this.error = null;
    },

    /**
     * Add or update an SD card
     */
    upsertCard(card: SDCard | any) {
      // Normalize device_id to deviceId
      const normalizedCard: SDCard = {
        ...card,
        deviceId: card.deviceId || card.device_id,
      };
      const index = this.sdcards.findIndex((c) => c.deviceId === normalizedCard.deviceId);
      if (index >= 0) {
        this.sdcards[index] = { ...this.sdcards[index], ...normalizedCard };
      } else {
        this.sdcards.push(normalizedCard);
      }
      this.lastUpdated = new Date();
    },

    /**
     * Remove an SD card
     */
    removeCard(deviceId: string) {
      const index = this.sdcards.findIndex((c) => c.deviceId === deviceId);
      if (index >= 0) {
        this.sdcards.splice(index, 1);
        this.lastUpdated = new Date();
      }
    },

    /**
     * Set selected card
     */
    setSelectedCard(card: SDCard | null) {
      this.selectedCard = card;
    },

    /**
     * Set formatting state
     */
    setFormatting(formatting: boolean) {
      this.formatting = formatting;
      if (!formatting) {
        this.formatProgress = 0;
      }
    },

    /**
     * Set format progress
     */
    setFormatProgress(progress: number) {
      this.formatProgress = Math.max(0, Math.min(100, progress));
    },

    /**
     * Set writing state
     */
    setWriting(writing: boolean) {
      this.writing = writing;
      if (!writing) {
        this.writeProgress = 0;
      }
    },

    /**
     * Set write progress
     */
    setWriteProgress(progress: number) {
      this.writeProgress = Math.max(0, Math.min(100, progress));
    },

    /**
     * Clear all SD cards
     */
    clearSdcards() {
      this.sdcards = [];
      this.selectedCard = null;
      this.lastUpdated = null;
    },
  },
});
