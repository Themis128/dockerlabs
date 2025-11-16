#!/usr/bin/env python3
"""
Simple web server for Raspberry Pi Management GUI
Enhanced with modern best practices: security headers, rate limiting, compression, etc.
"""
import http.server
import socketserver
import json
import subprocess
import sys
import os
import traceback
from urllib.parse import urlparse, parse_qs
import tempfile
import time
import gzip
import signal
import threading
import queue
import socket
from collections import defaultdict
from datetime import datetime
from typing import Optional, Dict, List, Tuple, Any
import hashlib

# Constants
DEFAULT_PORT = 3000
SSH_PORT = 22
TELNET_PORT = 23
DEFAULT_TIMEOUT = 30
REQUEST_TIMEOUT = 30
SUBPROCESS_TIMEOUT = 30
CONFIG_TIMEOUT = 120
MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB max request size
RATE_LIMIT_REQUESTS = 100  # Max requests per window
RATE_LIMIT_WINDOW = 60  # Time window in seconds
RATE_LIMIT_LOCALHOST_REQUESTS = 500  # Higher limit for localhost (for development)
STATIC_CACHE_MAX_AGE = 3600  # 1 hour cache for static files

# Allowed CORS origins (for production, restrict this list)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",  # Nuxt dev server
    "http://127.0.0.1:3001",  # Nuxt dev server
    # Add production domains here when deploying
]

PORT = int(os.environ.get("PORT", DEFAULT_PORT))
VERBOSE = os.environ.get("VERBOSE", "false").lower() == "true"
ENABLE_COMPRESSION = os.environ.get("ENABLE_COMPRESSION", "true").lower() == "true"
ENABLE_RATE_LIMITING = os.environ.get("ENABLE_RATE_LIMITING", "true").lower() == "true"

# Global state for graceful shutdown
shutdown_event = threading.Event()
_shutdown_in_progress = False
_shutdown_lock = threading.Lock()
_server_instance = None
_active_requests = set()  # Track active requests for graceful shutdown
_active_requests_lock = threading.Lock()
_shutdown_timeout = 30  # Maximum time to wait for requests to complete

# Rate limiting storage (in-memory, simple implementation)
# In production, consider using Redis or similar for distributed systems
_rate_limit_store: Dict[str, List[float]] = defaultdict(list)
_rate_limit_lock = threading.Lock()

# Track active subprocesses for graceful shutdown
_active_subprocesses: set = set()
_active_subprocesses_lock = threading.Lock()

# Server start time for metrics
server_start_time: float = 0.0

