/**
 * Ollama chat endpoint
 * Chat with a model using messages
 */

import type { OllamaChatRequest, OllamaChatResponse } from '~/types/ollama';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  const body = await readBody<OllamaChatRequest>(event);

  if (!body.model || !body.messages || body.messages.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        error: 'Model and messages are required',
      },
    });
  }

  try {
    const response = await $fetch<OllamaChatResponse>(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      body: {
        ...body,
        stream: false, // Force non-streaming for API responses
      },
      timeout: 120000, // 2 minutes for chat
    });

    return {
      success: true,
      data: response,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to chat',
      data: {
        success: false,
        error: error.message || 'Failed to chat',
      },
    });
  }
});
