#!/usr/bin/env python3
"""
List available SD cards/disks
Works on Windows, Linux, and macOS
"""
import sys
import platform
import subprocess
import json


def list_sdcards_windows():
    """List disks on Windows using PowerShell"""
    try:
        # Use PowerShell to get disk information
        ps_script = """
        Get-Disk | Where-Object {$_.BusType -eq 'USB' -or $_.MediaType -eq 'RemovableMedia'} |
        Select-Object Number, FriendlyName, Size, PartitionStyle, HealthStatus |
        ConvertTo-Json -Depth 3
        """
        result = subprocess.run(
            ["powershell", "-Command", ps_script], capture_output=True, text=True, timeout=10
        )

        if result.returncode == 0 and result.stdout.strip():
            try:
                import json

                output = result.stdout.strip()
                # Handle both single object and array responses
                if output.startswith("["):
                    disks = json.loads(output)
                else:
                    disks = [json.loads(output)]

                sdcards = []
                for disk in disks:
                    if disk:  # Check if disk is not None
                        size = disk.get("Size", 0)
                        sdcards.append(
                            {
                                "device_id": f"\\\\.\\PhysicalDrive{disk.get('Number', 'Unknown')}",
                                "label": disk.get(
                                    "FriendlyName", f"Disk {disk.get('Number', 'Unknown')}"
                                ),
                                "size_bytes": size,
                                "size_gb": round(size / (1024**3), 2) if size > 0 else 0,
                                "status": str(disk.get("HealthStatus", "Unknown")),
                            }
                        )
                return sdcards
            except json.JSONDecodeError:
                # If no removable disks found, return empty list
                return []
    except Exception as e:
        print(f"Error listing Windows disks: {e}", file=sys.stderr)

    return []


def list_sdcards_linux():
    """List disks on Linux using lsblk"""
    try:
        result = subprocess.run(
            ["lsblk", "-J", "-o", "NAME,SIZE,TYPE,MOUNTPOINT,LABEL"],
            capture_output=True,
            text=True,
            timeout=10,
        )

        if result.returncode == 0:
            import json

            data = json.loads(result.stdout)
            sdcards = []

            for device in data.get("blockdevices", []):
                if device.get("type") == "disk":
                    # Check if it's a removable device (common for SD cards)
                    device_path = f"/dev/{device['name']}"
                    size = device.get("size", "0")

                    sdcards.append(
                        {
                            "device_id": device_path,
                            "label": device.get("label", device["name"]),
                            "size_bytes": 0,  # Would need to parse size string
                            "size_gb": size,
                            "status": "Available",
                        }
                    )
            return sdcards
    except Exception as e:
        print(f"Error listing Linux disks: {e}", file=sys.stderr)

    return []


def list_sdcards_macos():
    """List disks on macOS using diskutil"""
    try:
        result = subprocess.run(
            ["diskutil", "list", "-plist", "external"], capture_output=True, text=True, timeout=10
        )

        if result.returncode == 0:
            # Parse plist output (simplified)
            sdcards = []
            # This is a simplified version - full plist parsing would be better
            lines = result.stdout.split("\n")
            for line in lines:
                if "/dev/disk" in line and "external" in line.lower():
                    parts = line.split()
                    if parts:
                        device_id = parts[0]
                        sdcards.append(
                            {
                                "device_id": device_id,
                                "label": device_id.split("/")[-1],
                                "size_bytes": 0,
                                "size_gb": "Unknown",
                                "status": "Available",
                            }
                        )
            return sdcards
    except Exception as e:
        print(f"Error listing macOS disks: {e}", file=sys.stderr)

    return []


def main():
    system = platform.system()

    try:
        if system == "Windows":
            sdcards = list_sdcards_windows()
        elif system == "Linux":
            sdcards = list_sdcards_linux()
        elif system == "Darwin":  # macOS
            sdcards = list_sdcards_macos()
        else:
            sdcards = []

        print(json.dumps({"success": True, "sdcards": sdcards}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "sdcards": []}))
        sys.exit(1)


if __name__ == "__main__":
    main()
