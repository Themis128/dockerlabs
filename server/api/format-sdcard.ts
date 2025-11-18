/**
 * Proxy endpoint for /api/format-sdcard
 * Proxies POST requests to Python backend
 * Supports both streaming (Server-Sent Events) and non-streaming responses
 */

import { getHeader, setHeader, createError, getMethod, readBody } from 'h3';
import { callPythonApi, API_TIMEOUTS } from '../utils/python-api';
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

    // If streaming is requested, proxy directly to Python backend
    if (wantsStreaming || body.stream === true) {
      const config = useRuntimeConfig();
      const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';
      const url = `${pythonServerUrl}/api/format-sdcard`;

      // Quick health check before attempting formatting
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
              timeout: 3000, // 3 second timeout for health check
            },
            (healthRes) => {
              healthRes.on('data', () => {}); // Consume data to prevent hanging
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
        // Health check failed - send error immediately
        if (!event.node.res.headersSent) {
          const errorHeaders: Record<string, string> = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          };
          if (origin) {
            errorHeaders['Access-Control-Allow-Origin'] = origin;
            errorHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            errorHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
          }
          event.node.res.writeHead(200, errorHeaders);
          if (typeof event.node.res.flushHeaders === 'function') {
            event.node.res.flushHeaders();
          }
        }
        const errorMessage = healthError.code === 'ECONNREFUSED' || healthError.code === 'ENOTFOUND'
          ? 'Cannot connect to Python backend. Please ensure the Python server is running on port 3000.'
          : healthError.message?.includes('timeout')
          ? 'Python backend health check timed out. The server may be overloaded or not responding.'
          : 'Python backend is not accessible. Please check if the server is running.';
        const errorData = `data: ${JSON.stringify({
          success: false,
          error: errorMessage,
          type: 'error',
        })}\n\n`;
        try {
          event.node.res.write(errorData);
          event.node.res.end();
        } catch (writeError) {
          console.error('[Format SD Card] Error writing health check error:', writeError);
        }
        return undefined;
      }

      // Parse the URL to determine if we should use http or https
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const requestModule = isHttps ? httpsRequest : httpRequest;

      const requestBody = JSON.stringify(body);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Content-Length': Buffer.byteLength(requestBody),
        },
        timeout: API_TIMEOUTS.FORMAT_SDCARD,
      };

      // Prepare headers object
      const headers: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      // Add CORS headers if needed
      if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type';
      }

      // CRITICAL: Write headers immediately to commit the response
      event.node.res.writeHead(200, headers);

      // Flush headers to ensure they're sent immediately
      if (typeof event.node.res.flushHeaders === 'function') {
        event.node.res.flushHeaders();
      }

      // Make the request and pipe the response
      let requestStarted = false;
      const req = requestModule(options, (res) => {
        requestStarted = true;

        // Validate that we received a valid HTTP response
        if (!res.statusCode) {
          if (!event.node.res.headersSent) {
            event.node.res.writeHead(200, headers);
            if (typeof event.node.res.flushHeaders === 'function') {
              event.node.res.flushHeaders();
            }
          }
          const errorData = `data: ${JSON.stringify({
            success: false,
            error: 'Received invalid response from Python backend. The server may be misconfigured.',
            type: 'error',
          })}\n\n`;
          try {
            event.node.res.write(errorData);
            event.node.res.end();
          } catch (writeError) {
            console.error('[Format SD Card] Error writing invalid response error:', writeError);
          }
          return;
        }

        // Handle error responses from Python backend
        if (res.statusCode >= 400) {
          let errorData = '';
          res.on('data', (chunk) => {
            errorData += chunk.toString();
          });
          res.on('end', () => {
            if (!event.node.res.headersSent) {
              event.node.res.writeHead(200, headers);
              if (typeof event.node.res.flushHeaders === 'function') {
                event.node.res.flushHeaders();
              }
            }
            try {
              let parsed: any;
              try {
                parsed = JSON.parse(errorData);
              } catch {
                const cleanError = errorData
                  .replace(/^HTTP\/[\d.]+ \d+ .+\r?\n/i, '')
                  .replace(/^[\w-]+: .+\r?\n/gm, '')
                  .trim();
                parsed = { error: cleanError || 'Formatting request failed' };
              }
              const sseError = `data: ${JSON.stringify({
                success: false,
                error: parsed.error || 'Formatting request failed',
                type: 'error',
              })}\n\n`;
              event.node.res.write(sseError);
              event.node.res.end();
            } catch (writeError) {
              console.error('[Format SD Card] Error writing error response:', writeError);
            }
          });
          res.on('error', (resError) => {
            if (!event.node.res.headersSent) {
              event.node.res.writeHead(200, headers);
              if (typeof event.node.res.flushHeaders === 'function') {
                event.node.res.flushHeaders();
              }
            }
            const sseError = `data: ${JSON.stringify({
              success: false,
              error: resError.message || 'Error reading response from Python backend',
              type: 'error',
            })}\n\n`;
            try {
              event.node.res.write(sseError);
              event.node.res.end();
            } catch (writeError) {
              console.error('[Format SD Card] Error writing error response:', writeError);
            }
          });
          return;
        }

        // Pipe only the response body (not headers) directly to the client
        res.on('data', (chunk) => {
          if (!event.node.res.writableEnded) {
            event.node.res.write(chunk);
          }
        });

        res.on('end', () => {
          if (!event.node.res.writableEnded) {
            event.node.res.end();
          }
        });

        res.on('error', (error) => {
          if (!event.node.res.writableEnded) {
            const errorData = `data: ${JSON.stringify({
              success: false,
              error: error.message || 'Streaming error',
              type: 'error',
            })}\n\n`;
            event.node.res.write(errorData);
            event.node.res.end();
          }
        });

        event.node.res.on('error', () => {
          // Response stream error - client may have disconnected
        });
      });

      req.on('error', (error: any) => {
        if (!requestStarted) {
          if (!event.node.res.headersSent) {
            event.node.res.writeHead(200, headers);
            if (typeof event.node.res.flushHeaders === 'function') {
              event.node.res.flushHeaders();
            }
          }
          const errorMessage = error.message || 'Failed to connect to Python backend';
          const userFriendlyMessage = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND'
            ? 'Cannot connect to Python backend. Please ensure the Python server is running on port 3000.'
            : error.code === 'ETIMEDOUT' || error.code === 'TIMEOUT'
            ? 'Connection to Python backend timed out. Please check if the server is running.'
            : errorMessage;
          const errorData = `data: ${JSON.stringify({
            success: false,
            error: userFriendlyMessage,
            type: 'error',
          })}\n\n`;
          try {
            if (!event.node.res.writableEnded) {
              event.node.res.write(errorData);
              event.node.res.end();
            }
          } catch (writeError) {
            console.error('[Format SD Card] Error writing error response:', writeError);
          }
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (!event.node.res.headersSent) {
          event.node.res.writeHead(200, headers);
          if (typeof event.node.res.flushHeaders === 'function') {
            event.node.res.flushHeaders();
          }
        }
        const errorData = `data: ${JSON.stringify({
          success: false,
          error: 'Formatting request timed out. The operation took too long.',
          type: 'error',
        })}\n\n`;
        try {
          event.node.res.write(errorData);
          event.node.res.end();
        } catch (writeError) {
          console.error('[Format SD Card] Error writing timeout response:', writeError);
        }
      });

      // Write the request body
      req.write(requestBody);
      req.end();

      return undefined;
    } else {
      // Non-streaming request - use existing callPythonApi method
      const response = await callPythonApi(event, {
        endpoint: '/api/format-sdcard',
        method: 'POST',
        body,
        timeout: API_TIMEOUTS.FORMAT_SDCARD,
      });

      // Set CORS headers if Origin is present
      if (origin) {
        setHeader(event, 'Access-Control-Allow-Origin', origin);
        setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
      }

      // Ensure content-type is set
      setHeader(event, 'Content-Type', 'application/json');
      return response;
    }
  } catch (error: any) {
    console.error('[Format SD Card] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    });

    // If streaming was requested, try to send error as SSE
    if (wantsStreaming) {
      if (!event.node.res.headersSent) {
        const errorHeaders: Record<string, string> = {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        };
        if (origin) {
          errorHeaders['Access-Control-Allow-Origin'] = origin;
          errorHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          errorHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
        }
        event.node.res.writeHead(200, errorHeaders);
        if (typeof event.node.res.flushHeaders === 'function') {
          event.node.res.flushHeaders();
        }
      }
      const errorData = `data: ${JSON.stringify({
        success: false,
        error: error.data?.error || error.message || 'Failed to format SD card',
        type: 'error',
      })}\n\n`;
      try {
        if (!event.node.res.writableEnded) {
          event.node.res.write(errorData);
          event.node.res.end();
        }
      } catch (writeError) {
        console.error('[Format SD Card] Error writing catch block error:', writeError);
      }
      return undefined;
    }

    // Non-streaming error
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }
    setHeader(event, 'Content-Type', 'application/json');
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to format SD card',
      data: error.data || { success: false, error: 'Failed to format SD card' },
    });
  }
});
