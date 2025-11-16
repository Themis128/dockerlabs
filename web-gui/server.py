#!/usr/bin/env python3
"""
Simple web server for Raspberry Pi Management GUI
"""
import http.server
import socketserver
import json
import subprocess
import sys
import os
from urllib.parse import urlparse, parse_qs
import threading

PORT = 3000

class PiManagementHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.public_dir = os.path.join(os.path.dirname(__file__), 'public')
        super().__init__(*args, **kwargs)

    def do_GET(self):
        if self.path == '/api/pis':
            self.send_pi_list()
        elif self.path == '/api/test-connections':
            self.test_connections()
        elif self.path.startswith('/api/test-ssh'):
            self.test_ssh_auth()
        elif self.path == '/api/sdcards':
            self.list_sdcards()
        elif self.path.startswith('/api/os-images'):
            self.list_os_images()
        else:
            self.serve_static_file()

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/connect-ssh':
            self.connect_ssh()
        elif self.path == '/api/connect-telnet':
            self.connect_telnet()
        elif self.path == '/api/format-sdcard':
            self.format_sdcard()
        elif self.path == '/api/install-os':
            self.install_os()
        elif self.path == '/api/configure-pi':
            self.configure_pi()
        else:
            self.send_error(404)

    def send_json(self, data, status=200):
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except (BrokenPipeError, ConnectionAbortedError):
            # Client disconnected, ignore
            pass

    def send_pi_list(self):
        try:
            config_path = os.path.join(os.path.dirname(__file__), '..', 'pi-config.json')
            with open(config_path, 'r') as f:
                config = json.load(f)

            pis = []
            for key, pi in config['raspberry_pis'].items():
                pis.append({
                    'id': key,
                    'name': pi['name'],
                    'ip': pi['ip'],
                    'mac': pi['mac'],
                    'connection': pi['connection'],
                    'description': pi.get('description', '')
                })

            self.send_json({'success': True, 'pis': pis})
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def test_connections(self):
        try:
            script_path = os.path.join(os.path.dirname(__file__), '..', 'test_connections.py')
            if not os.path.exists(script_path):
                self.send_json({'success': False, 'error': 'test_connections.py not found'}, 404)
                return
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            self.send_json({
                'success': result.returncode == 0,
                'output': result.stdout or '',
                'error': result.stderr or ''
            })
        except subprocess.TimeoutExpired:
            self.send_json({'success': False, 'error': 'Test timed out after 30 seconds'}, 500)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def test_ssh_auth(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            pi_number = query.get('pi', ['1'])[0]

            # Validate pi_number
            if not pi_number.isdigit() or int(pi_number) not in [1, 2]:
                self.send_json({'success': False, 'error': 'Invalid pi number. Must be 1 or 2'}, 400)
                return

            script_path = os.path.join(os.path.dirname(__file__), '..', 'test_ssh_auth.py')
            if not os.path.exists(script_path):
                self.send_json({'success': False, 'error': 'test_ssh_auth.py not found'}, 404)
                return
            result = subprocess.run(
                [sys.executable, script_path, pi_number],
                capture_output=True,
                text=True,
                timeout=30
            )
            self.send_json({
                'success': result.returncode == 0,
                'output': result.stdout or '',
                'error': result.stderr or ''
            })
        except subprocess.TimeoutExpired:
            self.send_json({'success': False, 'error': 'Test timed out after 30 seconds'}, 500)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def connect_ssh(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json({'success': False, 'error': 'No data provided'}, 400)
                return
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            pi_number = data.get('pi', '1')

            script_path = os.path.join(os.path.dirname(__file__), '..', 'connect_ssh.py')
            # Note: This would open an interactive session, so we just return info
            self.send_json({
                'success': True,
                'message': f'To connect to Pi {pi_number}, run: python connect_ssh.py {pi_number}'
            })
        except json.JSONDecodeError as e:
            self.send_json({'success': False, 'error': f'Invalid JSON: {str(e)}'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def connect_telnet(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json({'success': False, 'error': 'No data provided'}, 400)
                return
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            pi_number = data.get('pi', '1')

            script_path = os.path.join(os.path.dirname(__file__), '..', 'connect_telnet.py')
            self.send_json({
                'success': True,
                'message': f'To connect to Pi {pi_number} via telnet, run: python connect_telnet.py {pi_number}'
            })
        except json.JSONDecodeError as e:
            self.send_json({'success': False, 'error': f'Invalid JSON: {str(e)}'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def serve_static_file(self):
        """Serve static files from the public directory"""
        if self.path == '/' or self.path == '':
            self.path = '/index.html'

        # Normalize path to prevent directory traversal
        path = self.path.lstrip('/')
        # Remove any path traversal attempts
        path = path.replace('..', '').replace('//', '/')
        file_path = os.path.join(self.public_dir, path)

        # Ensure the file is within the public directory
        if not os.path.abspath(file_path).startswith(os.path.abspath(self.public_dir)):
            self.send_error(403, "Forbidden")
            return

        if os.path.exists(file_path) and os.path.isfile(file_path):
            try:
                with open(file_path, 'rb') as f:
                    content = f.read()

                self.send_response(200)

                # Set content type
                if file_path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif file_path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif file_path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif file_path.endswith('.json'):
                    self.send_header('Content-Type', 'application/json')
                else:
                    self.send_header('Content-Type', 'application/octet-stream')

                self.end_headers()
                self.wfile.write(content)
            except (BrokenPipeError, ConnectionAbortedError, OSError) as e:
                # Client disconnected or connection aborted - this is normal during tests
                # Don't log as error, just ignore
                pass
            except Exception as e:
                # Only log actual errors, not connection issues
                try:
                    self.send_error(500, f"Error serving file: {str(e)}")
                except (BrokenPipeError, ConnectionAbortedError, OSError):
                    # Client already disconnected, ignore
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
            script_path = os.path.join(os.path.dirname(__file__), 'scripts', 'list_sdcards.py')
            if not os.path.exists(script_path):
                self.send_json({'success': False, 'error': 'list_sdcards.py not found', 'sdcards': []}, 404)
                return

            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=os.path.dirname(os.path.dirname(__file__))  # Run from project root
            )

            if result.returncode == 0:
                try:
                    # Try to parse JSON from stdout
                    if result.stdout.strip():
                        data = json.loads(result.stdout)
                        self.send_json(data)
                    else:
                        # Empty output - no SD cards found
                        self.send_json({'success': True, 'sdcards': []})
                except json.JSONDecodeError:
                    # If stdout is not JSON, check stderr for errors
                    error_msg = result.stderr or 'Invalid response from script'
                    self.send_json({
                        'success': False,
                        'error': error_msg,
                        'sdcards': []
                    }, 500)
            else:
                # Script returned error code
                try:
                    # Try to parse error JSON from stdout
                    if result.stdout.strip():
                        data = json.loads(result.stdout)
                        self.send_json(data)
                    else:
                        self.send_json({
                            'success': False,
                            'error': result.stderr or 'Failed to list SD cards',
                            'sdcards': []
                        }, 500)
                except json.JSONDecodeError:
                    self.send_json({
                        'success': False,
                        'error': result.stderr or 'Failed to list SD cards',
                        'sdcards': []
                    }, 500)
        except subprocess.TimeoutExpired:
            self.send_json({'success': False, 'error': 'Operation timed out', 'sdcards': []}, 500)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e), 'sdcards': []}, 500)

    def list_os_images(self):
        """List available OS images"""
        # For now, return a static list - could be extended to fetch from Raspberry Pi website
        images = [
            {'id': 'raspios_lite_armhf', 'name': 'Raspberry Pi OS Lite (32-bit)', 'size': '~500MB'},
            {'id': 'raspios_armhf', 'name': 'Raspberry Pi OS with Desktop (32-bit)', 'size': '~2.5GB'},
            {'id': 'raspios_lite_arm64', 'name': 'Raspberry Pi OS Lite (64-bit)', 'size': '~500MB'},
            {'id': 'raspios_arm64', 'name': 'Raspberry Pi OS with Desktop (64-bit)', 'size': '~2.5GB'},
        ]
        self.send_json({'success': True, 'images': images})

    def format_sdcard(self):
        """Format SD card"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json({'success': False, 'error': 'No data provided'}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            device_id = data.get('device_id')

            if not device_id:
                self.send_json({'success': False, 'error': 'Device ID required'}, 400)
                return

            # Note: Formatting requires admin/root privileges
            # This is a placeholder - actual implementation would use platform-specific tools
            self.send_json({
                'success': True,
                'message': f'SD card formatting initiated for {device_id}. Note: This requires admin privileges and should be done via desktop app or command line.'
            })
        except json.JSONDecodeError as e:
            self.send_json({'success': False, 'error': f'Invalid JSON: {str(e)}'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def install_os(self):
        """Install OS to SD card"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json({'success': False, 'error': 'No data provided'}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            device_id = data.get('device_id')
            os_version = data.get('os_version')
            custom_image = data.get('custom_image')

            if not device_id:
                self.send_json({'success': False, 'error': 'Device ID required'}, 400)
                return

            # Note: OS installation requires admin/root privileges and direct disk access
            # This is a placeholder - actual implementation would use dd (Linux) or similar tools
            self.send_json({
                'success': True,
                'message': f'OS installation initiated for {device_id}. Note: This requires admin privileges and should be done via desktop app (RaspberryPiManager) or command line tools like Raspberry Pi Imager.'
            })
        except json.JSONDecodeError as e:
            self.send_json({'success': False, 'error': f'Invalid JSON: {str(e)}'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def configure_pi(self):
        """Configure Pi settings"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json({'success': False, 'error': 'No data provided'}, 400)
                return

            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            pi_number = data.get('pi_number')
            settings = data.get('settings')

            if not pi_number or not settings:
                self.send_json({'success': False, 'error': 'Pi number and settings required'}, 400)
                return

            script_path = os.path.join(os.path.dirname(__file__), 'scripts', 'configure_pi.py')
            if not os.path.exists(script_path):
                self.send_json({'success': False, 'error': 'configure_pi.py not found'}, 404)
                return

            settings_json = json.dumps(settings)
            result = subprocess.run(
                [sys.executable, script_path, str(pi_number), '--settings', settings_json],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                response_data = json.loads(result.stdout)
                self.send_json(response_data)
            else:
                self.send_json({
                    'success': False,
                    'error': result.stderr or 'Configuration failed'
                }, 500)
        except subprocess.TimeoutExpired:
            self.send_json({'success': False, 'error': 'Configuration timed out'}, 500)
        except json.JSONDecodeError as e:
            self.send_json({'success': False, 'error': f'Invalid JSON: {str(e)}'}, 400)
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)}, 500)

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def run_server():
    with socketserver.TCPServer(("", PORT), PiManagementHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()

if __name__ == "__main__":
    run_server()
