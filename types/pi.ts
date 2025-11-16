/**
 * Raspberry Pi related types
 */

export interface RaspberryPi {
  number: string
  hostname?: string
  ip?: string
  mac?: string
  model?: string
  status?: 'online' | 'offline' | 'unknown'
  lastSeen?: string
  settings?: PiSettings
}

export interface PiSettings {
  hostname?: string
  sshEnabled?: boolean
  wifi?: WiFiConfig
  locale?: string
  timezone?: string
  keyboard?: string
  [key: string]: any
}

export interface WiFiConfig {
  ssid: string
  password?: string
  country?: string
  hidden?: boolean
}

export interface PiConnectionInfo {
  piNumber: string
  connectionType: 'ssh' | 'telnet'
  networkType?: 'wifi' | 'ethernet'
  hostname?: string
  ip?: string
  port?: number
  username?: string
  password?: string
  keyPath?: string
  authenticated?: boolean
  lastTested?: string
}

export interface PiCommandResult {
  success: boolean
  output?: string
  error?: string
  exitCode?: number
}
