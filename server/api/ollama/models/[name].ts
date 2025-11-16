/**
 * Ollama model management endpoint
 * Delete a specific model
 */

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const ollamaUrl = config.public.ollamaUrl || 'http://localhost:11434';

  const modelName = getRouterParam(event, 'name');

  if (!modelName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        success: false,
        error: 'Model name is required',
      },
    });
  }

  if (event.method === 'DELETE') {
    try {
      await $fetch(`${ollamaUrl}/api/delete`, {
        method: 'DELETE',
        body: {
          name: modelName,
        },
        timeout: 30000,
      });

      return {
        success: true,
        message: `Model ${modelName} deleted successfully`,
      };
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete model',
        data: {
          success: false,
          error: error.message || 'Failed to delete model',
        },
      });
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
  });
});
