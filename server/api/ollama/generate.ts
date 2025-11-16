/**
 * Ollama generate endpoint
 * Generate text using a model
 */

import type { OllamaGenerateRequest, OllamaGenerateResponse } from '~/types/ollama';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  const body = await readBody<OllamaGenerateRequest>(event);

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
    const response = await $fetch<OllamaGenerateResponse>(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      body: {
        ...body,
        stream: false, // Force non-streaming for API responses
      },
      timeout: 120000, // 2 minutes for generation
    });

    return {
      success: true,
      data: response,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate text',
      data: {
        success: false,
        error: error.message || 'Failed to generate text',
      },
    });
  }
});
