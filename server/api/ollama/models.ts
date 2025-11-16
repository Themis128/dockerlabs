/**
 * Ollama models endpoint
 * List available models or get specific model info
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  try {
    const response = await $fetch<{ models?: any[] }>(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      timeout: 10000,
    });

    return {
      success: true,
      models: response.models || [],
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to list Ollama models',
      data: {
        success: false,
        error: error.message || 'Failed to connect to Ollama server',
      },
    });
  }
});
