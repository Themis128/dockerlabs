/**
 * Composable for managing SD cards
 * Wraps the SD cards store and API calls
 */

import type { SDCard } from '~/types'

export const useSdcards = () => {
  const sdcardsStore = useSdcardsStore()
  const { listSdcards, formatSdcard } = useApi()
  const notifications = useNotifications()

  /**
   * Load SD cards from API
   */
  const loadSdcards = async () => {
    sdcardsStore.setLoading(true)
    sdcardsStore.setError(null)

    try {
      const response = await listSdcards()

      if (response.success && response.data?.sdcards) {
        sdcardsStore.setSdcards(response.data.sdcards)
        notifications.success(`Loaded ${response.data.sdcards.length} SD card(s)`)
        return response.data.sdcards
      } else {
        const error = response.error || 'Failed to load SD cards'
        sdcardsStore.setError(error)
        notifications.error(error)
        return []
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load SD cards'
      sdcardsStore.setError(errorMessage)
      notifications.error(errorMessage)
      return []
    } finally {
      sdcardsStore.setLoading(false)
    }
  }

  /**
   * Format an SD card
   */
  const formatCard = async (deviceId: string, piModel?: string) => {
    sdcardsStore.setFormatting(true)
    sdcardsStore.setFormatProgress(0)

    try {
      // Simulate progress updates (in real implementation, this would come from SSE or polling)
      const progressInterval = setInterval(() => {
        const current = sdcardsStore.formatProgress
        if (current < 90) {
          sdcardsStore.setFormatProgress(current + 10)
        }
      }, 500)

      const response = await formatSdcard(deviceId, piModel)

      clearInterval(progressInterval)
      sdcardsStore.setFormatProgress(100)

      if (response.success) {
        notifications.success(`SD card ${deviceId} formatted successfully`)
        // Reload SD cards after formatting
        await loadSdcards()
        return true
      } else {
        notifications.error(`Failed to format SD card: ${response.error}`)
        return false
      }
    } catch (error: any) {
      notifications.error(`Format failed: ${error.message}`)
      return false
    } finally {
      sdcardsStore.setFormatting(false)
      sdcardsStore.setFormatProgress(0)
    }
  }

  /**
   * Refresh SD cards list
   */
  const refreshSdcards = () => {
    return loadSdcards()
  }

  /**
   * Select an SD card
   */
  const selectCard = (card: SDCard | null) => {
    sdcardsStore.setSelectedCard(card)
  }

  /**
   * Get card by device ID
   */
  const getCard = (deviceId: string) => {
    return sdcardsStore.getCardById(deviceId)
  }

  return {
    // State
    sdcards: computed(() => sdcardsStore.sdcards),
    loading: computed(() => sdcardsStore.loading),
    error: computed(() => sdcardsStore.error),
    selectedCard: computed(() => sdcardsStore.selectedCard),
    formatting: computed(() => sdcardsStore.formatting),
    formatProgress: computed(() => sdcardsStore.formatProgress),
    totalCards: computed(() => sdcardsStore.totalCards),
    availableCards: computed(() => sdcardsStore.availableCards),

    // Actions
    loadSdcards,
    formatCard,
    refreshSdcards,
    selectCard,
    getCard,
  }
}
