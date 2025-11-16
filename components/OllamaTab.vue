<template>
  <div class="tab-content">
    <h2>Ollama AI Assistant</h2>

    <!-- Connection Status -->
    <div class="connection-status" :class="connectionStatusClass">
      <span class="status-indicator"></span>
      <span class="status-text">{{ connectionStatusText }}</span>
      <button
        type="button"
        class="btn btn-sm"
        @click="checkConnection"
        :disabled="loading"
      >
        Refresh
      </button>
    </div>

    <!-- Model Selection -->
    <div class="section">
      <h3>Model Selection</h3>
      <div class="model-selector">
        <select v-model="selectedModel" @change="onModelChange" :disabled="loading">
          <option value="">-- Select Model --</option>
          <option v-for="model in models" :key="model.name" :value="model.name">
            {{ model.name }} ({{ formatSize(model.size) }})
          </option>
        </select>
        <button
          type="button"
          class="btn btn-primary"
          @click="refreshModels"
          :disabled="loading"
        >
          Refresh Models
        </button>
      </div>
    </div>

    <!-- Chat Interface -->
    <div class="section">
      <h3>Chat</h3>
      <div class="chat-container">
        <div class="chat-messages" ref="chatMessagesRef">
          <div
            v-for="(message, index) in chatMessages"
            :key="index"
            class="chat-message"
            :class="message.role"
          >
            <div class="message-header">
              <strong>{{ message.role === 'user' ? 'You' : 'Assistant' }}</strong>
            </div>
            <div class="message-content">{{ message.content }}</div>
          </div>
          <div v-if="loading" class="chat-message assistant">
            <div class="message-content">
              <LoadingSpinner />
              Thinking...
            </div>
          </div>
        </div>
        <div class="chat-input">
          <textarea
            v-model="chatInput"
            placeholder="Type your message here..."
            rows="3"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.enter.shift.exact="chatInput += '\n'"
            :disabled="loading || !selectedModel"
          ></textarea>
          <button
            type="button"
            class="btn btn-primary"
            @click="sendMessage"
            :disabled="loading || !selectedModel || !chatInput.trim()"
          >
            Send
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="clearChat"
            :disabled="loading"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Code Analysis -->
    <div class="section">
      <h3>Code Analysis</h3>
      <div class="code-analysis">
        <div class="code-input">
          <label>
            <strong>Code to Analyze:</strong>
            <textarea
              v-model="codeInput"
              placeholder="Paste your code here..."
              rows="10"
              :disabled="loading || !selectedModel"
            ></textarea>
          </label>
          <div class="input-actions">
            <select v-model="codeLanguage" :disabled="loading">
              <option value="auto">Auto-detect</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="vue">Vue</option>
              <option value="python">Python</option>
              <option value="csharp">C#</option>
            </select>
            <button
              type="button"
              class="btn btn-primary"
              @click="analyzeCode"
              :disabled="loading || !selectedModel || !codeInput.trim()"
            >
              Analyze Code
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              @click="explainCode"
              :disabled="loading || !selectedModel || !codeInput.trim()"
            >
              Explain Code
            </button>
          </div>
        </div>
        <div v-if="analysisResult" class="analysis-result">
          <h4>Analysis Result:</h4>
          <div class="result-content">{{ analysisResult }}</div>
          <button
            type="button"
            class="btn btn-sm"
            @click="copyToClipboard(analysisResult)"
          >
            Copy
          </button>
        </div>
      </div>
    </div>

    <!-- Model Management -->
    <div class="section">
      <h3>Model Management</h3>
      <div class="model-management">
        <div class="pull-model">
          <label>
            <strong>Pull New Model:</strong>
            <input
              v-model="newModelName"
              type="text"
              placeholder="e.g., llama3.1:8b"
              :disabled="loading"
            />
          </label>
          <button
            type="button"
            class="btn btn-primary"
            @click="pullNewModel"
            :disabled="loading || !newModelName.trim()"
          >
            Pull Model
          </button>
        </div>
        <div v-if="models.length > 0" class="models-list">
          <h4>Installed Models:</h4>
          <div v-for="model in models" :key="model.name" class="model-item">
            <div class="model-info">
              <strong>{{ model.name }}</strong>
              <span class="model-size">{{ formatSize(model.size) }}</span>
            </div>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              @click="deleteModelConfirm(model.name)"
              :disabled="loading"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <ErrorMessage v-if="error" :message="error" />
  </div>
</template>

<script setup lang="ts">
const {
  state,
  models,
  loading,
  error,
  selectedModel,
  connectionStatus,
  checkConnection,
  listModels,
  chat: ollamaChat,
  analyzeCode: ollamaAnalyzeCode,
  explainCode: ollamaExplainCode,
  pullModel,
  deleteModel,
} = useOllama();

const notifications = useNotifications();

// Chat state
const chatMessages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const chatInput = ref('');
const chatMessagesRef = ref<HTMLElement | null>(null);

// Code analysis state
const codeInput = ref('');
const codeLanguage = ref('auto');
const analysisResult = ref('');

// Model management
const newModelName = ref('');

// Watch for tab activation
const uiStore = useUIStore();
const isActive = computed(() => uiStore.activeTab === 'ollama');

watch(isActive, (active) => {
  if (active && !loading.value) {
    checkConnection();
    listModels();
  }
});

