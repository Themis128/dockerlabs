/**
 * Composable for managing Pi connections and testing
 */

import type { PiConnectionInfo, PiCommandResult } from '~/types'

export const useConnection = () => {
  const { get, post } = useApi()
  const connectionsStore = useConnectionsStore()
  const notifications = useNotifications()

  /**
   * Test connection to a Pi
   */
  const testConnection = async (
    piNumber: string,
    connectionType: 'ssh' | 'telnet' = 'ssh',
    networkType?: 'wifi' | 'ethernet'
  ) => {
    connectionsStore.setTesting(true, piNumber)

    try {
      const response = await get(`/test-connection`, {
        params: {
          pi: piNumber,
          type: connectionType,
          network: networkType,
        },
      })

      if (response.success) {
        const result = {
          piNumber,
          connectionType,
          networkType,
          success: true,
          responseTime: response.data?.responseTime,
          timestamp: new Date(),
        }
        connectionsStore.addTestResult(result)
        notifications.success(`Connection to Pi ${piNumber} successful`)
        return result
      } else {
        const result = {
          piNumber,
          connectionType,
          networkType,
          success: false,
          error: response.error || 'Connection failed',
          timestamp: new Date(),
        }
        connectionsStore.addTestResult(result)
        notifications.error(`Connection to Pi ${piNumber} failed: ${result.error}`)
        return result
      }
    } catch (error: any) {
      const result = {
        piNumber,
        connectionType,
        networkType,
        success: false,
        error: error.message || 'Connection test failed',
        timestamp: new Date(),
      }
      connectionsStore.addTestResult(result)
      notifications.error(`Connection test failed: ${result.error}`)
      return result
    } finally {
      connectionsStore.setTesting(false)
    }
  }

  /**
   * Test SSH authentication
   */
  const testSshAuth = async (piNumber: string) => {
    connectionsStore.setTesting(true, piNumber)

    try {
      const response = await get(`/test-ssh`, {
        params: { pi: piNumber },
      })

      if (response.success) {
        notifications.success(`SSH authentication successful for Pi ${piNumber}`)
        return { success: true, data: response.data }
      } else {
        notifications.error(`SSH authentication failed: ${response.error}`)
        return { success: false, error: response.error }
      }
    } catch (error: any) {
      notifications.error(`SSH test failed: ${error.message}`)
      return { success: false, error: error.message }
    } finally {
      connectionsStore.setTesting(false)
    }
  }

  /**
   * Execute remote command
   */
  const executeCommand = async (
    piNumber: string,
    command: string,
    options?: {
      connectionType?: string
      networkType?: string
      username?: string
      password?: string
      keyPath?: string
    }
  ): Promise<PiCommandResult> => {
    try {
      const response = await post('/execute-remote', {
        pi_number: piNumber,
        command,
        ...options,
      })

      if (response.success) {
        return {
          success: true,
          output: response.data?.output,
          exitCode: response.data?.exitCode,
        }
      } else {
        return {
          success: false,
          error: response.error || 'Command execution failed',
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Command execution failed',
      }
    }
  }

  /**
   * Get connection info for a Pi
   */
  const getConnectionInfo = (piNumber: string): PiConnectionInfo[] => {
    return connectionsStore.getConnectionsByPi(piNumber)
  }

  /**
   * Get latest test result for a Pi
   */
  const getLatestTestResult = (piNumber: string) => {
    return connectionsStore.getLatestTestResult(piNumber)
  }

  return {
    testConnection,
    testSshAuth,
    executeCommand,
    getConnectionInfo,
    getLatestTestResult,
    isTesting: computed(() => connectionsStore.testing),
    testingPi: computed(() => connectionsStore.testingPi),
  }
}
