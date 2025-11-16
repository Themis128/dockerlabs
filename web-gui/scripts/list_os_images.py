#!/usr/bin/env python3
"""
List available OS images for Raspberry Pi
Can fetch from local directory or provide static list
"""
import sys
import json
import os
import argparse
from typing import List, Dict, Any


def get_local_images(images_dir: str) -> List[Dict[str, Any]]:
    """
    Scan local directory for OS image files

    Args:
        images_dir: Directory to scan for image files

    Returns:
        List of image dictionaries
    """
    images = []

    if not os.path.exists(images_dir):
        return images

    # Common image file extensions
    image_extensions = [".img", ".zip", ".xz", ".gz"]

    try:
        for filename in os.listdir(images_dir):
            filepath = os.path.join(images_dir, filename)
            if not os.path.isfile(filepath):
                continue

            # Check if it's an image file
            _, ext = os.path.splitext(filename)
            if ext.lower() not in image_extensions:
                continue

            # Get file size
            size_bytes = os.path.getsize(filepath)
            size_mb = size_bytes / (1024 * 1024)
            size_gb = size_bytes / (1024 * 1024 * 1024)

            # Try to determine image type from filename
            name_lower = filename.lower()
            image_type = "Unknown"
            if "raspios" in name_lower or "raspberry" in name_lower:
                if "lite" in name_lower:
                    image_type = "Raspberry Pi OS Lite"
                else:
                    image_type = "Raspberry Pi OS"
            elif "ubuntu" in name_lower:
                image_type = "Ubuntu"
            elif "debian" in name_lower:
                image_type = "Debian"

            # Determine architecture
            arch = "Unknown"
            if "arm64" in name_lower or "aarch64" in name_lower:
                arch = "64-bit"
            elif "armhf" in name_lower or "armv7" in name_lower:
                arch = "32-bit"

            images.append({
                "id": filename,
                "name": f"{image_type} ({arch})",
                "filename": filename,
                "path": filepath,
                "size_bytes": size_bytes,
                "size_mb": round(size_mb, 2),
                "size_gb": round(size_gb, 2),
                "size": f"~{round(size_gb, 1)}GB" if size_gb >= 1 else f"~{round(size_mb, 0)}MB",
                "type": image_type,
                "architecture": arch,
            })
    except (OSError, PermissionError) as e:
        print(f"Error scanning directory: {e}", file=sys.stderr)

    return images


def get_static_images() -> List[Dict[str, Any]]:
    """
    Get static list of common Raspberry Pi OS images

    Returns:
        List of image dictionaries
    """
    return [
        {
            "id": "raspios_lite_armhf",
            "name": "Raspberry Pi OS Lite (32-bit)",
            "size": "~500MB",
            "download_url": "https://downloads.raspberrypi.org/raspios_lite_armhf/images/",
        },
        {
            "id": "raspios_armhf",
            "name": "Raspberry Pi OS with Desktop (32-bit)",
            "size": "~2.5GB",
            "download_url": "https://downloads.raspberrypi.org/raspios_armhf/images/",
        },
        {
            "id": "raspios_lite_arm64",
            "name": "Raspberry Pi OS Lite (64-bit)",
            "size": "~500MB",
            "download_url": "https://downloads.raspberrypi.org/raspios_lite_arm64/images/",
        },
        {
            "id": "raspios_arm64",
            "name": "Raspberry Pi OS with Desktop (64-bit)",
            "size": "~2.5GB",
            "download_url": "https://downloads.raspberrypi.org/raspios_arm64/images/",
        },
    ]


def main():
    parser = argparse.ArgumentParser(description="List available OS images")
    parser.add_argument(
        "--images-dir",
        type=str,
        help="Directory to scan for local OS images",
    )
    parser.add_argument(
        "--include-static",
        action="store_true",
        help="Include static list of common images",
    )

    args = parser.parse_args()

    images = []

    # Get local images if directory specified
    if args.images_dir:
        local_images = get_local_images(args.images_dir)
        images.extend(local_images)

    # Include static images if requested or if no local images found
    if args.include_static or not images:
        static_images = get_static_images()
        images.extend(static_images)

    print(json.dumps({"success": True, "images": images}))


if __name__ == "__main__":
    main()








