/**
 * Application constants
 * Centralized constants used throughout the application
 */

export const APP_NAME = 'Raspberry Pi Manager';
export const APP_VERSION = '1.0.0';

export const DEFAULT_PYTHON_SERVER_PORT = 3000;
export const DEFAULT_NUXT_PORT = 3001;

export const PI_MODELS = ['pi1', 'pi2', 'pi3', 'pi4', 'pi5'] as const;
export type PiModel = (typeof PI_MODELS)[number];

export const CONNECTION_TYPES = ['ssh', 'telnet'] as const;
export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const NETWORK_TYPES = ['wifi', 'ethernet'] as const;
export type NetworkType = (typeof NETWORK_TYPES)[number];

export const DEFAULT_SSH_PORT = 22;
export const DEFAULT_TELNET_PORT = 23;

export const FILE_SYSTEMS = ['fat32', 'exfat'] as const;
export type FileSystem = (typeof FILE_SYSTEMS)[number];

export const TAB_IDS = {
  DASHBOARD: 'dashboard',
  PIS: 'pis',
  SDCARD: 'sdcard',
  OS_INSTALL: 'osinstall',
  SETTINGS: 'settings',
  CONNECTIONS: 'connections',
  REMOTE: 'remote',
} as const;

export const API_ENDPOINTS = {
  PIS: '/pis',
  TEST_CONNECTIONS: '/test-connections',
  TEST_SSH: '/test-ssh',
  GET_PI_INFO: '/get-pi-info',
  SDCARDS: '/sdcards',
  SCAN_WIFI: '/scan-wifi',
  FORMAT_SDCARD: '/format-sdcard',
  CONFIGURE_PI: '/configure-pi',
  EXECUTE_REMOTE: '/execute-remote',
} as const;

// API configuration constants
export const DEFAULT_API_BASE = '/api';
export const DEFAULT_PYTHON_SERVER_URL = 'http://localhost:3000';

// Settings constants
export const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds in milliseconds
export const DEFAULT_USERNAME = 'pi';

// CSS paths
export const MAIN_CSS_PATH = '~/assets/css/main.css';
