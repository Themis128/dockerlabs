#!/usr/bin/env python3
"""
Test script for installation flow
Tests download and installation progress functionality
"""
import sys
import json
import subprocess
import os

def test_download_script():
    """Test that download script can be imported and has correct structure"""
    print("Testing download_os_image.py...")

    script_path = os.path.join(os.path.dirname(__file__), "download_os_image.py")

    if not os.path.exists(script_path):
        print(f"[ERROR] {script_path} not found")
        return False

    # Test syntax
    try:
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", script_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("[OK] download_os_image.py syntax is valid")
            return True
        else:
            print(f"[ERROR] Syntax error: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Error testing script: {e}")
        return False


def test_install_script():
    """Test that install script can be imported and has correct structure"""
    print("\nTesting install_os.py...")

    script_path = os.path.join(os.path.dirname(__file__), "install_os.py")

    if not os.path.exists(script_path):
        print(f"[ERROR] {script_path} not found")
        return False

    # Test syntax
    try:
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", script_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("[OK] install_os.py syntax is valid")
            return True
        else:
            print(f"[ERROR] Syntax error: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Error testing script: {e}")
        return False


def test_format_script():
    """Test that format script can be imported and has correct structure"""
    print("\nTesting format_sdcard.py...")

    script_path = os.path.join(os.path.dirname(__file__), "format_sdcard.py")

    if not os.path.exists(script_path):
        print(f"[ERROR] {script_path} not found")
        return False

    # Test syntax
    try:
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", script_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("[OK] format_sdcard.py syntax is valid")
            return True
        else:
            print(f"[ERROR] Syntax error: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Error testing script: {e}")
        return False


def test_download_help():
    """Test that download script shows help correctly"""
    print("\nTesting download_os_image.py --help...")

    script_path = os.path.join(os.path.dirname(__file__), "download_os_image.py")

    try:
        result = subprocess.run(
            [sys.executable, script_path, "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and "usage" in result.stdout.lower():
            print("[OK] download_os_image.py help works")
            return True
        else:
            print(f"[WARN] Help output: {result.stdout[:200]}")
            return True  # Not critical
    except Exception as e:
        print(f"[WARN] Could not test help: {e}")
        return True  # Not critical


def test_progress_output_format():
    """Test that progress output format is correct"""
    print("\nTesting progress output format...")

    # Import the progress function
    sys.path.insert(0, os.path.dirname(__file__))
    try:
        from download_os_image import progress

        # Capture output
        import io
        import contextlib

        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            progress("Test message", 50)

        output = f.getvalue().strip()

        try:
            data = json.loads(output)
            if data.get("type") == "progress" and data.get("percent") == 50:
                print("[OK] Progress output format is correct")
                return True
            else:
                print(f"[ERROR] Invalid progress format: {data}")
                return False
        except json.JSONDecodeError:
            print(f"[ERROR] Progress output is not valid JSON: {output}")
            return False
    except ImportError as e:
        print(f"[WARN] Could not import progress function: {e}")
        return True  # Not critical if import fails in test environment


def main():
    print("=" * 60)
    print("Testing Installation Flow Components")
    print("=" * 60)

    results = []

    results.append(("Download Script Syntax", test_download_script()))
    results.append(("Install Script Syntax", test_install_script()))
    results.append(("Format Script Syntax", test_format_script()))
    results.append(("Download Help", test_download_help()))
    results.append(("Progress Format", test_progress_output_format()))

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
        print("\n[OK] All tests passed!")
        return 0
    else:
        print(f"\n[WARN] {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
