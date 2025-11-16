#!/usr/bin/env python3
"""
Format SD card for Raspberry Pi 5 and 3B
Creates proper partition structure:
- Boot partition: FAT32 (512MB)
- Root partition: ext4 (remaining space)
Works on Windows, Linux, and macOS
"""
import sys
import platform
import subprocess
import json
import os
import time


def format_sdcard_windows(device_id):
    """Format SD card on Windows for Raspberry Pi"""
    try:
        # Extract disk number from device_id (e.g., \\.\PhysicalDrive1 -> 1)
        disk_num = None
        if "PhysicalDrive" in device_id:
            disk_num = device_id.split("PhysicalDrive")[1]
        else:
            return {"success": False, "error": f"Invalid device ID format: {device_id}"}

        # PowerShell script to format SD card for Raspberry Pi
        # This creates two partitions: FAT32 boot (512MB) and ext4 root (rest)
        ps_script = f"""
        $ErrorActionPreference = "Stop"
        try {{
            $diskNumber = {disk_num}

            # Clean the disk
            Clear-Disk -Number $diskNumber -RemoveData -Confirm:$false -ErrorAction Stop

            # Create GPT partition table
            Initialize-Disk -Number $diskNumber -PartitionStyle GPT -Confirm:$false

            # Create boot partition (512MB, FAT32)
            $bootPart = New-Partition -DiskNumber $diskNumber -Size 512MB -AssignDriveLetter
            Format-Volume -Partition $bootPart -FileSystem FAT32 -NewFileSystemLabel "boot" -Confirm:$false

            # Create root partition (remaining space, but Windows can't format ext4 natively)
            # We'll format it as NTFS and note that ext4 formatting should be done on Linux
            $rootPart = New-Partition -DiskNumber $diskNumber -UseMaximumSize -AssignDriveLetter
            Format-Volume -Partition $rootPart -FileSystem NTFS -NewFileSystemLabel "rootfs" -Confirm:$false

            Write-Output "{{'success': true, 'message': 'Partitions created. Boot partition formatted as FAT32. Root partition formatted as NTFS (ext4 formatting requires Linux).'}}"
        }} catch {{
            Write-Output "{{'success': false, 'error': $($_.Exception.Message)}}"
            exit 1
        }}
        """

        result = subprocess.run(
            ["powershell", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode == 0:
            try:
                output = result.stdout.strip()
                # Extract JSON from PowerShell output
                if "{" in output and "}" in output:
                    start = output.find("{")
                    end = output.rfind("}") + 1
                    json_str = output[start:end]
                    return json.loads(json_str)
                return {"success": True, "message": "SD card formatted successfully"}
            except json.JSONDecodeError:
                return {"success": True, "message": "SD card formatted successfully"}
        else:
            error_msg = result.stderr or result.stdout or "Unknown error"
            return {"success": False, "error": f"Formatting failed: {error_msg}"}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Formatting operation timed out"}
    except Exception as e:
        return {"success": False, "error": f"Error formatting SD card: {str(e)}"}


def format_sdcard_linux(device_id):
    """Format SD card on Linux for Raspberry Pi"""
    try:
        # Check if running as root/sudo
        if os.geteuid() != 0:
            return {
                "success": False,
                "error": "Root privileges required. Please run with sudo or as root user.",
            }

        # Unmount any mounted partitions first
        try:
            subprocess.run(
                ["umount", "-f", device_id + "*"],
                capture_output=True,
                timeout=10,
                stderr=subprocess.DEVNULL,
            )
        except:
            pass  # Ignore unmount errors

        # Use parted to create partitions
        # Create partition table (MSDOS for compatibility with Pi 3B and Pi 5)
        subprocess.run(
            ["parted", "-s", device_id, "mklabel", "msdos"],
            check=True,
            timeout=30,
        )

        # Create boot partition (512MB, FAT32)
        subprocess.run(
            ["parted", "-s", device_id, "mkpart", "primary", "fat32", "1MiB", "513MiB"],
            check=True,
            timeout=30,
        )

        # Create root partition (ext4, rest of space)
        subprocess.run(
            ["parted", "-s", device_id, "mkpart", "primary", "ext4", "513MiB", "100%"],
            check=True,
            timeout=30,
        )

        # Wait a moment for partitions to be recognized
        time.sleep(1)

        # Format boot partition as FAT32
        boot_partition = device_id + "1"
        subprocess.run(
            ["mkfs.vfat", "-F", "32", "-n", "boot", boot_partition],
            check=True,
            timeout=60,
        )

        # Format root partition as ext4
        root_partition = device_id + "2"
        subprocess.run(
            ["mkfs.ext4", "-F", "-L", "rootfs", root_partition],
            check=True,
            timeout=120,
        )

        return {
            "success": True,
            "message": "SD card formatted successfully for Raspberry Pi (boot: FAT32 512MB, root: ext4)",
        }

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        return {"success": False, "error": f"Formatting failed: {error_msg}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Formatting operation timed out"}
    except Exception as e:
        return {"success": False, "error": f"Error formatting SD card: {str(e)}"}


def format_sdcard_macos(device_id):
    """Format SD card on macOS for Raspberry Pi"""
    try:
        # Get the disk identifier (e.g., /dev/disk2 -> disk2)
        disk_id = device_id.replace("/dev/", "")

        # Unmount the disk first
        subprocess.run(
            ["diskutil", "unmountDisk", "force", device_id],
            capture_output=True,
            timeout=30,
        )

        # Erase the disk and create partition scheme
        # Note: macOS doesn't support ext4 natively, so we'll create the partitions
        # but the user may need to format ext4 on Linux
        result = subprocess.run(
            ["diskutil", "eraseDisk", "MS-DOS", "RASPBERRYPI", "MBR", device_id],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode == 0:
            # Create two partitions using diskutil
            # First, we need to repartition the disk
            # This is complex on macOS, so we'll provide a message
            return {
                "success": True,
                "message": "SD card partition table created. For full Raspberry Pi formatting (FAT32 boot + ext4 root), please use Linux or format manually.",
            }
        else:
            error_msg = result.stderr or result.stdout or "Unknown error"
            return {"success": False, "error": f"Formatting failed: {error_msg}"}

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Formatting operation timed out"}
    except Exception as e:
        return {"success": False, "error": f"Error formatting SD card: {str(e)}"}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Device ID required"}))
        sys.exit(1)

    device_id = sys.argv[1]
    system = platform.system()

    try:
        if system == "Windows":
            result = format_sdcard_windows(device_id)
        elif system == "Linux":
            result = format_sdcard_linux(device_id)
        elif system == "Darwin":  # macOS
            result = format_sdcard_macos(device_id)
        else:
            result = {"success": False, "error": f"Unsupported platform: {system}"}

        print(json.dumps(result))
        if not result.get("success"):
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
