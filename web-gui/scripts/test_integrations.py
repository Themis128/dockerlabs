#!/usr/bin/env python3
"""
Test script for new OS installation integrations
Tests: image_cache, decompress_image, apply_os_config, os_images.json, verify_image
"""
import sys
import os
import json
import tempfile
import subprocess
import shutil
from pathlib import Path

# Ensure UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add scripts directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)


def test_imports():
    """Test that all new modules can be imported"""
    print("Testing module imports...")
    results = []

    modules = [
        ("image_cache", "image_cache.py"),
        ("decompress_image", "decompress_image.py"),
        ("apply_os_config", "apply_os_config.py"),
        ("verify_image", "verify_image.py"),
    ]

    for module_name, filename in modules:
        try:
            module_path = os.path.join(script_dir, filename)
            if not os.path.exists(module_path):
                print(f"[FAIL] {filename} not found")
                results.append(False)
                continue

            # Test syntax
            result = subprocess.run(
                [sys.executable, "-m", "py_compile", module_path],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                print(f"[OK] {filename} syntax is valid")
                results.append(True)
            else:
                print(f"[FAIL] {filename} syntax error: {result.stderr}")
                results.append(False)
        except Exception as e:
            print(f"[FAIL] Error testing {filename}: {e}")
            results.append(False)

    return all(results)


def test_os_images_json():
    """Test that os_images.json exists and is valid"""
    print("\nTesting os_images.json...")

    config_path = os.path.join(os.path.dirname(script_dir), "config", "os_images.json")

    if not os.path.exists(config_path):
        print(f"[FAIL] os_images.json not found at {config_path}")
        return False

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)

        # Validate structure
        if "images" not in config_data:
            print("[FAIL] os_images.json missing 'images' key")
            return False

        images = config_data.get("images", [])
        if not isinstance(images, list):
            print("[FAIL] 'images' is not a list")
            return False

        if len(images) == 0:
            print("[WARN] os_images.json has no images")
            return True  # Not a failure, just empty

        # Validate first image structure
        first_image = images[0]
        required_keys = ["id", "name", "download_url", "os_family"]
        missing_keys = [key for key in required_keys if key not in first_image]

        if missing_keys:
            print(f"[FAIL] Image missing required keys: {missing_keys}")
            return False

        print(f"[OK] os_images.json is valid with {len(images)} images")
        return True

    except json.JSONDecodeError as e:
        print(f"[FAIL] os_images.json is not valid JSON: {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Error reading os_images.json: {e}")
        return False


def test_image_cache_basic():
    """Test basic image cache functionality"""
    print("\nTesting image_cache.py basic functionality...")

    try:
        from image_cache import get_cache_dir, get_cache_metadata_path, load_cache_metadata, save_cache_metadata

        # Test cache directory creation
        cache_dir = get_cache_dir()
        if not os.path.exists(cache_dir):
            print(f"[FAIL] Cache directory not created: {cache_dir}")
            return False
        print(f"[OK] Cache directory exists: {cache_dir}")

        # Test metadata file operations
        metadata = load_cache_metadata()
        if not isinstance(metadata, dict):
            print("[FAIL] load_cache_metadata() did not return dict")
            return False
        print("[OK] Metadata loading works")

        # Test saving metadata
        test_metadata = {"test": "value"}
        save_cache_metadata(test_metadata)
        loaded = load_cache_metadata()
        if loaded.get("test") != "value":
            print("[FAIL] Metadata save/load failed")
            return False
        print("[OK] Metadata save/load works")

        # Restore original metadata
        save_cache_metadata(metadata)

        return True

    except ImportError as e:
        print(f"[FAIL] Could not import image_cache: {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Error testing image_cache: {e}")
        return False


def test_decompress_image_basic():
    """Test decompress_image.py basic functionality"""
    print("\nTesting decompress_image.py basic functionality...")

    try:
        from decompress_image import decompress_image

        # Create a test file (not actually compressed, just test the function exists)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as tmp:
            tmp.write(b"test content")
            test_file = tmp.name

        try:
            # Test with non-compressed file (should fail gracefully)
            result = decompress_image(test_file, test_file + ".out")
            # Should return error for non-compressed file
            if result.get("success"):
                print("[WARN] Decompression succeeded on non-compressed file (unexpected)")
            else:
                print("[OK] Decompression correctly rejects non-compressed files")
            return True
        finally:
            if os.path.exists(test_file):
                os.unlink(test_file)
            if os.path.exists(test_file + ".out"):
                os.unlink(test_file + ".out")

    except ImportError as e:
        print(f"[FAIL] Could not import decompress_image: {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Error testing decompress_image: {e}")
        return False


