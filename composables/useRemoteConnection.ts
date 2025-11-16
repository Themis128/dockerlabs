/**
 * Composable for managing remote connections to Raspberry Pis
 * Migrated from web-gui/public/app.js
 */

import { ref, computed } from 'vue';
import { useApi } from './useApi';
import { useNotifications } from './useNotifications';
import { usePisStore } from '~/stores/pis';

export interface TerminalLine {
  text: string;
  color: string;
  timestamp?: Date;
}

export interface RemoteConnectionState {
  connected: boolean;
  piNumber: string | null;
  connectionType: 'ssh' | 'telnet' | null;
  piInfo: {
    ip?: string;
    connection?: string;
  } | null;
}

export const useRemoteConnection = () => {
  const { get, post } = useApi();
  const notifications = useNotifications();
  const pisStore = usePisStore();

  // Connection state
  const connectionState = ref<RemoteConnectionState>({
    connected: false,
    piNumber: null,
    connectionType: null,
    piInfo: null,
  });

  // Terminal output
  const terminalLines = ref<TerminalLine[]>([]);
  const commandInput = ref('');

  // Connection settings
  const connectionSettings = ref({
    piNumber: '1',
    connectionType: 'ssh' as 'ssh' | 'telnet',
    networkType: 'auto' as 'auto' | 'ethernet' | 'wifi',
    username: 'pi',
    password: '',
    keyPath: '',
  });

  /**
   * Append text to terminal
   */
  const appendToTerminal = (text: string, color: string = '#d4d4d4') => {
    terminalLines.value.push({
      text,
      color,
      timestamp: new Date(),
    });
    // Keep only last 1000 lines to prevent memory issues
    if (terminalLines.value.length > 1000) {
      terminalLines.value.shift();
    }
  };

  /**
   * Clear terminal
   */
  const clearTerminal = () => {
    terminalLines.value = [
      {
        text: 'Terminal cleared',
        color: '#4ec9b0',
        timestamp: new Date(),
      },
    ];
  };

  /**
   * Connect to a Raspberry Pi
   */
  const connect = async () => {
    if (connectionState.value.connected) {
      // Disconnect
      connectionState.value = {
        connected: false,
        piNumber: null,
        connectionType: null,
        piInfo: null,
      };
      appendToTerminal('Disconnected from Raspberry Pi', '#ff6b6b');
      notifications.info('Disconnected from Raspberry Pi');
      return;
    }

    // Connect
    const { piNumber, connectionType } = connectionSettings.value;

    try {
      const response = await get(`/get-pi-info?pi=${piNumber}`);

      if (response.success && response.data?.pi) {
        connectionState.value = {
          connected: true,
          piNumber,
          connectionType,
          piInfo: {
            ip: response.data.pi.ip,
            connection: response.data.pi.connection,
          },
        };

        appendToTerminal(
          `Connected to Raspberry Pi ${piNumber} (${response.data.pi.ip}) via ${connectionType.toUpperCase()}`,
          '#4ec9b0'
        );
        appendToTerminal(`Connection: ${response.data.pi.connection}`, '#4ec9b0');
        appendToTerminal('Type commands below or use quick commands', '#4ec9b0');
        appendToTerminal('', '#d4d4d4');

        notifications.success(`Connected to Pi ${piNumber}`);
      } else {
        appendToTerminal(`Connection failed: ${response.error || 'Unknown error'}`, '#ff6b6b');
        notifications.error(`Connection failed: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      appendToTerminal(`Connection error: ${error.message}`, '#ff6b6b');
      notifications.error(`Connection error: ${error.message}`);
    }
  };

  /**
   * Execute a remote command
   */
  const executeCommand = async (command?: string) => {
    if (!connectionState.value.connected) {
      appendToTerminal('Not connected. Please connect first.', '#ff6b6b');
      notifications.warning('Not connected. Please connect first.');
      return;
    }

    const cmd = command || commandInput.value.trim();
    if (!cmd) {
      return;
    }

    // Display command in terminal
    appendToTerminal(`$ ${cmd}`, '#d4d4d4');

    // Clear input if using the input field
    if (!command) {
      commandInput.value = '';
    }

    try {
      const { piNumber, connectionType, networkType, username, password, keyPath } =
        connectionSettings.value;

      const response = await post('/execute-remote', {
        pi_number: piNumber,
        command: cmd,
        connection_type: connectionType,
        network_type: networkType,
        username: username || 'pi',
        password: password || null,
        key_path: keyPath || null,
      });

      if (response.success) {
        if (response.data?.output) {
          appendToTerminal(response.data.output, '#d4d4d4');
        }
        if (response.data?.error && response.data.error.trim()) {
          appendToTerminal(response.data.error, '#ff6b6b');
        }
      } else {
        appendToTerminal(`Error: ${response.error || 'Command execution failed'}`, '#ff6b6b');
        if (response.data?.output) {
          appendToTerminal(response.data.output, '#ff6b6b');
        }
      }
    } catch (error: any) {
      appendToTerminal(`Error: ${error.message}`, '#ff6b6b');
      notifications.error(`Command execution failed: ${error.message}`);
    }

    // Add separator
    appendToTerminal('', '#d4d4d4');
  };

  /**
   * Run a quick command
   */
  const runQuickCommand = (command: string) => {
    if (!connectionState.value.connected) {
      appendToTerminal('Not connected. Please connect first.', '#ff6b6b');
      notifications.warning('Not connected. Please connect first.');
      return;
    }

    commandInput.value = command;
    executeCommand(command);
  };

  /**
   * Update connection settings
   */
  const updateSettings = (settings: Partial<typeof connectionSettings.value>) => {
    connectionSettings.value = { ...connectionSettings.value, ...settings };
  };

  /**
   * Get connection status text
   */
  const connectionStatusText = computed(() => {
    if (!connectionState.value.connected) {
      return 'Disconnected';
    }
    const { piNumber, connectionType, piInfo } = connectionState.value;
    if (piInfo?.ip) {
      return `Connected to Pi ${piNumber} (${piInfo.ip}) via ${connectionType?.toUpperCase()}`;
    }
    return `Connected to Pi ${piNumber}`;
  });

  /**
   * Get connection status color
   */
  const connectionStatusColor = computed(() => {
    if (!connectionState.value.connected) {
      return '#666';
    }
    return '#28a745';
  });

  return {
    // State
    connectionState: computed(() => connectionState.value),
    terminalLines: computed(() => terminalLines.value),
    commandInput,
    connectionSettings,

    // Computed
    connectionStatusText,
    connectionStatusColor,
    isConnected: computed(() => connectionState.value.connected),

    // Methods
    connect,
    disconnect: connect, // Same function handles both
    executeCommand,
    runQuickCommand,
    appendToTerminal,
    clearTerminal,
    updateSettings,
  };
};
