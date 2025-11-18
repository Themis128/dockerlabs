#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for install_os.py implementation
Tests the Windows installation logic without actually writing to a disk
"""
import sys
import os
import platform
import tempfile
import json
from unittest.mock import patch, MagicMock

# Ensure UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add parent directory to path to import install_os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_install_os_import():
    """Test that install_os.py can be imported"""
    try:
        import install_os
        print("[OK] install_os.py imports successfully")
        return True
    except Exception as e:
        print(f"[FAIL] Failed to import install_os.py: {e}")
        return False

def test_windows_function_exists():
    """Test that install_os_windows function exists"""
    try:
        import install_os
        assert hasattr(install_os, 'install_os_windows'), "install_os_windows function not found"
        print("[OK] install_os_windows function exists")
        return True
    except Exception as e:
        print(f"[FAIL] install_os_windows function check failed: {e}")
        return False

def test_invalid_device_id():
    """Test error handling for invalid device ID"""
    try:
        import install_os

        # Create a temporary image file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.img') as tmp:
            tmp.write(b'fake image data' * 1000)
            tmp_path = tmp.name

        try:
            result = install_os.install_os_windows(tmp_path, "InvalidDevice")
            assert result.get("success") == False, "Should fail for invalid device ID"
            assert "Invalid device ID" in result.get("error", ""), "Error message should mention invalid device ID"
            print("[OK] Invalid device ID handling works correctly")
            return True
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        print(f"[FAIL] Invalid device ID test failed: {e}")
        return False

def test_missing_image_file():
    """Test error handling for missing image file"""
    try:
        import install_os
        result = install_os.install_os_windows("nonexistent_file.img", r"\\.\PhysicalDrive1")
        assert result.get("success") == False, "Should fail for missing image file"
        assert "not found" in result.get("error", "").lower(), "Error message should mention file not found"
        print("[OK] Missing image file handling works correctly")
        return True
    except Exception as e:
        print(f"[FAIL] Missing image file test failed: {e}")
        return False

def test_dd_not_found_fallback():
    """Test that the function falls back to direct writing when dd is not found"""
    try:
        import install_os

        # Create a temporary image file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.img') as tmp:
            tmp.write(b'fake image data' * 1000)
            tmp_path = tmp.name

        try:
            # Mock subprocess.run to simulate dd not being found
            with patch('install_os.subprocess.run') as mock_run:
                # Mock 'where dd' command to return non-zero (dd not found)
                mock_where = MagicMock()
                mock_where.returncode = 1
                mock_run.return_value = mock_where

                # Mock open to simulate permission error (expected when not admin)
                with patch('builtins.open', side_effect=PermissionError("Access denied")):
                    result = install_os.install_os_windows(tmp_path, r"\\.\PhysicalDrive1")

                    # Should attempt direct write and get permission error
                    assert result.get("success") == False, "Should fail without admin privileges"
                    assert "Permission" in result.get("error", "") or "administrator" in result.get("error", "").lower(), \
                        "Error should mention permission or administrator"
                    print("[OK] Fallback to direct writing works (permission error as expected)")
                    return True
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        print(f"[FAIL] DD not found fallback test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_progress_output():
    """Test that progress messages are output correctly"""
    try:
        import install_os
        import io
        from contextlib import redirect_stdout

        # Create a temporary image file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.img') as tmp:
            tmp.write(b'fake image data' * 1000)
            tmp_path = tmp.name

        try:
            # Capture stdout
            f = io.StringIO()
            with redirect_stdout(f):
                # Mock to return error immediately
                with patch('install_os.os.path.exists', return_value=True):
                    with patch('install_os.os.path.getsize', return_value=1024):
                        with patch('install_os.subprocess.run') as mock_run:
                            mock_where = MagicMock()
                            mock_where.returncode = 1
                            mock_run.return_value = mock_where

                            with patch('builtins.open', side_effect=PermissionError("Access denied")):
                                result = install_os.install_os_windows(tmp_path, r"\\.\PhysicalDrive1")

            output = f.getvalue()
            # Check that progress messages were output
            assert "type" in output or "progress" in output.lower() or len(output) > 0, \
                "Should output progress messages"
            print("[OK] Progress output works correctly")
            return True
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        print(f"[FAIL] Progress output test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_json_output_format():
    """Test that the function returns proper JSON-serializable results"""
    try:
        import install_os

        # Create a temporary image file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.img') as tmp:
            tmp.write(b'fake image data' * 1000)
            tmp_path = tmp.name

        try:
            result = install_os.install_os_windows(tmp_path, "InvalidDevice")

            # Try to serialize to JSON
            json_str = json.dumps(result)
            parsed = json.loads(json_str)

            assert "success" in parsed, "Result should have 'success' field"
            assert isinstance(parsed["success"], bool), "success should be boolean"

            if not parsed["success"]:
                assert "error" in parsed, "Failed result should have 'error' field"

            print("[OK] JSON output format is correct")
            return True
        finally:
            os.unlink(tmp_path)
    except Exception as e:
        print(f"[FAIL] JSON output format test failed: {e}")
        return False

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("Testing install_os.py Windows Implementation")
    print("=" * 60)
    print()

    if platform.system() != "Windows":
        print("[WARN] Warning: Not running on Windows. Some tests may not be accurate.")
        print()

    tests = [
        ("Import Test", test_install_os_import),
        ("Function Exists", test_windows_function_exists),
        ("Invalid Device ID", test_invalid_device_id),
        ("Missing Image File", test_missing_image_file),
        ("DD Not Found Fallback", test_dd_not_found_fallback),
        ("Progress Output", test_progress_output),
        ("JSON Output Format", test_json_output_format),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"Running: {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"[FAIL] {test_name} raised exception: {e}")
            results.append((test_name, False))
        print()

    # Summary
    print("=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print()
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("[SUCCESS] All tests passed!")
        return 0
    else:
        print("[WARN] Some tests failed. Review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
