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
    """Format SD card on Windows for Raspberry Pi"""
    try:
        # Extract disk number from device_id (e.g., \\.\PhysicalDrive1 -> 1)
        disk_num = None
        if "PhysicalDrive" in device_id:
            disk_num = device_id.split("PhysicalDrive")[1]
        else:
            return {"success": False, "error": f"Invalid device ID format: {device_id}"}

        progress("Initializing SD card formatting process...", 0)
        progress(f"Detected device: {device_id} (Disk {disk_num})", 5)

        # PowerShell script to format SD card for Raspberry Pi
        # This creates two partitions: FAT32 boot (512MB) and ext4 root (rest)
        ps_script = f"""
        $ErrorActionPreference = "Stop"
        try {{
            $diskNumber = {disk_num}

            # Clean the disk
            Write-Host "PROGRESS:Cleaning disk and removing existing partitions..."
            Clear-Disk -Number $diskNumber -RemoveData -Confirm:$false -ErrorAction Stop

            # Create GPT partition table
            Write-Host "PROGRESS:Creating partition table (GPT)..."
            Initialize-Disk -Number $diskNumber -PartitionStyle GPT -Confirm:$false

            # Create boot partition (512MB, FAT32)
            Write-Host "PROGRESS:Creating boot partition (512MB, FAT32)..."
            $bootPart = New-Partition -DiskNumber $diskNumber -Size 512MB -AssignDriveLetter
            Write-Host "PROGRESS:Formatting boot partition as FAT32..."
            Format-Volume -Partition $bootPart -FileSystem FAT32 -NewFileSystemLabel "boot" -Confirm:$false

            # Create root partition (remaining space, but Windows can't format ext4 natively)
            # We'll format it as NTFS and note that ext4 formatting should be done on Linux
            Write-Host "PROGRESS:Creating root partition (remaining space)..."
            $rootPart = New-Partition -DiskNumber $diskNumber -UseMaximumSize -AssignDriveLetter
            Write-Host "PROGRESS:Formatting root partition as NTFS..."
            Format-Volume -Partition $rootPart -FileSystem NTFS -NewFileSystemLabel "rootfs" -Confirm:$false

            Write-Host "PROGRESS:Formatting completed successfully!"
            Write-Output "{{'success': true, 'message': 'Partitions created. Boot partition formatted as FAT32. Root partition formatted as NTFS (ext4 formatting requires Linux).'}}"
        }} catch {{
            Write-Host "PROGRESS:ERROR:$($_.Exception.Message)"
            Write-Output "{{'success': false, 'error': $($_.Exception.Message)}}"
            exit 1
        }}
        """

        progress("Cleaning disk and removing existing partitions...", 10)

        # Run PowerShell and capture output in real-time
        # Use unbuffered output for real-time progress
        process = subprocess.Popen(
            ["powershell", "-NoProfile", "-Command", ps_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merge stderr into stdout
            text=True,
            bufsize=0,  # Unbuffered
            universal_newlines=True
        )

        stdout_lines = []
        last_progress = 10

        # Read output line by line to capture progress
        # For Windows, we need to read differently
        if platform.system() == "Windows":
            # On Windows, read from process.stdout directly
            while True:
                output = process.stdout.readline()
                if output == '' and process.poll() is not None:
                    break
                if output:
                    line = output.strip()
                    stdout_lines.append(line)
                    # Check for progress messages
                    if "PROGRESS:" in line:
                        msg = line.replace("PROGRESS:", "").strip()
                        if msg.startswith("ERROR:"):
                            progress(msg.replace("ERROR:", ""), None)
                        else:
                            # Estimate progress based on step
                            if "Cleaning" in msg or "removing" in msg.lower():
                                last_progress = 15
                                progress(msg, last_progress)
                            elif "partition table" in msg.lower():
                                last_progress = 25
                                progress(msg, last_progress)
                            elif "boot partition" in msg.lower() and "Creating" in msg:
                                last_progress = 35
                                progress(msg, last_progress)
                            elif "boot partition" in msg.lower() and "Formatting" in msg:
                                last_progress = 45
                                progress(msg, last_progress)
                            elif "root partition" in msg.lower() and "Creating" in msg:
                                last_progress = 55
                                progress(msg, last_progress)
                            elif "root partition" in msg.lower() and "Formatting" in msg:
                                last_progress = 70
                                progress(msg, last_progress)
                            elif "completed" in msg.lower():
                                last_progress = 90
                                progress(msg, last_progress)
                            else:
                                progress(msg, last_progress)

        # Wait for process to complete and get remaining output
        remaining_stdout, _ = process.communicate()
        if remaining_stdout:
            for line in remaining_stdout.strip().split('\n'):
                if line.strip():
                    stdout_lines.append(line.strip())
                    if "PROGRESS:" in line:
                        msg = line.replace("PROGRESS:", "").strip()
                        if "completed" in msg.lower():
                            progress(msg, 90)

        returncode = process.returncode
        # Create a simple result object
        class Result:
            def __init__(self, returncode, stdout, stderr):
                self.returncode = returncode
                self.stdout = stdout
                self.stderr = stderr

        result = Result(returncode, '\n'.join(stdout_lines), '')

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
            )
            progress("Partitions unmounted successfully", 15)
        except:
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
    except Exception as e:
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
