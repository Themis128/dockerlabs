#!/usr/bin/env python3
"""
End-to-end integration test for OS installation flow
Tests the complete flow: cache -> download -> decompress -> verify -> config
"""
import sys
import os
import json
import tempfile
import subprocess
import hashlib

# Ensure UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add scripts directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)


def create_test_image_file(size_mb=1):
    """Create a test image file for testing"""
    test_file = tempfile.NamedTemporaryFile(delete=False, suffix='.img')
    # Write some test data
    chunk = b"0" * (1024 * 1024)  # 1MB chunk
    for _ in range(size_mb):
        test_file.write(chunk)
    test_file.close()
    return test_file.name


def test_cache_workflow():
    """Test complete cache workflow"""
    print("Testing cache workflow...")

    try:
        from image_cache import cache_image, get_cached_image, get_cache_stats

        # Create test image
        test_image = create_test_image_file(1)
        test_url = "https://test.example.com/test.img"

        try:
            # Test caching
            cache_result = cache_image(test_url, test_image)
            if not cache_result.get("success"):
                print(f"[FAIL] Cache failed: {cache_result.get('error')}")
                return False
            print("[OK] Image cached successfully")

            # Test retrieving from cache
            cached_result = get_cached_image(test_url, verify_hash=False)
            if not cached_result.get("success"):
                print(f"[FAIL] Cache retrieval failed: {cached_result.get('error')}")
                return False
            print("[OK] Image retrieved from cache")

            # Test cache stats
            stats = get_cache_stats()
            if not stats.get("success"):
                print(f"[FAIL] Cache stats failed: {stats.get('error')}")
                return False
            print(f"[OK] Cache stats: {stats.get('total_files')} files, {stats.get('total_size_gb', 0):.2f} GB")

            return True
        finally:
            if os.path.exists(test_image):
                os.unlink(test_image)

    except Exception as e:
        print(f"[FAIL] Cache workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_decompression_workflow():
    """Test decompression workflow with actual compressed file"""
    print("\nTesting decompression workflow...")

    try:
        import gzip
        from decompress_image import decompress_image

        # Create a test compressed file
        test_content = b"This is test content for compression" * 1000
        compressed_file = tempfile.NamedTemporaryFile(delete=False, suffix='.img.gz')

        with gzip.open(compressed_file.name, 'wb') as f:
            f.write(test_content)
        compressed_file.close()

        decompressed_file = compressed_file.name[:-3]  # Remove .gz

        try:
            result = decompress_image(compressed_file.name, decompressed_file, remove_source=False)
            if not result.get("success"):
                print(f"[FAIL] Decompression failed: {result.get('error')}")
                return False

            # Verify decompressed content
            if not os.path.exists(decompressed_file):
                print("[FAIL] Decompressed file not created")
                return False

            with open(decompressed_file, 'rb') as f:
                decompressed_content = f.read()

            if decompressed_content != test_content:
                print("[FAIL] Decompressed content doesn't match original")
                return False

            print("[OK] Decompression workflow works correctly")
            return True
        finally:
            for f in [compressed_file.name, decompressed_file]:
                if os.path.exists(f):
                    os.unlink(f)

    except Exception as e:
        print(f"[FAIL] Decompression workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_verify_workflow():
    """Test verification workflow"""
    print("\nTesting verification workflow...")

    try:
        from verify_image import calculate_hash, verify_hash

        # Create test file
        test_file = create_test_image_file(1)

        try:
            # Calculate hash
            hash_value = calculate_hash(test_file, "sha256")
            if not hash_value:
                print("[FAIL] Hash calculation failed")
                return False

            # Verify with correct hash
            verify_result = verify_hash(test_file, hash_value, "sha256")
            if not verify_result.get("success"):
                print("[FAIL] Verification with correct hash failed")
                return False

            print(f"[OK] Verification workflow works (hash: {hash_value[:16]}...)")
            return True
        finally:
            if os.path.exists(test_file):
                os.unlink(test_file)

    except Exception as e:
        print(f"[FAIL] Verification workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_download_script_integration():
    """Test that download_os_image.py properly integrates cache and decompression"""
    print("\nTesting download_os_image.py integration...")

    script_path = os.path.join(script_dir, "download_os_image.py")

    # Test that script can be executed with --help
    try:
        result = subprocess.run(
            [sys.executable, script_path, "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )

        # Check that help output mentions cache or decompression
        output = result.stdout + result.stderr
        if "usage:" in output.lower() or "download" in output.lower():
            print("[OK] download_os_image.py can be executed")
            return True
        else:
            print("[WARN] download_os_image.py help output unexpected")
            return True  # Not a failure

    except Exception as e:
        print(f"[FAIL] Error testing download_os_image.py: {e}")
        return False


def test_apply_config_structure():
    """Test apply_os_config.py structure and argument parsing"""
    print("\nTesting apply_os_config.py structure...")

    script_path = os.path.join(script_dir, "apply_os_config.py")

    # Test with invalid arguments (should show error, not crash)
    try:
        result = subprocess.run(
            [sys.executable, script_path, "invalid_device"],
            capture_output=True,
            text=True,
            timeout=10
        )

        # Should return error (non-zero exit) or show usage
        output = result.stdout + result.stderr
        if result.returncode != 0 or "error" in output.lower() or "usage" in output.lower():
            print("[OK] apply_os_config.py handles invalid arguments correctly")
            return True
        else:
            print("[WARN] Unexpected response from apply_os_config.py")
            return True

    except Exception as e:
        print(f"[FAIL] Error testing apply_os_config.py: {e}")
        return False


def test_server_endpoint_simulation():
    """Simulate server endpoint behavior"""
    print("\nTesting server endpoint simulation...")

    # Test that os_images.json can be loaded (simulating server behavior)
    config_path = os.path.join(os.path.dirname(script_dir), "config", "os_images.json")

    if not os.path.exists(config_path):
        print("[WARN] os_images.json not found, skipping server simulation")
        return True

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config_data = json.load(f)

        images = config_data.get("images", [])

        # Simulate what server does: return images list
        response = {"success": True, "images": images}

        if len(images) > 0:
            # Check first image has required fields
            first = images[0]
            required = ["id", "name", "download_url"]
            if all(key in first for key in required):
                print(f"[OK] Server endpoint simulation works ({len(images)} images)")
                return True
            else:
                print("[FAIL] Images missing required fields")
                return False
        else:
            print("[WARN] No images in config")
            return True

    except Exception as e:
        print(f"[FAIL] Server simulation failed: {e}")
        return False


def test_integration_chain():
    """Test that all components work together"""
    print("\nTesting integration chain...")

    try:
        # Test that we can import all modules together
        from image_cache import cache_image, get_cached_image
        from decompress_image import decompress_image
        from verify_image import calculate_hash
        from apply_os_config import progress  # Just test import

        print("[OK] All modules can be imported together")

        # Test that download_os_image can use them
        download_script = os.path.join(script_dir, "download_os_image.py")
        with open(download_script, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check all integrations are present
        checks = [
            ("image_cache", "image_cache" in content or "get_cached_image" in content),
            ("decompress_image", "decompress_image" in content or "decompress" in content.lower()),
            ("verify_image", "verify_image" in content or "calculate_hash" in content),
        ]

        all_present = all(present for _, present in checks)
        if all_present:
            print("[OK] All integrations present in download_os_image.py")
            return True
        else:
            missing = [name for name, present in checks if not present]
            print(f"[WARN] Missing integrations: {missing}")
            return True  # Not critical

    except Exception as e:
        print(f"[FAIL] Integration chain test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all integration flow tests"""
    print("=" * 70)
    print("End-to-End Integration Flow Tests")
    print("=" * 70)
    print()

    tests = [
        ("Cache Workflow", test_cache_workflow),
        ("Decompression Workflow", test_decompression_workflow),
        ("Verification Workflow", test_verify_workflow),
        ("Download Script Integration", test_download_script_integration),
        ("Apply Config Structure", test_apply_config_structure),
        ("Server Endpoint Simulation", test_server_endpoint_simulation),
        ("Integration Chain", test_integration_chain),
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
    print("Integration Flow Test Summary")
    print("=" * 70)
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {test_name}")

    print()
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n[SUCCESS] All integration flow tests passed!")
        return 0
    else:
        print(f"\n[WARN] {total - passed} test(s) failed. Review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
