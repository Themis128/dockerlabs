# OS Installation Procedure - Files Checklist

## Overview
This document lists all files involved in the OS installation procedure and their current status.

## File Structure

### 1. Frontend Files

#### `components/OsInstallTab.vue`
- **Purpose**: Main UI component for OS installation
- **Status**: ✅ Updated
- **Key Features**:
  - OS selection dropdown with correct URLs
  - Configuration options (SSH, WiFi, etc.)
  - Progress display with detailed logs
  - Streaming progress updates via SSE
- **URLs**:
  - Raspberry Pi OS: Updated to base images directory
  - Ubuntu: Direct .img.xz URLs (verified correct)

#### `composables/useApi.ts`
- **Purpose**: API communication utilities
- **Status**: ✅ Checked
- **Functions**: Provides `installOS` function

#### `composables/useProgress.ts`
- **Purpose**: Progress tracking composable
- **Status**: ✅ Checked
- **Functions**: Progress state management

### 2. Backend Server Files

#### `web-gui/server.py`
- **Purpose**: Main HTTP server handling API requests
- **Status**: ✅ Updated
- **Key Method**: `install_os()` (lines 1986-2580)
- **Features**:
  - Handles streaming progress via Server-Sent Events (SSE)
  - Downloads OS images if needed
  - Calls install_os.py script
  - Error handling and progress reporting

#### `server/api/install-os.ts`
- **Purpose**: Nuxt API route proxy
- **Status**: ✅ Checked
- **Function**: Proxies requests to Python backend

### 3. Python Scripts

#### `web-gui/scripts/download_os_image.py`
- **Purpose**: Download OS images from URLs
- **Status**: ✅ Updated
- **Key Features**:
  - Handles direct image URLs (Ubuntu)
  - Handles directory listings (Raspberry Pi OS)
  - Recursive directory scanning for date folders
  - Progress reporting
  - Supports .img, .img.xz, .img.gz formats
- **Recent Updates**:
  - Added recursive directory scanning for Raspberry Pi OS date folders
  - Improved error handling

#### `web-gui/scripts/install_os.py`
- **Purpose**: Install OS image to SD card
- **Status**: ✅ Fully Implemented
- **Platform Support**:
  - ✅ Windows: Implemented (dd.exe or direct file writing)
  - ✅ Linux: Implemented (dd command)
  - ✅ macOS: Implemented (dd command)
- **Key Features**:
  - Progress reporting via JSON
  - Error debugging with detailed information
  - Platform-specific implementations
  - Timeout handling (30 minutes)
- **Windows Implementation**:
  - Tries to use dd.exe if available
  - Falls back to direct Python file writing
  - Requires administrator privileges for direct writing
  - Clear error messages

#### `web-gui/scripts/format_sdcard.py`
- **Purpose**: Format SD card before OS installation
- **Status**: ✅ Checked
- **Key Features**:
  - Cleans disk partitions
  - Prepares SD card for OS installation
  - Progress reporting
  - Platform-specific implementations

### 4. Test Files

#### `web-gui/scripts/test_install_os.py`
- **Purpose**: Test suite for install_os.py
- **Status**: ✅ Created
- **Tests**: 7/7 passing
  - Import test
  - Function exists
  - Invalid device ID handling
  - Missing image file handling
  - DD fallback mechanism
  - Progress output
  - JSON format validation

## Installation Flow

### Step 1: User Interaction
1. User selects SD card in `OsInstallTab.vue`
2. User selects OS image (download or custom)
3. User configures options (SSH, WiFi, etc.)
4. User clicks "Install OS"

### Step 2: Frontend Processing
1. `OsInstallTab.vue` → `handleInstall()` function
2. Calls `formatSdcardWithStreaming()` to format SD card
3. Sends POST request to `/api/install-os` with:
   - `device_id`
   - `os_version`
   - `download_url`
   - `configuration`
   - `stream: true`

