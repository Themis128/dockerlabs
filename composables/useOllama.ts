/**
 * Composable for interacting with Ollama API
 * Provides methods to chat, generate, embed, and manage models
 */

import type {
  OllamaModel,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaEmbedRequest,
  OllamaEmbedResponse,
  OllamaPullRequest,
  OllamaState,
} from '~/types/ollama';

export const useOllama = () => {
  const config = useRuntimeConfig();
  const notifications = useNotifications();

  // State
  const state = reactive<OllamaState>({
    models: [],
    loading: false,
    error: null,
    selectedModel: null,
    connectionStatus: 'checking',
  });

  /**
   * Check if Ollama server is running
   */
  const checkConnection = async (): Promise<boolean> => {
    state.connectionStatus = 'checking';
    try {
      const response = await $fetch<{ success: boolean }>('/api/ollama/health', {
        method: 'GET',
      });
      state.connectionStatus = response.success ? 'connected' : 'disconnected';
      return response.success;
    } catch (error: any) {
      state.connectionStatus = 'disconnected';
      state.error = error.message || 'Failed to connect to Ollama';
      return false;
    }
  };

  /**
   * List available models
   */
  const listModels = async (): Promise<OllamaModel[]> => {
    state.loading = true;
    state.error = null;

    try {
      const response = await $fetch<{ success: boolean; models: OllamaModel[] }>(
        '/api/ollama/models',
        {
          method: 'GET',
        }
      );

      if (response.success) {
        state.models = response.models;
        return response.models;
      } else {
        throw new Error('Failed to list models');
      }
    } catch (error: any) {
      state.error = error.message || 'Failed to list models';
      if (state.error) {
        notifications.error(state.error);
      }
      return [];
    } finally {
      state.loading = false;
    }
  };

  /**
   * Generate text using a model
   */
  const generate = async (
    model: string,
    prompt: string,
    options?: Partial<OllamaGenerateRequest>
  ): Promise<string | null> => {
    state.loading = true;
    state.error = null;

    try {
      const request: OllamaGenerateRequest = {
        model,
        prompt,
        stream: false,
        ...options,
      };

      const response = await $fetch<{ success: boolean; data: OllamaGenerateResponse }>(
        '/api/ollama/generate',
        {
          method: 'POST',
          body: request,
        }
      );

      if (response.success) {
        return response.data.response;
      } else {
        throw new Error('Failed to generate text');
      }
    } catch (error: any) {
      state.error = error.message || 'Failed to generate text';
      if (state.error) {
        notifications.error(state.error);
      }
      return null;
    } finally {
      state.loading = false;
    }
  };

  /**
   * Chat with a model
   */
  const chat = async (
    model: string,
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: Partial<OllamaChatRequest>
  ): Promise<string | null> => {
    state.loading = true;
    state.error = null;

    try {
      const request: OllamaChatRequest = {
        model,
        messages,
        stream: false,
        ...options,
      };

      const response = await $fetch<{ success: boolean; data: OllamaChatResponse }>(
        '/api/ollama/chat',
        {
          method: 'POST',
          body: request,
        }
      );

      if (response.success) {
        return response.data.message.content;
      } else {
        throw new Error('Failed to chat');
      }
    } catch (error: any) {
      state.error = error.message || 'Failed to chat';
      if (state.error) {
        notifications.error(state.error);
      }
      return null;
    } finally {
      state.loading = false;
    }
  };

  /**
   * Generate embeddings
   */
  const embed = async (
    model: string,
    prompt: string,
    options?: Partial<OllamaEmbedRequest>
  ): Promise<number[] | null> => {
    state.loading = true;
    state.error = null;

    try {
      const request: OllamaEmbedRequest = {
        model,
        prompt,
        ...options,
      };

      const response = await $fetch<{ success: boolean; data: OllamaEmbedResponse }>(
        '/api/ollama/embed',
        {
          method: 'POST',
          body: request,
        }
      );

      if (response.success) {
        return response.data.embedding;
      } else {
        throw new Error('Failed to generate embeddings');
      }
    } catch (error: any) {
      state.error = error.message || 'Failed to generate embeddings';
      if (state.error) {
        notifications.error(state.error);
      }
      return null;
    } finally {
      state.loading = false;
    }
  };

  /**
   * Pull a model from Ollama
   */
  const pullModel = async (modelName: string): Promise<boolean> => {
    state.loading = true;
    state.error = null;

    try {
      const request: OllamaPullRequest = {
        name: modelName,
        stream: false,
      };

      const response = await $fetch<{ success: boolean; message?: string }>(
        '/api/ollama/pull',
        {
          method: 'POST',
          body: request,
        }
      );

      if (response.success) {
        notifications.success(`Model ${modelName} pulled successfully`);
        // Refresh model list
        await listModels();
        return true;
      } else {
        throw new Error(response.message || 'Failed to pull model');
      }
    } catch (error: any) {
      state.error = error.message || 'Failed to pull model';
      if (state.error) {
        notifications.error(state.error);
      }
      return false;
    } finally {
      state.loading = false;
    }
  };

  /**
   * Delete a model
   */
  const deleteModel = async (modelName: string): Promise<boolean> => {
    state.loading = true;
    state.error = null;

    try {
      const response = await $fetch<{ success: boolean; message?: string }>(
        `/api/ollama/models/${encodeURIComponent(modelName)}`,
        {
          method: 'DELETE',
        }
      );

      if (response.success) {
        notifications.success(`Model ${modelName} deleted successfully`);
        // Refresh model list
        await listModels();
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete model');
      }
    } catch (error: any) {
      state.error = error.message || 'Failed to delete model';
      if (state.error) {
        notifications.error(state.error);
      }
      return false;
    } finally {
      state.loading = false;
    }
  };

  /**
   * Analyze code using Ollama
   */
  const analyzeCode = async (
    code: string,
    language: string = 'auto',
    model?: string
  ): Promise<string | null> => {
    const selectedModel = model || state.selectedModel || 'qwen2.5-coder:14b';

    const prompt = `Analyze the following ${language} code and provide a comprehensive code review focusing on:

1. **Code Quality Issues:**
   - Code smells and anti-patterns
   - Potential bugs or logic errors
   - Performance issues
   - Security vulnerabilities

2. **Best Practices:**
   - Adherence to language-specific best practices
   - Code organization and structure
   - Naming conventions
   - Error handling

3. **Improvements:**
   - Specific, actionable suggestions
   - Code examples for improvements
   - Refactoring opportunities

4. **Summary:**
   - Overall code quality score (1-10)
   - Priority issues to address first

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Provide a structured analysis with clear sections and actionable recommendations.`;

    return await generate(selectedModel, prompt, {
      options: {
        temperature: 0.3,
        top_p: 0.9,
      },
    });
  };

  /**
   * Explain code using Ollama
   */
  const explainCode = async (
    code: string,
    language: string = 'auto',
    model?: string
  ): Promise<string | null> => {
    const selectedModel = model || state.selectedModel || 'qwen2.5-coder:14b';

    const prompt = `Explain the following ${language} code in detail:

\`\`\`${language}
${code}
\`\`\`

Provide a clear explanation of:
1. What the code does
2. How it works
3. Key concepts and patterns used
4. Any important details or edge cases`;

    return await generate(selectedModel, prompt, {
      options: {
        temperature: 0.2,
      },
    });
  };

  /**
   * Initialize - check connection and load models
   */
  const initialize = async () => {
    const connected = await checkConnection();
    if (connected) {
      await listModels();
    }
  };

  return {
    // State
    state: readonly(state),
    models: computed(() => state.models),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    selectedModel: computed({
      get: () => state.selectedModel,
      set: (value) => {
        state.selectedModel = value;
      },
    }),
    connectionStatus: computed(() => state.connectionStatus),

    // Methods
    checkConnection,
    listModels,
    generate,
    chat,
    embed,
    pullModel,
    deleteModel,
    analyzeCode,
    explainCode,
    initialize,
  };
};
