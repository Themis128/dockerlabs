#!/usr/bin/env python3
"""
Diagnostic script to identify why installation fails
Checks all prerequisites and common failure points
"""
import sys
import os
import json
import subprocess
from pathlib import Path

# Add scripts directory to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

def check_file_exists(filepath, description):
    """Check if file exists"""
    exists = os.path.exists(filepath)
    status = "[OK]" if exists else "[FAIL]"
    print(f"{status} {description}: {filepath}")
    if not exists:
        print(f"  ERROR: File not found!")
    return exists

def check_script_executable(script_path, description):
    """Check if script can be executed"""
    print(f"\nChecking: {description}")
    if not os.path.exists(script_path):
        print(f"  [FAIL] Script not found: {script_path}")
        return False

    try:
        result = subprocess.run(
            [sys.executable, script_path, "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 or "usage:" in result.stdout.lower() or "usage:" in result.stderr.lower():
            print(f"  [OK] Script is executable")
            return True
        else:
            print(f"  [FAIL] Script execution failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"  [FAIL] Error checking script: {e}")
        return False

def check_download_script():
    """Check download script functionality"""
    print("\n" + "="*70)
    print("Checking download_os_image.py")
    print("="*70)

    script_path = os.path.join(script_dir, "download_os_image.py")
    if not check_file_exists(script_path, "Download script"):
        return False

    # Check if it has required imports
    try:
        with open(script_path, 'r', encoding='utf-8') as f:
            content = f.read()

        checks = [
            ("image_cache import", "from image_cache import" in content or "import image_cache" in content),
            ("decompress_image import", "from decompress_image import" in content or "import decompress_image" in content),
            ("verify_image import", "from verify_image import" in content or "import verify_image" in content),
        ]

        for check_name, result in checks:
            status = "[OK]" if result else "[FAIL]"
            print(f"{status} {check_name}")

        return all(r for _, r in checks)
    except Exception as e:
        print(f"  [FAIL] Error reading script: {e}")
        return False

def check_install_script():
    """Check install script functionality"""
    print("\n" + "="*70)
    print("Checking install_os.py")
    print("="*70)

    script_path = os.path.join(script_dir, "install_os.py")
    if not check_file_exists(script_path, "Install script"):
        return False

    return check_script_executable(script_path, "install_os.py")

def check_apply_config_script():
    """Check apply_os_config.py"""
    print("\n" + "="*70)
    print("Checking apply_os_config.py")
    print("="*70)

    script_path = os.path.join(script_dir, "apply_os_config.py")
    if not check_file_exists(script_path, "Apply config script"):
        return False

    return check_script_executable(script_path, "apply_os_config.py")

def check_os_images_json():
    """Check os_images.json"""
    print("\n" + "="*70)
    print("Checking os_images.json")
    print("="*70)

    config_path = os.path.join(os.path.dirname(script_dir), "config", "os_images.json")
    if not check_file_exists(config_path, "OS images config"):
        return False

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        images = config.get("images", [])
        print(f"  [OK] Contains {len(images)} OS images")

        if len(images) > 0:
            first = images[0]
            required = ["id", "name", "download_url"]
            missing = [r for r in required if r not in first]
            if missing:
                print(f"  [FAIL] Missing required fields: {missing}")
                return False
            else:
                print(f"  [OK] All required fields present")

        return True
    except json.JSONDecodeError as e:
        print(f"  [FAIL] Invalid JSON: {e}")
        return False
    except Exception as e:
        print(f"  [FAIL] Error reading config: {e}")
        return False

def check_server_integration():
    """Check server.py integration"""
    print("\n" + "="*70)
    print("Checking server.py integration")
    print("="*70)

    server_path = os.path.join(os.path.dirname(script_dir), "server.py")
    if not check_file_exists(server_path, "Server file"):
        return False

    try:
        with open(server_path, 'r', encoding='utf-8') as f:
            content = f.read()

        checks = [
            ("apply_os_config integration", "apply_os_config" in content),
            ("os_images.json loading", "os_images.json" in content),
            ("download_os_image integration", "download_os_image" in content),
        ]

        for check_name, result in checks:
            status = "[OK]" if result else "[FAIL]"
            print(f"{status} {check_name}")

        return all(r for _, r in checks)
    except Exception as e:
        print(f"  [FAIL] Error reading server.py: {e}")
        return False

def check_permissions():
    """Check file permissions"""
    print("\n" + "="*70)
    print("Checking File Permissions")
    print("="*70)

    scripts = [
        "download_os_image.py",
        "install_os.py",
        "apply_os_config.py",
        "decompress_image.py",
        "image_cache.py",
        "verify_image.py",
    ]

    all_ok = True
    for script in scripts:
        script_path = os.path.join(script_dir, script)
        if os.path.exists(script_path):
            readable = os.access(script_path, os.R_OK)
            executable = os.access(script_path, os.X_OK) if sys.platform != 'win32' else True
            status = "[OK]" if (readable and (executable or sys.platform == 'win32')) else "[FAIL]"
            print(f"{status} {script}: readable={readable}, executable={executable}")
            if not readable:
                all_ok = False
        else:
            print(f"[FAIL] {script}: not found")
            all_ok = False

    return all_ok

def check_python_modules():
    """Check required Python modules"""
    print("\n" + "="*70)
    print("Checking Python Modules")
    print("="*70)

    required_modules = [
        "json",
        "subprocess",
        "os",
        "sys",
        "tempfile",
        "urllib.request",
        "hashlib",
    ]

    optional_modules = [
        ("lzma", "For .xz decompression"),
        ("gzip", "For .gz decompression"),
        ("crypt", "For userconf generation (Unix only)"),
    ]

    all_ok = True
    for module in required_modules:
        try:
            __import__(module)
            print(f"[OK] {module}")
        except ImportError:
            print(f"[FAIL] {module} - REQUIRED but not available!")
            all_ok = False

    for module, description in optional_modules:
        try:
            __import__(module)
            print(f"[OK] {module} ({description})")
        except ImportError:
            print(f"[WARN] {module} - Optional: {description}")

    return all_ok

def simulate_download_check():
    """Simulate what happens during download"""
    print("\n" + "="*70)
    print("Simulating Download Check")
    print("="*70)

    try:
        from image_cache import get_cache_dir, get_cache_stats
        cache_dir = get_cache_dir()
        print(f"[OK] Cache directory: {cache_dir}")

        stats = get_cache_stats()
        if stats.get("success"):
            print(f"[OK] Cache stats: {stats.get('total_files')} files, {stats.get('total_size_gb', 0):.2f} GB")
        else:
            print(f"[WARN] Cache stats error: {stats.get('error')}")

        return True
    except ImportError as e:
        print(f"[FAIL] Cannot import cache module: {e}")
        return False
    except Exception as e:
        print(f"[WARN] Cache check error: {e}")
        return True  # Not critical

def main():
    """Run all diagnostic checks"""
    print("="*70)
    print("Installation Failure Diagnostic Tool")
    print("="*70)
    print()

    checks = [
        ("File Permissions", check_permissions),
        ("Python Modules", check_python_modules),
        ("Download Script", check_download_script),
        ("Install Script", check_install_script),
        ("Apply Config Script", check_apply_config_script),
        ("OS Images JSON", check_os_images_json),
        ("Server Integration", check_server_integration),
        ("Cache Functionality", simulate_download_check),
    ]

    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"\n[FAIL] {check_name} raised exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((check_name, False))

    # Summary
    print("\n" + "="*70)
    print("Diagnostic Summary")
    print("="*70)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for check_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{status}: {check_name}")

    print(f"\nTotal: {passed}/{total} checks passed")

    if passed < total:
        print("\n" + "="*70)
        print("RECOMMENDED ACTIONS")
        print("="*70)
        print("\n1. Check the SERVER CONSOLE OUTPUT where you started the server")
        print("   Look for lines starting with [ERROR]")
        print("\n2. Check BROWSER CONSOLE (F12 -> Console tab)")
        print("   Look for JavaScript errors or parsing errors")
        print("\n3. Check BROWSER NETWORK TAB (F12 -> Network tab)")
        print("   Find the 'install-os' request and check the Response")
        print("\n4. Run server with VERBOSE mode:")
        print("   cd web-gui")
        print("   VERBOSE=true python server.py")
        print("\n5. Test download script directly:")
        print("   cd web-gui/scripts")
        print("   python download_os_image.py <your-download-url>")

    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
