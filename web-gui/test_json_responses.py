#!/usr/bin/env python3
"""
Test script to verify all API endpoints return valid JSON
Run this while the server is running to check for malformed JSON responses
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000")

def test_endpoint(path, method="GET", data=None):
    """Test an API endpoint and verify it returns valid JSON"""
    url = f"{BASE_URL}{path}"
    print(f"\nTesting: {method} {path}")

    try:
        req = urllib.request.Request(url)
        req.add_header("Content-Type", "application/json")

        if data:
            req.data = json.dumps(data).encode('utf-8')

        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.getcode()
            content_type = response.headers.get('Content-Type', '')
            body = response.read().decode('utf-8')

            print(f"  Status: {status}")
            print(f"  Content-Type: {content_type}")

            # Try to parse as JSON
            try:
                parsed = json.loads(body)
                print(f"  [OK] Valid JSON")
                print(f"  Response keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'Not a dict'}")
                return True
            except json.JSONDecodeError as e:
                print(f"  [FAIL] Invalid JSON: {e}")
                print(f"  Response body (first 200 chars): {body[:200]}")
                return False

    except urllib.error.HTTPError as e:
        print(f"  [FAIL] HTTP Error {e.code}: {e.reason}")
        try:
            body = e.read().decode('utf-8')
            # Try to parse error response as JSON
            try:
                parsed = json.loads(body)
                print(f"  Error response is valid JSON: {parsed}")
            except:
                print(f"  Error response (first 200 chars): {body[:200]}")
        except:
            pass
        return False
    except urllib.error.URLError as e:
        print(f"  [FAIL] URL Error: {e.reason}")
        print(f"  Make sure the server is running on {BASE_URL}")
        return False
    except Exception as e:
        print(f"  [FAIL] Error: {type(e).__name__}: {e}")
        return False

def main():
    print("=" * 60)
    print("Testing API Endpoints for Valid JSON Responses")
    print("=" * 60)

    results = []

    # Test GET endpoints
    endpoints = [
        "/api/pis",
        "/api/sdcards",
        "/api/os-images",
        "/api/health",
        "/api/metrics",
    ]

    for endpoint in endpoints:
        results.append((endpoint, test_endpoint(endpoint)))
        # Small delay to avoid rate limiting
        time.sleep(0.1)

    # Test POST endpoints (with minimal data)
    post_endpoints = [
        ("/api/format-sdcard", {"device_id": "test", "pi_model": "pi5"}),
        ("/api/scan-wifi", {}),
    ]

    for endpoint, data in post_endpoints:
        results.append((endpoint, test_endpoint(endpoint, "POST", data)))
        # Small delay to avoid rate limiting
        time.sleep(0.1)

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for endpoint, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status}: {endpoint}")

    print(f"\nTotal: {passed}/{total} endpoints returned valid JSON")

    if passed < total:
        print("\n[WARNING] Some endpoints returned invalid JSON. Check server logs for details.")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All endpoints returned valid JSON!")
        sys.exit(0)

if __name__ == "__main__":
    main()
