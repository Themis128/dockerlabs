#!/usr/bin/env python3
"""
Verify OS image integrity using checksums
Supports SHA256, SHA512, MD5, and other hash algorithms
"""
import sys
import os
import json
import argparse
import hashlib
import traceback
from typing import Optional, Dict, Any


def progress(message, percent=None):
    """Output progress message in JSON format"""
    progress_data = {"type": "progress", "message": message}
    if percent is not None:
        progress_data["percent"] = percent
    print(json.dumps(progress_data), flush=True)


def error_debug(message, exception=None, context=None):
    """Output verbose error debugging information"""
    error_data = {
        "type": "error_debug",
        "message": message,
    }
    if exception:
        error_data["exception_type"] = type(exception).__name__
        error_data["exception_message"] = str(exception)
        error_data["traceback"] = ''.join(traceback.format_exception(type(exception), exception, exception.__traceback__))
    if context:
        error_data["context"] = context
    print(json.dumps(error_data), flush=True)


def calculate_hash(file_path: str, algorithm: str = "sha256", chunk_size: int = 8192) -> Optional[str]:
    """
    Calculate file hash using specified algorithm

    Args:
        file_path: Path to file
        algorithm: Hash algorithm (sha256, sha512, md5, etc.)
        chunk_size: Chunk size for reading file

    Returns:
        Hexadecimal hash string or None on error
    """
    try:
        # Validate algorithm
        if algorithm not in hashlib.algorithms_available:
            return None

        hash_obj = hashlib.new(algorithm)
        file_size = os.path.getsize(file_path)
        bytes_read = 0

        with open(file_path, 'rb') as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                hash_obj.update(chunk)
                bytes_read += len(chunk)

                # Update progress (0-90%)
                if file_size > 0:
                    progress_percent = int((bytes_read / file_size) * 90)
                    progress(f"Calculating {algorithm.upper()}: {bytes_read / (1024*1024):.1f} MB / {file_size / (1024*1024):.1f} MB", progress_percent)

        return hash_obj.hexdigest()

    except (OSError, IOError) as e:
        error_debug(f"Error calculating {algorithm} hash", exception=e, context={"file_path": file_path})
        return None
    except Exception as e:
        error_debug(f"Unexpected error calculating hash", exception=e, context={"file_path": file_path, "algorithm": algorithm})
        return None


def verify_hash(file_path: str, expected_hash: str, algorithm: str = "sha256") -> Dict[str, Any]:
    """
    Verify file hash against expected value

    Args:
        file_path: Path to file to verify
        expected_hash: Expected hash value (hexadecimal string)
        algorithm: Hash algorithm to use

    Returns:
        Dictionary with verification result
    """
    try:
        if not os.path.exists(file_path):
            return {
                "success": False,
                "error": f"File not found: {file_path}"
            }

        progress(f"Verifying {algorithm.upper()} checksum...", 0)
        progress(f"Expected: {expected_hash}", 5)

        actual_hash = calculate_hash(file_path, algorithm)
        if actual_hash is None:
            return {
                "success": False,
                "error": f"Failed to calculate {algorithm} hash"
            }

        progress(f"Calculated: {actual_hash}", 95)

        # Compare hashes (case-insensitive)
        if actual_hash.lower() == expected_hash.lower():
            progress("Checksum verification passed!", 100)
            return {
                "success": True,
                "message": "Checksum verification passed",
                "algorithm": algorithm,
                "hash": actual_hash
            }
        else:
            return {
                "success": False,
                "error": "Checksum mismatch",
                "algorithm": algorithm,
                "expected": expected_hash.lower(),
                "actual": actual_hash.lower()
            }

    except Exception as e:
        error_debug("Error verifying hash", exception=e, context={
            "file_path": file_path,
            "algorithm": algorithm
        })
        return {
            "success": False,
            "error": f"Error verifying hash: {str(e)}"
        }


