#!/usr/bin/env python3
"""
Download OS image from URL
Supports direct image URLs and directory listings
"""
import sys
import os
import json
import argparse
import urllib.request
import urllib.parse
import re
import tempfile
from pathlib import Path


def progress(message, percent=None):
    """Output progress message in JSON format"""
    progress_data = {"type": "progress", "message": message}
    if percent is not None:
        progress_data["percent"] = percent
    print(json.dumps(progress_data), flush=True)


def find_image_url(base_url):
    """Find the actual image file URL from a directory listing"""
    try:
        progress("Scanning directory listing...", 5)

        # Try to get directory listing
        with urllib.request.urlopen(base_url, timeout=30) as response:
            html = response.read().decode('utf-8', errors='ignore')

        # Look for .img or .img.xz files in the HTML
        # Raspberry Pi downloads typically have links like: raspios_armhf-2024-01-15.img.xz
        img_patterns = [
            r'href="([^"]+\.img(?:\.xz)?)"',
            r'<a[^>]+href="([^"]+\.img(?:\.xz)?)"',
        ]

        for pattern in img_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                # Get the most recent/latest image (usually the first one in directory listing)
                img_file = matches[0]
                if not img_file.startswith('http'):
                    # Relative URL, make it absolute
                    if base_url.endswith('/'):
                        img_url = base_url + img_file
                    else:
                        img_url = base_url + '/' + img_file
                else:
                    img_url = img_file

                progress(f"Found image: {img_file}", 10)
                return img_url

        # If no .img found, return None
        return None

    except Exception as e:
        progress(f"Error scanning directory: {str(e)}", None)
        return None


def download_file(url, destination, progress_callback=None):
    """Download a file with progress tracking"""
    try:
        progress(f"Starting download from {url}...", 15)

        # Get file size for progress calculation
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        with urllib.request.urlopen(req) as response:
            total_size = int(response.headers.get('Content-Length', 0))
            downloaded = 0
            block_size = 8192

            progress(f"File size: {total_size / (1024*1024):.1f} MB", 20)

            with open(destination, 'wb') as f:
                while True:
                    chunk = response.read(block_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)

                    if total_size > 0 and progress_callback:
                        percent = 20 + int((downloaded / total_size) * 70)  # 20-90%
                        progress_callback(f"Downloaded {downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB", percent)
                    elif progress_callback:
                        progress_callback(f"Downloaded {downloaded / (1024*1024):.1f} MB", None)

            progress("Download completed!", 95)
            return True

    except Exception as e:
        progress(f"Download error: {str(e)}", None)
        return False


def main():
    parser = argparse.ArgumentParser(description="Download OS image from URL")
    parser.add_argument("url", help="URL to download from (can be directory or direct image URL)")
    parser.add_argument("--output", help="Output file path (optional, will use temp file if not provided)")

    args = parser.parse_args()

    try:
        progress("Initializing image download...", 0)

        # Determine if URL is a directory or direct file
        url_lower = args.url.lower()
        is_direct_image = url_lower.endswith('.img') or url_lower.endswith('.img.xz') or url_lower.endswith('.img.gz')

        if is_direct_image:
            image_url = args.url
            progress(f"Direct image URL detected: {image_url}", 5)
        else:
            # Try to find image in directory listing
            progress(f"Directory URL detected, scanning for image files...", 5)
            image_url = find_image_url(args.url)

            if not image_url:
                result = {
                    "success": False,
                    "error": f"Could not find image file in directory listing: {args.url}"
                }
                print(json.dumps(result))
                sys.exit(1)

        # Determine output path
        if args.output:
            output_path = args.output
        else:
            # Create temp file with appropriate extension
            ext = '.img.xz' if image_url.endswith('.xz') else '.img.gz' if image_url.endswith('.gz') else '.img'
            temp_dir = tempfile.gettempdir()
            output_path = os.path.join(temp_dir, f"raspberry_pi_image{ext}")

        # Download the file
        def progress_callback(msg, percent):
            progress(msg, percent)

        success = download_file(image_url, output_path, progress_callback)

        if success:
            progress("Image download completed successfully!", 100)
            result = {
                "success": True,
                "message": f"Image downloaded successfully to {output_path}",
                "image_path": output_path
            }
            print(json.dumps(result))
        else:
            result = {
                "success": False,
                "error": "Download failed"
            }
            print(json.dumps(result))
            sys.exit(1)

    except Exception as e:
        result = {
            "success": False,
            "error": f"Error downloading image: {str(e)}"
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    main()



