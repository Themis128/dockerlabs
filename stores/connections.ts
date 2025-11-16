/**
 * Pinia store for connection testing and management
 */

import { defineStore } from 'pinia';
import type { PiConnectionInfo } from '~/types';

export interface ConnectionTestResult {
  piNumber: string;
  connectionType: 'ssh' | 'telnet';
  networkType?: 'wifi' | 'ethernet';
  success: boolean;
  error?: string;
  responseTime?: number;
  timestamp: Date;
}

export interface ConnectionsState {
  connections: PiConnectionInfo[];
  testResults: ConnectionTestResult[];
  testing: boolean;
  testingPi: string | null;
  error: string | null;
  lastTested: Date | null;
}

export const useConnectionsStore = defineStore('connections', {
  state: (): ConnectionsState => ({
    connections: [],
    testResults: [],
    testing: false,
    testingPi: null,
    error: null,
    lastTested: null,
  }),

  getters: {
    /**
     * Get connections for a specific Pi
     */
    getConnectionsByPi: (state) => (piNumber: string) => {
      return state.connections.filter((c) => c.piNumber === piNumber);
    },

    /**
     * Get test results for a specific Pi
     */
    getTestResultsByPi: (state) => (piNumber: string) => {
      return state.testResults.filter((r) => r.piNumber === piNumber);
    },

    /**
     * Get latest test result for a Pi
     */
    getLatestTestResult: (state) => (piNumber: string) => {
      const results = state.testResults
        .filter((r) => r.piNumber === piNumber)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return results[0] || null;
    },

    /**
     * Get successful connections count
     */
    successfulConnections: (state) => {
      return state.testResults.filter((r) => r.success).length;
    },

    /**
     * Get failed connections count
     */
    failedConnections: (state) => {
      return state.testResults.filter((r) => !r.success).length;
    },
  },

  actions: {
    /**
     * Set connections list
     */
    setConnections(connections: PiConnectionInfo[]) {
      this.connections = connections;
    },

    /**
     * Add or update a connection
     */
    upsertConnection(connection: PiConnectionInfo) {
      const index = this.connections.findIndex(
        (c) =>
          c.piNumber === connection.piNumber &&
          c.connectionType === connection.connectionType &&
          c.networkType === connection.networkType
      );
      if (index >= 0) {
        this.connections[index] = { ...this.connections[index], ...connection };
      } else {
        this.connections.push(connection);
      }
    },

    /**
     * Remove a connection
     */
    removeConnection(piNumber: string, connectionType: string, networkType?: string) {
      const index = this.connections.findIndex(
        (c) =>
          c.piNumber === piNumber &&
          c.connectionType === connectionType &&
          (!networkType || c.networkType === networkType)
      );
      if (index >= 0) {
        this.connections.splice(index, 1);
      }
    },

    /**
     * Add test result
     */
    addTestResult(result: Omit<ConnectionTestResult, 'timestamp'>) {
      const testResult: ConnectionTestResult = {
        ...result,
        timestamp: new Date(),
      };
      this.testResults.push(testResult);
      this.lastTested = new Date();

      // Keep only last 100 results
      if (this.testResults.length > 100) {
        this.testResults.shift();
      }
    },

    /**
     * Set testing state
     */
    setTesting(testing: boolean, piNumber?: string) {
      this.testing = testing;
      this.testingPi = piNumber || null;
    },

    /**
     * Set error message
     */
    setError(error: string | null) {
      this.error = error;
    },

    /**
     * Clear test results
     */
    clearTestResults() {
      this.testResults = [];
      this.lastTested = null;
    },

    /**
     * Clear all connections
     */
    clearConnections() {
      this.connections = [];
      this.testResults = [];
      this.lastTested = null;
    },
  },
});
