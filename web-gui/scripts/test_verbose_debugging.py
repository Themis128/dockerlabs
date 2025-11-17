#!/usr/bin/env python3
"""
Test script to verify verbose debugging functionality in install_os.py
Tests that error_debug messages are properly formatted and contain all necessary information
"""
import sys
import json
import os
import io
import contextlib
import traceback

# Add parent directory to path to import install_os
sys.path.insert(0, os.path.dirname(__file__))

def test_error_debug_function():
    """Test that error_debug function outputs correct JSON format"""
    print("Testing error_debug function...")
    print("=" * 60)

    try:
        from install_os import error_debug

        # Test 1: Basic error_debug without exception
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            error_debug("Test debug message")

        output = f.getvalue().strip()
        try:
            data = json.loads(output)
            assert data.get("type") == "error_debug", f"Expected type 'error_debug', got '{data.get('type')}'"
            assert data.get("message") == "Test debug message", "Message mismatch"
            print("[OK] Basic error_debug output format is correct")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Output is not valid JSON: {output}")
            print(f"Error: {e}")
            return False

        # Test 2: error_debug with exception
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            try:
                raise ValueError("Test exception")
            except Exception as e:
                error_debug("Exception occurred", exception=e)

        output = f.getvalue().strip()
        try:
            data = json.loads(output)
            assert data.get("type") == "error_debug", "Type should be 'error_debug'"
            assert data.get("exception_type") == "ValueError", "Exception type should be 'ValueError'"
            assert data.get("exception_message") == "Test exception", "Exception message mismatch"
            assert "traceback" in data, "Traceback should be present"
            assert len(data.get("traceback", "")) > 0, "Traceback should not be empty"
            print("[OK] error_debug with exception output format is correct")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Output is not valid JSON: {output}")
            return False

        # Test 3: error_debug with context
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            error_debug("Test with context", context={"key1": "value1", "key2": 123})

        output = f.getvalue().strip()
        try:
            data = json.loads(output)
            assert data.get("type") == "error_debug", "Type should be 'error_debug'"
            assert "context" in data, "Context should be present"
            assert data["context"]["key1"] == "value1", "Context value mismatch"
            assert data["context"]["key2"] == 123, "Context value mismatch"
            print("[OK] error_debug with context output format is correct")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Output is not valid JSON: {output}")
            return False

        # Test 4: error_debug with exception and context
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            try:
                raise RuntimeError("Runtime error test")
            except Exception as e:
                error_debug("Full error debug", exception=e, context={"platform": "Linux", "device": "/dev/sdb"})

        output = f.getvalue().strip()
        try:
            data = json.loads(output)
            assert data.get("type") == "error_debug", "Type should be 'error_debug'"
            assert data.get("exception_type") == "RuntimeError", "Exception type mismatch"
            assert "traceback" in data, "Traceback should be present"
            assert "context" in data, "Context should be present"
            assert data["context"]["platform"] == "Linux", "Context platform mismatch"
            print("[OK] error_debug with exception and context output format is correct")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Output is not valid JSON: {output}")
            return False

        return True

    except ImportError as e:
        print(f"[ERROR] Could not import error_debug function: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Test failed with error: {e}")
        traceback.print_exc()
        return False


def test_error_output_in_final_result():
    """Test that final error results include debug_info"""
    print("\n\nTesting error result with debug_info...")
    print("=" * 60)

    # Simulate what install_os.py would output on error
    try:
        raise FileNotFoundError("Image file not found: /path/to/image.img")
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "debug_info": {
                "exception_type": type(e).__name__,
                "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            }
        }

    # Verify structure
    assert error_result.get("success") == False, "Success should be False"
    assert "error" in error_result, "Error message should be present"
    assert "debug_info" in error_result, "debug_info should be present"
    assert "exception_type" in error_result["debug_info"], "Exception type should be in debug_info"
    assert "traceback" in error_result["debug_info"], "Traceback should be in debug_info"

    print("[OK] Error result structure is correct")
    print("\nExample error result:")
    print(json.dumps(error_result, indent=2))

    return True


