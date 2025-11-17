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

# Progress output helper
def progress(message, percent=None):
    """Output progress message in JSON format"""
    progress_data = {"type": "progress", "message": message}
    if percent is not None:
        progress_data["percent"] = percent
    print(json.dumps(progress_data), flush=True)


def format_sdcard_windows(device_id):
    """Format SD card on Windows for Raspberry Pi using diskpart"""
    try:
        # Extract disk number from device_id (e.g., \\.\PhysicalDrive1 -> 1)
        disk_num = None
        if "PhysicalDrive" in device_id:
            disk_num = device_id.split("PhysicalDrive")[1]
        else:
            return {"success": False, "error": f"Invalid device ID format: {device_id}"}

        progress("Initializing SD card formatting process...", 0)
        progress(f"Detected device: {device_id} (Disk {disk_num})", 5)

        # Check for administrator privileges
        progress("Checking administrator privileges...", 8)
        try:
            import ctypes
            is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
            if not is_admin:
                return {
                    "success": False,
                    "error": "Administrator privileges required. Please run this script as Administrator. Right-click and select 'Run as administrator'."
                }
        except Exception:
            # If we can't check, try anyway but warn
            progress("Warning: Could not verify administrator privileges", 8)

        # Use diskpart instead of PowerShell CIM cmdlets (more reliable)
        # Create a temporary script file for diskpart
        import tempfile
        diskpart_script = f"""select disk {disk_num}
clean
create partition primary size=512
active
format fs=fat32 label=boot quick
create partition primary
format fs=ntfs label=rootfs quick
exit
"""

        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            script_path = f.name
            f.write(diskpart_script)

        try:
            progress("Cleaning disk and removing existing partitions...", 10)

            # Run diskpart with the script
            process = subprocess.Popen(
                ["diskpart", "/s", script_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
            )

            stdout_lines = []
            stderr_lines = []

            # Read output in real-time
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    stdout_lines.append(line)
                    # Parse diskpart output for progress
                    if "cleaning" in line.lower() or "cleaning disk" in line.lower():
                        progress("Cleaning disk...", 15)
                    elif "creating partition" in line.lower():
                        progress("Creating partitions...", 30)
                    elif "formatting" in line.lower() or "format" in line.lower():
                        if "boot" in line.lower() or "fat32" in line.lower():
                            progress("Formatting boot partition (FAT32)...", 45)
                        else:
                            progress("Formatting root partition (NTFS)...", 70)
                    elif "successfully" in line.lower() or "completed" in line.lower():
                        progress("Partitions created and formatted", 85)

            # Get remaining output
            remaining_stdout, stderr = process.communicate()
            if remaining_stdout:
                stdout_lines.extend(remaining_stdout.strip().split('\n'))
            if stderr:
                stderr_lines.extend(stderr.strip().split('\n'))

            returncode = process.returncode

            if returncode == 0:
                progress("Formatting completed successfully!", 100)
                return {
                    "success": True,
                    "message": "SD card formatted successfully. Boot partition (FAT32, 512MB) and root partition (NTFS) created. Note: ext4 formatting for root partition requires Linux."
                }
            else:
                error_msg = '\n'.join(stderr_lines) if stderr_lines else '\n'.join(stdout_lines) or "Unknown error"
                # Clean up error message
                if "Access is denied" in error_msg or "denied" in error_msg.lower():
                    error_msg = "Access denied. Please run as Administrator (Right-click and select 'Run as administrator')."
                elif "CIM" in error_msg or "WMI" in error_msg:
                    error_msg = "System management error. Please run as Administrator and ensure the SD card is not in use."
                return {"success": False, "error": f"Formatting failed: {error_msg}"}

        finally:
            # Clean up temporary script file
            try:
                os.unlink(script_path)
            except OSError:
                pass

    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Formatting operation timed out"}
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        return {"success": False, "error": f"Error formatting SD card: {str(e)}"}


def format_sdcard_linux(device_id):
    """Format SD card on Linux for Raspberry Pi"""
    try:
        progress("Initializing SD card formatting process...", 0)
        progress(f"Detected device: {device_id}", 5)

        # Check if running as root/sudo
        if os.geteuid() != 0:
            return {
                "success": False,
                "error": "Root privileges required. Please run with sudo or as root user.",
            }

        # Unmount any mounted partitions first
        progress("Unmounting existing partitions...", 10)
        try:
            subprocess.run(
                ["umount", "-f", device_id + "*"],
                capture_output=True,
                timeout=10,
                stderr=subprocess.DEVNULL,
                check=False,
            )
            progress("Partitions unmounted successfully", 15)
        except (OSError, subprocess.SubprocessError):
            pass  # Ignore unmount errors

        # Use parted to create partitions
        # Create partition table (MSDOS for compatibility with Pi 3B and Pi 5)
        progress("Creating partition table (MSDOS)...", 20)
        subprocess.run(
            ["parted", "-s", device_id, "mklabel", "msdos"],
            check=True,
            timeout=30,
        )
        progress("Partition table created", 25)

        # Create boot partition (512MB, FAT32)
        progress("Creating boot partition (512MB, FAT32)...", 30)
        subprocess.run(
            ["parted", "-s", device_id, "mkpart", "primary", "fat32", "1MiB", "513MiB"],
            check=True,
            timeout=30,
        )
        progress("Boot partition created", 35)

        # Create root partition (ext4, rest of space)
        progress("Creating root partition (ext4, remaining space)...", 40)
        subprocess.run(
            ["parted", "-s", device_id, "mkpart", "primary", "ext4", "513MiB", "100%"],
            check=True,
            timeout=30,
        )
        progress("Root partition created", 45)

        # Wait a moment for partitions to be recognized
        progress("Waiting for partitions to be recognized...", 50)
        time.sleep(1)

        # Format boot partition as FAT32
        boot_partition = device_id + "1"
        progress(f"Formatting boot partition {boot_partition} as FAT32...", 55)
        subprocess.run(
            ["mkfs.vfat", "-F", "32", "-n", "boot", boot_partition],
            check=True,
            timeout=60,
        )
        progress("Boot partition formatted successfully", 70)

        # Format root partition as ext4
        root_partition = device_id + "2"
        progress(f"Formatting root partition {root_partition} as ext4...", 75)
        subprocess.run(
            ["mkfs.ext4", "-F", "-L", "rootfs", root_partition],
            check=True,
            timeout=120,
        )
        progress("Root partition formatted successfully", 90)

        progress("Formatting completed successfully!", 100)
        return {
            "success": True,
            "message": "SD card formatted successfully for Raspberry Pi (boot: FAT32 512MB, root: ext4)",
        }

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        return {"success": False, "error": f"Formatting failed: {error_msg}"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Formatting operation timed out"}
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        return {"success": False, "error": f"Error formatting SD card: {str(e)}"}


def format_sdcard_macos(device_id):
    """Format SD card on macOS for Raspberry Pi"""
    try:
        progress("Initializing SD card formatting process...", 0)
        progress(f"Detected device: {device_id}", 5)

        # Get the disk identifier (e.g., /dev/disk2 -> disk2)
        disk_id = device_id.replace("/dev/", "")

        # Unmount the disk first
        progress("Unmounting disk...", 10)
        subprocess.run(
            ["diskutil", "unmountDisk", "force", device_id],
            capture_output=True,
            timeout=30,
            check=False,
        )
        progress("Disk unmounted", 15)

        # Erase the disk and create partition scheme
        # Note: macOS doesn't support ext4 natively, so we'll create the partitions
        # but the user may need to format ext4 on Linux
        progress("Erasing disk and creating partition scheme...", 20)
        result = subprocess.run(
            ["diskutil", "eraseDisk", "MS-DOS", "RASPBERRYPI", "MBR", device_id],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        progress("Partition scheme created", 80)

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
    except (OSError, subprocess.SubprocessError, ValueError) as e:
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

    except (OSError, subprocess.SubprocessError, ValueError, json.JSONDecodeError) as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