### Step 3: Backend Processing
1. `server/api/install-os.ts` → Proxies to Python backend
2. `web-gui/server.py` → `install_os()` method:
   - Validates request
   - If `download_url` provided:
     - Calls `download_os_image.py` to download image
     - Streams download progress
   - Calls `install_os.py` with image path and device ID
   - Streams installation progress
   - Returns success/error

### Step 4: OS Installation
1. `install_os.py` → Platform-specific function:
   - Windows: `install_os_windows()`
   - Linux: `install_os_linux()`
   - macOS: `install_os_macos()`
2. Writes image to SD card
3. Reports progress via JSON stdout
4. Returns success/error result

## URL Configuration

### Raspberry Pi OS URLs
- **Base URLs**: `https://downloads.raspberrypi.org/{variant}/images/`
- **Variants**:
  - `raspios_lite_armhf` (32-bit Lite)
  - `raspios_armhf` (32-bit Desktop)
  - `raspios_full_armhf` (32-bit Full)
  - `raspios_lite_arm64` (64-bit Lite)
  - `raspios_arm64` (64-bit Desktop)
  - `raspios_full_arm64` (64-bit Full)
- **Structure**: Base URL → Date folder → Image file
- **Script**: Automatically finds latest date folder and image

### Ubuntu URLs
- **Direct URLs**: Point directly to .img.xz files
- **Examples**:
  - `ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz`
  - `ubuntu-22.04-preinstalled-server-arm64+raspi.img.xz`
  - `ubuntu-24.04-preinstalled-desktop-arm64+raspi.img.xz`
  - `ubuntu-22.04-preinstalled-desktop-arm64+raspi.img.xz`

## Error Handling

### Frontend
- Progress logs with timestamps
- Error messages displayed to user
- Detailed debug information in logs

### Backend
- JSON error responses
- Debug information in error_debug messages
- Exception tracebacks included
- Return codes and stderr captured

## Progress Reporting

### Format
- JSON messages via stdout/stderr
- Server-Sent Events (SSE) for streaming
- Progress percentages (0-100%)
- Status messages

### Message Types
- `progress`: Progress updates
- `error_debug`: Detailed error information
- `success`: Final result

## Requirements

### Windows
- Administrator privileges (for direct file writing)
- OR dd.exe installed (alternative method)

### Linux
- Root/sudo privileges
- dd command available

### macOS
- dd command available
- Disk access permissions

## Testing

### Test Suite
- Location: `web-gui/scripts/test_install_os.py`
- Status: All tests passing (7/7)
- Coverage: Windows implementation fully tested

### Manual Testing
1. Format SD card
2. Download OS image
3. Install OS to SD card
4. Verify progress reporting
5. Check error handling

## Recent Updates

### 2024 Updates
1. ✅ Implemented Windows OS installation
2. ✅ Updated Raspberry Pi OS URLs to base directories
3. ✅ Enhanced download script for recursive directory scanning
4. ✅ Added comprehensive error handling
5. ✅ Created test suite
6. ✅ Improved progress reporting

## File Dependencies

```
OsInstallTab.vue
  ├── useApi.ts (installOS)
  ├── useProgress.ts (progress tracking)
  └── useSdcards.ts (SD card listing)
       │
       └──> server/api/install-os.ts
              └──> web-gui/server.py
                     ├──> format_sdcard.py (Step 1)
                     ├──> download_os_image.py (if download_url)
                     └──> install_os.py (Step 2)
```

## Verification Checklist

- [x] Frontend component has correct OS URLs
- [x] Download script handles Raspberry Pi OS directory structure
- [x] Download script handles Ubuntu direct URLs
- [x] Install script has Windows implementation
- [x] Install script has Linux implementation
- [x] Install script has macOS implementation
- [x] Progress reporting works correctly
- [x] Error handling is comprehensive
- [x] Test suite passes
- [x] All files are properly integrated

## Notes

- The installation process requires administrator/root privileges on all platforms
- Windows users should run the server as administrator or install dd.exe
- Progress is streamed in real-time via Server-Sent Events
- All error messages include detailed debug information
- The download script automatically finds the latest OS image version
