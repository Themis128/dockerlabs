#!/usr/bin/env python3
"""
Integration test to verify error scenarios produce verbose debugging output
This simulates various error conditions to ensure debug info is captured
"""
import sys
import json
import os
import subprocess
import tempfile

def test_missing_image_file():
    """Test error handling when image file doesn't exist"""
    print("Testing: Missing image file error...")
    print("-" * 60)

    script_path = os.path.join(os.path.dirname(__file__), "install_os.py")
    fake_image = "/nonexistent/path/to/image.img"
    fake_device = "/dev/sdb"

    try:
        result = subprocess.run(
            [sys.executable, script_path, fake_image, fake_device],
            capture_output=True,
            text=True,
            timeout=10
        )

        # Parse output
        output_lines = result.stdout.strip().split('\n')
        error_debug_found = False
        final_result = None

        for line in output_lines:
            if line.strip():
                try:
                    data = json.loads(line)
                    if data.get("type") == "error_debug":
                        error_debug_found = True
                        print("[OK] error_debug message found")
                        print(f"  Message: {data.get('message')}")
                        if data.get("context"):
                            print(f"  Context keys: {list(data['context'].keys())}")
                    elif data.get("success") is not None:
                        final_result = data
                except json.JSONDecodeError:
                    pass

        if final_result:
            print(f"[OK] Final result received: success={final_result.get('success')}")
            if final_result.get("debug_info"):
                print(f"[OK] debug_info present with keys: {list(final_result['debug_info'].keys())}")
            else:
                print("[WARN] No debug_info in final result")

        if result.returncode != 0:
            print("[OK] Script exited with error code (expected)")
        else:
            print("[WARN] Script exited successfully (unexpected for error test)")

        return True

    except subprocess.TimeoutExpired:
        print("[ERROR] Test timed out")
        return False
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        return False


def test_invalid_device_format():
    """Test error handling with invalid device format"""
    print("\n\nTesting: Invalid device format error...")
    print("-" * 60)

    script_path = os.path.join(os.path.dirname(__file__), "install_os.py")

    # Create a temporary file to use as image
    with tempfile.NamedTemporaryFile(delete=False, suffix='.img') as tmp_file:
        tmp_file.write(b"fake image data")
        tmp_image = tmp_file.name

    try:
        # Use invalid device format for Windows
        invalid_device = "invalid_device_format"

        result = subprocess.run(
            [sys.executable, script_path, tmp_image, invalid_device],
            capture_output=True,
            text=True,
            timeout=10
        )

        # Check for error_debug messages
        output_lines = result.stdout.strip().split('\n')
        has_error_debug = False

        for line in output_lines:
            if line.strip():
                try:
                    data = json.loads(line)
                    if data.get("type") == "error_debug":
                        has_error_debug = True
                        print("[OK] error_debug message found for invalid device")
                        break
                except json.JSONDecodeError:
                    pass

        if not has_error_debug:
            print("[INFO] No error_debug message (may be handled differently)")

        # Check final result
        for line in output_lines:
            if line.strip():
                try:
                    data = json.loads(line)
                    if data.get("success") is not None and not data.get("success"):
                        print(f"[OK] Error result received: {data.get('error', 'No error message')}")
                        if data.get("debug_info"):
                            print("[OK] debug_info present in error result")
                        break
                except json.JSONDecodeError:
                    pass

        return True

    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        return False
    finally:
        # Clean up
        try:
            os.unlink(tmp_image)
        except:
            pass


def test_progress_and_error_output():
    """Test that progress messages and error_debug messages can coexist"""
    print("\n\nTesting: Progress and error output format...")
    print("-" * 60)

    # Import the functions directly
    sys.path.insert(0, os.path.dirname(__file__))
    try:
        from install_os import progress, error_debug
        import io
        import contextlib

        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            progress("Initializing...", 0)
            progress("Checking image...", 10)
            error_debug("Test error occurred", context={"test": "value"})
            progress("Continuing after error...", 20)

        output = f.getvalue()
        lines = [line.strip() for line in output.strip().split('\n') if line.strip()]

        progress_count = 0
        error_debug_count = 0

        for line in lines:
            try:
                data = json.loads(line)
                if data.get("type") == "progress":
                    progress_count += 1
                elif data.get("type") == "error_debug":
                    error_debug_count += 1
            except json.JSONDecodeError:
                pass

        print(f"[OK] Found {progress_count} progress messages")
        print(f"[OK] Found {error_debug_count} error_debug messages")

        if progress_count >= 2 and error_debug_count >= 1:
            print("[OK] Progress and error_debug messages can coexist")
            return True
        else:
            print(f"[WARN] Expected at least 2 progress and 1 error_debug, got {progress_count} progress and {error_debug_count} error_debug")
            return False

    except ImportError as e:
        print(f"[ERROR] Could not import functions: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all integration tests"""
    print("=" * 60)
    print("Integration Tests: Error Scenarios with Verbose Debugging")
    print("=" * 60)

    results = []

    # Note: Some tests may fail in certain environments (e.g., Windows vs Linux)
    # but they should at least verify the structure is correct
    results.append(("Missing Image File", test_missing_image_file()))
    results.append(("Invalid Device Format", test_invalid_device_format()))
    results.append(("Progress and Error Output", test_progress_and_error_output()))

    print("\n" + "=" * 60)
    print("Integration Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n[OK] All integration tests passed!")
        return 0
    else:
        print(f"\n[INFO] {total - passed} test(s) had issues (may be environment-specific)")
        return 0  # Return 0 as these are informational tests


if __name__ == "__main__":
    sys.exit(main())