def get_timestamp() -> str:
    """Get formatted timestamp"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def generate_request_id() -> str:
    """Generate a unique request ID for tracking"""
    return hashlib.md5(f"{time.time()}{os.urandom(16)}".encode()).hexdigest()[:12]

def debug_log(message: str, request_id: Optional[str] = None):
    """Print debug message if verbose mode is enabled"""
    if VERBOSE:
        req_id = f"[{request_id}]" if request_id else ""
        print(f"[DEBUG {get_timestamp()}]{req_id} {message}")

def error_log(message: str, exception: Optional[Exception] = None,
              include_traceback: bool = False, request_id: Optional[str] = None):
    """Print error message - always displayed"""
    timestamp = get_timestamp()
    req_id = f"[{request_id}]" if request_id else ""
    print(f"[ERROR {timestamp}]{req_id} {message}", file=sys.stderr)
    if exception:
        print(f"[ERROR {timestamp}]{req_id} Exception: {type(exception).__name__}: {str(exception)}", file=sys.stderr)
    if include_traceback and exception:
        print(f"[ERROR {timestamp}]{req_id} Traceback:", file=sys.stderr)
        traceback.print_exception(type(exception), exception, exception.__traceback__, file=sys.stderr)

def warning_log(message: str, request_id: Optional[str] = None):
    """Print warning message - always displayed"""
    timestamp = get_timestamp()
    req_id = f"[{request_id}]" if request_id else ""
    print(f"[WARNING {timestamp}]{req_id} {message}", file=sys.stderr)

def info_log(message: str, request_id: Optional[str] = None):
    """Print info message"""
    timestamp = get_timestamp()
    req_id = f"[{request_id}]" if request_id else ""
    print(f"[INFO {timestamp}]{req_id} {message}")

def check_rate_limit(client_ip: str) -> Tuple[bool, Optional[int]]:
    """
    Check if client has exceeded rate limit.
    Returns: (allowed, retry_after_seconds)
    """
    if not ENABLE_RATE_LIMITING:
        return True, None

    # Allow unlimited requests from localhost (for development)
    if client_ip in ("127.0.0.1", "localhost", "::1"):
        return True, None

    current_time = time.time()

    with _rate_limit_lock:
        # Clean old entries
        _rate_limit_store[client_ip] = [
            req_time for req_time in _rate_limit_store[client_ip]
            if current_time - req_time < RATE_LIMIT_WINDOW
        ]

        # Check limit
        if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
            # Calculate retry after
            oldest_request = min(_rate_limit_store[client_ip])
            retry_after = int(RATE_LIMIT_WINDOW - (current_time - oldest_request)) + 1
            return False, retry_after

        # Add current request
        _rate_limit_store[client_ip].append(current_time)
        return True, None

def should_compress(content_type: str, content_length: int) -> bool:
    """Determine if response should be compressed"""
    if not ENABLE_COMPRESSION:
        return False

    # Only compress text-based content
    compressible_types = [
        'text/', 'application/json', 'application/javascript',
        'application/xml', 'application/xhtml+xml'
    ]

    return any(content_type.startswith(ct) for ct in compressible_types) and content_length > 1024


class PiManagementHandler(http.server.SimpleHTTPRequestHandler):
    timeout = REQUEST_TIMEOUT
    server_version = "PiManagementServer/1.0"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        self.public_dir = os.path.join(os.path.dirname(__file__), "public")
        self.request_id = generate_request_id()
        self.request_start_time = time.time()
        # Initialize request_version early to avoid AttributeError in send_response
        # This will be overwritten when the request is parsed, but ensures it exists
        self.request_version = 'HTTP/1.1'
        super().__init__(*args, **kwargs)
        # Ensure request_version is still set after super().__init__()
        # (in case base class resets it or it wasn't set during request parsing)
        if not hasattr(self, 'request_version') or not self.request_version:
            self.request_version = 'HTTP/1.1'

    def handle(self):
        """Override handle to set timeout and handle connection errors gracefully"""
        self.timeout = REQUEST_TIMEOUT

        # Ensure request_version is set before any operations
        # This is critical because send_response requires it, and we might call it
        # before super().handle() parses the request
        if not hasattr(self, 'request_version') or not self.request_version:
            self.request_version = 'HTTP/1.1'

        # Check for graceful shutdown
        if shutdown_event.is_set():
            try:
                # Set requestline and request_version to avoid AttributeError
                # Ensure request_version is set before calling send_response
                if not hasattr(self, 'requestline'):
                    self.requestline = "SHUTDOWN"
                self.request_version = getattr(self, 'request_version', 'HTTP/1.1')
                self.send_response(503, "Service Unavailable")
                self.send_header("Content-Type", "application/json")
                self.send_header("Connection", "close")
                self._send_security_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Server is shutting down"
                }).encode())
            except (OSError, BrokenPipeError, ConnectionAbortedError):
                pass
            return

        # Track active request
        with _active_requests_lock:
            _active_requests.add(self.request_id)

        # Get client IP early to avoid undefined variable in exception handlers
        client_ip = self.client_address[0] if self.client_address else "unknown"

        try:
            # Rate limiting check
            allowed, retry_after = check_rate_limit(client_ip)
            if not allowed:
                warning_log(f"Rate limit exceeded for {client_ip}, retry after {retry_after}s", self.request_id)
                # Set requestline and request_version to avoid AttributeError
                # The request hasn't been parsed yet, so we use placeholders
                # Ensure request_version is set before calling send_response
                if not hasattr(self, 'requestline'):
                    self.requestline = f"RATE_LIMITED {client_ip}"
                self.request_version = getattr(self, 'request_version', 'HTTP/1.1')
                self.send_response(429, "Too Many Requests")
                self.send_header("Content-Type", "application/json")
                self.send_header("Retry-After", str(retry_after))
                self._send_security_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Rate limit exceeded",
                    "retry_after": retry_after
                }).encode())
                return

            super().handle()

            # Log request completion
            duration = time.time() - self.request_start_time
            if VERBOSE:
                debug_log(f"Request completed in {duration:.3f}s: {self.path} -> {self.response_code if hasattr(self, 'response_code') else 'N/A'}", self.request_id)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError) as e:
            # Client disconnected before request could be read - this is normal
            # Log in verbose mode only to avoid cluttering logs
            if VERBOSE:
                debug_log(f"Client disconnected: {type(e).__name__} from {client_ip}", self.request_id)
        except OSError as e:
            # Check for connection reset errors (Windows error 10054, Linux errno 104)
            # ConnectionResetError is a subclass of OSError, but we catch it separately above
            # This catches other OSErrors that might be connection-related
            if hasattr(e, 'winerror') and e.winerror == 10054:
                # Windows: "An existing connection was forcibly closed by the remote host"
                if VERBOSE:
                    debug_log(f"Connection reset by client: {client_ip}", self.request_id)
            elif hasattr(e, 'errno') and e.errno == 104:
                # Linux: "Connection reset by peer"
                if VERBOSE:
                    debug_log(f"Connection reset by peer: {client_ip}", self.request_id)
            else:
                # Log other OSErrors as they might be important
                error_log(f"OSError handling request from {client_ip}: {str(e)}", e, request_id=self.request_id)
                raise
        except Exception as e:
            # Catch any other unexpected exceptions
            error_log(f"Unexpected error handling request from {client_ip}: {str(e)}", e, include_traceback=True, request_id=self.request_id)
            raise
        finally:
            # Remove from active requests
            with _active_requests_lock:
                _active_requests.discard(self.request_id)

    def do_GET(self):
        debug_log(f"GET request: {self.path} from {self.client_address[0]}", self.request_id)

        try:
            # Health check endpoint (no auth, no rate limit)
            # Handle health check early to ensure it's always accessible
            if self.path == "/api/health":
                try:
                    self.send_health_check()
                except Exception as e:
                    # If health check fails, return a minimal response to indicate server is running
                    error_log(f"Health check failed, returning minimal response: {str(e)}", e, request_id=self.request_id)
                    self.send_json({
                        "status": "degraded",
                        "error": "Health check failed",
                        "server_running": True,
                        "timestamp": datetime.now().isoformat()
                    }, 503)
                return
            elif self.path == "/api/metrics":
                self.send_metrics()
                return

            if self.path == "/api/pis":
                self.send_pi_list()
                return
            elif self.path == "/api/test-connections":
                self.test_connections()
            elif self.path.startswith("/api/test-ssh"):
                self.test_ssh_auth()
            elif self.path.startswith("/api/get-pi-info"):
                self.get_pi_info()
            elif self.path == "/api/sdcards":
                self.list_sdcards()
            elif self.path.startswith("/api/os-images"):
                self.list_os_images()
            elif self.path == "/api/scan-wifi":
                self.scan_wifi_networks()
            elif self.path == "/api/scan-network":
                self.scan_network()
            else:
                self.serve_static_file()
        except Exception as e:
            # Catch any unhandled exceptions to prevent connection from closing
            error_log(f"Unhandled exception in do_GET for {self.path}: {str(e)}", e, include_traceback=True, request_id=self.request_id)
            try:
                self.send_json({
                    "success": False,
                    "error": f"Internal server error: {str(e)}"
                }, 500)
            except Exception:
                # If we can't send JSON, the connection will close - that's okay
                pass

    def _get_allowed_origin(self) -> Optional[str]:
        """Get allowed origin for CORS, or None if not allowed"""
        origin = self.headers.get("Origin")
        if origin and origin in ALLOWED_ORIGINS:
            return origin
        # For development, allow localhost and local network IPs
        if origin:
            origin_lower = origin.lower()
            if ("localhost" in origin_lower or
                "127.0.0.1" in origin_lower or
                origin_lower.startswith("http://192.168.") or
                origin_lower.startswith("http://10.") or
                origin_lower.startswith("http://172.")):
                return origin
        # For server-side requests (no Origin header), return None (CORS not needed)
        # This is fine - CORS only applies to browser requests
        return None

    def _send_cors_headers(self):
        """Send CORS headers if origin is allowed"""
        origin = self._get_allowed_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "86400")  # 24 hours

    def _send_security_headers(self):
        """Send security headers for better protection"""
        # Prevent clickjacking
        self.send_header("X-Frame-Options", "DENY")
        # Prevent MIME type sniffing
        self.send_header("X-Content-Type-Options", "nosniff")
        # XSS Protection (legacy, but still useful)
        self.send_header("X-XSS-Protection", "1; mode=block")
        # Referrer Policy
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        # Content Security Policy (basic)
        csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
        self.send_header("Content-Security-Policy", csp)
        # Permissions Policy (formerly Feature Policy)
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

        # HSTS (only if HTTPS - detect via X-Forwarded-Proto or similar)
        # In production with HTTPS, uncomment:
        # self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        debug_log(f"POST request: {self.path} from {self.client_address[0]}", self.request_id)

        try:
            # Check request size
            try:
                content_length = int(self.headers.get("Content-Length", 0))
            except (ValueError, TypeError):
                content_length = 0
            if content_length > MAX_REQUEST_SIZE:
                warning_log(f"Request too large: {content_length} bytes from {self.client_address[0]}", self.request_id)
                self.send_json({
                    "success": False,
                    "error": f"Request too large. Maximum size: {MAX_REQUEST_SIZE} bytes"
                }, 413)
                return

            if self.path == "/api/connect-ssh":
                self.connect_ssh()
            elif self.path == "/api/connect-telnet":
                self.connect_telnet()
            elif self.path == "/api/execute-remote":
                self.execute_remote_command()
            elif self.path == "/api/get-pi-info":
                self.get_pi_info()
            elif self.path == "/api/format-sdcard":
                self.format_sdcard()
            elif self.path == "/api/install-os":
                self.install_os()
            elif self.path == "/api/configure-pi":
                self.configure_pi()
            elif self.path == "/api/scan-wifi":
                # Allow POST for scan-wifi as well (test script uses POST)
                self.scan_wifi_networks()
            elif self.path.startswith("/api/get-pi-info"):
                # Allow POST for get-pi-info as well
                self.get_pi_info()
            else:
                warning_log(f"404 Not Found: {self.path}", self.request_id)
                self.send_json({
                    "success": False,
                    "error": "Endpoint not found"
                }, 404)
        except Exception as e:
            # Catch any unhandled exceptions to prevent connection from closing
            error_log(f"Unhandled exception in do_POST for {self.path}: {str(e)}", e, include_traceback=True, request_id=self.request_id)
            try:
                self.send_json({
                    "success": False,
                    "error": f"Internal server error: {str(e)}"
                }, 500)
            except Exception:
                # If we can't send JSON, the connection will close - that's okay
                pass

    def send_json(self, data: Dict[str, Any], status: int = 200):
        """Send JSON response with compression support"""
        try:
            json_data = json.dumps(data).encode('utf-8')
            content_length = len(json_data)

            # Check if client accepts compression
            accept_encoding = self.headers.get("Accept-Encoding", "")
            compressed = False

            if should_compress("application/json", content_length) and "gzip" in accept_encoding:
                json_data = gzip.compress(json_data)
                compressed = True
                content_length = len(json_data)

            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            if compressed:
                self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(content_length))
            self._send_cors_headers()
            self._send_security_headers()
            self.end_headers()
            self.wfile.write(json_data)
            # Explicitly flush to ensure response is sent immediately
            # This is important on Windows where buffering can cause delays
            self.wfile.flush()
            self.response_code = status
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError) as e:
            # Client disconnected or connection was reset, ignore silently
            pass
        except OSError as e:
            # On Windows, connection resets can be raised as OSError with error code 10054
            # Only ignore connection-related errors, not other OSErrors
            if hasattr(e, 'winerror') and e.winerror == 10054:
                # Windows connection reset error
                pass
            elif hasattr(e, 'errno') and e.errno in (10054, 104, 32, 107):
                # Connection reset errors on various platforms
                # 10054: Windows WSAECONNRESET
                # 104: Linux ECONNRESET
                # 32: EPIPE (broken pipe)
                # 107: ENOTCONN (not connected)
                pass
            else:
                # Re-raise other OSErrors as they might be legitimate errors
                raise

    def _get_config_path(self) -> str:
        """Get the path to pi-config.json in project root"""
        return os.path.join(os.path.dirname(os.path.dirname(__file__)), "pi-config.json")

    def send_pi_list(self):
        try:
            config_path = self._get_config_path()
            with open(config_path, "r", encoding='utf-8') as f:
                config = json.load(f)

            pis = []
            for key, pi in config["raspberry_pis"].items():
                pis.append(
                    {
                        "id": key,
                        "name": pi["name"],
                        "ip": pi["ip"],
                        "mac": pi["mac"],
                        "connection": pi["connection"],
                        "description": pi.get("description", ""),
                    }
                )

            self.send_json({"success": True, "pis": pis})
        except (OSError, IOError, json.JSONDecodeError, KeyError) as e:
            error_log(f"Error loading Pi list: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def test_connections(self):
        try:
            # Check for shutdown
            if shutdown_event.is_set():
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            script_path = os.path.join(
                os.path.dirname(__file__), "..", "scripts", "python", "test_connections.py"
            )
            if not os.path.exists(script_path):
                self.send_json({"success": False, "error": "test_connections.py not found"}, 404)
                return

            result = run_subprocess_safe(
                [sys.executable, script_path],
                timeout=SUBPROCESS_TIMEOUT,
                check_shutdown=True
            )

            if result is None:
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            # Try to parse JSON response from updated test_connections.py
            if result.returncode == 0 and result.stdout:
                try:
                    data = json.loads(result.stdout)
                    # If it's already JSON, return it
                    if isinstance(data, dict) and "results" in data:
                        self.send_json(data)
                        return
                except json.JSONDecodeError:
                    # Fall back to old format if not JSON
                    pass

            # Old format fallback
            self.send_json(
                {
                    "success": result.returncode == 0,
                    "output": result.stdout or "",
                    "error": result.stderr or "",
                }
            )
        except subprocess.TimeoutExpired:
            error_msg = f"Test timed out after {SUBPROCESS_TIMEOUT} seconds"
            error_log(error_msg, request_id=self.request_id)
            self.send_json({"success": False, "error": error_msg}, 500)
        except (OSError, subprocess.SubprocessError, ValueError) as e:
            error_log(f"Error running test_connections: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def test_ssh_auth(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            pi_number = query.get("pi", ["1"])[0]

            # Validate pi_number
            if not pi_number.isdigit() or int(pi_number) not in [1, 2]:
                self.send_json(
                    {"success": False, "error": "Invalid pi number. Must be 1 or 2"}, 400
                )
                return

            script_path = os.path.join(os.path.dirname(__file__), "..", "test_ssh_auth.py")
            if not os.path.exists(script_path):
                self.send_json({"success": False, "error": "test_ssh_auth.py not found"}, 404)
                return

            # Check for shutdown before starting
            if shutdown_event.is_set():
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            result = run_subprocess_safe(
                [sys.executable, script_path, pi_number],
                timeout=SUBPROCESS_TIMEOUT,
                check_shutdown=True
            )

            if result is None:
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return
            self.send_json(
                {
                    "success": result.returncode == 0,
                    "output": result.stdout or "",
                    "error": result.stderr or "",
                }
            )
        except subprocess.TimeoutExpired:
            error_msg = f"SSH test timed out after {SUBPROCESS_TIMEOUT} seconds"
            error_log(error_msg, request_id=self.request_id)
            self.send_json({"success": False, "error": error_msg}, 500)
        except (OSError, subprocess.SubprocessError, ValueError) as e:
            error_log(f"Error running SSH test: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def connect_ssh(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_json({"success": False, "error": "No data provided"}, 400)
                return
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            # Accept both "pi" and "pi_number" for backward compatibility
            pi_number = data.get("pi_number") or data.get("pi", "1")

            # Note: This would open an interactive session, so we just return info
            self.send_json(
                {
                    "success": True,
                    "message": (
                        f"To connect to Pi {pi_number}, "
                        f"run: python connect_ssh.py {pi_number}"
                    ),
                }
            )
        except json.JSONDecodeError as e:
            error_log(f"Invalid JSON in connect_ssh request: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
        except (OSError, ValueError) as e:
            error_log(f"Error in connect_ssh: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def connect_telnet(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_json({"success": False, "error": "No data provided"}, 400)
                return
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            # Accept both "pi" and "pi_number" for backward compatibility
            pi_number = data.get("pi_number") or data.get("pi", "1")

            self.send_json(
                {
                    "success": True,
                    "message": (
                        f"To connect to Pi {pi_number} via telnet, "
                        f"run: python connect_telnet.py {pi_number}"
                    ),
                }
            )
        except json.JSONDecodeError as e:
            error_log(f"Invalid JSON in connect_telnet request: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
        except (OSError, ValueError) as e:
            error_log(f"Error in connect_telnet: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def get_pi_info(self):
        """Get Pi information for remote connection"""
        try:
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            pi_number = query_params.get("pi", ["1"])[0]

            # Load config to get Pi info
            config_path = self._get_config_path()
            if os.path.exists(config_path):
                with open(config_path, "r", encoding='utf-8') as f:
                    config = json.load(f)
                    all_pis = config.get("raspberry_pis", {})
                    ethernet_pis = [
                        pi for pi in all_pis.values() if pi.get("connection") == "Wired"
                    ]
                    wifi_pis = [
                        pi for pi in all_pis.values() if pi.get("connection") == "2.4G"
                    ]

                    idx = int(pi_number) - 1
                    pi_info = None
                    connection_method = ""

                    if ethernet_pis and 0 <= idx < len(ethernet_pis):
                        pi_info = ethernet_pis[idx]
                        connection_method = "Ethernet"
                    elif wifi_pis and 0 <= idx < len(wifi_pis):
                        pi_info = wifi_pis[idx]
                        connection_method = "WiFi"

                    if pi_info:
                        self.send_json({
                            "success": True,
                            "pi": {
                                "number": pi_number,
                                "ip": pi_info.get("ip"),
                                "connection": connection_method,
                                "mac": pi_info.get("mac"),
                            }
                        })
                    else:
                        self.send_json({"success": False, "error": f"Pi {pi_number} not found"})
            else:
                warning_log("pi-config.json not found")
                self.send_json({"success": False, "error": "pi-config.json not found"})
        except (OSError, IOError, json.JSONDecodeError, KeyError, ValueError) as e:
            error_log(f"Error getting Pi info: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def execute_remote_command(self):
        """Execute remote command on Raspberry Pi via SSH or Telnet"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_json({"success": False, "error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            pi_number = data.get("pi_number", "1")
            command = data.get("command", "")
            connection_type = data.get("connection_type", "ssh")
            network_type = data.get("network_type", "auto")
            username = data.get("username", "pi")
            password = data.get("password", None)
            key_path = data.get("key_path", None)

            if not command:
                self.send_json({"success": False, "error": "Command is required"}, 400)
                return

            script_path = os.path.join(
                os.path.dirname(__file__), "scripts", "execute_remote_command.py"
            )
            if not os.path.exists(script_path):
                self.send_json(
                    {"success": False, "error": "execute_remote_command.py not found"}, 404
                )
                return

            # Build command arguments
            cmd_args = [
                sys.executable,
                script_path,
                str(pi_number),
                command,
                "-u", username,
                "-t", connection_type,
                "-c", network_type,
            ]

            if password:
                cmd_args.extend(["-p", password])
            if key_path:
                cmd_args.extend(["-k", key_path])

            # Check for shutdown before starting
            if shutdown_event.is_set():
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            result = run_subprocess_safe(
                cmd_args,
                timeout=60,
                cwd=os.path.dirname(os.path.dirname(__file__)),
                check_shutdown=True
            )

            if result is None:
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    self.send_json(data)
                except json.JSONDecodeError:
                    self.send_json({
                        "success": False,
                        "error": "Invalid response from script",
                        "output": result.stdout,
                    })
            else:
                try:
                    error_data = json.loads(result.stdout)
                    self.send_json(error_data)
                except json.JSONDecodeError:
                    self.send_json({
                        "success": False,
                        "error": result.stderr or "Command execution failed",
                        "output": result.stdout,
                    })
        except subprocess.TimeoutExpired:
            error_log("Command execution timed out", request_id=self.request_id)
            self.send_json({"success": False, "error": "Command execution timed out"}, 500)
        except json.JSONDecodeError as e:
            error_log(f"Invalid JSON in execute_remote_command request: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
        except (OSError, subprocess.SubprocessError, ValueError) as e:
            error_log(f"Error executing remote command: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def _check_disk_space(self, path: str) -> Dict[str, Any]:
        """Check available disk space for a given path"""
        try:
            if sys.platform == "win32":
                import shutil
                total, used, free = shutil.disk_usage(path)
                free_gb = free / (1024 ** 3)
                total_gb = total / (1024 ** 3)
                percent_free = (free / total) * 100
                return {
                    "status": "ok" if percent_free > 10 else "warning" if percent_free > 5 else "critical",
                    "free_gb": round(free_gb, 2),
                    "total_gb": round(total_gb, 2),
                    "percent_free": round(percent_free, 1)
                }
            else:
                import statvfs
                stat = os.statvfs(path)
                free_gb = (stat.f_bavail * stat.f_frsize) / (1024 ** 3)
                total_gb = (stat.f_blocks * stat.f_frsize) / (1024 ** 3)
                percent_free = (stat.f_bavail / stat.f_blocks) * 100
                return {
                    "status": "ok" if percent_free > 10 else "warning" if percent_free > 5 else "critical",
                    "free_gb": round(free_gb, 2),
                    "total_gb": round(total_gb, 2),
                    "percent_free": round(percent_free, 1)
                }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _check_memory_usage(self) -> Dict[str, Any]:
        """Check system memory usage (using standard library only)"""
        try:
            if sys.platform == "win32":
                # Windows: Use ctypes to query memory status
                try:
                    import ctypes

                    class MEMORYSTATUSEX(ctypes.Structure):
                        _fields_ = [
                            ("dwLength", ctypes.c_ulong),
                            ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong),
                            ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong),
                            ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong),
                            ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                        ]

                    mem_status = MEMORYSTATUSEX()
                    mem_status.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
                    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem_status))

                    total_gb = mem_status.ullTotalPhys / (1024 ** 3)
                    available_gb = mem_status.ullAvailPhys / (1024 ** 3)
                    percent_used = mem_status.dwMemoryLoad

                    return {
                        "status": "ok" if percent_used < 90 else "warning" if percent_used < 95 else "critical",
                        "percent_used": round(percent_used, 1),
                        "available_gb": round(available_gb, 2),
                        "total_gb": round(total_gb, 2)
                    }
                except (AttributeError, OSError):
                    return {"status": "unknown", "note": "Memory check not available on this Windows system"}
            else:
                # Linux/Mac - read /proc/meminfo on Linux
                if os.path.exists("/proc/meminfo"):
                    try:
                        with open("/proc/meminfo", "r") as f:
                            meminfo = f.read()
                            lines = meminfo.split("\n")

                            mem_total_line = [l for l in lines if l.startswith("MemTotal:")]
                            mem_available_line = [l for l in lines if l.startswith("MemAvailable:")]

                            if mem_total_line and mem_available_line:
                                mem_total = int(mem_total_line[0].split()[1]) * 1024
                                mem_available = int(mem_available_line[0].split()[1]) * 1024
                                mem_used = mem_total - mem_available
                                percent_used = (mem_used / mem_total) * 100

                                return {
                                    "status": "ok" if percent_used < 90 else "warning" if percent_used < 95 else "critical",
                                    "percent_used": round(percent_used, 1),
                                    "available_gb": round(mem_available / (1024 ** 3), 2),
                                    "total_gb": round(mem_total / (1024 ** 3), 2)
                                }
                    except (IOError, ValueError, IndexError):
                        pass

                return {"status": "unknown", "note": "Memory check not available on this platform"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def _check_config_file(self, config_path: str) -> Dict[str, Any]:
        """Check config file existence, readability, and validity"""
        result = {"exists": False, "readable": False, "valid_json": False, "valid_structure": False, "pi_count": 0}

        if not os.path.exists(config_path):
            return result

        result["exists"] = True

        # Check readability
        if not os.access(config_path, os.R_OK):
            return result

        result["readable"] = True

        # Check JSON validity
        try:
            with open(config_path, "r", encoding='utf-8') as f:
                config = json.load(f)
            result["valid_json"] = True

            # Check structure
            if isinstance(config, dict) and "raspberry_pis" in config:
                result["valid_structure"] = True
                if isinstance(config["raspberry_pis"], dict):
                    result["pi_count"] = len(config["raspberry_pis"])
        except (json.JSONDecodeError, IOError, OSError):
            pass

        return result

    def _check_scripts_availability(self) -> Dict[str, Any]:
        """Check if required scripts exist"""
        scripts_dir = os.path.join(os.path.dirname(__file__), "scripts")
        required_scripts = [
            "execute_remote_command.py",
            "list_sdcards.py",
            "scan_wifi_networks.py",
            "format_sdcard.py"
        ]

        result = {"available": [], "missing": []}
        for script in required_scripts:
            script_path = os.path.join(scripts_dir, script)
            if os.path.exists(script_path) and os.access(script_path, os.R_OK):
                result["available"].append(script)
            else:
                result["missing"].append(script)

        result["status"] = "ok" if len(result["missing"]) == 0 else "degraded"
        return result

    def _check_python_version(self) -> Dict[str, Any]:
        """Check Python version"""
        version = sys.version_info
        version_str = f"{version.major}.{version.minor}.{version.micro}"
        is_supported = version.major >= 3 and version.minor >= 7
        return {
            "version": version_str,
            "status": "ok" if is_supported else "warning",
            "supported": is_supported
        }

    def _check_file_permissions(self, path: str) -> Dict[str, Any]:
        """Check file/directory permissions"""
        try:
            if not os.path.exists(path):
                return {"status": "missing", "readable": False, "writable": False}

            readable = os.access(path, os.R_OK)
            writable = os.access(path, os.W_OK)

            status = "ok" if (readable and (os.path.isdir(path) or not writable)) else "warning"
            return {
                "status": status,
                "readable": readable,
                "writable": writable
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def send_health_check(self):
        """Send enhanced health check response with detailed diagnostics"""
        try:
            checks = {}
            critical_issues = []
            warnings = []

            # Basic file checks
            config_path = self._get_config_path()
            config_check = self._check_config_file(config_path)
            checks["config_file"] = {
                "exists": config_check["exists"],
                "readable": config_check["readable"],
                "valid_json": config_check["valid_json"],
                "valid_structure": config_check["valid_structure"],
                "pi_count": config_check["pi_count"],
                "status": "ok" if all([config_check["exists"], config_check["readable"],
                                      config_check["valid_json"], config_check["valid_structure"]]) else "error"
            }
            if not config_check["exists"]:
                critical_issues.append("Config file missing")
            elif not config_check["valid_json"]:
                critical_issues.append("Config file invalid JSON")
            elif not config_check["valid_structure"]:
                critical_issues.append("Config file invalid structure")

            public_dir_check = self._check_file_permissions(self.public_dir)
            checks["public_directory"] = {
                **public_dir_check,
                "exists": os.path.exists(self.public_dir),
                "path": self.public_dir
            }
            if not os.path.exists(self.public_dir):
                critical_issues.append("Public directory missing")
            elif not public_dir_check["readable"]:
                critical_issues.append("Public directory not readable")

            # System resources
            checks["disk_space"] = self._check_disk_space(os.path.dirname(config_path))
            if checks["disk_space"].get("status") == "critical":
                critical_issues.append("Low disk space")
            elif checks["disk_space"].get("status") == "warning":
                warnings.append("Disk space running low")

            checks["memory"] = self._check_memory_usage()
            if checks["memory"].get("status") == "critical":
                critical_issues.append("High memory usage")
            elif checks["memory"].get("status") == "warning":
                warnings.append("Memory usage high")

            # Python version
            checks["python_version"] = self._check_python_version()
            if not checks["python_version"]["supported"]:
                warnings.append("Python version may not be supported")

            # Scripts availability
            checks["scripts"] = self._check_scripts_availability()
            if checks["scripts"]["status"] != "ok":
                warnings.append(f"Missing scripts: {', '.join(checks['scripts']['missing'])}")

            # Server metrics
            uptime_seconds = time.time() - server_start_time if server_start_time > 0 else 0
            with _active_requests_lock:
                active_requests = len(_active_requests)

            with _rate_limit_lock:
                total_requests = sum(len(requests) for requests in _rate_limit_store.values())
                unique_clients = len(_rate_limit_store)

            checks["server"] = {
                "status": "running",
                "uptime_seconds": round(uptime_seconds, 1),
                "uptime_formatted": self._format_uptime(uptime_seconds),
                "active_requests": active_requests,
                "port": PORT,
                "rate_limiting_enabled": ENABLE_RATE_LIMITING,
                "compression_enabled": ENABLE_COMPRESSION
            }

            checks["metrics"] = {
                "total_requests_in_window": total_requests,
                "unique_clients": unique_clients,
                "rate_limit_window_seconds": RATE_LIMIT_WINDOW,
                "rate_limit_max_requests": RATE_LIMIT_REQUESTS
            }

            # Threading health check
            checks["threading"] = {
                "status": "ok",
                "active_threads": threading.active_count(),
                "shutdown_in_progress": shutdown_event.is_set()
            }
            if shutdown_event.is_set():
                warnings.append("Server shutdown in progress")

            # Determine overall status
            # Note: Nuxt checks for "healthy", "ok", or "degraded" status
            if critical_issues:
                overall_status = "unhealthy"
                status_code = 503
            elif warnings:
                overall_status = "degraded"
                status_code = 200
            else:
                overall_status = "healthy"  # Also accepted as "ok" by Nuxt
                status_code = 200

            health_status = {
                "status": overall_status,
                "timestamp": datetime.now().isoformat(),
                "checks": checks,
                "summary": {
                    "critical_issues": critical_issues,
                    "warnings": warnings,
                    "all_checks_passed": len(critical_issues) == 0 and len(warnings) == 0
                }
            }

            self.send_json(health_status, status_code)
        except Exception as e:
            error_log(f"Error in health check: {str(e)}", e, request_id=self.request_id)
            self.send_json({
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }, 503)

    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human-readable format"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds // 60)}m {int(seconds % 60)}s"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
        else:
            days = int(seconds // 86400)
            hours = int((seconds % 86400) // 3600)
            return f"{days}d {hours}h"

    def send_metrics(self):
        """Send basic server metrics"""
        try:
            with _rate_limit_lock:
                total_requests = sum(len(requests) for requests in _rate_limit_store.values())
                unique_clients = len(_rate_limit_store)

            metrics = {
                "server": {
                    "uptime_seconds": time.time() - server_start_time if server_start_time > 0 else 0,
                    "port": PORT,
                    "rate_limiting_enabled": ENABLE_RATE_LIMITING,
                    "compression_enabled": ENABLE_COMPRESSION
                },
                "requests": {
                    "total_in_window": total_requests,
                    "unique_clients": unique_clients,
                    "rate_limit_window_seconds": RATE_LIMIT_WINDOW,
                    "rate_limit_max_requests": RATE_LIMIT_REQUESTS
                },
                "timestamp": datetime.now().isoformat()
            }

            self.send_json(metrics)
        except Exception as e:
            error_log(f"Error generating metrics: {str(e)}", e, request_id=self.request_id)
            self.send_json({"error": "Failed to generate metrics"}, 500)

    def serve_static_file(self):
        """Serve static files from the public directory with caching support"""
        if self.path in ("/", ""):
            self.path = "/index.html"

        # Normalize path to prevent directory traversal
        path = self.path.lstrip("/")

        # Use os.path for proper path normalization
        normalized = os.path.normpath(path)

        # Check for path traversal attempts
        if ".." in normalized or normalized.startswith("/") or os.path.isabs(normalized):
            self.send_error(403, "Forbidden")
            return

        file_path = os.path.join(self.public_dir, normalized)

        # Ensure the file is within the public directory (final security check)
        try:
            abs_file_path = os.path.abspath(file_path)
            abs_public_dir = os.path.abspath(self.public_dir)
            if not abs_file_path.startswith(abs_public_dir):
                self.send_error(403, "Forbidden")
                return
        except (OSError, ValueError):
            self.send_error(403, "Forbidden")
            return

        if os.path.exists(file_path) and os.path.isfile(file_path):
            try:
                with open(file_path, "rb") as f:
                    content = f.read()

                # Get file modification time for ETag
                file_mtime = os.path.getmtime(file_path)
                etag = hashlib.md5(f"{file_path}{file_mtime}".encode()).hexdigest()

                # Check If-None-Match header for 304 Not Modified
                if_none_match = self.headers.get("If-None-Match")
                if if_none_match == etag:
                    self.send_response(304, "Not Modified")
                    self._send_security_headers()
                    self.end_headers()
                    return

                self.send_response(200)

                # Set content type
                content_type = "application/octet-stream"
                if file_path.endswith(".html"):
                    content_type = "text/html; charset=utf-8"
                elif file_path.endswith(".css"):
                    content_type = "text/css; charset=utf-8"
                elif file_path.endswith(".js"):
                    content_type = "application/javascript; charset=utf-8"
                elif file_path.endswith(".json"):
                    content_type = "application/json; charset=utf-8"
                elif file_path.endswith((".png", ".jpg", ".jpeg", ".gif", ".ico")):
                    content_type = f"image/{file_path.split('.')[-1]}"

                self.send_header("Content-Type", content_type)

                # Add caching headers for static files
                self.send_header("Cache-Control", f"public, max-age={STATIC_CACHE_MAX_AGE}")
                self.send_header("ETag", etag)
                self.send_header("Last-Modified", datetime.fromtimestamp(file_mtime).strftime("%a, %d %b %Y %H:%M:%S GMT"))

                # Compression for text-based static files
                accept_encoding = self.headers.get("Accept-Encoding", "")
                compressed = False
                if should_compress(content_type, len(content)) and "gzip" in accept_encoding:
                    content = gzip.compress(content)
                    compressed = True
                    self.send_header("Content-Encoding", "gzip")

                self.send_header("Content-Length", str(len(content)))
                self._send_security_headers()
                self.end_headers()
                self.wfile.write(content)
                self.response_code = 200
            except (BrokenPipeError, ConnectionAbortedError):
                # Client disconnected or connection aborted - this is normal during tests
                # Don't log as error, just ignore
                pass
            except (PermissionError, IOError) as e:
                # Only log actual errors, not connection issues
                # PermissionError is a subclass of OSError, so it must come first
                error_log(f"Error serving file {file_path}: {str(e)}", e, request_id=self.request_id)
                try:
                    self.send_error(500, f"Error serving file: {str(e)}")
                except (BrokenPipeError, ConnectionAbortedError, OSError):
                    # Client already disconnected, ignore
                    pass
            except OSError as e:
                # Catch other OSErrors (but not PermissionError which is handled above)
                # Log connection-related errors in verbose mode
                if VERBOSE:
                    debug_log(f"OSError serving file {file_path}: {str(e)}", self.request_id)
                # Don't log all connection errors as they're common
                pass
        else:
            try:
                self.send_error(404, "File not found")
            except (BrokenPipeError, ConnectionAbortedError, OSError):
                # Client disconnected, ignore
                pass

    def list_sdcards(self):
        """List available SD cards"""
        try:
            # Check for shutdown
            if shutdown_event.is_set():
                self.send_json({"success": False, "error": "Server is shutting down", "sdcards": []}, 503)
                return

            script_path = os.path.join(os.path.dirname(__file__), "scripts", "list_sdcards.py")
            if not os.path.exists(script_path):
                self.send_json(
                    {"success": False, "error": "list_sdcards.py not found", "sdcards": []}, 404
                )
                return

            result = run_subprocess_safe(
                [sys.executable, script_path],
                timeout=SUBPROCESS_TIMEOUT,
                cwd=os.path.dirname(os.path.dirname(__file__)),  # Run from project root
                check_shutdown=True
            )

            if result is None:
                self.send_json({"success": False, "error": "Server is shutting down", "sdcards": []}, 503)
                return

            if result.returncode == 0:
                try:
                    # Try to parse JSON from stdout
                    if result.stdout.strip():
                        data = json.loads(result.stdout)
                        self.send_json(data)
                    else:
                        # Empty output - no SD cards found
                        self.send_json({"success": True, "sdcards": []})
                except json.JSONDecodeError:
                    # If stdout is not JSON, check stderr for errors
                    error_msg = result.stderr or "Invalid response from script"
                    self.send_json({"success": False, "error": error_msg, "sdcards": []}, 500)
            else:
                # Script returned error code
                try:
                    # Try to parse error JSON from stdout
                    if result.stdout.strip():
                        data = json.loads(result.stdout)
                        self.send_json(data)
                    else:
                        self.send_json(
                            {
                                "success": False,
                                "error": result.stderr or "Failed to list SD cards",
                                "sdcards": [],
                            },
                            500,
                        )
                except json.JSONDecodeError:
                    self.send_json(
                        {
                            "success": False,
                            "error": result.stderr or "Failed to list SD cards",
                            "sdcards": [],
                        },
                        500,
                    )
        except subprocess.TimeoutExpired:
            error_log("SD card listing operation timed out", request_id=self.request_id)
            self.send_json({"success": False, "error": "Operation timed out", "sdcards": []}, 500)
        except (OSError, subprocess.SubprocessError) as e:
            error_log(f"Error listing SD cards: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e), "sdcards": []}, 500)

    def list_os_images(self):
        """List available OS images"""
        # For now, return a static list - could be extended to fetch from Raspberry Pi website
        images = [
            {"id": "raspios_lite_armhf", "name": "Raspberry Pi OS Lite (32-bit)", "size": "~500MB"},
            {
                "id": "raspios_armhf",
                "name": "Raspberry Pi OS with Desktop (32-bit)",
                "size": "~2.5GB",
            },
            {"id": "raspios_lite_arm64", "name": "Raspberry Pi OS Lite (64-bit)", "size": "~500MB"},
            {
                "id": "raspios_arm64",
                "name": "Raspberry Pi OS with Desktop (64-bit)",
                "size": "~2.5GB",
            },
        ]
        self.send_json({"success": True, "images": images})

    def format_sdcard(self):
        """Format SD card for Raspberry Pi with progress streaming"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_json({"success": False, "error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            device_id = data.get("device_id")
            pi_model = data.get("pi_model", "pi5")  # Default to Pi 5

            if not device_id:
                self.send_json({"success": False, "error": "Device ID required"}, 400)
                return

            script_path = os.path.join(os.path.dirname(__file__), "scripts", "format_sdcard.py")
            if not os.path.exists(script_path):
                self.send_json(
                    {"success": False, "error": "format_sdcard.py not found"}, 404
                )
                return

            # Check if client wants progress streaming (SSE)
            accept_header = self.headers.get("Accept", "")
            stream_progress = "text/event-stream" in accept_header or data.get("stream", False)

            if stream_progress:
                # Stream progress via Server-Sent Events
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "keep-alive")
                self._send_cors_headers()
                self.end_headers()

                try:
                    # Check for shutdown before starting
                    if shutdown_event.is_set():
                        error_data = json.dumps({"success": False, "error": "Server is shutting down"})
                        self.wfile.write(f"data: {error_data}\n\n".encode())
                        self.wfile.flush()
                        return

                    # Run script and capture output line by line
                    process = subprocess.Popen(
                        [sys.executable, script_path, device_id],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        bufsize=1,
                        cwd=os.path.dirname(os.path.dirname(__file__)),
                    )

                    final_result = None
                    progress_messages = []
                    last_output_time = time.time()
                    max_silence_timeout = 300  # 5 minutes max silence before timeout
                    read_timeout = 1.0  # Check every second for shutdown/timeout

                    # Read stdout line by line with timeout protection
                    # Use a queue-based approach for non-blocking reads
                    output_queue = queue.Queue()
                    read_thread_running = True

                    def read_output():
                        """Thread to read process output"""
                        try:
                            for line in iter(process.stdout.readline, ''):
                                if not read_thread_running:
                                    break
                                output_queue.put(('stdout', line))
                            output_queue.put(('stdout', None))  # EOF marker
                        except Exception as e:
                            output_queue.put(('error', str(e)))

                    import threading
                    read_thread = threading.Thread(target=read_output, daemon=True)
                    read_thread.start()

                    # Read from queue with timeout
                    while True:
                        # Check for shutdown during processing
                        if shutdown_event.is_set():
                            read_thread_running = False
                            try:
                                process.terminate()
                                process.wait(timeout=5)
                            except (subprocess.TimeoutExpired, OSError):
                                try:
                                    process.kill()
                                except OSError:
                                    pass
                            error_data = json.dumps({"success": False, "error": "Server is shutting down"})
                            self.wfile.write(f"data: {error_data}\n\n".encode())
                            self.wfile.flush()
                            return

                        # Check if process has died
                        if process.poll() is not None:
                            # Process finished, drain remaining output
                            break

                        # Check for timeout (no output for too long)
                        if time.time() - last_output_time > max_silence_timeout:
                            read_thread_running = False
                            warning_log(f"SD card format operation timed out (no output for {max_silence_timeout}s)", self.request_id)
                            try:
                                process.terminate()
                                process.wait(timeout=5)
                            except (subprocess.TimeoutExpired, OSError):
                                try:
                                    process.kill()
                                except OSError:
                                    pass
                            error_data = json.dumps({"success": False, "error": f"Operation timed out after {max_silence_timeout} seconds of silence"})
                            self.wfile.write(f"data: {error_data}\n\n".encode())
                            self.wfile.flush()
                            return

                        # Try to get output from queue (non-blocking)
                        try:
                            source, line = output_queue.get(timeout=read_timeout)
                            if source == 'error':
                                raise Exception(f"Error reading output: {line}")
                            if line is None:  # EOF
                                break

                            last_output_time = time.time()  # Reset timeout on output

                            line = line.strip()
                            if not line:
                                continue

                            try:
                                # Try to parse as JSON progress message
                                progress_data = json.loads(line)
                                if progress_data.get("type") == "progress":
                                    # Send progress update via SSE
                                    sse_data = json.dumps(progress_data)
                                    self.wfile.write(f"data: {sse_data}\n\n".encode())
                                    self.wfile.flush()
                                    progress_messages.append(progress_data)
                                elif progress_data.get("success") is not None:
                                    # This is the final result
                                    final_result = progress_data
                            except json.JSONDecodeError:
                                # Not a JSON progress message, might be final result
                                if "{" in line and "}" in line:
                                    try:
                                        parsed = json.loads(line)
                                        if parsed.get("success") is not None:
                                            final_result = parsed
                                    except (json.JSONDecodeError, ValueError):
                                        pass
                        except queue.Empty:
                            # Timeout waiting for output - continue loop to check shutdown/timeout
                            continue

                    # Stop the read thread
                    read_thread_running = False

                    # Wait for process to complete and get any remaining output
                    try:
                        remaining_stdout, stderr = process.communicate(timeout=10)
                        if remaining_stdout:
                            for line in remaining_stdout.strip().split('\n'):
                                if line.strip():
                                    try:
                                        data = json.loads(line)
                                        if data.get("type") == "progress":
                                            sse_data = json.dumps(data)
                                            self.wfile.write(f"data: {sse_data}\n\n".encode())
                                            self.wfile.flush()
                                        elif data.get("success") is not None:
                                            final_result = data
                                    except (json.JSONDecodeError, ValueError):
                                        pass

                        # Send final result
                        if final_result:
                            sse_data = json.dumps(final_result)
                            self.wfile.write(f"data: {sse_data}\n\n".encode())
                        else:
                            # Check return code
                            if process.returncode == 0:
                                final_result = {
                                    "success": True,
                                    "message": f"SD card {device_id} formatted successfully"
                                }
                            else:
                                error_msg = stderr or "Formatting failed"
                                final_result = {"success": False, "error": error_msg}
                            sse_data = json.dumps(final_result)
                            self.wfile.write(f"data: {sse_data}\n\n".encode())

                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionAbortedError, OSError) as e:
                        # Client disconnected during streaming
                        if VERBOSE:
                            debug_log(f"Client disconnected during SD card formatting: {e}", self.request_id)
                        # Ensure process is terminated
                        try:
                            if process.poll() is None:
                                process.terminate()
                                process.wait(timeout=5)
                        except (subprocess.TimeoutExpired, OSError):
                            try:
                                process.kill()
                            except OSError:
                                pass
                        return
                    finally:
                        # Ensure process is cleaned up
                        if process.poll() is None:
                            try:
                                process.terminate()
                                process.wait(timeout=5)
                            except (subprocess.TimeoutExpired, OSError):
                                try:
                                    process.kill()
                                except OSError:
                                    pass
                    return

                except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as e:
                    error_log(f"Error in streaming format_sdcard: {str(e)}", e, request_id=self.request_id)
                    try:
                        error_data = json.dumps({"success": False, "error": str(e)})
                        self.wfile.write(f"data: {error_data}\n\n".encode())
                        self.wfile.flush()
                    except (BrokenPipeError, ConnectionAbortedError, OSError):
                        # Client already disconnected
                        pass
                    return

            # Non-streaming mode (original behavior)
            # Note: Formatting requires admin/root privileges
            # The script will handle platform-specific formatting
            # Check for shutdown before starting
            if shutdown_event.is_set():
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            result = run_subprocess_safe(
                [sys.executable, script_path, device_id],
                timeout=180,  # Formatting can take longer
                cwd=os.path.dirname(os.path.dirname(__file__)),  # Run from project root
                check_shutdown=True
            )

            if result is None:
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            if result.returncode == 0:
                try:
                    # Try to parse JSON from stdout
                    if result.stdout.strip():
                        # Parse last JSON line (final result)
                        lines = result.stdout.strip().split('\n')
                        for line in reversed(lines):
                            if line.strip() and ("{" in line and "}" in line):
                                try:
                                    data = json.loads(line)
                                    if data.get("type") != "progress":  # Skip progress messages
                                        self.send_json(data)
                                        return
                                except (json.JSONDecodeError, ValueError):
                                    pass
                        # If no final result found, use default success
                        msg = (
                            f"SD card {device_id} formatted successfully "
                            f"for Raspberry Pi {pi_model}"
                        )
                        self.send_json({"success": True, "message": msg})
                    else:
                        msg = (
                            f"SD card {device_id} formatted successfully "
                            f"for Raspberry Pi {pi_model}"
                        )
                        self.send_json({"success": True, "message": msg})
                except json.JSONDecodeError:
                    # If stdout is not JSON, check stderr for errors
                    error_msg = result.stderr or "Invalid response from script"
                    self.send_json({"success": False, "error": error_msg}, 500)
            else:
                # Script returned error code
                try:
                    # Try to parse error JSON from stdout
                    if result.stdout.strip():
                        lines = result.stdout.strip().split('\n')
                        for line in reversed(lines):
                            if line.strip() and ("{" in line and "}" in line):
                                try:
                                    data = json.loads(line)
                                    if data.get("type") != "progress":
                                        self.send_json(data)
                                        return
                                except (json.JSONDecodeError, ValueError):
                                    pass
                    self.send_json(
                        {
                            "success": False,
                            "error": result.stderr or "Failed to format SD card",
                        },
                        500,
                    )
                except json.JSONDecodeError:
                    self.send_json(
                        {
                            "success": False,
                            "error": result.stderr or "Failed to format SD card",
                        },
                        500,
                    )
        except subprocess.TimeoutExpired:
            error_log("SD card formatting operation timed out", request_id=self.request_id)
            self.send_json({"success": False, "error": "Formatting operation timed out"}, 500)
        except json.JSONDecodeError as e:
            error_log(f"Invalid JSON in format_sdcard request: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
        except (OSError, subprocess.SubprocessError, ValueError) as e:
            error_log(f"Error formatting SD card: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def install_os(self):
        """Install OS to SD card"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_json({"success": False, "error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode())
            except json.JSONDecodeError as e:
                self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
                return

            if not isinstance(data, dict):
                self.send_json({"success": False, "error": "Data must be a JSON object"}, 400)
                return

            device_id = data.get("device_id")

            if not device_id:
                self.send_json({"success": False, "error": "Device ID required"}, 400)
                return

            # Note: OS installation requires admin/root privileges and direct disk access
            # This is a placeholder - actual implementation would use dd (Linux) or similar tools
            msg = (
                f"OS installation initiated for {device_id}. "
                f"Note: This requires admin privileges and should be done via "
                f"desktop app (RaspberryPiManager) or command line tools like "
                f"Raspberry Pi Imager."
            )
            self.send_json({"success": True, "message": msg})
        except json.JSONDecodeError as e:
            error_log(f"Invalid JSON in install_os request: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
        except (OSError, ValueError) as e:
            error_log(f"Error in install_os: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def configure_pi(self):
        """Configure Pi settings"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self.send_json({"success": False, "error": "No data provided"}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            pi_number = data.get("pi_number")
            settings = data.get("settings")

            # Validate pi_number
            if not pi_number:
                self.send_json({"success": False, "error": "Pi number required"}, 400)
                return

            try:
                pi_number = int(pi_number)
                if pi_number not in [1, 2]:
                    self.send_json(
                        {"success": False, "error": "Invalid pi number. Must be 1 or 2"}, 400
                    )
                    return
            except (ValueError, TypeError):
                self.send_json({"success": False, "error": "Invalid pi number format"}, 400)
                return

            if not settings:
                self.send_json({"success": False, "error": "Settings required"}, 400)
                return

            # Validate settings is a dictionary
            if not isinstance(settings, dict):
                self.send_json({"success": False, "error": "Settings must be a dictionary"}, 400)
                return

            script_path = os.path.join(os.path.dirname(__file__), "scripts", "configure_pi.py")
            if not os.path.exists(script_path):
                self.send_json({"success": False, "error": "configure_pi.py not found"}, 404)
                return

            # Write settings to temporary file instead of command-line argument
            # This prevents command injection
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False, encoding='utf-8'
            ) as tmp_file:
                json.dump(settings, tmp_file)
                tmp_file_path = tmp_file.name

            # Check for shutdown before starting
            if shutdown_event.is_set():
                try:
                    os.unlink(tmp_file_path)
                except OSError:
                    pass
                self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                return

            try:
                result = run_subprocess_safe(
                    [sys.executable, script_path, str(pi_number), "--settings-file", tmp_file_path],
                    timeout=CONFIG_TIMEOUT,
                    check_shutdown=True
                )

                if result is None:
                    try:
                        os.unlink(tmp_file_path)
                    except OSError:
                        pass
                    self.send_json({"success": False, "error": "Server is shutting down"}, 503)
                    return
            finally:
                # Clean up temporary file
                try:
                    os.unlink(tmp_file_path)
                except OSError:
                    pass

            if result.returncode == 0:
                try:
                    response_data = json.loads(result.stdout)
                    self.send_json(response_data)
                except json.JSONDecodeError:
                    # If stdout is not valid JSON, treat as success with message
                    error_log(f"Invalid JSON response from configure_pi script: {result.stdout}", request_id=self.request_id)
                    self.send_json({
                        "success": True,
                        "message": result.stdout or "Configuration completed"
                    })
            else:
                error_msg = result.stderr or "Configuration failed"
                error_log(f"Pi configuration failed: {error_msg}", request_id=self.request_id)
                self.send_json({"success": False, "error": error_msg}, 500)
        except subprocess.TimeoutExpired:
            error_log("Pi configuration timed out", request_id=self.request_id)
            self.send_json({"success": False, "error": "Configuration timed out"}, 500)
        except json.JSONDecodeError as e:
            error_log(f"Invalid JSON in configure_pi request: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": f"Invalid JSON: {str(e)}"}, 400)
        except (OSError, subprocess.SubprocessError, ValueError) as e:
            error_log(f"Error configuring Pi: {str(e)}", e, request_id=self.request_id)
            self.send_json({"success": False, "error": str(e)}, 500)

    def scan_network(self):
        """Scan network for Raspberry Pi devices"""
        try:
            # Check for shutdown
            if shutdown_event.is_set():
                self.send_json({
                    "success": False,
                    "error": "Server is shutting down",
                    "devices": [],
                    "raspberry_pis": []
                }, 503)
                return

            script_path = os.path.join(
                os.path.dirname(__file__), "..", "scripts", "python", "scan_network.py"
            )
            if not os.path.exists(script_path):
                self.send_json({
                    "success": False,
                    "error": "Network scanning script not found",
                    "devices": [],
                    "raspberry_pis": []
                }, 404)
                return

            # Network scan can take longer, use extended timeout
            result = run_subprocess_safe(
                [sys.executable, script_path],
                timeout=60,  # 60 seconds for network scan
                check_shutdown=True
            )

            if result is None:
                self.send_json({
                    "success": False,
                    "error": "Server is shutting down",
                    "devices": [],
                    "raspberry_pis": []
                }, 503)
                return

            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    self.send_json(data)
                except json.JSONDecodeError:
                    error_log(f"Invalid JSON from network scanner: {result.stdout[:200]}", request_id=self.request_id)
                    self.send_json({
                        "success": False,
                        "error": "Invalid response from network scanner",
                        "devices": [],
                        "raspberry_pis": []
                    }, 500)
            else:
                error_log(f"Network scan failed: {result.stderr}", request_id=self.request_id)
                self.send_json({
                    "success": False,
                    "error": result.stderr or "Network scan failed",
                    "devices": [],
                    "raspberry_pis": []
                }, 500)
        except subprocess.TimeoutExpired:
            error_msg = "Network scan timed out after 60 seconds"
            # Log as warning since timeouts can be expected on slow networks
            warning_log(f"{error_msg} - This may be normal on large or slow networks", request_id=self.request_id)
            self.send_json({
                "success": False,
                "error": error_msg,
                "devices": [],
                "raspberry_pis": [],
                "note": "Scan may have found some devices before timing out. Try again or check network connectivity."
            }, 500)
        except (OSError, subprocess.SubprocessError) as e:
            error_log(f"Error scanning network: {str(e)}", e, request_id=self.request_id)
            self.send_json({
                "success": False,
                "error": str(e),
                "devices": [],
                "raspberry_pis": []
            }, 500)

    def scan_wifi_networks(self):
        """Scan for available WiFi networks"""
        try:
            # Check for shutdown
            if shutdown_event.is_set():
                self.send_json({
                    "success": False,
                    "error": "Server is shutting down",
                    "networks": []
                }, 503)
                return

            script_path = os.path.join(
                os.path.dirname(__file__), "scripts", "scan_wifi_networks.py"
            )
            if not os.path.exists(script_path):
                self.send_json({
                    "success": False,
                    "error": "WiFi scanning script not found",
                    "networks": []
                }, 404)
                return

            result = run_subprocess_safe(
                [sys.executable, script_path],
                timeout=SUBPROCESS_TIMEOUT,
                check_shutdown=True
            )

            if result is None:
                self.send_json({
                    "success": False,
                    "error": "Server is shutting down",
                    "networks": []
                }, 503)
                return

            if result.returncode == 0:
                try:
                    data = json.loads(result.stdout)
                    self.send_json(data)
                except json.JSONDecodeError:
                    self.send_json({
                        "success": False,
                        "error": "Invalid response from scanner",
                        "networks": []
                    }, 500)
            else:
                self.send_json({
                    "success": False,
                    "error": result.stderr or "Scan failed",
                    "networks": []
                }, 500)
        except subprocess.TimeoutExpired:
            error_msg = f"WiFi scan timed out after {SUBPROCESS_TIMEOUT} seconds"
            error_log(error_msg, request_id=self.request_id)
            self.send_json({
                "success": False,
                "error": error_msg,
                "networks": []
            }, 500)
        except (OSError, subprocess.SubprocessError) as e:
            error_log(f"Error scanning WiFi networks: {str(e)}", e, request_id=self.request_id)
            self.send_json({
                "success": False,
                "error": str(e),
                "networks": []
            }, 500)

    def log_message(self, format_str, *args):
        # Verbose logging for debugging
        if VERBOSE:
            timestamp = __import__('datetime').datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            message = format_str % args
            print(f"[HTTP {timestamp}] {message}")


def _get_config_path() -> str:
    """Get the path to pi-config.json in project root"""
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "pi-config.json")

def validate_configuration():
    """Validate that required configuration files exist"""
    config_path = _get_config_path()
    if not os.path.exists(config_path):
        warning_log(f"Configuration file not found at {config_path}")
        warning_log("Some features may not work correctly.")
        warning_log("Please create pi-config.json in the project root.")
        return False

    try:
        with open(config_path, "r", encoding='utf-8') as f:
            config = json.load(f)
            if "raspberry_pis" not in config:
                warning_log("pi-config.json missing 'raspberry_pis' key")
                return False
            if not config["raspberry_pis"]:
                warning_log("No Raspberry Pi devices configured")
                return False
        return True
    except (OSError, IOError, json.JSONDecodeError) as e:
        error_log(f"Error reading configuration: {str(e)}", e)
        return False


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global _shutdown_in_progress, _server_instance

    # Use lock to prevent race conditions
    with _shutdown_lock:
        # Prevent multiple signal handler calls
        if _shutdown_in_progress:
            return

        _shutdown_in_progress = True

    info_log(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()

    # Shut down the server if it exists
    # This will interrupt serve_forever()
    if _server_instance is not None:
        try:
            # Stop accepting new connections
            _server_instance.shutdown()
            info_log("Server stopped accepting new connections")
        except (AttributeError, RuntimeError, OSError) as e:
            # Server might already be shutting down or not fully initialized
            if VERBOSE:
                debug_log(f"Error shutting down server: {e}")

    # Wait for active requests to complete (with timeout)
    start_wait = time.time()
    while True:
        with _active_requests_lock:
            active_count = len(_active_requests)

        if active_count == 0:
            info_log("All active requests completed")
            break

        elapsed = time.time() - start_wait
        if elapsed >= _shutdown_timeout:
            warning_log(f"Shutdown timeout reached. {active_count} request(s) still active")
            break

        if VERBOSE:
            debug_log(f"Waiting for {active_count} active request(s) to complete... ({elapsed:.1f}s)")

        time.sleep(0.5)  # Check every 500ms

    # Clean up resources (kill subprocesses, etc.)
    cleanup_resources()

def cleanup_resources():
    """Clean up resources on shutdown"""
    try:
        # Kill all active subprocesses
        with _active_subprocesses_lock:
            for proc in list(_active_subprocesses):
                try:
                    if proc.poll() is None:  # Process is still running
                        proc.kill()
                        proc.wait(timeout=2)
                except (OSError, subprocess.TimeoutExpired):
                    pass
            _active_subprocesses.clear()
        if VERBOSE:
            debug_log("Active subprocesses terminated")
    except Exception as e:
        if VERBOSE:
            debug_log(f"Error cleaning up subprocesses: {e}")

    try:
        # Clear rate limit store
        with _rate_limit_lock:
            _rate_limit_store.clear()
        if VERBOSE:
            debug_log("Rate limit store cleared")
    except Exception as e:
        if VERBOSE:
            debug_log(f"Error cleaning up rate limit store: {e}")


def run_subprocess_safe(cmd_args, timeout=None, cwd=None, check_shutdown=True):
    """
    Run subprocess with graceful shutdown support.
    Returns subprocess.CompletedProcess or None if shutdown requested.
    """
    if check_shutdown and shutdown_event.is_set():
        return None

    process = None
    try:
        # Use Popen instead of run to have better control over the process
        process = subprocess.Popen(
            cmd_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=cwd,
        )

        # Track the process
        with _active_subprocesses_lock:
            _active_subprocesses.add(process)

        try:
            # Wait for process with timeout
            stdout, stderr = process.communicate(timeout=timeout)

            # Create a CompletedProcess-like result
            result = subprocess.CompletedProcess(
                cmd_args,
                process.returncode,
                stdout=stdout,
                stderr=stderr
            )
            return result
        except subprocess.TimeoutExpired:
            # Kill the process if it times out
            try:
                process.kill()
                process.wait(timeout=5)
            except (OSError, subprocess.TimeoutExpired):
                pass
            raise
    except KeyboardInterrupt:
        # Kill process on KeyboardInterrupt
        if process:
            try:
                process.kill()
                process.wait(timeout=2)
            except (OSError, subprocess.TimeoutExpired):
                pass
        # Re-raise KeyboardInterrupt to allow proper shutdown
        raise
    except Exception as e:
        # Log and re-raise other exceptions
        error_log(f"Subprocess error: {str(e)}", e)
        raise
    finally:
        # Remove from tracking
        if process:
            with _active_subprocesses_lock:
                _active_subprocesses.discard(process)


def run_server():
    global server_start_time, _server_instance
    server_start_time = time.time()
    startup_begin = time.time()

    # Register signal handlers for graceful shutdown
    if hasattr(signal, 'SIGTERM'):
        signal.signal(signal.SIGTERM, signal_handler)
    if hasattr(signal, 'SIGINT'):
        signal.signal(signal.SIGINT, signal_handler)

    # Validate configuration before starting
    print("Validating configuration...")
    config_start = time.time()
    config_valid = validate_configuration()
    config_time = (time.time() - config_start) * 1000
    if not config_valid:
        warning_log("Configuration validation failed. Server will start but some features may not work.")
        print()

    if VERBOSE:
        print("=" * 60)
        print("VERBOSE MODE ENABLED - Debugging messages will be shown")
        print("=" * 60)
        debug_log(f"Server starting on host: {os.environ.get('HOST', '0.0.0.0')}, port: {PORT}")
        debug_log(f"Public directory: {os.path.join(os.path.dirname(__file__), 'public')}")
        debug_log(f"Scripts directory: {os.path.join(os.path.dirname(__file__), 'scripts')}")
        debug_log(f"Rate limiting: {'enabled' if ENABLE_RATE_LIMITING else 'disabled'}")
        debug_log(f"Compression: {'enabled' if ENABLE_COMPRESSION else 'disabled'}")

    # Bind to all interfaces (0.0.0.0) to allow network access
    host = os.environ.get("HOST", "0.0.0.0")

    # Create server with allow_reuse_address for faster restarts
    # Use ThreadingTCPServer to handle concurrent requests
    # This is important when multiple clients (wait script, Nuxt, browser) connect simultaneously
    class ReusableThreadingTCPServer(socketserver.ThreadingTCPServer):
        allow_reuse_address = True
        # Set daemon threads so they don't prevent server shutdown
        daemon_threads = True

    socket_start = time.time()
    with ReusableThreadingTCPServer((host, PORT), PiManagementHandler) as httpd:
        socket_time = (time.time() - socket_start) * 1000
        # Store server instance for signal handler
        _server_instance = httpd

        print(f"\n{'='*60}")
        print(f"Server running on ALL network interfaces (0.0.0.0:{PORT})")
        print(f"{'='*60}")
        print(f"\nLocal access:")
        print(f"  http://localhost:{PORT}/")
        print(f"  http://127.0.0.1:{PORT}/")
        print(f"\nAPI endpoints:")
        print(f"  http://localhost:{PORT}/api/health - Health check")
        print(f"  http://localhost:{PORT}/api/metrics - Server metrics")
        print(f"\nNetwork access (accessible from other devices):")
        if VERBOSE:
            debug_log(f"Server socket created and listening on {host}:{PORT}")
        print("Press Ctrl+C to stop the server\n")

        # Get network IP addresses
        try:
            # Get all network IPs (excluding localhost and APIPA)
            hostname = socket.gethostname()
            all_ips = socket.gethostbyname_ex(hostname)[2]
            network_ips = [
                ip for ip in all_ips
                if not ip.startswith('127.') and not ip.startswith('169.254.')
            ]

            if network_ips:
                print("\nNetwork IP addresses:")
                for ip in network_ips:
                    print(f"  http://{ip}:{PORT}/")
            else:
                # Fallback to first non-localhost IP
                local_ip = socket.gethostbyname(hostname)
                if not local_ip.startswith('127.'):
                    print(f"\nNetwork IP: http://{local_ip}:{PORT}/")
        except (OSError, socket.error):
            print("\nNote: Could not detect network IPs automatically")
            print(f"Server is accessible on all network interfaces on port {PORT}")

        # Flush output to ensure messages are visible before blocking serve_forever
        import sys
        sys.stdout.flush()
        sys.stderr.flush()

        # Start serve_forever in a background thread so we can print "ready" after it starts
        # The socket is already bound and listening, but serve_forever() needs to start processing
        def start_server():
            """Start the server in background thread"""
            httpd.serve_forever(poll_interval=0.5)

        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()

        # Give serve_forever() a moment to start processing connections
        # This is critical - the server must be processing before we say it's ready
        time.sleep(0.5)

        # Calculate total startup time
        total_startup_time = (time.time() - startup_begin) * 1000
        if VERBOSE:
            debug_log(f"Startup timing: config={config_time:.1f}ms, socket={socket_time:.1f}ms, total={total_startup_time:.1f}ms")
        else:
            # Show startup time - server is now actually processing connections
            print(f"\n[Startup completed in {total_startup_time:.0f}ms]")

        try:
            # Keep the main thread alive while server runs in background thread
            # This allows the server to respond to shutdown signals
            while not shutdown_event.is_set():
                time.sleep(0.5)
        except KeyboardInterrupt:
            # KeyboardInterrupt is raised when Ctrl+C is pressed
            # Check if we haven't already initiated shutdown via signal handler
            with _shutdown_lock:
                if not _shutdown_in_progress:
                    info_log("\nShutting down server...")
                    shutdown_event.set()
                    _shutdown_in_progress = True
                    # Trigger shutdown similar to signal handler
                    try:
                        httpd.shutdown()
                    except (AttributeError, RuntimeError, OSError):
                        pass
        except Exception as e:
            error_log(f"Fatal server error: {str(e)}", e, include_traceback=True)
            shutdown_event.set()
            raise
        finally:
            # Wait for any remaining active requests
            if shutdown_event.is_set():
                start_wait = time.time()
                while True:
                    with _active_requests_lock:
                        active_count = len(_active_requests)

                    if active_count == 0:
                        break

                    elapsed = time.time() - start_wait
                    if elapsed >= _shutdown_timeout:
                        warning_log(f"Shutdown timeout reached. {active_count} request(s) still active")
                        break

                    if VERBOSE:
                        debug_log(f"Waiting for {active_count} active request(s) to complete... ({elapsed:.1f}s)")

                    time.sleep(0.5)

            # Clean up resources
            cleanup_resources()

            # Clean up global state
            with _shutdown_lock:
                _server_instance = None
                _shutdown_in_progress = False
            info_log("Server shutdown complete.")


if __name__ == "__main__":
    run_server()
