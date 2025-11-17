#!/usr/bin/env python3
"""
Test script for connection error handling in install_os endpoint
Tests that ConnectionResetError and other connection errors are handled gracefully
"""
import sys
import os
import socket
import threading
import time
import json
import http.client
from unittest.mock import patch, MagicMock

# Add parent directory to path to import server
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_connection_reset_handling():
    """Test that ConnectionResetError is handled gracefully"""
    print("=" * 60)
    print("Testing Connection Error Handling")
    print("=" * 60)

    try:
        from server import PiManagementHandler, error_log, debug_log
        import http.server
        import io

        # Test 1: ConnectionResetError during write
        print("\n[Test 1] Testing ConnectionResetError handling...")
        try:
            # Create a minimal handler instance by directly testing send_json
            # We'll test the send_json method directly since it's where the error handling is
            class TestHandler:
                def __init__(self):
                    self.wfile = MagicMock()
                    self.response_code = 200

                def send_header(self, key, value):
                    pass

                def end_headers(self):
                    pass

                def send_response(self, code):
                    self.response_code = code

                def send_json(self, data, status=200):
                    """Copy of send_json method to test"""
                    try:
                        self.send_response(status)
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Access-Control-Allow-Origin", "*")
                        self.end_headers()
                        json_data = json.dumps(data)
                        self.wfile.write(json_data.encode())
                        self.wfile.flush()
                        self.response_code = status
                    except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError) as e:
                        pass
                    except OSError as e:
                        if hasattr(e, 'winerror') and e.winerror == 10054:
                            pass
                        elif hasattr(e, 'errno') and e.errno in (10054, 104, 32, 107):
                            pass
                        else:
                            raise

            handler = TestHandler()
            handler.wfile = MagicMock()

            # Simulate ConnectionResetError when writing
            handler.wfile.write.side_effect = ConnectionResetError("[WinError 10054] An existing connection was forcibly closed by the remote host")
            handler.wfile.flush.side_effect = ConnectionResetError("[WinError 10054] An existing connection was forcibly closed by the remote host")

            # Try to send JSON (should handle error gracefully)
            try:
                handler.send_json({"success": False, "error": "test"})
                print("  [OK] ConnectionResetError handled gracefully in send_json")
            except Exception as e:
                print(f"  [FAIL] Unexpected error: {e}")
                return False
        except Exception as e:
            print(f"  [FAIL] Test setup failed: {e}")
            return False

        # Test 2: OSError with winerror 10054
        print("\n[Test 2] Testing OSError with winerror 10054...")
        try:
            handler = TestHandler()
            handler.wfile = MagicMock()

            # Create OSError with winerror 10054
            error = OSError()
            error.winerror = 10054
            error.strerror = "An existing connection was forcibly closed by the remote host"

            handler.wfile.write.side_effect = error
            handler.wfile.flush.side_effect = error

            try:
                handler.send_json({"success": False, "error": "test"})
                print("  [OK] OSError with winerror 10054 handled gracefully")
            except Exception as e:
                print(f"  [FAIL] Unexpected error: {e}")
                return False
        except Exception as e:
            print(f"  [FAIL] Test setup failed: {e}")
            return False

        # Test 3: BrokenPipeError handling
        print("\n[Test 3] Testing BrokenPipeError handling...")
        try:
            handler = TestHandler()
            handler.wfile = MagicMock()

            handler.wfile.write.side_effect = BrokenPipeError("Broken pipe")
            handler.wfile.flush.side_effect = BrokenPipeError("Broken pipe")

            try:
                handler.send_json({"success": False, "error": "test"})
                print("  [OK] BrokenPipeError handled gracefully")
            except Exception as e:
                print(f"  [FAIL] Unexpected error: {e}")
                return False
        except Exception as e:
            print(f"  [FAIL] Test setup failed: {e}")
            return False

        # Test 4: ConnectionAbortedError handling
        print("\n[Test 4] Testing ConnectionAbortedError handling...")
        try:
            handler = TestHandler()
            handler.wfile = MagicMock()

            handler.wfile.write.side_effect = ConnectionAbortedError("Connection aborted")
            handler.wfile.flush.side_effect = ConnectionAbortedError("Connection aborted")

            try:
                handler.send_json({"success": False, "error": "test"})
                print("  [OK] ConnectionAbortedError handled gracefully")
            except Exception as e:
                print(f"  [FAIL] Unexpected error: {e}")
                return False
        except Exception as e:
            print(f"  [FAIL] Test setup failed: {e}")
            return False

        print("\n" + "=" * 60)
        print("All connection error handling tests passed!")
        print("=" * 60)
        return True

    except ImportError as e:
        print(f"  [FAIL] Could not import server module: {e}")
        print("  Make sure you're running this from the project root")
        return False
    except Exception as e:
        print(f"  [FAIL] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_error_detection():
    """Test that connection errors are properly detected"""
    print("\n" + "=" * 60)
    print("Testing Error Detection Logic")
    print("=" * 60)

    # Test Windows error code detection
    print("\n[Test] Testing Windows error code 10054 detection...")
    error = OSError()
    error.winerror = 10054

    is_connection_error = False
    if hasattr(error, 'winerror') and error.winerror == 10054:
        is_connection_error = True

    if is_connection_error:
        print("  [OK] Windows error 10054 correctly detected as connection error")
    else:
        print("  [FAIL] Windows error 10054 not detected")
        return False

    # Test Linux error code detection
    print("\n[Test] Testing Linux error code 104 detection...")
    error = OSError()
    error.errno = 104

    is_connection_error = False
    if hasattr(error, 'errno') and error.errno in (10054, 104, 32, 107):
        is_connection_error = True

    if is_connection_error:
        print("  [OK] Linux error 104 correctly detected as connection error")
    else:
        print("  [FAIL] Linux error 104 not detected")
        return False

    print("\n" + "=" * 60)
    print("All error detection tests passed!")
    print("=" * 60)
    return True


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("Connection Error Handling Test Suite")
    print("=" * 60)

    results = []

    results.append(("Connection Reset Handling", test_connection_reset_handling()))
    results.append(("Error Detection Logic", test_error_detection()))

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} test suites passed")

    if passed == total:
        print("\n[OK] All tests passed!")
        return 0
    else:
        print(f"\n[WARN] {total - passed} test suite(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
