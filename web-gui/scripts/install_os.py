#!/usr/bin/env python3
"""
Install OS image to SD card
Supports Windows, Linux, and macOS
"""
import sys
import platform
import subprocess
import json
import os
import argparse
import time
import traceback


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


def install_os_windows(image_path, device_id):
    """Install OS image on Windows using dd or similar tool"""
    try:
        progress("Initializing OS installation...", 0)
        progress(f"Image: {image_path}, Device: {device_id}", 5)

        # Extract disk number from device_id
        disk_num = None
        if "PhysicalDrive" in device_id:
            disk_num = device_id.split("PhysicalDrive")[1]
        else:
            return {"success": False, "error": f"Invalid device ID format: {device_id}"}

        # Check if image file exists
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        # On Windows, we need to use a tool like Win32DiskImager, dd for Windows, or similar
        # This is a placeholder implementation
        progress("Checking for available tools...", 10)

        # Try to use dd for Windows if available
        dd_paths = [
            "C:\\Program Files\\dd\\dd.exe",
            "C:\\Program Files (x86)\\dd\\dd.exe",
            "dd.exe",
        ]

        dd_exe = None
        for path in dd_paths:
            if os.path.exists(path):
                dd_exe = path
                break

        if not dd_exe:
            # Try to find it in PATH
            try:
                result = subprocess.run(
                    ["where", "dd"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                if result.returncode == 0:
                    dd_exe = result.stdout.strip().split('\n')[0]
            except (OSError, subprocess.SubprocessError):
                pass

        if not dd_exe:
            return {
                "success": False,
                "error": (
                    "dd tool not found. Please install dd for Windows or use "
                    "Raspberry Pi Imager for OS installation."
                ),
            }

        progress(f"Using dd tool: {dd_exe}", 15)
        progress("Writing image to SD card (this may take several minutes)...", 20)

        # Convert device ID to dd format
        # Windows: \\.\PhysicalDrive1 -> /dev/sdb (approximate)
        # Note: This is a simplified approach - actual implementation would need
        # proper device mapping

        # For now, return a message indicating manual installation is needed
        return {
            "success": False,
            "error": (
                "Automatic OS installation on Windows requires additional setup. "
                "Please use Raspberry Pi Imager or dd for Windows manually. "
                "Command would be: dd if=<image> of=\\.\\PhysicalDrive<num> bs=4M"
            ),
        }

    except Exception as e:
        error_debug(
            "Windows installation failed",
            exception=e,
            context={
                "image_path": image_path,
                "device_id": device_id,
                "platform": platform.system(),
                "python_version": sys.version
            }
        )
        return {
            "success": False,
            "error": f"Error installing OS: {str(e)}",
            "debug_info": {
                "exception_type": type(e).__name__,
                "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            }
        }


def install_os_linux(image_path, device_id):
    """Install OS image on Linux using dd"""
    try:
        progress("Initializing OS installation...", 0)
        progress(f"Image: {image_path}, Device: {device_id}", 5)

        # Check if running as root/sudo
        if os.geteuid() != 0:
            return {
                "success": False,
                "error": "Root privileges required. Please run with sudo or as root user.",
            }

        # Check if image file exists
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        # Unmount any mounted partitions
        progress("Unmounting partitions...", 10)
        try:
            subprocess.run(
                ["umount", "-f", device_id + "*"],
                capture_output=True,
                timeout=10,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            pass

        progress("Writing image to SD card (this may take several minutes)...", 20)

        # Use dd to write image
        # Note: Using conv=fsync to ensure data is written
        result = subprocess.run(
            [
                "dd",
                f"if={image_path}",
                f"of={device_id}",
                "bs=4M",
                "status=progress",
                "conv=fsync",
            ],
            capture_output=True,
            text=True,
            timeout=1800,  # 30 minutes timeout
            check=False,
        )

        if result.returncode == 0:
            progress("OS installation completed successfully!", 100)
            return {
                "success": True,
                "message": f"OS image installed successfully to {device_id}",
            }
        else:
            error_msg = result.stderr or result.stdout or "Unknown error"
            error_debug(
                "Linux dd command failed",
                context={
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "command": f"dd if={image_path} of={device_id} bs=4M status=progress conv=fsync",
                    "image_path": image_path,
                    "device_id": device_id
                }
            )
            return {
                "success": False,
                "error": f"Installation failed: {error_msg}",
                "debug_info": {
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "command": f"dd if={image_path} of={device_id} bs=4M status=progress conv=fsync"
                }
            }

    except subprocess.TimeoutExpired as e:
        error_debug(
            "Linux installation timed out",
            exception=e,
            context={
                "image_path": image_path,
                "device_id": device_id,
                "timeout": 1800
            }
        )
        return {
            "success": False,
            "error": "Installation operation timed out",
            "debug_info": {
                "exception_type": "TimeoutExpired",
                "timeout_seconds": 1800
            }
        }
    except Exception as e:
        error_debug(
            "Linux installation failed",
            exception=e,
            context={
                "image_path": image_path,
                "device_id": device_id,
                "platform": platform.system()
            }
        )
        return {
            "success": False,
            "error": f"Error installing OS: {str(e)}",
            "debug_info": {
                "exception_type": type(e).__name__,
                "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            }
        }


def install_os_macos(image_path, device_id):
    """Install OS image on macOS using dd"""
    try:
        progress("Initializing OS installation...", 0)
        progress(f"Image: {image_path}, Device: {device_id}", 5)

        # Check if image file exists
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        # Unmount the disk first
        progress("Unmounting disk...", 10)
        subprocess.run(
            ["diskutil", "unmountDisk", "force", device_id],
            capture_output=True,
            timeout=30,
            check=False,
        )

        progress("Writing image to SD card (this may take several minutes)...", 20)

        # Use dd to write image
        # Get the raw device (rdisk instead of disk for faster writes)
        raw_device = device_id.replace("/dev/disk", "/dev/rdisk")

        result = subprocess.run(
            [
                "dd",
                f"if={image_path}",
                f"of={raw_device}",
                "bs=4m",
                "status=progress",
            ],
            capture_output=True,
            text=True,
            timeout=1800,  # 30 minutes timeout
            check=False,
        )

        if result.returncode == 0:
            progress("OS installation completed successfully!", 100)
            return {
                "success": True,
                "message": f"OS image installed successfully to {device_id}",
            }
        else:
            error_msg = result.stderr or result.stdout or "Unknown error"
            error_debug(
                "macOS dd command failed",
                context={
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "command": f"dd if={image_path} of={raw_device} bs=4m status=progress",
                    "image_path": image_path,
                    "device_id": device_id,
                    "raw_device": raw_device
                }
            )
            return {
                "success": False,
                "error": f"Installation failed: {error_msg}",
                "debug_info": {
                    "returncode": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "command": f"dd if={image_path} of={raw_device} bs=4m status=progress"
                }
            }

    except subprocess.TimeoutExpired as e:
        error_debug(
            "macOS installation timed out",
            exception=e,
            context={
                "image_path": image_path,
                "device_id": device_id,
                "timeout": 1800
            }
        )
        return {
            "success": False,
            "error": "Installation operation timed out",
            "debug_info": {
                "exception_type": "TimeoutExpired",
                "timeout_seconds": 1800
            }
        }
    except Exception as e:
        error_debug(
            "macOS installation failed",
            exception=e,
            context={
                "image_path": image_path,
                "device_id": device_id,
                "platform": platform.system()
            }
        )
        return {
            "success": False,
            "error": f"Error installing OS: {str(e)}",
            "debug_info": {
                "exception_type": type(e).__name__,
                "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            }
        }


def main():
    parser = argparse.ArgumentParser(description="Install OS image to SD card")
    parser.add_argument("image_path", help="Path to OS image file")
    parser.add_argument("device_id", help="Device ID (e.g., /dev/sdb or \\\\.\\PhysicalDrive1)")

    args = parser.parse_args()

    system = platform.system()

    try:
        if system == "Windows":
            result = install_os_windows(args.image_path, args.device_id)
        elif system == "Linux":
            result = install_os_linux(args.image_path, args.device_id)
        elif system == "Darwin":  # macOS
            result = install_os_macos(args.image_path, args.device_id)
        else:
            result = {"success": False, "error": f"Unsupported platform: {system}"}

        print(json.dumps(result))
        if not result.get("success"):
            sys.exit(1)

    except Exception as e:
        error_debug(
            "Main installation process failed",
            exception=e,
            context={
                "system": system,
                "image_path": args.image_path,
                "device_id": args.device_id,
                "python_version": sys.version,
                "platform": platform.platform()
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
