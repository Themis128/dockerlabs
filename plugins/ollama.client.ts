/**
 * Ollama client-side initialization plugin
 * Initializes Ollama connection and loads models on app startup
 */

export default defineNuxtPlugin(async () => {
  const { initialize, checkConnection } = useOllama();
  const config = useRuntimeConfig();

  if (process.client) {
    console.log('[Ollama Plugin] Initializing Ollama client');
    console.log('[Ollama Plugin] Ollama URL:', config.public.ollamaUrl || 'http://localhost:11434');

    // Initialize Ollama connection and load models
    // Use nextTick to ensure the composable is fully initialized
    await nextTick();

    try {
      await initialize();
      console.log('[Ollama Plugin] Ollama initialized successfully');
    } catch (error: any) {
      console.warn('[Ollama Plugin] Failed to initialize Ollama:', error.message);
      // Don't throw - allow app to continue even if Ollama is not available
    }
  }
});
