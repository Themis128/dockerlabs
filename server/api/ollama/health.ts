/**
 * Ollama health check endpoint
 * Checks if Ollama server is running
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  try {
    // Check if Ollama is running by calling the tags endpoint
    const response = await $fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      timeout: 5000,
    });

    return {
      success: true,
      status: 'connected',
      ollamaUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 'disconnected',
      error: error.message || 'Ollama server is not running',
      ollamaUrl,
    };
  }
});
