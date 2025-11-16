/**
 * Health check endpoint
 * Returns server health status
 */

export default defineEventHandler(async (event) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nuxt-api',
    version: '1.0.0',
  };
});