onMounted(() => {
  if (isActive.value) {
    checkConnection();
    listModels();
  }
});

// Computed properties
const connectionStatusClass = computed(() => {
  return {
    'status-connected': connectionStatus.value === 'connected',
    'status-disconnected': connectionStatus.value === 'disconnected',
    'status-checking': connectionStatus.value === 'checking',
  };
});

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return 'Connected to Ollama';
    case 'disconnected':
      return 'Disconnected from Ollama';
    case 'checking':
      return 'Checking connection...';
    default:
      return 'Unknown status';
  }
});

// Methods
const onModelChange = () => {
  if (selectedModel.value) {
    notifications.success(`Selected model: ${selectedModel.value}`);
  }
};

const refreshModels = async () => {
  await listModels();
};

const sendMessage = async () => {
  if (!chatInput.value.trim() || !selectedModel.value) return;

  const userMessage = chatInput.value.trim();
  chatMessages.value.push({ role: 'user', content: userMessage });
  chatInput.value = '';

  // Scroll to bottom
  await nextTick();
  scrollToBottom();

  try {
    const messages = [
      ...chatMessages.value.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    const response = await ollamaChat(selectedModel.value, messages);

    if (response) {
      chatMessages.value.push({ role: 'assistant', content: response });
      await nextTick();
      scrollToBottom();
    }
  } catch (error: any) {
    notifications.error(`Failed to send message: ${error.message}`);
  }
};

const clearChat = () => {
  chatMessages.value = [];
  analysisResult.value = '';
};

const scrollToBottom = () => {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
  }
};

const analyzeCode = async () => {
  if (!codeInput.value.trim() || !selectedModel.value) return;

  analysisResult.value = '';
  const result = await ollamaAnalyzeCode(
    codeInput.value,
    codeLanguage.value,
    selectedModel.value
  );

  if (result) {
    analysisResult.value = result;
  }
};

const explainCode = async () => {
  if (!codeInput.value.trim() || !selectedModel.value) return;

  analysisResult.value = '';
  const result = await ollamaExplainCode(
    codeInput.value,
    codeLanguage.value,
    selectedModel.value
  );

  if (result) {
    analysisResult.value = result;
  }
};

const pullNewModel = async () => {
  if (!newModelName.value.trim()) return;

  const success = await pullModel(newModelName.value.trim());
  if (success) {
    newModelName.value = '';
  }
};

const deleteModelConfirm = async (modelName: string) => {
  if (confirm(`Are you sure you want to delete model "${modelName}"?`)) {
    await deleteModel(modelName);
  }
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    notifications.success('Copied to clipboard');
  } catch (error) {
    notifications.error('Failed to copy to clipboard');
  }
};

const formatSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};
</script>

<style scoped>
.tab-content {
  padding: 24px;
}

.section {
  margin-bottom: 32px;
  padding: 20px;
  background: var(--win11-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--win11-border);
}

.section h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: var(--win11-accent);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  background: var(--win11-bg-secondary);
  border: 1px solid var(--win11-border);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--win11-text-secondary);
}

.status-connected .status-indicator {
  background: #4caf50;
}

.status-disconnected .status-indicator {
  background: #f44336;
}

.status-checking .status-indicator {
  background: #ff9800;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.model-selector {
  display: flex;
  gap: 12px;
  align-items: center;
}

.model-selector select {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  background: var(--win11-bg);
  color: var(--win11-text);
  font-size: 14px;
}

.chat-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-messages {
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  padding: 16px;
  background: var(--win11-bg);
  border: 1px solid var(--win11-border);
  border-radius: 8px;
}

.chat-message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
}

.chat-message.user {
  background: var(--win11-accent);
  color: white;
  margin-left: 20%;
}

.chat-message.assistant {
  background: var(--win11-bg-secondary);
  margin-right: 20%;
}

.message-header {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 8px;
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.chat-input {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  background: var(--win11-bg);
  color: var(--win11-text);
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.code-analysis {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.code-input label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  background: var(--win11-bg);
  color: var(--win11-text);
  font-family: 'Courier New', monospace;
  font-size: 13px;
  resize: vertical;
}

.input-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.input-actions select {
  padding: 8px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  background: var(--win11-bg);
  color: var(--win11-text);
}

.analysis-result {
  padding: 16px;
  background: var(--win11-bg);
  border: 1px solid var(--win11-border);
  border-radius: 8px;
}

.analysis-result h4 {
  margin-top: 0;
  margin-bottom: 12px;
}

.result-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-bottom: 12px;
  padding: 12px;
  background: var(--win11-bg-secondary);
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.model-management {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pull-model {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.pull-model label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pull-model input {
  padding: 10px;
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  background: var(--win11-bg);
  color: var(--win11-text);
  font-size: 14px;
}

.models-list h4 {
  margin-bottom: 12px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--win11-bg);
  border: 1px solid var(--win11-border);
  border-radius: 4px;
  margin-bottom: 8px;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-size {
  font-size: 12px;
  color: var(--win11-text-secondary);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--win11-accent);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--win11-accent-hover);
}

.btn-secondary {
  background: var(--win11-bg-secondary);
  color: var(--win11-text);
  border: 1px solid var(--win11-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--win11-bg);
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
