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
import threading
import atexit


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
    """Install OS image on Windows using dd or direct file writing"""
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

        # Handle ZIP files - extract if needed
        if image_path.lower().endswith('.zip'):
            progress("ZIP file detected, extracting image...", 10)
            import zipfile
            try:
                extract_dir = os.path.dirname(image_path) or os.getcwd()
                with zipfile.ZipFile(image_path, 'r') as zip_ref:
                    # Find .img file in the zip
                    img_files = [f for f in zip_ref.namelist() if f.endswith('.img')]
                    if not img_files:
                        return {"success": False, "error": "No .img file found in ZIP archive"}
                    # Extract the first .img file found
                    img_file = img_files[0]
                    extracted_path = os.path.join(extract_dir, img_file)
                    # Only extract if not already extracted
                    if not os.path.exists(extracted_path):
                        # Get file info for progress tracking
                        file_info = zip_ref.getinfo(img_file)
                        total_size = file_info.file_size
                        extracted_size = 0
                        chunk_size = 1024 * 1024  # 1MB chunks for progress updates
                        last_progress_time = time.time()

                        progress(f"Extracting {img_file} ({total_size / (1024*1024*1024):.2f} GB)...", 11)

                        with zip_ref.open(img_file) as source, open(extracted_path, 'wb') as target:
                            while True:
                                chunk = source.read(chunk_size)
                                if not chunk:
                                    break
                                target.write(chunk)
                                extracted_size += len(chunk)

                                # Send progress update every 2 seconds
                                current_time = time.time()
                                if current_time - last_progress_time >= 2:
                                    percent = min(11 + int((extracted_size / total_size) * 6), 17)
                                    progress(f"Extracting... {extracted_size / (1024*1024):.0f} MB / {total_size / (1024*1024):.0f} MB", percent)
                                    last_progress_time = current_time

                        progress(f"Extracted {img_file} from ZIP", 18)
                    else:
                        progress(f"Using existing extracted image: {img_file}", 18)
                    image_path = extracted_path
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to extract ZIP file: {str(e)}",
                    "debug_info": {
                        "exception_type": type(e).__name__,
                        "traceback": ''.join(traceback.format_exception(type(e), e, e.__traceback__))
                    }
                }

        # Get image file size for progress tracking
        image_size = os.path.getsize(image_path)
        progress(f"Image size: {image_size / (1024*1024*1024):.2f} GB", 18)

        # Try to use dd for Windows if available
        progress("Checking for available tools...", 20)
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

        if dd_exe:
            # Use dd.exe if available
            progress(f"Using dd tool: {dd_exe}", 20)
            progress("Writing image to SD card (this may take several minutes)...", 25)

            # Use dd with Windows physical drive path
            # Use Popen to stream output in real-time instead of capturing it
            try:
                process = subprocess.Popen(
                    [
                        dd_exe,
                        f"if={image_path}",
                        f"of={device_id}",
                        "bs=4M",
                        "status=progress",
                    ],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,  # Merge stderr to stdout
                    text=True,
                    bufsize=1,  # Line buffered
                )

                # Read output line by line to stream progress using threading
                stdout_lines = []
                last_progress_update = time.time()
                start_time = time.time()
                output_lock = threading.Lock()
                reading_complete = False

                def read_output():
                    """Thread function to read process output"""
                    nonlocal stdout_lines, last_progress_update, reading_complete
                    try:
                        for line in iter(process.stdout.readline, ''):
                            if line:
                                line = line.strip()
                                with output_lock:
                                    stdout_lines.append(line)
                                    # Send progress updates on any output from dd
                                    progress(f"dd: {line}", None)
                                    last_progress_update = time.time()
                    except Exception:
                        pass
                    finally:
                        reading_complete = True

                # Start reading thread
                read_thread = threading.Thread(target=read_output, daemon=True)
                read_thread.start()

                # Main loop: send periodic updates and wait for process to complete
                max_timeout = 1800  # 30 minutes timeout
                while process.poll() is None:
                    elapsed = time.time() - start_time

                    # Check for timeout
                    if elapsed > max_timeout:
                        process.kill()
                        return {
                            "success": False,
                            "error": f"Installation timed out after {max_timeout // 60} minutes",
                            "debug_info": {
                                "message": "dd process exceeded timeout",
                                "elapsed_time": elapsed
                            }
                        }

                    # Send periodic "still working" updates every 10 seconds
                    if time.time() - last_progress_update > 10:
                        # Estimate progress based on elapsed time (assuming ~50MB/s write speed)
                        # This is a fallback if dd doesn't output progress
                        estimated_speed = 50 * 1024 * 1024  # 50 MB/s
                        bytes_written_estimate = int(elapsed * estimated_speed)
                        if bytes_written_estimate < image_size:
                            estimated_percent = min(25 + int((bytes_written_estimate / image_size) * 70), 99)
                            progress(f"Writing image... ({elapsed:.0f}s elapsed, ~{bytes_written_estimate / (1024*1024):.0f} MB written)", estimated_percent)
                        else:
                            progress("Finalizing write operation...", 99)
                        last_progress_update = time.time()
                        sys.stdout.flush()  # Ensure progress is sent immediately
                    time.sleep(1)  # Check every second

                # Wait for read thread to finish
                read_thread.join(timeout=5)

                # Wait for process to complete and get return code
                returncode = process.wait()
                with output_lock:
                    stdout_text = '\n'.join(stdout_lines)

                if returncode == 0:
                    progress("OS installation completed successfully!", 100)
                    return {
                        "success": True,
                        "message": f"OS image installed successfully to {device_id}",
                    }
                else:
                    error_msg = stdout_text or "Unknown error"
                    error_debug(
                        "Windows dd command failed",
                        context={
                            "returncode": returncode,
                            "stdout": stdout_text,
                            "command": f"{dd_exe} if={image_path} of={device_id} bs=4M status=progress",
                            "image_path": image_path,
                            "device_id": device_id
                        }
                    )
                    return {
                        "success": False,
                        "error": f"Installation failed: {error_msg}",
                        "debug_info": {
                            "returncode": returncode,
                            "stdout": stdout_text,
                            "command": f"{dd_exe} if={image_path} of={device_id} bs=4M status=progress"
                        }
                    }
            except subprocess.TimeoutExpired:
                process.kill()
                return {
                    "success": False,
                    "error": "Installation timed out after 30 minutes",
                    "debug_info": {
                        "message": "dd process exceeded timeout"
                    }
                }
            except Exception as dd_error:
                error_debug(
                    "Windows dd execution failed",
                    exception=dd_error,
                    context={
                        "dd_exe": dd_exe,
                        "image_path": image_path,
                        "device_id": device_id
                    }
                )
                return {
                    "success": False,
                    "error": f"dd execution failed: {str(dd_error)}",
                    "debug_info": {
                        "exception_type": type(dd_error).__name__,
                        "traceback": ''.join(traceback.format_exception(type(dd_error), dd_error, dd_error.__traceback__))
                    }
                }
        else:
            # Fallback: Use Python direct file writing
            progress("Using direct file writing method...", 20)
            progress("WARNING: This requires administrator privileges", 25)
            progress("Writing image to SD card (this may take several minutes)...", 30)

            result = None
            try:
                # Open the physical drive in binary write mode
                # This requires administrator privileges on Windows
                with open(device_id, 'rb+') as target_drive:
                    with open(image_path, 'rb') as source_image:
                        bytes_written = 0
                        chunk_size = 4 * 1024 * 1024  # 4MB chunks
                        last_progress = 0

                        while True:
                            chunk = source_image.read(chunk_size)
                            if not chunk:
                                break

                            target_drive.write(chunk)
                            bytes_written += len(chunk)

                            # Update progress every 1%
                            current_progress = int((bytes_written / image_size) * 100)
                            if current_progress >= last_progress + 1:
                                progress(
                                    f"Writing: {bytes_written / (1024*1024):.1f} MB / {image_size / (1024*1024):.1f} MB",
                                    min(30 + int((bytes_written / image_size) * 70), 99)
                                )
                                last_progress = current_progress
                                # Flush stdout to ensure progress is sent immediately
                                sys.stdout.flush()

                        # Flush and sync
                        target_drive.flush()
                        os.fsync(target_drive.fileno())

                progress("OS installation completed successfully!", 100)
                sys.stdout.flush()  # Ensure progress message is sent
                result = {
                    "success": True,
                    "message": f"OS image installed successfully to {device_id}",
                }
                # Send result immediately and flush
                result_json = json.dumps(result)
                print(result_json, flush=True)
                sys.stdout.flush()
                return result

            except PermissionError:
                error_msg = (
                    "Permission denied. Administrator privileges required to write to physical drives. "
                    "Please run the server as administrator or install dd for Windows."
                )
                error_debug(
                    "Windows installation permission denied",
                    context={
                        "image_path": image_path,
                        "device_id": device_id,
                        "error": "PermissionError"
                    }
                )
                result = {
                    "success": False,
                    "error": error_msg,
                    "debug_info": {
                        "exception_type": "PermissionError",
                        "message": "Administrator privileges required"
                    }
                }
                result_json = json.dumps(result)
                print(result_json, flush=True)
                sys.stdout.flush()
                return result
            except Exception as write_error:
                error_debug(
                    "Windows direct write failed",
                    exception=write_error,
                    context={
                        "image_path": image_path,
                        "device_id": device_id,
                        "method": "direct_file_write"
                    }
                )
                result = {
                    "success": False,
                    "error": f"Direct write failed: {str(write_error)}",
                    "debug_info": {
                        "exception_type": type(write_error).__name__,
                        "traceback": ''.join(traceback.format_exception(type(write_error), write_error, write_error.__traceback__))
                    }
                }
                result_json = json.dumps(result)
                print(result_json, flush=True)
                sys.stdout.flush()
                return result
            finally:
                # Ensure we always send a result, even if something goes wrong
                if result is None:
                    # If we get here without setting result, something unexpected happened
                    error_result = {
                        "success": False,
                        "error": "Installation process was interrupted unexpectedly",
                        "debug_info": {
                            "message": "Direct write method did not complete normally",
                            "image_path": image_path,
                            "device_id": device_id
                        }
                    }
                    try:
                        error_json = json.dumps(error_result)
                        print(error_json, flush=True)
                        sys.stdout.flush()
                    except Exception:
                        pass  # Can't do anything if stdout is closed

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


