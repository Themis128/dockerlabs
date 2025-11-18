#!/usr/bin/env python3
"""
Decompress OS image files
Supports .xz and .gz compressed formats
"""
import sys
import os
import json
import argparse
import subprocess
import traceback
from pathlib import Path


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


def decompress_xz(input_path: str, output_path: str) -> dict:
    """
    Decompress .xz file using xz command or Python lzma module

    Args:
        input_path: Path to compressed .xz file
        output_path: Path to output decompressed file

    Returns:
        Dictionary with success status
    """
    try:
        progress("Decompressing .xz file...", 10)

        # Try using xz command first (faster)
        try:
            result = subprocess.run(
                ["xz", "-d", "-c", input_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=3600,  # 1 hour timeout
                check=False,
            )

            if result.returncode == 0:
                # Write output to file
                with open(output_path, 'wb') as f:
                    f.write(result.stdout)
                progress("Decompression completed!", 100)
                return {
                    "success": True,
                    "message": f"Decompressed {input_path} to {output_path}",
                    "output_path": output_path
                }
            else:
                # Fall back to Python lzma
                progress("xz command failed, using Python lzma module...", 20)
        except FileNotFoundError:
            # xz command not available, use Python lzma
            progress("xz command not found, using Python lzma module...", 20)

        # Use Python lzma module as fallback
        import lzma

        input_size = os.path.getsize(input_path)
        decompressed_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks

        with lzma.open(input_path, 'rb') as f_in:
            with open(output_path, 'wb') as f_out:
                while True:
                    chunk = f_in.read(chunk_size)
                    if not chunk:
                        break
                    f_out.write(chunk)
                    decompressed_size += len(chunk)

                    # Update progress (20-90%)
                    if input_size > 0:
                        # Estimate progress based on input read
                        # Note: This is approximate since we don't know final size
                        progress_percent = 20 + int((decompressed_size / (input_size * 2)) * 70)
                        progress(f"Decompressed {decompressed_size / (1024*1024):.1f} MB...", progress_percent)

        progress("Decompression completed!", 100)
        return {
            "success": True,
            "message": f"Decompressed {input_path} to {output_path}",
            "output_path": output_path
        }

    except Exception as e:
        error_debug("Error decompressing .xz file", exception=e, context={
            "input_path": input_path,
            "output_path": output_path
        })
        return {
            "success": False,
            "error": f"Error decompressing .xz file: {str(e)}"
        }


def decompress_gz(input_path: str, output_path: str) -> dict:
    """
    Decompress .gz file using gzip command or Python gzip module

    Args:
        input_path: Path to compressed .gz file
        output_path: Path to output decompressed file

    Returns:
        Dictionary with success status
    """
    try:
        progress("Decompressing .gz file...", 10)

        # Try using gzip command first (faster)
        try:
            result = subprocess.run(
                ["gzip", "-d", "-c", input_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=3600,  # 1 hour timeout
                check=False,
            )

            if result.returncode == 0:
                # Write output to file
                with open(output_path, 'wb') as f:
                    f.write(result.stdout)
                progress("Decompression completed!", 100)
                return {
                    "success": True,
                    "message": f"Decompressed {input_path} to {output_path}",
                    "output_path": output_path
                }
            else:
                # Fall back to Python gzip
                progress("gzip command failed, using Python gzip module...", 20)
        except FileNotFoundError:
            # gzip command not available, use Python gzip
            progress("gzip command not found, using Python gzip module...", 20)

        # Use Python gzip module as fallback
        import gzip

        input_size = os.path.getsize(input_path)
        decompressed_size = 0
        chunk_size = 1024 * 1024  # 1MB chunks

        with gzip.open(input_path, 'rb') as f_in:
            with open(output_path, 'wb') as f_out:
                while True:
                    chunk = f_in.read(chunk_size)
                    if not chunk:
                        break
                    f_out.write(chunk)
                    decompressed_size += len(chunk)

                    # Update progress (20-90%)
                    if input_size > 0:
                        # Estimate progress based on input read
                        progress_percent = 20 + int((decompressed_size / (input_size * 2)) * 70)
                        progress(f"Decompressed {decompressed_size / (1024*1024):.1f} MB...", progress_percent)

        progress("Decompression completed!", 100)
        return {
            "success": True,
            "message": f"Decompressed {input_path} to {output_path}",
            "output_path": output_path
        }

    except Exception as e:
        error_debug("Error decompressing .gz file", exception=e, context={
            "input_path": input_path,
            "output_path": output_path
        })
        return {
            "success": False,
            "error": f"Error decompressing .gz file: {str(e)}"
        }


def decompress_image(input_path: str, output_path: str = None, remove_source: bool = False) -> dict:
    """
    Decompress image file (auto-detect format)

    Args:
        input_path: Path to compressed image file
        output_path: Optional output path (default: remove compression extension)
        remove_source: Whether to remove source file after decompression

    Returns:
        Dictionary with success status and output path
    """
    try:
        if not os.path.exists(input_path):
            return {
                "success": False,
                "error": f"Input file not found: {input_path}"
            }

        # Determine output path
        if output_path is None:
            if input_path.endswith('.xz'):
                output_path = input_path[:-3]  # Remove .xz
            elif input_path.endswith('.gz'):
                output_path = input_path[:-3]  # Remove .gz
            else:
                return {
                    "success": False,
                    "error": f"Unknown compression format: {input_path}"
                }

        # Check if output already exists
        if os.path.exists(output_path):
            return {
                "success": False,
                "error": f"Output file already exists: {output_path}"
            }

        progress(f"Input: {input_path}", 5)
        progress(f"Output: {output_path}", 5)

        # Decompress based on extension
        if input_path.endswith('.xz'):
            result = decompress_xz(input_path, output_path)
        elif input_path.endswith('.gz'):
            result = decompress_gz(input_path, output_path)
        else:
            return {
                "success": False,
                "error": f"Unsupported compression format: {input_path}"
            }

        # Remove source file if requested
        if result.get("success") and remove_source:
            try:
                os.remove(input_path)
                progress("Source file removed", 100)
            except OSError:
                pass  # Ignore removal errors

        return result

    except Exception as e:
        error_debug("Error decompressing image", exception=e, context={
            "input_path": input_path,
            "output_path": output_path
        })
        return {
            "success": False,
            "error": f"Error decompressing image: {str(e)}"
        }


def main():
    parser = argparse.ArgumentParser(description="Decompress OS image files")
    parser.add_argument("input_path", help="Path to compressed image file")
    parser.add_argument("--output", help="Output file path (optional, defaults to removing compression extension)")
    parser.add_argument("--remove-source", action="store_true", help="Remove source file after decompression")

    args = parser.parse_args()

    try:
        result = decompress_image(args.input_path, args.output, args.remove_source)
        print(json.dumps(result))
        if not result.get("success"):
            sys.exit(1)

    except Exception as e:
        error_debug(
            "Main decompression process failed",
            exception=e,
            context={
                "input_path": args.input_path,
                "output_path": args.output
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
