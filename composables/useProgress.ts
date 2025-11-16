/**
 * Composable for managing progress tracking
 * Useful for long-running operations like SD card formatting/writing
 */

export interface ProgressState {
  percent: number | null
  message: string | null
  status: 'idle' | 'running' | 'success' | 'error'
  error: string | null
}

export const useProgress = () => {
  const progress = ref<ProgressState>({
    percent: null,
    message: null,
    status: 'idle',
    error: null,
  })

  /**
   * Start progress tracking
   */
  const start = (message?: string) => {
    progress.value = {
      percent: 0,
      message: message || 'Processing...',
      status: 'running',
      error: null,
    }
  }

  /**
   * Update progress
   */
  const update = (percent: number, message?: string) => {
    if (progress.value.status === 'running') {
      progress.value.percent = Math.max(0, Math.min(100, percent))
      if (message) {
        progress.value.message = message
      }
    }
  }

  /**
   * Complete progress with success
   */
  const complete = (message?: string) => {
    progress.value = {
      percent: 100,
      message: message || 'Completed successfully',
      status: 'success',
      error: null,
    }
  }

  /**
   * Fail progress with error
   */
  const fail = (error: string, message?: string) => {
    progress.value = {
      percent: progress.value.percent,
      message: message || 'Operation failed',
      status: 'error',
      error,
    }
  }

  /**
   * Reset progress
   */
  const reset = () => {
    progress.value = {
      percent: null,
      message: null,
      status: 'idle',
      error: null,
    }
  }

  /**
   * Check if progress is active
   */
  const isActive = computed(() => progress.value.status === 'running')

  /**
   * Check if progress is complete
   */
  const isComplete = computed(() => progress.value.status === 'success')

  /**
   * Check if progress has error
   */
  const hasError = computed(() => progress.value.status === 'error')

  return {
    progress: readonly(progress),
    start,
    update,
    complete,
    fail,
    reset,
    isActive,
    isComplete,
    hasError,
  }
}
