/**
 * API request and response types
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  [key: string]: any
}

export interface FetchOptions extends RequestInit {
  logResponse?: boolean
  force?: boolean
  params?: Record<string, any>
}

export interface ApiError {
  message: string
  status?: number
  statusText?: string
  data?: any
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