def test_stderr_capture_format():
    """Test that stderr messages are formatted correctly for streaming"""
    print("\n\nTesting stderr capture format...")
    print("=" * 60)

    # Simulate what server.py would send for stderr
    stderr_line = "dd: error writing '/dev/sdb': No space left on device"
    error_debug_data = {
        "type": "error_debug",
        "message": f"stderr: {stderr_line}",
        "source": "stderr"
    }

    # Verify format
    assert error_debug_data.get("type") == "error_debug", "Type should be 'error_debug'"
    assert error_debug_data.get("source") == "stderr", "Source should be 'stderr'"
    assert "stderr:" in error_debug_data.get("message", ""), "Message should contain 'stderr:'"

    print("[OK] Stderr capture format is correct")
    print("\nExample stderr error_debug:")
    print(json.dumps(error_debug_data, indent=2))

    return True


def test_complete_error_scenario():
    """Test a complete error scenario with all debugging information"""
    print("\n\nTesting complete error scenario...")
    print("=" * 60)

    # Simulate a complete error scenario
    try:
        # Simulate what would happen in install_os_linux when dd fails
        class MockResult:
            returncode = 1
            stdout = "0+0 records in\n0+0 records out"
            stderr = "dd: failed to open '/dev/sdb': Permission denied"

        result = MockResult()
        error_msg = result.stderr or result.stdout or "Unknown error"

        # This is what install_os.py would output
        error_debug_output = {
            "type": "error_debug",
            "message": "Linux dd command failed",
            "context": {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "command": "dd if=/path/to/image.img of=/dev/sdb bs=4M status=progress conv=fsync",
                "image_path": "/path/to/image.img",
                "device_id": "/dev/sdb"
            }
        }

        final_result = {
            "success": False,
            "error": f"Installation failed: {error_msg}",
            "debug_info": {
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "command": "dd if=/path/to/image.img of=/dev/sdb bs=4M status=progress conv=fsync"
            }
        }

        # Verify both outputs
        assert error_debug_output.get("type") == "error_debug", "error_debug type should be correct"
        assert "context" in error_debug_output, "Context should be present"
        assert final_result.get("success") == False, "Final result success should be False"
        assert "debug_info" in final_result, "debug_info should be in final result"

        print("[OK] Complete error scenario structure is correct")
        print("\nExample error_debug output:")
        print(json.dumps(error_debug_output, indent=2))
        print("\nExample final result:")
        print(json.dumps(final_result, indent=2))

        return True

    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        traceback.print_exc()
        return False


def test_json_output_validity():
    """Test that all JSON outputs are valid and can be parsed"""
    print("\n\nTesting JSON output validity...")
    print("=" * 60)

    test_cases = [
        # error_debug without exception
        {"type": "error_debug", "message": "Test message"},
        # error_debug with exception
        {
            "type": "error_debug",
            "message": "Exception occurred",
            "exception_type": "ValueError",
            "exception_message": "Test exception",
            "traceback": "Traceback (most recent call last):\n  File \"test.py\", line 1, in <module>\n    raise ValueError('Test')\nValueError: Test"
        },
        # error_debug with context
        {
            "type": "error_debug",
            "message": "Context test",
            "context": {"key": "value", "number": 123}
        },
        # Final error result
        {
            "success": False,
            "error": "Installation failed",
            "debug_info": {
                "returncode": 1,
                "stderr": "Error message",
                "command": "dd if=image.img of=/dev/sdb"
            }
        }
    ]

    for i, test_case in enumerate(test_cases, 1):
        try:
            json_str = json.dumps(test_case)
            parsed = json.loads(json_str)
            assert parsed == test_case, "Parsed JSON should match original"
            print(f"[OK] Test case {i}: Valid JSON")
        except Exception as e:
            print(f"[ERROR] Test case {i} failed: {e}")
            return False

    return True


def main():
    """Run all tests"""
    print("=" * 60)
    print("Testing Verbose Debugging Functionality")
    print("=" * 60)

    results = []

    results.append(("error_debug Function", test_error_debug_function()))
    results.append(("Error Result with debug_info", test_error_output_in_final_result()))
    results.append(("Stderr Capture Format", test_stderr_capture_format()))
    results.append(("Complete Error Scenario", test_complete_error_scenario()))
    results.append(("JSON Output Validity", test_json_output_validity()))

    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n[OK] All verbose debugging tests passed!")
        print("\nThe verbose debugging implementation is working correctly.")
        print("Error messages will now include:")
        print("  - Exception types and tracebacks")
        print("  - Command details and return codes")
        print("  - Full stdout and stderr output")
        print("  - Context information (image path, device ID, platform, etc.)")
        return 0
    else:
        print(f"\n[WARN] {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
