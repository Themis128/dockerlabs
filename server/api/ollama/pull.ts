/**
 * Ollama pull endpoint
 * Pull/download a model from Ollama
 */

import type { OllamaPullRequest } from '~/types/ollama';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  const body = await readBody<OllamaPullRequest>(event);

  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        error: 'Model name is required',
      },
    });
  }

  try {
    // Pull is a long-running operation, so we'll start it and return immediately
    // In a real implementation, you might want to use Server-Sent Events or polling
    await $fetch(`${ollamaUrl}/api/pull`, {
      method: 'POST',
      body: {
        ...body,
        stream: false, // For now, don't stream
      },
      timeout: 300000, // 5 minutes for pulling models
    });

    return {
      success: true,
      message: `Model ${body.name} pulled successfully`,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to pull model',
      data: {
        success: false,
        error: error.message || 'Failed to pull model',
      },
    });
  }
});
