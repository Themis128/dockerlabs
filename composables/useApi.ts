/**
 * Composable for making API calls to the Python backend
 * Handles logging, error handling, and response parsing
 */

import type { ApiResponse, FetchOptions } from '~/types';

// Request deduplication: track in-flight requests to prevent duplicate calls
const pendingRequests = new Map<string, Promise<any>>();

export const useApi = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase || '/api';

  /**
   * Make a GET request with deduplication to prevent duplicate simultaneous calls
   */
  const get = async <T = any>(
    endpoint: string,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> => {
    const requestKey = `GET:${endpoint}`;

    // Check if there's already a pending request for this endpoint
    if (pendingRequests.has(requestKey) && !options?.force) {
      // Return the existing promise instead of making a new request
      if (process.dev && (endpoint === '/pis' || endpoint === '/sdcards')) {
        console.log(`[API] Deduplicating request to ${endpoint} - using existing pending request`);
      }
      return pendingRequests.get(requestKey) as Promise<ApiResponse<T>>;
    }

    if (process.dev && (endpoint === '/pis' || endpoint === '/sdcards')) {
      console.log(`[API] Making new request to ${endpoint}`);
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const response = await $fetch<ApiResponse<T>>(`${apiBase}${endpoint}`, {
          method: 'GET',
          ...options,
        });

        if (options?.logResponse) {
          console.log(`[API GET] ${endpoint}:`, response);
        }

        return response;
      } catch (error: any) {
        console.error(`[API GET Error] ${endpoint}:`, error);

        // Extract more detailed error information
        let errorMessage = 'Request failed';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.data?.error) {
          errorMessage = error.data.error;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.statusMessage) {
          errorMessage = error.statusMessage;
        }

        // Add more context for common errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to backend server. Start it with: npm run start:server';
        } else if (error.statusCode === 504 || errorMessage.includes('timeout')) {
          errorMessage = 'Backend server timeout. The Python server may be slow to respond or not running.';
        } else if (error.statusCode === 500) {
          errorMessage = 'Backend server error. Check the Python server logs for details.';
        }

        return {
          success: false,
          error: errorMessage,
          data: error.data,
        };
      } finally {
        // Remove from pending requests when done
        pendingRequests.delete(requestKey);
      }
    })();

    // Store the promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  };

  /**
   * Make a POST request with deduplication to prevent duplicate simultaneous calls
   */
  const post = async <T = any>(
    endpoint: string,
    data?: any,
    options?: FetchOptions
  ): Promise<ApiResponse<T>> => {
    // For POST requests, include a hash of the data in the key to allow different payloads
    const dataHash = data ? JSON.stringify(data).slice(0, 100) : '';
    const requestKey = `POST:${endpoint}:${dataHash}`;

    // Check if there's already a pending request for this endpoint with same data
    if (pendingRequests.has(requestKey) && !options?.force) {
      // Return the existing promise instead of making a new request
      return pendingRequests.get(requestKey) as Promise<ApiResponse<T>>;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const response = await $fetch<ApiResponse<T>>(`${apiBase}${endpoint}`, {
          method: 'POST',
          body: data,
          ...options,
        });

        if (options?.logResponse) {
          console.log(`[API POST] ${endpoint}:`, response);
        }

        return response;
      } catch (error: any) {
        console.error(`[API POST Error] ${endpoint}:`, error);

        // Extract more detailed error information
        let errorMessage = 'Request failed';
        if (error.message) {
          errorMessage = error.message;
        } else if (error.data?.error) {
          errorMessage = error.data.error;
        } else if (error.data?.message) {
          errorMessage = error.data.message;
        } else if (error.statusMessage) {
          errorMessage = error.statusMessage;
        }

        // Add more context for common errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to backend server. Start it with: npm run start:server';
        } else if (error.statusCode === 504 || errorMessage.includes('timeout')) {
          errorMessage = 'Backend server timeout. The Python server may be slow to respond or not running.';
        } else if (error.statusCode === 500) {
          errorMessage = 'Backend server error. Check the Python server logs for details.';
        }

        return {
          success: false,
          error: errorMessage,
          data: error.data,
        };
      } finally {
        // Remove from pending requests when done
        pendingRequests.delete(requestKey);
      }
    })();

    // Store the promise for deduplication
    pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  };

  /**
   * Get list of Raspberry Pis
   */
  const getPis = async () => {
    return await get<{ pis: import('~/types').RaspberryPi[] }>('/pis');
  };

  /**
   * Test connections to all Pis
   */
  const testConnections = async () => {
    return await get('/test-connections');
  };

  /**
   * Scan network for Raspberry Pi devices
   */
  const scanNetwork = async () => {
    return await get<{ devices: any[]; raspberry_pis: any[]; total_discovered: number; raspberry_pi_count: number }>('/scan-network');
  };

  /**
   * Test SSH authentication for a specific Pi
   */
  const testSshAuth = async (piNumber: string) => {
    return await get(`/test-ssh?pi=${piNumber}`);
  };

  /**
   * Get Pi information
   */
  const getPiInfo = async (piNumber: string) => {
    return await get(`/get-pi-info?pi=${piNumber}`);
  };

  /**
   * List SD cards
   */
  const listSdcards = async () => {
    return await get<{ sdcards: import('~/types').SDCard[] }>('/sdcards');
  };

  /**
   * Scan WiFi networks
   */
  const scanWifi = async () => {
    return await post<{ networks: import('~/types').WiFiConfig[] }>('/scan-wifi');
  };

  /**
   * Format SD card
   */
  const formatSdcard = async (deviceId: string, piModel?: string) => {
    return await post('/format-sdcard', {
      device_id: deviceId,
      pi_model: piModel || 'pi5',
    });
  };

  /**
   * Configure Pi settings
   */
  const configurePi = async (piNumber: string, settings: import('~/types').PiSettings) => {
    return await post('/configure-pi', {
      pi_number: piNumber,
      settings,
    });
  };

  /**
   * Execute remote command
   */
  const executeRemoteCommand = async (params: {
    pi_number: string;
    command: string;
    connection_type?: string;
    network_type?: string;
    username?: string;
    password?: string;
    key_path?: string;
  }) => {
    return await post('/execute-remote', params);
  };

  /**
   * Install OS to SD card
   */
  const installOS = async (params: {
    device_id: string;
    os_version?: string;
    download_url?: string;
    custom_image?: string;
    configuration: any;
  }) => {
    return await post('/install-os', params);
  };

  /**
   * List OS images
   */
  const listOsImages = async () => {
    return await get<{ images: any[] }>('/os-images');
  };

  /**
   * Connect via SSH
   */
  const connectSsh = async (params: {
    pi_number: string;
    username?: string;
    password?: string;
    key_path?: string;
  }) => {
    return await post('/connect-ssh', params);
  };

  /**
   * Connect via Telnet
   */
  const connectTelnet = async (params: {
    pi_number: string;
    username?: string;
    password?: string;
  }) => {
    return await post('/connect-telnet', params);
  };

  /**
   * Health check
   */
  const healthCheck = async () => {
    return await get('/health');
  };

  /**
   * Get server metrics
   */
  const getMetrics = async () => {
    return await get('/metrics');
  };

  return {
    get,
    post,
    getPis,
    testConnections,
    testSshAuth,
    getPiInfo,
    listSdcards,
    scanWifi,
    scanNetwork,
    formatSdcard,
    configurePi,
    executeRemoteCommand,
    installOS,
    listOsImages,
    connectSsh,
    connectTelnet,
    healthCheck,
    getMetrics,
  };
};
