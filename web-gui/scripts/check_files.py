#!/usr/bin/env python3
"""Quick script to check if required files exist"""
import os

files = [
    'components/OsInstallTab.vue',
    'web-gui/server.py',
    'web-gui/scripts/install_os.py',
    'web-gui/scripts/download_os_image.py',
    'web-gui/scripts/format_sdcard.py',
    'composables/useApi.ts',
    'composables/useProgress.ts',
    'server/api/install-os.ts'
]

for f in files:
    status = "EXISTS" if os.path.exists(f) else "MISSING"
    print(f"{f}: {status}")
