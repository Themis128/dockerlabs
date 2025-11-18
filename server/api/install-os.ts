/**
 * Proxy endpoint for /api/install-os
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

  // For streaming requests, we need to handle the response manually
  // to completely bypass H3's response processing

  try {
    const body = await readBody(event).catch(() => ({}));

    // If streaming is requested, proxy directly to Python backend
    if (wantsStreaming || body.stream === true) {
      const config = useRuntimeConfig();
      const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';
      const url = `${pythonServerUrl}/api/install-os`;

      // Quick health check before attempting installation
      // This helps catch connection issues early
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
              // Just check if we got a response - don't need to read the body
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
          console.error('[Install OS] Error writing health check error:', writeError);
        }
        return undefined;
      }

      // Parse the URL to determine if we should use http or https
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const requestModule = isHttps ? httpsRequest : httpRequest;

      // Use event.node.res directly to pipe the response
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
        timeout: API_TIMEOUTS.FORMAT_SDCARD * 10, // 1900 seconds (31+ minutes)
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
      // This prevents H3 from trying to process or modify it
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
          // Invalid response - no status code
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
            console.error('[Install OS] Error writing invalid response error:', writeError);
          }
          return;
        }

        // Handle response parsing errors
        res.on('error', (parseError: any) => {
          // Catch HTTP parsing errors like "Parse Error: Expected HTTP/"
          const errorMessage = parseError.message || String(parseError);
          const isParseError = errorMessage.includes('Parse Error') || errorMessage.includes('Expected HTTP');

          if (!event.node.res.headersSent) {
            event.node.res.writeHead(200, headers);
            if (typeof event.node.res.flushHeaders === 'function') {
              event.node.res.flushHeaders();
            }
          }

          const userFriendlyError = isParseError
            ? 'Python backend returned an invalid response. The server may be experiencing issues or returned an error page. Please check if the Python server is running correctly.'
            : parseError.message || 'Error reading response from Python backend';

          const sseError = `data: ${JSON.stringify({
            success: false,
            error: userFriendlyError,
            type: 'error',
            debug: process.dev ? errorMessage : undefined,
          })}\n\n`;
          try {
            if (!event.node.res.writableEnded) {
              event.node.res.write(sseError);
              event.node.res.end();
            }
          } catch (writeError) {
            console.error('[Install OS] Error writing parse error response:', writeError);
          }
        });

        // Handle error responses from Python backend
        if (res.statusCode >= 400) {
          let errorData = '';
          res.on('data', (chunk) => {
            errorData += chunk.toString();
          });
          res.on('end', () => {
            // Ensure headers are sent
            if (!event.node.res.headersSent) {
              event.node.res.writeHead(200, headers);
              if (typeof event.node.res.flushHeaders === 'function') {
                event.node.res.flushHeaders();
              }
            }
            try {
              // Try to parse as JSON first
              let parsed: any;
              try {
                parsed = JSON.parse(errorData);
              } catch {
                // If not JSON, try to extract error message from HTML/text
                // Remove any HTTP headers that might be in the response
                const cleanError = errorData
                  .replace(/^HTTP\/[\d.]+ \d+ .+\r?\n/i, '') // Remove HTTP status line
                  .replace(/^[\w-]+: .+\r?\n/gm, '') // Remove HTTP headers
                  .trim();
                parsed = { error: cleanError || 'Installation request failed' };
              }
              const sseError = `data: ${JSON.stringify({
                success: false,
                error: parsed.error || 'Installation request failed',
                type: 'error',
              })}\n\n`;
              event.node.res.write(sseError);
              event.node.res.end();
            } catch (writeError) {
              // Response might already be closed
              console.error('[Install OS] Error writing error response:', writeError);
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
              console.error('[Install OS] Error writing error response:', writeError);
            }
          });
          return;
        }

        // Pipe only the response body (not headers) directly to the client
        // The headers have already been sent via writeHead above
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

        // Handle errors on the destination stream
        event.node.res.on('error', () => {
          // Response stream error - client may have disconnected
          // Nothing to do, just let it close
        });
      });

      req.on('error', (error: any) => {
        // Handle all request errors, including HTTP parsing errors
        const errorMessage = error.message || String(error) || 'Failed to connect to Python backend';
        const errorCode = error.code || error.name;
        const isParseError = errorMessage.includes('Parse Error') || errorMessage.includes('Expected HTTP');

        // Only handle errors if request hasn't started (connection errors)
        // If request started, the response handler will deal with it
        if (!requestStarted || isParseError) {
          // Ensure headers are sent before writing error data
          if (!event.node.res.headersSent) {
            event.node.res.writeHead(200, headers);
            if (typeof event.node.res.flushHeaders === 'function') {
              event.node.res.flushHeaders();
            }
          }

          let userFriendlyMessage: string;
          if (isParseError) {
            userFriendlyMessage = 'Python backend returned an invalid response. The server may be experiencing issues or returned an error page. Please check if the Python server is running correctly and try again.';
          } else if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') {
            userFriendlyMessage = 'Cannot connect to Python backend. Please ensure the Python server is running on port 3000.';
          } else if (errorCode === 'ETIMEDOUT' || errorCode === 'TIMEOUT') {
            userFriendlyMessage = 'Connection to Python backend timed out. Please check if the server is running.';
          } else {
            userFriendlyMessage = errorMessage;
          }

          const errorData = `data: ${JSON.stringify({
            success: false,
            error: userFriendlyMessage,
            type: 'error',
            debug: process.dev ? { code: errorCode, message: errorMessage } : undefined,
          })}\n\n`;
          try {
            if (!event.node.res.writableEnded) {
              event.node.res.write(errorData);
              event.node.res.end();
            }
          } catch (writeError) {
            // Response might already be closed, ignore
            console.error('[Install OS] Error writing error response:', writeError);
          }
        }
      });

      req.on('timeout', () => {
        req.destroy();
        // Ensure headers are sent before writing error data
        if (!event.node.res.headersSent) {
          event.node.res.writeHead(200, headers);
          if (typeof event.node.res.flushHeaders === 'function') {
            event.node.res.flushHeaders();
          }
        }
        const errorData = `data: ${JSON.stringify({
          success: false,
          error: 'Installation request timed out. The operation took too long.',
          type: 'error',
        })}\n\n`;
        try {
          event.node.res.write(errorData);
          event.node.res.end();
        } catch (writeError) {
          console.error('[Install OS] Error writing timeout response:', writeError);
        }
      });

      // Write the request body
      req.write(requestBody);
      req.end();

      // Return undefined to signal H3 that we've handled the response manually
      // The response is already committed via writeHead above
      // H3 will see headersSent=true and won't try to process the response
      return undefined;
    } else {
      // Non-streaming request - use existing callPythonApi method
      const response = await callPythonApi(event, {
        endpoint: '/api/install-os',
        method: 'POST',
        body,
        timeout: API_TIMEOUTS.FORMAT_SDCARD * 10, // Use longer timeout for OS installation
      });

      // Ensure content-type is set
      setHeader(event, 'Content-Type', 'application/json');
      return response;
    }
  } catch (error: any) {
    // Log the error for debugging
    console.error('[Install OS] Unexpected error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
    });

    // If streaming was requested, try to send error as SSE
    if (wantsStreaming) {
      // Ensure headers are sent before writing error
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
        error: error.data?.error || error.message || 'Failed to install OS',
        type: 'error',
      })}\n\n`;
      try {
        if (!event.node.res.writableEnded) {
          event.node.res.write(errorData);
          event.node.res.end();
        }
      } catch (writeError) {
        console.error('[Install OS] Error writing catch block error:', writeError);
      }
      return undefined;
    }

    // Non-streaming error
    setHeader(event, 'Content-Type', 'application/json');
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to install OS',
      data: error.data || { success: false, error: 'Failed to install OS' },
    });
  }
});
