#!/usr/bin/env python3
"""
Download OS image from URL
Supports direct image URLs and directory listings
Integrated with image cache and decompression
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


def find_image_url(base_url, depth=0, max_depth=3):
    """Find the actual image file URL from a directory listing"""
    if depth > max_depth:
        return None

    try:
        progress("Scanning directory listing...", 5)

        # Try to get directory listing
        req = urllib.request.Request(base_url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        with urllib.request.urlopen(req, timeout=30) as response:
            html = response.read().decode('utf-8', errors='ignore')

        # First, look for image files directly in this directory
        # Try multiple patterns to catch different directory listing formats
        # Apache directory listings, nginx, and custom formats
        # Note: Raspberry Pi OS images can be .img, .img.xz, .img.gz, or .zip files
        img_patterns = [
            # Standard href patterns - include .zip files
            r'<a[^>]*href=["\']([^"\']*\.(?:img(?:\.xz|\.gz)?|zip))["\']',
            r'href=["\']([^"\']*\.(?:img(?:\.xz|\.gz)?|zip))["\']',
            # Table row patterns (Apache directory listing)
            r'<tr[^>]*>.*?<a[^>]*href=["\']([^"\']*\.(?:img(?:\.xz|\.gz)?|zip))["\']',
            # Direct file links
            r'<a[^>]*>([^<]*\.(?:img(?:\.xz|\.gz)?|zip))</a>',
            # Text content patterns
            r'>([^<\s]+\.(?:img(?:\.xz|\.gz)?|zip))<',
        ]

        all_matches = []
        for pattern in img_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
            if matches:
                all_matches.extend(matches)

        if all_matches:
            # Filter and clean matches
            valid_matches = []
            for match in all_matches:
                # Clean up the match
                match = match.strip().strip('"').strip("'").strip()
                # Must end with .img, .img.xz, .img.gz, or .zip
                if re.search(r'\.(?:img(?:\.xz|\.gz)?|zip)$', match, re.IGNORECASE):
                    # Exclude checksum and signature files
                    if not re.search(r'\.(sha1|sha256|sig|torrent)$', match, re.IGNORECASE):
                        # Exclude matches that are clearly not filenames
                        if '/' not in match or match.count('/') <= 1:  # Allow one level of path
                            valid_matches.append(match)

            if valid_matches:
                # Remove duplicates while preserving order
                seen = set()
                unique_matches = []
                for m in valid_matches:
                    if m.lower() not in seen:
                        seen.add(m.lower())
                        unique_matches.append(m)

                # Prefer .img.xz, .img.gz, or .zip over .img (compressed is more common)
                img_file = None
                for match in unique_matches:
                    if match.lower().endswith('.img.xz') or match.lower().endswith('.img.gz') or match.lower().endswith('.zip'):
                        img_file = match
                        break
                if not img_file:
                    img_file = unique_matches[0]

                # Construct full URL
                if not img_file.startswith('http'):
                    # Relative URL, make it absolute
                    if base_url.endswith('/'):
                        img_url = base_url + img_file.lstrip('/')
                    else:
                        img_url = base_url + '/' + img_file.lstrip('/')
                else:
                    img_url = img_file

                progress(f"Found image: {img_file}", 10)
                return img_url

        # If no direct .img files found, look for date folders (Raspberry Pi OS structure)
        # Pattern: raspios_armhf-2024-01-15/ or similar
        date_folder_patterns = [
            r'<a[^>]*href=["\']([^"\']*raspios[^"\']*-\d{4}-\d{2}-\d{2}[^"\']*/)["\']',
            r'href=["\']([^"\']*raspios[^"\']*-\d{4}-\d{2}-\d{2}[^"\']*/)["\']',
            r'>([^<]*raspios[^<]*-\d{4}-\d{2}-\d{2}[^<]*/)<',
            # Also try without the trailing slash
            r'<a[^>]*href=["\']([^"\']*raspios[^"\']*-\d{4}-\d{2}-\d{2}[^"\']*)["\']',
        ]

        date_folders = []
        for pattern in date_folder_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            if matches:
                date_folders.extend(matches)
                break  # Use first pattern that finds matches

        if date_folders:
            # Get the most recent date folder (usually first in listing)
            date_folder = date_folders[0]
            date_folder = date_folder.strip().strip('"').strip("'")

            # Ensure it ends with /
            if not date_folder.endswith('/'):
                date_folder += '/'

            if not date_folder.startswith('http'):
                if base_url.endswith('/'):
                    folder_url = base_url + date_folder.lstrip('/')
                else:
                    folder_url = base_url + '/' + date_folder.lstrip('/')
            else:
                folder_url = date_folder

            progress(f"Found date folder: {date_folder}, scanning for image...", 8)

            # Recursively search in the date folder
            result = find_image_url(folder_url, depth + 1, max_depth)
            if result:
                return result

            # Fallback: Try common filename patterns based on folder name
            # Raspberry Pi OS images often follow a pattern like:
            # raspios_lite_arm64-2020-08-24/2020-08-20-raspios-buster-arm64-lite.img.xz
            # or raspios_lite_arm64-2020-08-24/raspios_lite_arm64-2020-08-24.img.xz
            folder_name = date_folder.rstrip('/').split('/')[-1]
            if folder_name:
                progress(f"Trying fallback pattern matching for folder: {folder_name}", 9)

                # Extract components from folder name
                date_match = re.search(r'(\d{4}-\d{2}-\d{2})', folder_name)
                date_str = date_match.group(1) if date_match else None

                # Try to extract version (buster, bullseye, bookworm, etc.)
                # The version might not be in the folder name, so we'll try common versions
                # Common Raspberry Pi OS versions: buster, bullseye, bookworm
                common_versions = ['buster', 'bullseye', 'bookworm', 'stretch', 'jessie']
                version = None
                for v in common_versions:
                    if v in folder_name.lower():
                        version = v
                        break

                # Try to extract architecture
                arch_match = re.search(r'(arm64|armhf|armv6)', folder_name, re.IGNORECASE)
                arch = arch_match.group(1) if arch_match else None

                # Check if it's lite version
                is_lite = 'lite' in folder_name.lower()

                # Build comprehensive list of patterns to try
                common_patterns = []

                # Pattern 1: Direct folder name
                common_patterns.extend([
                    f"{folder_name}.img.xz",
                    f"{folder_name}.img.gz",
                    f"{folder_name}.img",
                ])

                # Pattern 2: Date-based patterns (most common for Raspberry Pi OS)
                if date_str and arch:
                    # Try with all common versions if version not found in folder name
                    versions_to_try = [version] if version else common_versions

                    for ver in versions_to_try:
                        if is_lite:
                            common_patterns.extend([
                                f"{date_str}-raspios-{ver}-{arch}-lite.img.xz",
                                f"{date_str}-raspios-{ver}-{arch}-lite.img.gz",
                                f"{date_str}-raspios-{ver}-{arch}-lite.img",
                            ])
                        common_patterns.extend([
                            f"{date_str}-raspios-{ver}-{arch}.img.xz",
                            f"{date_str}-raspios-{ver}-{arch}.img.gz",
                            f"{date_str}-raspios-{ver}-{arch}.img",
                        ])

                    # Try with just date and arch (no version)
                    if is_lite:
                        common_patterns.extend([
                            f"{date_str}-raspios-{arch}-lite.img.xz",
                            f"{date_str}-raspios-{arch}-lite.img.gz",
                        ])
                    common_patterns.extend([
                        f"{date_str}-raspios-{arch}.img.xz",
                        f"{date_str}-raspios-{arch}.img.gz",
                    ])

                # Pattern 3: Try all files in directory by fetching HTML and extracting all .img links
                # This is the most reliable method - directly parse the HTML
                # We'll prioritize these patterns since they're actually in the HTML
                html_found_patterns = []
                try:
                    req = urllib.request.Request(folder_url)
                    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                    with urllib.request.urlopen(req, timeout=30) as response:
                        html = response.read().decode('utf-8', errors='ignore')
                        # Extract all .img and .zip file links from HTML using multiple patterns
                        img_patterns = [
                            r'<a[^>]*href=["\']([^"\']*\.(?:img(?:\.xz|\.gz)?|zip))["\']',
                            r'href=["\']([^"\']*\.(?:img(?:\.xz|\.gz)?|zip))["\']',
                            r'>([^<\s]+\.(?:img(?:\.xz|\.gz)?|zip))<',
                            # Also try table-based directory listings
                            r'<tr[^>]*>.*?<a[^>]*href=["\']([^"\']*\.(?:img(?:\.xz|\.gz)?|zip))["\']',
                            # Try text content between tags
                            r'<a[^>]*>([^<]*\.(?:img(?:\.xz|\.gz)?|zip))</a>',
                        ]
                        img_links = []
                        for pattern in img_patterns:
                            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
                            img_links.extend(matches)

                        # Clean and deduplicate
                        seen_links = set()
                        for link in img_links:
                            link = link.strip().strip('"').strip("'").strip()
                            # Must be a valid image file (.img, .img.xz, .img.gz, or .zip)
                            # Exclude checksum and signature files
                            if link and re.search(r'\.(?:img(?:\.xz|\.gz)?|zip)$', link, re.IGNORECASE):
                                if not re.search(r'\.(sha1|sha256|sig|torrent)$', link, re.IGNORECASE):
                                    link_lower = link.lower()
                                    if link_lower not in seen_links:
                                        seen_links.add(link_lower)
                                        # Extract just the filename if it's a full path
                                        if '/' in link:
                                            filename = link.split('/')[-1]
                                            # Prefer the filename over the full path
                                            if filename not in html_found_patterns:
                                                html_found_patterns.append(filename)
                                        else:
                                            if link not in html_found_patterns:
                                                html_found_patterns.append(link)

                        if html_found_patterns:
                            progress(f"Found {len(html_found_patterns)} image file(s) in HTML", 9)
                            # Prepend HTML-found patterns to the front of the list (try these first)
                            common_patterns = html_found_patterns + common_patterns
                        else:
                            progress("No image files found in HTML, trying constructed patterns", 9)
                except Exception as e:
                    progress(f"Could not parse HTML from date folder: {str(e)}", None)
                    pass  # If we can't fetch HTML, continue with other patterns

                # Try each pattern
                progress(f"Trying {len(common_patterns)} filename patterns...", 9)
                for i, pattern in enumerate(common_patterns):
                    # Skip empty patterns
                    if not pattern or not pattern.strip():
                        continue

                    test_url = folder_url.rstrip('/') + '/' + pattern.lstrip('/')
                    try:
                        # First try HEAD request (faster)
                        req = urllib.request.Request(test_url)
                        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                        req.get_method = lambda: 'HEAD'
                        try:
                            with urllib.request.urlopen(req, timeout=10) as response:
                                if response.status == 200:
                                    progress(f"Found image: {pattern}", 10)
                                    return test_url
                        except urllib.error.HTTPError as e:
                            if e.code == 405:  # Method not allowed, try GET instead
                                # Try GET with range header (only download first few bytes)
                                req = urllib.request.Request(test_url)
                                req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                                req.add_header('Range', 'bytes=0-1023')  # Only request first 1KB
                                try:
                                    with urllib.request.urlopen(req, timeout=10) as response:
                                        if response.status in (200, 206):  # 206 = Partial Content
                                            progress(f"Found image: {pattern}", 10)
                                            return test_url
                                except:
                                    continue
                            elif e.code == 404:
                                continue  # File doesn't exist, try next
                            else:
                                continue  # Other error, try next
                        except urllib.error.URLError:
                            continue  # Network error, try next
                    except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
                        continue  # Try next pattern

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

    # Import cache and decompression modules (after progress function is defined)
    try:
        # Add scripts directory to path for imports
        script_dir = os.path.dirname(os.path.abspath(__file__))
        if script_dir not in sys.path:
            sys.path.insert(0, script_dir)

        from image_cache import get_cached_image, cache_image
        from decompress_image import decompress_image
        HAS_CACHE = True
    except ImportError:
        HAS_CACHE = False
        progress("Image cache and decompression modules not available, using basic download", 0)

    try:
        progress("Initializing image download...", 0)

        # Determine if URL is a directory or direct file
        url_lower = args.url.lower()
        is_direct_image = url_lower.endswith('.img') or url_lower.endswith('.img.xz') or url_lower.endswith('.img.gz') or url_lower.endswith('.zip')

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

        # Check cache first if available
        cached_result = None
        if HAS_CACHE:
            progress("Checking image cache...", 5)
            cached_result = get_cached_image(image_url, verify_hash=True)
            if cached_result.get("success"):
                cached_path = cached_result.get("cached_path")
                progress(f"Using cached image: {cached_path}", 10)

                # Check if cached image is compressed and needs decompression
                if cached_path.endswith('.xz') or cached_path.endswith('.gz'):
                    progress("Decompressing cached image...", 15)
                    # Determine decompressed output path
                    if args.output:
                        decompressed_path = args.output
                    else:
                        decompressed_path = cached_path[:-3] if cached_path.endswith('.xz') or cached_path.endswith('.gz') else cached_path

                    decompress_result = decompress_image(cached_path, decompressed_path, remove_source=False)
                    if decompress_result.get("success"):
                        # Cache the decompressed image too
                        cache_image(image_url, decompressed_path)
                        result = {
                            "success": True,
                            "message": f"Image loaded from cache and decompressed",
                            "image_path": decompressed_path,
                            "cached": True
                        }
                        print(json.dumps(result))
                        return
                    else:
                        progress("Decompression failed, will re-download", 10)
                else:
                    # Cached image is already decompressed
                    result = {
                        "success": True,
                        "message": f"Image loaded from cache",
                        "image_path": cached_path,
                        "cached": True
                    }
                    print(json.dumps(result))
                    return

        # Determine output path
        if args.output:
            output_path = args.output
        else:
            # Create temp file with appropriate extension
            if image_url.endswith('.xz'):
                ext = '.img.xz'
            elif image_url.endswith('.gz'):
                ext = '.img.gz'
            elif image_url.endswith('.zip'):
                ext = '.zip'
            else:
                ext = '.img'
            temp_dir = tempfile.gettempdir()
            output_path = os.path.join(temp_dir, f"raspberry_pi_image{ext}")

        # Download the file
        def progress_callback(msg, percent):
            progress(msg, percent)

        success = download_file(image_url, output_path, progress_callback)

        if success:
            # Verify checksum if available (optional - don't fail if verification unavailable)
            try:
                from verify_image import verify_hash, calculate_hash
                # Try to verify if checksum URL is available
                checksum_url = image_url + ".sha256"
                # For now, just calculate hash for caching purposes
                # Full verification would require checksum file download
                calculated_hash = calculate_hash(output_path, "sha256")
                if calculated_hash:
                    progress(f"Image hash: {calculated_hash[:16]}...", 94)
            except ImportError:
                pass  # Verification module not available, skip
            except Exception as e:
                # Don't fail download if verification fails
                pass  # Silently skip verification errors
            # Cache the downloaded image if cache is available
            if HAS_CACHE:
                progress("Caching downloaded image...", 95)
                cache_result = cache_image(image_url, output_path)
                if cache_result.get("success"):
                    progress("Image cached successfully", 96)

            # Check if downloaded image is compressed or zipped
            is_compressed = output_path.endswith('.xz') or output_path.endswith('.gz')
            is_zipped = output_path.endswith('.zip')
            final_path = output_path

            if is_zipped:
                # Extract ZIP file
                progress("Extracting ZIP archive...", 97)
                import zipfile
                try:
                    # Extract to same directory as zip file
                    extract_dir = os.path.dirname(output_path)
                    with zipfile.ZipFile(output_path, 'r') as zip_ref:
                        # Find .img file in the zip
                        img_files = [f for f in zip_ref.namelist() if f.endswith('.img')]
                        if not img_files:
                            raise Exception("No .img file found in ZIP archive")
                        # Extract the first .img file found
                        img_file = img_files[0]
                        zip_ref.extract(img_file, extract_dir)
                        final_path = os.path.join(extract_dir, img_file)
                        progress(f"Extracted {img_file} from ZIP", 98)
                        # Optionally remove the zip file to save space
                        # os.remove(output_path)
                except Exception as e:
                    result = {
                        "success": False,
                        "error": f"Failed to extract ZIP file: {str(e)}"
                    }
                    print(json.dumps(result))
                    sys.exit(1)
            elif is_compressed:
                progress("Decompressing image...", 97)
                # Determine decompressed output path
                if args.output:
                    decompressed_path = args.output
                else:
                    decompressed_path = output_path[:-3] if output_path.endswith('.xz') or output_path.endswith('.gz') else output_path

                decompress_result = decompress_image(output_path, decompressed_path, remove_source=False)
                if decompress_result.get("success"):
                    final_path = decompressed_path
                    # Cache the decompressed image too
                    if HAS_CACHE:
                        cache_image(image_url, decompressed_path)
                else:
                    progress("Warning: Decompression failed, compressed image will be used", 98)

            progress("Image download completed successfully!", 100)
            result = {
                "success": True,
                "message": f"Image downloaded successfully to {final_path}",
                "image_path": final_path,
                "compressed": is_compressed
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
