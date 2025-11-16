/**
 * Composable for managing Raspberry Pi devices
 * Wraps the Pis store and API calls
 */

import type { RaspberryPi, PiSettings } from '~/types'

export const usePis = () => {
  const pisStore = usePisStore()
  const { getPis, getPiInfo, configurePi } = useApi()
  const notifications = useNotifications()

  /**
   * Load all Pis from API
   */
  const loadPis = async () => {
    pisStore.setLoading(true)
    pisStore.setError(null)

    try {
      const response = await getPis()

      // Handle both response formats: {success, data: {pis}} and {success, pis}
      if (response.success) {
        const pisData = response.data?.pis || response.pis || (response as any).data
        if (Array.isArray(pisData)) {
          pisStore.setPis(pisData)
          notifications.success(`Loaded ${pisData.length} Raspberry Pi(s)`)
          return pisData
        } else {
          const error = response.error || 'Invalid response format - Pis data not found'
          pisStore.setError(error)
          notifications.error(error)
          return []
        }
      } else {
        const error = response.error || 'Failed to load Pis'
        pisStore.setError(error)
        notifications.error(error)
        return []
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load Pis'
      pisStore.setError(errorMessage)
      notifications.error(errorMessage)
      return []
    } finally {
      pisStore.setLoading(false)
    }
  }

  /**
   * Load info for a specific Pi
   */
  const loadPiInfo = async (piNumber: string) => {
    try {
      const response = await getPiInfo(piNumber)

      if (response.success && response.data) {
        pisStore.upsertPi(response.data as RaspberryPi)
        return response.data
      } else {
        notifications.error(`Failed to load info for Pi ${piNumber}: ${response.error}`)
        return null
      }
    } catch (error: any) {
      notifications.error(`Failed to load Pi info: ${error.message}`)
      return null
    }
  }

  /**
   * Configure a Pi
   */
  const configurePiSettings = async (piNumber: string, settings: PiSettings) => {
    try {
      const response = await configurePi(piNumber, settings)

      if (response.success) {
        pisStore.updatePiSettings(piNumber, settings)
        notifications.success(`Settings updated for Pi ${piNumber}`)
        return true
      } else {
        notifications.error(`Failed to configure Pi ${piNumber}: ${response.error}`)
        return false
      }
    } catch (error: any) {
      notifications.error(`Failed to configure Pi: ${error.message}`)
      return false
    }
  }

  /**
   * Refresh Pis list
   */
  const refreshPis = () => {
    return loadPis()
  }

  /**
   * Select a Pi
   */
  const selectPi = (pi: RaspberryPi | null) => {
    pisStore.setSelectedPi(pi)
  }

  /**
   * Get Pi by number
   */
  const getPi = (piNumber: string) => {
    return pisStore.getPiByNumber(piNumber)
  }

  return {
    // State
    pis: computed(() => pisStore.pis),
    loading: computed(() => pisStore.loading),
    error: computed(() => pisStore.error),
    selectedPi: computed(() => pisStore.selectedPi),
    totalPis: computed(() => pisStore.totalPis),
    onlineCount: computed(() => pisStore.onlineCount),
    offlineCount: computed(() => pisStore.offlineCount),

    // Getters
    pisByConnection: (type: 'ethernet' | 'wifi') => pisStore.pisByConnection(type),
    pisByStatus: (status: 'online' | 'offline' | 'unknown') => pisStore.pisByStatus(status),

    // Actions
    loadPis,
    loadPiInfo,
    configurePiSettings,
    refreshPis,
    selectPi,
    getPi,
  }
}
