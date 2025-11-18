/**
 * Proxy endpoint for /api/download-os-image
 * Handles OS image downloads separately from installation
 * Supports streaming progress via Server-Sent Events
 */

import { getHeader, setHeader, createError, getMethod, readBody } from 'h3';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';

export default defineEventHandler(async (event) => {
  // Handle CORS preflight
  if (getMethod(event) === 'OPTIONS') {
    const origin = getHeader(event, 'origin');
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }
    return {};
  }

  // Check if client wants streaming response
  const acceptHeader = getHeader(event, 'accept') || '';
  const wantsStreaming = acceptHeader.includes('text/event-stream');
  const origin = getHeader(event, 'origin');

  try {
    const body = await readBody(event).catch(() => ({}));
    const { download_url, os_version } = body;

    if (!download_url && !os_version) {
      throw createError({
        statusCode: 400,
        statusMessage: 'download_url or os_version is required',
        data: { success: false, error: 'download_url or os_version is required' },
      });
    }

    const config = useRuntimeConfig();
    const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';

    // Quick health check before attempting download
    try {
      const healthUrl = `${pythonServerUrl}/api/health`;
      const healthParsedUrl = new URL(healthUrl);
      const healthIsHttps = healthParsedUrl.protocol === 'https:';
      const healthRequestModule = healthIsHttps ? httpsRequest : httpRequest;

      await new Promise<void>((resolve, reject) => {
        const healthReq = healthRequestModule(
          {
            hostname: healthParsedUrl.hostname,
            port: healthParsedUrl.port ? parseInt(healthParsedUrl.port, 10) : (healthIsHttps ? 443 : 80),
            path: healthParsedUrl.pathname,
            method: 'GET',
            timeout: 3000,
          },
          (healthRes) => {
            healthRes.on('data', () => {});
            healthRes.on('end', resolve);
            healthRes.on('error', reject);
          }
        );
        healthReq.on('error', reject);
        healthReq.on('timeout', () => {
          healthReq.destroy();
          reject(new Error('Health check timed out'));
        });
        healthReq.end();
      });
    } catch (healthError: any) {
      const errorMessage = healthError.code === 'ECONNREFUSED' || healthError.code === 'ENOTFOUND'
        ? 'Cannot connect to Python backend. Please ensure the Python server is running on port 3000.'
        : 'Python backend is not accessible. Please check if the server is running.';
      throw createError({
        statusCode: 503,
        statusMessage: errorMessage,
        data: { success: false, error: errorMessage },
      });
    }

    // If streaming is requested, proxy directly to Python backend
    if (wantsStreaming || body.stream === true) {
      // For now, we'll use the install-os endpoint's download functionality
      // In the future, we could create a dedicated download endpoint in Python
      // For now, we proxy to a download endpoint that doesn't exist yet
      // So we'll use the download_os_image.py script directly via a new endpoint

      // This is a placeholder - the Python backend would need a /api/download-os-image endpoint
      // For now, we'll return an error suggesting to use install-os with download_url
      throw createError({
        statusCode: 501,
        statusMessage: 'Separate download endpoint not yet implemented in Python backend',
        data: {
          success: false,
          error: 'Separate download endpoint not yet implemented. Use /api/install-os with download_url to download and install.',
          note: 'The download is currently integrated into the installation process.',
        },
      });
    } else {
      // Non-streaming request - not supported for downloads (they need progress)
      throw createError({
        statusCode: 400,
        statusMessage: 'Streaming is required for downloads',
        data: { success: false, error: 'Streaming is required for downloads. Set Accept: text/event-stream header.' },
      });
    }
  } catch (error: any) {
    // If it's already an H3 error, re-throw it
    if (error.statusCode) {
      throw error;
    }

    // Handle other errors
    const origin = getHeader(event, 'origin');
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }
    setHeader(event, 'Content-Type', 'application/json');
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to download OS image',
      data: error.data || { success: false, error: 'Failed to download OS image' },
    });
  }
});