# Global variable to track if we've sent a final result
_final_result_sent = False

def _send_final_result_on_exit():
    """Atexit handler to ensure we always send a final result"""
    global _final_result_sent
    if not _final_result_sent:
        try:
            error_result = {
                "success": False,
                "error": "Installation script exited unexpectedly without sending final result",
                "debug_info": {
                    "message": "Script was terminated or crashed before completion",
                    "exit_handler": "atexit"
                }
            }
            error_json = json.dumps(error_result)
            print(error_json, flush=True)
            sys.stdout.flush()
        except Exception:
            pass  # Can't do anything if stdout is closed

# Register atexit handler to ensure we always send a result
atexit.register(_send_final_result_on_exit)

def main():
    global _final_result_sent
    # Send immediate output to let server know script has started
    try:
        progress("Installation script started", 0)
        sys.stdout.flush()
    except Exception:
        pass  # Continue even if initial output fails

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

        # Ensure final result is flushed immediately
        result_json = json.dumps(result)
        print(result_json, flush=True)
        sys.stdout.flush()
        _final_result_sent = True  # Mark that we've sent the result
        if not result.get("success"):
            sys.exit(1)

    except KeyboardInterrupt:
        # Handle Ctrl+C gracefully
        error_result = {
            "success": False,
            "error": "Installation cancelled by user",
            "debug_info": {
                "exception_type": "KeyboardInterrupt"
            }
        }
        error_json = json.dumps(error_result)
        print(error_json, flush=True)
        sys.stdout.flush()
        _final_result_sent = True  # Mark that we've sent the result
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
        error_json = json.dumps(error_result)
        print(error_json, flush=True)
        sys.stdout.flush()
        _final_result_sent = True  # Mark that we've sent the result
        sys.exit(1)


if __name__ == "__main__":
    main()