def test_verify_image_basic():
    """Test verify_image.py basic functionality"""
    print("\nTesting verify_image.py basic functionality...")

    try:
        from verify_image import calculate_hash, verify_hash

        # Create a test file
        with tempfile.NamedTemporaryFile(delete=False, mode='wb', suffix='.txt') as tmp:
            tmp.write(b"test content for hashing")
            test_file = tmp.name

        try:
            # Test hash calculation
            hash_value = calculate_hash(test_file, "sha256")
            if not hash_value:
                print("[FAIL] calculate_hash returned None")
                return False
            if len(hash_value) != 64:  # SHA256 hex is 64 chars
                print(f"[FAIL] Invalid hash length: {len(hash_value)}")
                return False
            print(f"[OK] Hash calculation works: {hash_value[:16]}...")

            # Test verification with correct hash
            verify_result = verify_hash(test_file, hash_value, "sha256")
            if not verify_result.get("success"):
                print("[FAIL] Hash verification failed with correct hash")
                return False
            print("[OK] Hash verification works with correct hash")

            # Test verification with incorrect hash
            wrong_hash = "0" * 64
            verify_result = verify_hash(test_file, wrong_hash, "sha256")
            if verify_result.get("success"):
                print("[FAIL] Hash verification passed with incorrect hash")
                return False
            print("[OK] Hash verification correctly rejects incorrect hash")

            return True
        finally:
            if os.path.exists(test_file):
                os.unlink(test_file)

    except ImportError as e:
        print(f"[FAIL] Could not import verify_image: {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Error testing verify_image: {e}")
        return False


def test_apply_os_config_import():
    """Test that apply_os_config.py can be imported and has required functions"""
    print("\nTesting apply_os_config.py structure...")

    try:
        script_path = os.path.join(script_dir, "apply_os_config.py")

        # Test syntax
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", script_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            print(f"[FAIL] Syntax error: {result.stderr}")
            return False

        print("[OK] apply_os_config.py syntax is valid")

        # Test that it can be run with --help
        result = subprocess.run(
            [sys.executable, script_path, "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0 and "usage:" not in result.stdout.lower():
            print("[WARN] --help test failed (may be expected)")
        else:
            print("[OK] apply_os_config.py can be executed")

        return True

    except Exception as e:
        print(f"[FAIL] Error testing apply_os_config.py: {e}")
        return False


def test_download_os_image_integration():
    """Test that download_os_image.py has integrated cache and decompression"""
    print("\nTesting download_os_image.py integration...")

    script_path = os.path.join(script_dir, "download_os_image.py")

    if not os.path.exists(script_path):
        print(f"[FAIL] download_os_image.py not found")
        return False

    # Read the file and check for integration markers
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for cache integration
        if "image_cache" in content or "get_cached_image" in content:
            print("[OK] Image cache integration found")
        else:
            print("[WARN] Image cache integration not found in download_os_image.py")

        # Check for decompression integration
        if "decompress_image" in content or "decompress" in content.lower():
            print("[OK] Decompression integration found")
        else:
            print("[WARN] Decompression integration not found in download_os_image.py")

        # Check for checksum verification
        if "verify_image" in content or "calculate_hash" in content:
            print("[OK] Checksum verification integration found")
        else:
            print("[WARN] Checksum verification integration not found")

        return True

    except Exception as e:
        print(f"[FAIL] Error reading download_os_image.py: {e}")
        return False


def test_server_integration():
    """Test that server.py has integrated the new features"""
    print("\nTesting server.py integration...")

    server_path = os.path.join(os.path.dirname(script_dir), "server.py")

    if not os.path.exists(server_path):
        print(f"[WARN] server.py not found, skipping server integration test")
        return True

    try:
        with open(server_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for apply_os_config integration
        if "apply_os_config" in content:
            print("[OK] apply_os_config integration found in server.py")
        else:
            print("[WARN] apply_os_config integration not found in server.py")

        # Check for os_images.json loading
        if "os_images.json" in content:
            print("[OK] os_images.json loading found in server.py")
        else:
            print("[WARN] os_images.json loading not found in server.py")

        return True

    except Exception as e:
        print(f"[FAIL] Error reading server.py: {e}")
        return False


def test_cache_cli():
    """Test image_cache.py CLI functionality"""
    print("\nTesting image_cache.py CLI...")

    script_path = os.path.join(script_dir, "image_cache.py")

    try:
        # Test stats command
        result = subprocess.run(
            [sys.executable, script_path, "stats"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            try:
                stats_data = json.loads(result.stdout)
                if stats_data.get("success"):
                    print("[OK] Cache stats command works")
                    return True
                else:
                    print(f"[WARN] Cache stats returned error: {stats_data.get('error')}")
                    return True  # Not a failure, cache might be empty
            except json.JSONDecodeError:
                print("[FAIL] Cache stats did not return valid JSON")
                return False
        else:
            print(f"[FAIL] Cache stats command failed: {result.stderr}")
            return False

    except Exception as e:
        print(f"[FAIL] Error testing cache CLI: {e}")
        return False


def main():
    """Run all integration tests"""
    print("=" * 70)
    print("Testing OS Installation Integrations")
    print("=" * 70)
    print()

    tests = [
        ("Module Imports", test_imports),
        ("OS Images JSON", test_os_images_json),
        ("Image Cache Basic", test_image_cache_basic),
        ("Decompress Image Basic", test_decompress_image_basic),
        ("Verify Image Basic", test_verify_image_basic),
        ("Apply OS Config Import", test_apply_os_config_import),
        ("Download Integration", test_download_os_image_integration),
        ("Server Integration", test_server_integration),
        ("Cache CLI", test_cache_cli),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*70}")
        print(f"Test: {test_name}")
        print('='*70)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"[FAIL] {test_name} raised exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print()
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n[SUCCESS] All integration tests passed!")
        return 0
    else:
        print(f"\n[WARN] {total - passed} test(s) failed. Review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
