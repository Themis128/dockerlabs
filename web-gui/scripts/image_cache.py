#!/usr/bin/env python3
"""
Image cache management for OS images
Caches downloaded images to avoid re-downloading
Supports checksum verification and cache size management
"""
import sys
import os
import json
import argparse
import hashlib
import shutil
import time
from pathlib import Path
from typing import Optional, Dict, Any


def get_cache_dir():
    """Get cache directory path"""
    # Use platform-specific cache directory
    system = os.name
    if system == "nt":  # Windows
        cache_base = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "PiManager")
    else:  # Unix-like (Linux, macOS)
        cache_base = os.path.join(os.path.expanduser("~"), ".cache", "pi-manager")

    cache_dir = os.path.join(cache_base, "images")
    os.makedirs(cache_dir, exist_ok=True)
    return cache_dir


def get_cache_metadata_path():
    """Get path to cache metadata file"""
    cache_dir = get_cache_dir()
    return os.path.join(cache_dir, "cache_metadata.json")


def load_cache_metadata() -> Dict[str, Any]:
    """Load cache metadata"""
    metadata_path = get_cache_metadata_path()
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError):
            return {}
    return {}


def save_cache_metadata(metadata: Dict[str, Any]):
    """Save cache metadata"""
    metadata_path = get_cache_metadata_path()
    try:
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
    except OSError:
        pass  # Ignore write errors


def calculate_file_hash(file_path: str, algorithm: str = "sha256") -> Optional[str]:
    """Calculate file hash"""
    try:
        hash_obj = hashlib.new(algorithm)
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()
    except (OSError, IOError):
        return None


def get_cache_key(url: str) -> str:
    """Generate cache key from URL"""
    # Use URL hash as cache key
    return hashlib.sha256(url.encode('utf-8')).hexdigest()


def get_cached_image_path(url: str) -> Optional[str]:
    """Get path to cached image if it exists"""
    cache_dir = get_cache_dir()
    cache_key = get_cache_key(url)

    # Check metadata first
    metadata = load_cache_metadata()
    if cache_key in metadata:
        cached_info = metadata[cache_key]
        cached_path = cached_info.get("path")

        if cached_path and os.path.exists(cached_path):
            # Verify file still exists and optionally verify hash
            return cached_path

    # Check for file directly (for backward compatibility)
    # Look for files matching the cache key pattern
    for ext in ['.img', '.img.xz', '.img.gz']:
        cached_path = os.path.join(cache_dir, f"{cache_key}{ext}")
        if os.path.exists(cached_path):
            return cached_path

    return None


def cache_image(url: str, image_path: str, expected_hash: Optional[str] = None) -> Dict[str, Any]:
    """
    Cache an image file

    Args:
        url: Source URL of the image
        image_path: Path to the image file to cache
        expected_hash: Optional expected hash for verification

    Returns:
        Dictionary with success status and cached path
    """
    try:
        if not os.path.exists(image_path):
            return {
                "success": False,
                "error": f"Image file not found: {image_path}"
            }

        # Calculate file hash
        file_hash = calculate_file_hash(image_path)
        if not file_hash:
            return {
                "success": False,
                "error": "Failed to calculate file hash"
            }

        # Verify hash if provided
        if expected_hash and file_hash != expected_hash:
            return {
                "success": False,
                "error": f"Hash mismatch. Expected: {expected_hash}, Got: {file_hash}"
            }

        # Determine cache path
        cache_dir = get_cache_dir()
        cache_key = get_cache_key(url)

        # Preserve file extension
        _, ext = os.path.splitext(image_path)
        if image_path.endswith('.img.xz'):
            ext = '.img.xz'
        elif image_path.endswith('.img.gz'):
            ext = '.img.gz'

        cached_path = os.path.join(cache_dir, f"{cache_key}{ext}")

        # Copy file to cache
        shutil.copy2(image_path, cached_path)

        # Update metadata
        metadata = load_cache_metadata()
        file_size = os.path.getsize(cached_path)
        metadata[cache_key] = {
            "url": url,
            "path": cached_path,
            "hash": file_hash,
            "size": file_size,
            "cached_at": time.time(),
            "last_accessed": time.time(),
            "access_count": 1
        }
        save_cache_metadata(metadata)

        return {
            "success": True,
            "cached_path": cached_path,
            "hash": file_hash,
            "size": file_size
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error caching image: {str(e)}"
        }


