/**
 * SD Card related types
 */

export interface SDCard {
  deviceId: string
  name: string
  size: number
  sizeFormatted?: string
  mountPoint?: string
  fileSystem?: string
  available?: boolean
  removable?: boolean
}

export interface SDCardFormatOptions {
  deviceId: string
  piModel?: 'pi4' | 'pi5' | 'pi3' | 'pi2' | 'pi1'
  label?: string
  fileSystem?: 'fat32' | 'exfat'
}

export interface SDCardFormatResult {
  success: boolean
  message?: string
  error?: string
}

export interface OSImage {
  name: string
  url: string
  size?: number
  version?: string
  description?: string
}

export interface SDCardWriteOptions {
  deviceId: string
  imageUrl: string
  verify?: boolean
}

export interface SDCardWriteResult {
  success: boolean
  progress?: number
  message?: string
  error?: string
}