def verify_from_checksum_file(image_path: str, checksum_file_path: str, algorithm: str = "sha256") -> Dict[str, Any]:
    """
    Verify image against checksum file

    Args:
        image_path: Path to image file
        checksum_file_path: Path to checksum file (format: hash filename)
        algorithm: Hash algorithm to use

    Returns:
        Dictionary with verification result
    """
    try:
        if not os.path.exists(image_path):
            return {
                "success": False,
                "error": f"Image file not found: {image_path}"
            }

        if not os.path.exists(checksum_file_path):
            return {
                "success": False,
                "error": f"Checksum file not found: {checksum_file_path}"
            }

        # Read checksum file
        with open(checksum_file_path, 'r', encoding='utf-8') as f:
            checksum_lines = f.readlines()

        # Find matching line (usually format: hash filename or hash *filename)
        image_filename = os.path.basename(image_path)
        expected_hash = None

        for line in checksum_lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            # Try different formats:
            # 1. hash filename
            # 2. hash *filename
            # 3. hash  filename (two spaces)
            parts = line.split()
            if len(parts) >= 2:
                hash_part = parts[0]
                file_part = parts[-1]

                # Check if this line matches our file
                if file_part == image_filename or file_part == f"*{image_filename}" or file_part.endswith(image_filename):
                    expected_hash = hash_part
                    break

        if not expected_hash:
            return {
                "success": False,
                "error": f"Could not find checksum for {image_filename} in checksum file"
            }

        # Verify using found hash
        return verify_hash(image_path, expected_hash, algorithm)

    except Exception as e:
        error_debug("Error verifying from checksum file", exception=e, context={
            "image_path": image_path,
            "checksum_file_path": checksum_file_path
        })
        return {
            "success": False,
            "error": f"Error verifying from checksum file: {str(e)}"
        }


def download_and_verify_checksum_file(image_url: str, checksum_url: str, algorithm: str = "sha256") -> Optional[str]:
    """
    Download checksum file and extract expected hash

    Args:
        image_url: URL of image file
        checksum_url: URL of checksum file
        algorithm: Hash algorithm to use

    Returns:
        Expected hash string or None
    """
    try:
        import urllib.request
        import tempfile

        # Download checksum file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as f:
            checksum_file_path = f.name

        try:
            urllib.request.urlretrieve(checksum_url, checksum_file_path)

            # Read and parse checksum file
            image_filename = os.path.basename(image_url)
            with open(checksum_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue

                    parts = line.split()
                    if len(parts) >= 2:
                        hash_part = parts[0]
                        file_part = parts[-1]

                        if file_part == image_filename or file_part == f"*{image_filename}" or file_part.endswith(image_filename):
                            return hash_part

            return None
        finally:
            try:
                os.unlink(checksum_file_path)
            except:
                pass

    except Exception as e:
        error_debug("Error downloading checksum file", exception=e)
        return None


def main():
    parser = argparse.ArgumentParser(description="Verify OS image integrity using checksums")
    parser.add_argument("image_path", help="Path to image file to verify")
    parser.add_argument("--hash", help="Expected hash value (hexadecimal)")
    parser.add_argument("--algorithm", default="sha256", choices=["sha256", "sha512", "md5", "sha1", "sha224", "sha384"],
                        help="Hash algorithm to use (default: sha256)")
    parser.add_argument("--checksum-file", help="Path to checksum file (format: hash filename)")
    parser.add_argument("--checksum-url", help="URL to download checksum file from")
    parser.add_argument("--image-url", help="Image URL (required if using --checksum-url)")

    args = parser.parse_args()

    try:
        if args.checksum_file:
            # Verify using checksum file
            result = verify_from_checksum_file(args.image_path, args.checksum_file, args.algorithm)
        elif args.checksum_url:
            # Download checksum file and verify
            if not args.image_url:
                result = {
                    "success": False,
                    "error": "--image-url required when using --checksum-url"
                }
            else:
                expected_hash = download_and_verify_checksum_file(args.image_url, args.checksum_url, args.algorithm)
                if expected_hash:
                    result = verify_hash(args.image_path, expected_hash, args.algorithm)
                else:
                    result = {
                        "success": False,
                        "error": "Could not extract hash from checksum file"
                    }
        elif args.hash:
            # Verify using provided hash
            result = verify_hash(args.image_path, args.hash, args.algorithm)
        else:
            # Just calculate hash without verification
            progress(f"Calculating {args.algorithm.upper()} hash...", 0)
            calculated_hash = calculate_hash(args.image_path, args.algorithm)
            if calculated_hash:
                progress("Hash calculation completed!", 100)
                result = {
                    "success": True,
                    "algorithm": args.algorithm,
                    "hash": calculated_hash,
                    "message": "Hash calculated successfully (no verification performed)"
                }
            else:
                result = {
                    "success": False,
                    "error": f"Failed to calculate {args.algorithm} hash"
                }

        print(json.dumps(result))
        if not result.get("success"):
            sys.exit(1)

    except Exception as e:
        error_debug(
            "Main verification process failed",
            exception=e,
            context={
                "image_path": args.image_path,
                "algorithm": args.algorithm
            }
        )
        error_result = {
            "success": False,
            "error": str(e),
            "debug_info": {
                "exception_type": type(e).__name__,
                "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            }
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main()