def get_cached_image(url: str, verify_hash: bool = True) -> Dict[str, Any]:
    """
    Get cached image if available

    Args:
        url: Source URL of the image
        verify_hash: Whether to verify file hash

    Returns:
        Dictionary with success status and cached path
    """
    try:
        cached_path = get_cached_image_path(url)
        if not cached_path:
            return {
                "success": False,
                "error": "Image not in cache"
            }

        # Update access metadata
        metadata = load_cache_metadata()
        cache_key = get_cache_key(url)
        if cache_key in metadata:
            metadata[cache_key]["last_accessed"] = time.time()
            metadata[cache_key]["access_count"] = metadata[cache_key].get("access_count", 0) + 1
            save_cache_metadata(metadata)

        # Verify hash if requested
        if verify_hash and cache_key in metadata:
            cached_info = metadata[cache_key]
            expected_hash = cached_info.get("hash")
            if expected_hash:
                actual_hash = calculate_file_hash(cached_path)
                if actual_hash != expected_hash:
                    return {
                        "success": False,
                        "error": "Cached image hash verification failed - file may be corrupted"
                    }

        return {
            "success": True,
            "cached_path": cached_path,
            "size": os.path.getsize(cached_path)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting cached image: {str(e)}"
        }


def clean_cache(max_size_gb: float = 10.0, max_age_days: int = 30):
    """
    Clean cache by removing old or excess files

    Args:
        max_size_gb: Maximum cache size in GB
        max_age_days: Maximum age in days for cached files
    """
    try:
        metadata = load_cache_metadata()
        cache_dir = get_cache_dir()
        max_size_bytes = max_size_gb * 1024 * 1024 * 1024
        max_age_seconds = max_age_days * 24 * 60 * 60
        current_time = time.time()

        # Calculate current cache size
        total_size = 0
        for cache_key, info in metadata.items():
            cached_path = info.get("path")
            if cached_path and os.path.exists(cached_path):
                total_size += info.get("size", 0)

        # Remove old files first
        to_remove = []
        for cache_key, info in metadata.items():
            cached_path = info.get("path")
            if not cached_path or not os.path.exists(cached_path):
                to_remove.append(cache_key)
                continue

            cached_at = info.get("cached_at", 0)
            age = current_time - cached_at
            if age > max_age_seconds:
                to_remove.append(cache_key)

        # Remove old files
        for cache_key in to_remove:
            info = metadata.get(cache_key, {})
            cached_path = info.get("path")
            if cached_path and os.path.exists(cached_path):
                try:
                    os.remove(cached_path)
                    total_size -= info.get("size", 0)
                except OSError:
                    pass
            del metadata[cache_key]

        # If still over size limit, remove least recently used
        if total_size > max_size_bytes:
            # Sort by last_accessed (oldest first)
            sorted_items = sorted(
                metadata.items(),
                key=lambda x: x[1].get("last_accessed", 0)
            )

            for cache_key, info in sorted_items:
                if total_size <= max_size_bytes:
                    break

                cached_path = info.get("path")
                if cached_path and os.path.exists(cached_path):
                    try:
                        os.remove(cached_path)
                        total_size -= info.get("size", 0)
                    except OSError:
                        pass
                del metadata[cache_key]

        save_cache_metadata(metadata)

        return {
            "success": True,
            "removed_count": len(to_remove),
            "remaining_size_gb": total_size / (1024 * 1024 * 1024)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error cleaning cache: {str(e)}"
        }


def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    try:
        metadata = load_cache_metadata()
        cache_dir = get_cache_dir()

        total_files = 0
        total_size = 0
        for cache_key, info in metadata.items():
            cached_path = info.get("path")
            if cached_path and os.path.exists(cached_path):
                total_files += 1
                total_size += info.get("size", 0)

        return {
            "success": True,
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_gb": total_size / (1024 * 1024 * 1024),
            "cache_dir": cache_dir
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting cache stats: {str(e)}"
        }


def main():
    parser = argparse.ArgumentParser(description="Manage OS image cache")
    parser.add_argument("action", choices=["get", "cache", "clean", "stats"], help="Action to perform")
    parser.add_argument("--url", help="Image URL (for get/cache actions)")
    parser.add_argument("--image-path", help="Path to image file (for cache action)")
    parser.add_argument("--hash", help="Expected hash for verification (for cache action)")
    parser.add_argument("--max-size-gb", type=float, default=10.0, help="Maximum cache size in GB (for clean action)")
    parser.add_argument("--max-age-days", type=int, default=30, help="Maximum age in days (for clean action)")
    parser.add_argument("--verify-hash", action="store_true", help="Verify hash when getting cached image")

    args = parser.parse_args()

    try:
        if args.action == "get":
            if not args.url:
                result = {"success": False, "error": "URL required for get action"}
            else:
                result = get_cached_image(args.url, verify_hash=args.verify_hash)

        elif args.action == "cache":
            if not args.url or not args.image_path:
                result = {"success": False, "error": "URL and image-path required for cache action"}
            else:
                result = cache_image(args.url, args.image_path, args.hash)

        elif args.action == "clean":
            result = clean_cache(args.max_size_gb, args.max_age_days)

        elif args.action == "stats":
            result = get_cache_stats()

        print(json.dumps(result))
        if not result.get("success"):
            sys.exit(1)

    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    main()
