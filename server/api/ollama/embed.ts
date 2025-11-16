/**
 * Ollama embed endpoint
 * Generate embeddings for text
 */

import type { OllamaEmbedRequest, OllamaEmbedResponse } from '~/types/ollama';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  const body = await readBody<OllamaEmbedRequest>(event);

  if (!body.model || !body.prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        error: 'Model and prompt are required',
      },
    });
  }

  try {
    const response = await $fetch<OllamaEmbedResponse>(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      body,
      timeout: 60000, // 1 minute for embeddings
    });

    return {
      success: true,
      data: response,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate embeddings',
      data: {
        success: false,
        error: error.message || 'Failed to generate embeddings',
      },
    });
  }
});
