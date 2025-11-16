// Use current host and port for API calls (works with localhost and network IP)
const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // Load data for the tab
    if (tabName === 'dashboard' || tabName === 'pis') {
        loadPis();
    } else if (tabName === 'sdcard') {
        // Auto-refresh SD cards when tab is opened (only if auto-detection is not enabled)
        if (!autoDetectEnabled) {
            setTimeout(() => refreshSDCards(true), 100);
        }
    }
}

// Load Raspberry Pis
async function loadPis() {
    try {
        const response = await fetch(`${API_BASE}/pis`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.success) {
            displayPis(data.pis);
            updateDashboard(data.pis);
        } else {
            showError(data.error || 'Failed to load Raspberry Pis');
        }
    } catch (error) {
        showError(`Error: ${error.message}`);
        // Show loading error in pi-list if it exists
        const piList = document.getElementById('pi-list');
        if (piList) {
            piList.innerHTML = `<p class="loading error-message">Error loading Raspberry Pis: ${error.message}</p>`;
        }
    }
}

function displayPis(pis) {
    const piList = document.getElementById('pi-list');

    if (pis.length === 0) {
        piList.innerHTML = '<p class="loading">No Raspberry Pis configured</p>';
        return;
    }

    // Group Pis by device number (pi-ethernet-1 and pi-wifi-1 are the same Pi)
    const groupedPis = {};
    pis.forEach(pi => {
        const match = pi.id.match(/(\d+)$/);
        if (match) {
            const piNumber = match[1];
            if (!groupedPis[piNumber]) {
                groupedPis[piNumber] = [];
            }
            groupedPis[piNumber].push(pi);
        }
    });

    // Display grouped Pis
    piList.innerHTML = Object.keys(groupedPis).sort().map(piNumber => {
        const piConnections = groupedPis[piNumber];
        const ethernetPi = piConnections.find(p => p.connection === 'Wired');
        const wifiPi = piConnections.find(p => p.connection === '2.4G');

        return `
        <div class="pi-card">
            <h3>Raspberry Pi ${piNumber}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div>
                    <h4 style="margin-bottom: 10px; color: #667eea;">Ethernet Connection</h4>
                    ${ethernetPi ? `
                        <p><strong>IP:</strong> ${ethernetPi.ip}</p>
                        <p><strong>MAC:</strong> ${ethernetPi.mac}</p>
                        <span class="pi-badge badge-wired">Wired</span>
                    ` : '<p style="color: #999;">Not configured</p>'}
                </div>
                <div>
                    <h4 style="margin-bottom: 10px; color: #667eea;">WiFi Connection</h4>
                    ${wifiPi ? `
                        <p><strong>IP:</strong> ${wifiPi.ip}</p>
                        <p><strong>MAC:</strong> ${wifiPi.mac}</p>
                        <span class="pi-badge badge-wifi">2.4G</span>
                    ` : '<p style="color: #999;">Not configured</p>'}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function updateDashboard(pis) {
    // Count unique Pis by grouping (each Pi has both Ethernet and WiFi)
    // Group by the base name (pi-ethernet-1 and pi-wifi-1 are the same Pi)
    const uniquePis = new Set();
    pis.forEach(pi => {
        // Extract Pi number from ID (e.g., "pi-ethernet-1" -> "1", "pi-wifi-2" -> "2")
        const match = pi.id.match(/(\d+)$/);
        if (match) {
            uniquePis.add(match[1]);
        }
    });

    document.getElementById('total-pis').textContent = uniquePis.size || pis.length;
    document.getElementById('ethernet-count').textContent =
        pis.filter(p => p.connection === 'Wired').length;
    document.getElementById('wifi-count').textContent =
        pis.filter(p => p.connection === '2.4G').length;
}

// Test connections
document.getElementById('test-all')?.addEventListener('click', async () => {
    const resultsDiv = document.getElementById('test-results');
    resultsDiv.textContent = 'Testing connections...';

    try {
        const response = await fetch(`${API_BASE}/test-connections`);
        const data = await response.json();

        if (data.success) {
            resultsDiv.textContent = data.output || 'Test completed successfully';
        } else {
            resultsDiv.textContent = `Error: ${data.error || 'Unknown error'}\n${data.output || ''}`;
        }
    } catch (error) {
        resultsDiv.textContent = `Error: ${error.message}`;
    }
});

// Test SSH
document.getElementById('test-ssh')?.addEventListener('click', async () => {
    const piNumber = document.getElementById('pi-select').value;
    const resultsDiv = document.getElementById('ssh-results');
    resultsDiv.textContent = `Testing SSH authentication for Pi ${piNumber}...`;

    try {
        const response = await fetch(`${API_BASE}/test-ssh?pi=${piNumber}`);
        const data = await response.json();

        if (data.success) {
            resultsDiv.textContent = data.output || 'SSH test completed successfully';
        } else {
            resultsDiv.textContent = `Error: ${data.error || 'Unknown error'}\n${data.output || ''}`;
        }
    } catch (error) {
        resultsDiv.textContent = `Error: ${error.message}`;
    }
});

// Refresh buttons
document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
    loadPis();
});

document.getElementById('refresh-pis')?.addEventListener('click', () => {
    loadPis();
});

function showError(message) {
    console.error(message);
    // Show error in status message if available
    const statusElement = document.querySelector('[id*="status"], .status-message');
    if (statusElement) {
        statusElement.textContent = `Error: ${message}`;
        statusElement.classList.add('error-message');
    }
}

// SD Card Management - Auto-detection state
let autoDetectEnabled = false;
let autoDetectInterval = null;
let lastSDCardCount = 0;
const AUTO_DETECT_INTERVAL = 2000; // Check every 2 seconds

// Reusable function to refresh SD cards
async function refreshSDCards(showLoading = true) {
    const sdcardList = document.getElementById('sdcard-list');
    if (showLoading) {
        sdcardList.innerHTML = '<p class="loading">Detecting SD cards...</p>';
    }

    try {
        const response = await fetch(`${API_BASE}/sdcards`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
        }

        const data = await response.json();

        if (data.success && data.sdcards && data.sdcards.length > 0) {
            const currentCount = data.sdcards.length;
            const wasEmpty = lastSDCardCount === 0;
            lastSDCardCount = currentCount;

            sdcardList.innerHTML = data.sdcards.map(card => `
                <div class="pi-card">
                    <h3>${card.label}</h3>
                    <p><strong>Device:</strong> ${card.device_id}</p>
                    <p><strong>Size:</strong> ${card.size_gb} GB</p>
                    <p><strong>Status:</strong> ${card.status}</p>
                    <div style="margin-top: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <select id="pi-model-${card.device_id.replace(/[^a-zA-Z0-9]/g, '_')}" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            <option value="pi5">Raspberry Pi 5</option>
                            <option value="pi3b">Raspberry Pi 3B</option>
                        </select>
                        <button class="btn btn-secondary" onclick="formatSDCard('${card.device_id}', '${card.device_id.replace(/[^a-zA-Z0-9]/g, '_')}')">Format for Pi</button>
                    </div>
                </div>
            `).join('');

            // Show notification if a new card was detected
            if (wasEmpty && currentCount > 0 && autoDetectEnabled) {
                updateAutoDetectStatus(`SD card detected! (${currentCount} card${currentCount > 1 ? 's' : ''})`, '#28a745');
                setTimeout(() => updateAutoDetectStatus('', ''), 3000);
            }

            // Update OS install dropdown
            updateOSInstallDropdown(data.sdcards);
        } else {
            lastSDCardCount = 0;
            if (showLoading || !autoDetectEnabled) {
                sdcardList.innerHTML = '<p class="loading">No SD cards detected. Please insert an SD card and try again.</p>';
            }
        }
    } catch (error) {
        if (showLoading || !autoDetectEnabled) {
            sdcardList.innerHTML = `<p class="loading" style="color: #dc3545;">Error: ${error.message}</p>`;
        }
    }
}

// Update OS install dropdown with SD cards
function updateOSInstallDropdown(sdcards) {
    const select = document.getElementById('os-sdcard-select');
    if (select && sdcards) {
        select.innerHTML = '<option value="">-- Select SD Card --</option>';
        sdcards.forEach(card => {
            const option = document.createElement('option');
            option.value = card.device_id;
            option.textContent = `${card.label} (${card.size_gb} GB)`;
            select.appendChild(option);
        });
    }
}

// Update auto-detect status message
function updateAutoDetectStatus(message, color = '#666') {
    const statusEl = document.getElementById('auto-detect-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = color;
    }
}

// Toggle auto-detection
function toggleAutoDetect() {
    autoDetectEnabled = !autoDetectEnabled;
    const toggleBtn = document.getElementById('toggle-auto-detect');
    const textSpan = document.getElementById('auto-detect-text');
    const indicatorSpan = document.getElementById('auto-detect-indicator');

    if (autoDetectEnabled) {
        toggleBtn.classList.add('active');
        textSpan.textContent = 'Disable Auto-Detection';
        indicatorSpan.style.display = 'inline';
        updateAutoDetectStatus('Auto-detection active', '#28a745');

        // Start polling
        autoDetectInterval = setInterval(() => {
            // Only poll if SD card tab is visible
            const sdcardTab = document.getElementById('sdcard');
            if (sdcardTab && sdcardTab.classList.contains('active')) {
                refreshSDCards(false); // Don't show loading message during auto-detection
            }
        }, AUTO_DETECT_INTERVAL);

        // Do an immediate check
        refreshSDCards(true);
    } else {
        toggleBtn.classList.remove('active');
        textSpan.textContent = 'Enable Auto-Detection';
        indicatorSpan.style.display = 'none';
        updateAutoDetectStatus('');

        // Stop polling
        if (autoDetectInterval) {
            clearInterval(autoDetectInterval);
            autoDetectInterval = null;
        }
    }
}

// Manual refresh button
document.getElementById('refresh-sdcards')?.addEventListener('click', () => {
    refreshSDCards(true);
});

// Auto-detection toggle button
document.getElementById('toggle-auto-detect')?.addEventListener('click', toggleAutoDetect);

// OS Installation
document.querySelectorAll('input[name="os-source"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'download') {
            document.getElementById('os-download-section').style.display = 'block';
            document.getElementById('os-custom-section').style.display = 'none';
        } else {
            document.getElementById('os-download-section').style.display = 'none';
            document.getElementById('os-custom-section').style.display = 'block';
        }
    });
});

// Show OS description when selection changes
function updateOSDescription() {
    const osSelect = document.getElementById('os-version-select');
    if (!osSelect) return;

    const selectedOption = osSelect.options[osSelect.selectedIndex];
    const description = selectedOption ? selectedOption.getAttribute('data-desc') : null;
    const descriptionDiv = document.getElementById('os-description');
    const descriptionText = document.getElementById('os-description-text');

    if (description && descriptionDiv && descriptionText) {
        descriptionText.textContent = description;
        descriptionDiv.style.display = 'block';
    } else if (descriptionDiv) {
        descriptionDiv.style.display = 'none';
    }
}

document.getElementById('os-version-select')?.addEventListener('change', updateOSDescription);

// Initialize description on page load
document.addEventListener('DOMContentLoaded', () => {
    updateOSDescription();
});

// WiFi settings toggle
document.getElementById('os-enable-wifi')?.addEventListener('change', (e) => {
    const wifiSettings = document.getElementById('os-wifi-settings');
    if (wifiSettings) {
        wifiSettings.style.display = e.target.checked ? 'block' : 'none';
    }
});

// WPA3 Security type change handler
document.getElementById('os-wifi-security')?.addEventListener('change', (e) => {
    const securityType = e.target.value;
    const passwordSection = document.getElementById('os-wifi-password-section');
    const transitionMode = document.getElementById('os-wifi-transition-mode');
    const enterpriseSettings = document.getElementById('os-wifi-enterprise-settings');

    // Show/hide password section based on security type
    if (securityType === 'Open') {
        passwordSection.style.display = 'none';
        transitionMode.style.display = 'none';
    } else {
        passwordSection.style.display = 'block';
    }

    // Show/hide transition mode (only for WPA3-Personal)
    if (securityType === 'WPA3_Personal') {
        transitionMode.style.display = 'block';
    } else {
        transitionMode.style.display = 'none';
    }

    // Show/hide enterprise settings
    if (securityType === 'WPA3_Enterprise' || securityType === 'WPA2_Enterprise') {
        enterpriseSettings.classList.remove('hidden');
    } else {
        enterpriseSettings.classList.add('hidden');
    }
});

// Password strength checker
function checkPasswordStrength(password) {
    if (!password) return { strength: 'none', score: 0 };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score <= 2) return { strength: 'weak', score };
    if (score <= 3) return { strength: 'medium', score };
    return { strength: 'strong', score };
}

// Password strength indicator
document.getElementById('os-wifi-password')?.addEventListener('input', (e) => {
    const password = e.target.value;
    const strengthDiv = document.getElementById('os-wifi-password-strength');
    if (!strengthDiv) return;

    const result = checkPasswordStrength(password);
    strengthDiv.className = 'password-strength';

    if (result.strength !== 'none') {
        strengthDiv.classList.add(result.strength);
    }
});

// Password toggle (show/hide)
document.getElementById('os-wifi-password-toggle')?.addEventListener('click', (e) => {
    const passwordInput = document.getElementById('os-wifi-password');
    const toggleButton = e.target;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = '🙈';
        toggleButton.setAttribute('aria-label', 'Hide password');
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = '👁️';
        toggleButton.setAttribute('aria-label', 'Show password');
    }
});

// Static IP settings toggle
document.getElementById('os-use-static-ip')?.addEventListener('change', (e) => {
    const staticIpSettings = document.getElementById('os-static-ip-settings');
    if (staticIpSettings) {
        staticIpSettings.style.display = e.target.checked ? 'block' : 'none';
    }
});

// Settings tab WiFi toggle
document.getElementById('settings-wifi-enable')?.addEventListener('change', (e) => {
    const wifiConfig = document.getElementById('settings-wifi-config');
    if (wifiConfig) {
        wifiConfig.classList.toggle('hidden', !e.target.checked);
    }
});

// Settings tab WPA3 security type handler
document.getElementById('settings-wifi-security')?.addEventListener('change', (e) => {
    const securityType = e.target.value;
    const transitionCheckbox = document.getElementById('settings-wifi-transition');

    // Show/hide transition mode (only for WPA3-Personal)
    if (transitionCheckbox) {
        if (securityType === 'WPA3_Personal') {
            transitionCheckbox.closest('.form-label').style.display = 'block';
        } else {
            transitionCheckbox.closest('.form-label').style.display = 'none';
        }
    }
});

// Add user functionality
let userCounter = 0;
document.getElementById('os-add-user')?.addEventListener('click', () => {
    const container = document.getElementById('os-users-container');
    if (!container) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'user-entry';
    userDiv.style.cssText = 'margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;';
    userDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 2fr 1fr 1fr auto; gap: 10px; align-items: center;">
            <input type="text" placeholder="Username" class="os-user-username" style="padding: 5px;">
            <input type="password" placeholder="Password" class="os-user-password" style="padding: 5px;">
            <label style="display: flex; align-items: center; gap: 5px;">
                <input type="checkbox" class="os-user-sudo" checked> Sudo
            </label>
            <input type="text" placeholder="Groups (comma-sep)" class="os-user-groups" style="padding: 5px;">
            <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()" style="padding: 5px 10px;">Remove</button>
        </div>
    `;
    container.appendChild(userDiv);
    userCounter++;
});

// Use the visible button for click handler, submit button is hidden for accessibility
(document.getElementById('install-os-button') || document.getElementById('install-os'))?.addEventListener('click', async () => {
    const deviceId = document.getElementById('os-sdcard-select').value;
    if (!deviceId) {
        alert('Please select an SD card');
        return;
    }

    const osSource = document.querySelector('input[name="os-source"]:checked').value;
    const progressDiv = document.getElementById('os-install-progress');
    const progressBar = document.getElementById('os-progress-bar');
    const statusText = document.getElementById('os-status-text');

    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.textContent = 'Starting OS installation...';

    try {
        // Collect all configuration options
        const config = {
            boot: {
                enable_ssh: document.getElementById('os-enable-ssh')?.checked ?? true,
                enable_serial: document.getElementById('os-enable-serial')?.checked ?? false,
                disable_overscan: document.getElementById('os-disable-overscan')?.checked ?? true,
                gpu_memory: parseInt(document.getElementById('os-gpu-memory')?.value || '64')
            },
            system: {
                hostname: document.getElementById('os-hostname')?.value || 'raspberrypi',
                timezone: document.getElementById('os-timezone')?.value || 'UTC',
                locale: document.getElementById('os-locale')?.value || 'en_US.UTF-8',
                enable_camera: document.getElementById('os-enable-camera')?.checked ?? false,
                enable_spi: document.getElementById('os-enable-spi')?.checked ?? false,
                enable_i2c: document.getElementById('os-enable-i2c')?.checked ?? false,
                enable_serial_hw: document.getElementById('os-enable-serial-hw')?.checked ?? false
            },
            network: {
                enable_ethernet: document.getElementById('os-enable-ethernet')?.checked ?? true,
                enable_wifi: document.getElementById('os-enable-wifi')?.checked ?? false,
                wifi_ssid: document.getElementById('os-wifi-ssid')?.value || '',
                wifi_password: document.getElementById('os-wifi-password')?.value || '',
                wifi_country: document.getElementById('os-wifi-country')?.value || 'US',
                wifi_security_type: document.getElementById('os-wifi-security')?.value || 'WPA3_Personal',
                wifi_transition_mode: document.getElementById('os-wifi-transition')?.checked ?? true,
                wifi_eap_method: document.getElementById('os-wifi-eap-method')?.value || '',
                wifi_ca_cert: document.getElementById('os-wifi-ca-cert')?.value || '',
                wifi_client_cert: document.getElementById('os-wifi-client-cert')?.value || '',
                use_static_ip: document.getElementById('os-use-static-ip')?.checked ?? false,
                static_ip: document.getElementById('os-static-ip')?.value || '',
                gateway: document.getElementById('os-gateway')?.value || '',
                dns: document.getElementById('os-dns')?.value || ''
            },
            users: {
                default_password: document.getElementById('os-default-password')?.value || '',
                additional_users: []
            },
            ssh: {
                port: parseInt(document.getElementById('os-ssh-port')?.value || '22'),
                enable_password_auth: document.getElementById('os-ssh-password-auth')?.checked ?? true,
                disable_root_login: document.getElementById('os-ssh-disable-root')?.checked ?? true,
                authorized_keys: (document.getElementById('os-ssh-keys')?.value || '').split('\n').filter(k => k.trim())
            },
            packages: {
                update_package_list: document.getElementById('os-update-packages')?.checked ?? true,
                upgrade_packages: document.getElementById('os-upgrade-packages')?.checked ?? false,
                packages_to_install: (document.getElementById('os-packages')?.value || '').split(',').map(p => p.trim()).filter(p => p)
            },
            scripts: {
                pre_install: (document.getElementById('os-pre-scripts')?.value || '').split('\n').filter(s => s.trim()),
                post_install: (document.getElementById('os-post-scripts')?.value || '').split('\n').filter(s => s.trim()),
                first_boot: (document.getElementById('os-firstboot-scripts')?.value || '').split('\n').filter(s => s.trim())
            }
        };

        // Collect additional users
        document.querySelectorAll('.user-entry').forEach(entry => {
            const username = entry.querySelector('.os-user-username')?.value;
            if (username) {
                config.users.additional_users.push({
                    username: username,
                    password: entry.querySelector('.os-user-password')?.value || '',
                    has_sudo: entry.querySelector('.os-user-sudo')?.checked ?? false,
                    groups: (entry.querySelector('.os-user-groups')?.value || '').split(',').map(g => g.trim()).filter(g => g)
                });
            }
        });

        // Get selected OS version and download URL
        const osSelect = document.getElementById('os-version-select');
        const selectedOption = osSelect.options[osSelect.selectedIndex];
        const osVersion = osSource === 'download' ? selectedOption.value : null;
        const downloadUrl = selectedOption ? selectedOption.getAttribute('data-url') : null;

        const requestData = {
            device_id: deviceId,
            os_version: osVersion,
            download_url: downloadUrl, // Include the download URL for the backend to fetch
            custom_image: osSource === 'custom' ? document.getElementById('os-custom-file').files[0]?.name : null,
            configuration: config
        };

        const response = await fetch(`${API_BASE}/install-os`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (data.success) {
            progressBar.style.width = '100%';
            statusText.textContent = data.message || 'OS installation completed!';
        } else {
            statusText.textContent = `Error: ${data.error}`;
            statusText.style.color = '#dc3545';
        }
    } catch (error) {
        statusText.textContent = `Error: ${error.message}`;
        statusText.style.color = '#dc3545';
    }
});

// Pi Configuration
document.getElementById('settings-pi-select')?.addEventListener('change', (e) => {
    const settingsForm = document.getElementById('settings-form');
    if (e.target.value) {
        settingsForm.style.display = 'block';
    } else {
        settingsForm.style.display = 'none';
    }
});

document.getElementById('apply-settings')?.addEventListener('click', async () => {
    const piNumber = document.getElementById('settings-pi-select').value;
    if (!piNumber) {
        alert('Please select a Raspberry Pi');
        return;
    }

    const settings = {
        ssh: {
            enable_ssh: document.getElementById('settings-ssh-enable').checked,
            password_auth: document.getElementById('settings-ssh-password-auth').checked,
            ssh_port: parseInt(document.getElementById('settings-ssh-port').value) || 22
        },
        telnet: {
            enable_telnet: document.getElementById('settings-telnet-enable').checked,
            telnet_port: parseInt(document.getElementById('settings-telnet-port').value) || 23
        },
        network: {
            hostname: document.getElementById('settings-hostname').value,
            wifi_enable: document.getElementById('settings-wifi-enable').checked,
            wifi_ssid: document.getElementById('settings-wifi-ssid')?.value || '',
            wifi_password: document.getElementById('settings-wifi-password')?.value || '',
            wifi_security_type: document.getElementById('settings-wifi-security')?.value || 'WPA3_Personal',
            wifi_transition_mode: document.getElementById('settings-wifi-transition')?.checked ?? true,
            enable_pmf: true  // Protected Management Frames
        }
    };

    const statusDiv = document.getElementById('settings-status');
    statusDiv.textContent = 'Applying settings...';
    statusDiv.style.color = '#333';

    try {
        const response = await fetch(`${API_BASE}/configure-pi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pi_number: parseInt(piNumber),
                settings: settings
            })
        });

        const data = await response.json();

        if (data.success) {
            statusDiv.textContent = `Settings applied successfully! ${data.message || ''}`;
            statusDiv.style.color = '#28a745';
        } else {
            statusDiv.textContent = `Error: ${data.error || 'Failed to apply settings'}`;
            statusDiv.style.color = '#dc3545';
        }
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = '#dc3545';
    }
});

// Helper function for SD card formatting
async function formatSDCard(deviceId, elementId) {
    const modelSelect = document.getElementById(`pi-model-${elementId}`);
    const piModel = modelSelect ? modelSelect.value : 'pi5';
    const piModelName = piModel === 'pi5' ? 'Raspberry Pi 5' : 'Raspberry Pi 3B';

    if (!confirm(`Are you sure you want to format ${deviceId} for ${piModelName}?\n\nThis will:\n- Erase ALL data on the card\n- Create boot partition (FAT32, 512MB)\n- Create root partition (ext4, remaining space)\n\nThis action cannot be undone!`)) {
        return;
    }

    // Show formatting status
    const sdcardList = document.getElementById('sdcard-list');
    const originalContent = sdcardList.innerHTML;
    sdcardList.innerHTML = '<p class="loading" style="color: #667eea;">Formatting SD card for ' + piModelName + '... This may take a few minutes. Please wait...</p>';

    try {
        const response = await fetch(`${API_BASE}/format-sdcard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                device_id: deviceId,
                pi_model: piModel
            })
        });

        const data = await response.json();

        if (data.success) {
            sdcardList.innerHTML = '<p class="loading" style="color: #28a745;">✓ ' + (data.message || 'SD card formatted successfully!') + '</p>';
            // Refresh the SD card list after a short delay
            setTimeout(() => {
                refreshSDCards(true);
            }, 2000);
        } else {
            sdcardList.innerHTML = `<p class="loading" style="color: #dc3545;">✗ Error: ${data.error || 'Formatting failed'}</p>`;
            setTimeout(() => {
                refreshSDCards(true);
            }, 3000);
        }
    } catch (error) {
        sdcardList.innerHTML = `<p class="loading" style="color: #dc3545;">✗ Error: ${error.message}</p>`;
        setTimeout(() => {
            refreshSDCards(true);
        }, 3000);
    }
}

// Update SD card list when OS install tab is opened
document.querySelector('[data-tab="osinstall"]')?.addEventListener('click', async () => {
    // Refresh SD cards when OS install tab is opened (only if auto-detection is not enabled)
    if (!autoDetectEnabled) {
        setTimeout(() => refreshSDCards(true), 100);
    }
});

// Pause auto-detection when page is hidden, resume when visible
document.addEventListener('visibilitychange', () => {
    if (autoDetectEnabled) {
        if (document.hidden) {
            // Page is hidden, pause polling
            if (autoDetectInterval) {
                clearInterval(autoDetectInterval);
                autoDetectInterval = null;
            }
            updateAutoDetectStatus('Auto-detection paused (tab hidden)', '#ffc107');
        } else {
            // Page is visible, resume polling
            const sdcardTab = document.getElementById('sdcard');
            if (sdcardTab && sdcardTab.classList.contains('active')) {
                autoDetectInterval = setInterval(() => {
                    const sdcardTab = document.getElementById('sdcard');
                    if (sdcardTab && sdcardTab.classList.contains('active')) {
                        refreshSDCards(false);
                    }
                }, AUTO_DETECT_INTERVAL);
                updateAutoDetectStatus('Auto-detection active', '#28a745');
            }
        }
    }
});

// Remote Connection State
let remoteConnected = false;
let currentPiNumber = null;
let currentConnectionType = null;

// Remote Connection Functions
document.getElementById('remote-connect-btn')?.addEventListener('click', async () => {
    const piNumber = document.getElementById('remote-pi-select').value;
    const connectionType = document.getElementById('remote-connection-type').value;
    const statusDiv = document.getElementById('remote-connection-status');

    if (remoteConnected) {
        // Disconnect
        remoteConnected = false;
        currentPiNumber = null;
        currentConnectionType = null;
        statusDiv.textContent = 'Disconnected';
        statusDiv.style.color = '#666';
        document.getElementById('remote-connect-btn').textContent = 'Connect';
        appendToTerminal('Disconnected from Raspberry Pi', '#ff6b6b');
    } else {
        // Connect
        statusDiv.textContent = 'Connecting...';
        statusDiv.style.color = '#667eea';

        try {
            const response = await fetch(`${API_BASE}/get-pi-info?pi=${piNumber}`);
            const data = await response.json();

            if (data.success) {
                remoteConnected = true;
                currentPiNumber = piNumber;
                currentConnectionType = connectionType;
                statusDiv.textContent = `Connected to Pi ${piNumber} (${data.pi.ip}) via ${connectionType.toUpperCase()}`;
                statusDiv.style.color = '#28a745';
                document.getElementById('remote-connect-btn').textContent = 'Disconnect';
                appendToTerminal(`Connected to Raspberry Pi ${piNumber} (${data.pi.ip}) via ${connectionType.toUpperCase()}`, '#4ec9b0');
                appendToTerminal(`Connection: ${data.pi.connection}`, '#4ec9b0');
                appendToTerminal('Type commands below or use quick commands', '#4ec9b0');
                appendToTerminal('', '#d4d4d4');
            } else {
                statusDiv.textContent = `Error: ${data.error}`;
                statusDiv.style.color = '#dc3545';
                appendToTerminal(`Connection failed: ${data.error}`, '#ff6b6b');
            }
        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.style.color = '#dc3545';
            appendToTerminal(`Connection error: ${error.message}`, '#ff6b6b');
        }
    }
});

// Execute remote command
async function executeRemoteCommand() {
    if (!remoteConnected) {
        appendToTerminal('Not connected. Please connect first.', '#ff6b6b');
        return;
    }

    const commandInput = document.getElementById('remote-command-input');
    const command = commandInput.value.trim();

    if (!command) {
        return;
    }

    // Display command in terminal
    appendToTerminal(`$ ${command}`, '#d4d4d4');

    // Clear input
    commandInput.value = '';

    try {
        const piNumber = document.getElementById('remote-pi-select').value;
        const connectionType = document.getElementById('remote-connection-type').value;
        const networkType = document.getElementById('remote-network-type').value;
        const username = document.getElementById('remote-username').value || 'pi';
        const password = document.getElementById('remote-password').value || null;
        const keyPath = document.getElementById('remote-key-path').value || null;

        const response = await fetch(`${API_BASE}/execute-remote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pi_number: piNumber,
                command: command,
                connection_type: connectionType,
                network_type: networkType,
                username: username,
                password: password,
                key_path: keyPath
            })
        });

        const data = await response.json();

        if (data.success) {
            if (data.output) {
                appendToTerminal(data.output, '#d4d4d4');
            }
            if (data.error && data.error.trim()) {
                appendToTerminal(data.error, '#ff6b6b');
            }
        } else {
            appendToTerminal(`Error: ${data.error || 'Command execution failed'}`, '#ff6b6b');
            if (data.output) {
                appendToTerminal(data.output, '#ff6b6b');
            }
        }
    } catch (error) {
        appendToTerminal(`Error: ${error.message}`, '#ff6b6b');
    }

    // Add separator
    appendToTerminal('', '#d4d4d4');
}

// Run quick command
function runQuickCommand(command) {
    if (!remoteConnected) {
        appendToTerminal('Not connected. Please connect first.', '#ff6b6b');
        return;
    }

    document.getElementById('remote-command-input').value = command;
    executeRemoteCommand();
}

// Append text to terminal
function appendToTerminal(text, color = '#d4d4d4') {
    const terminal = document.getElementById('remote-terminal');
    const line = document.createElement('div');
    line.style.color = color;
    line.style.marginBottom = '2px';
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Clear terminal
function clearRemoteTerminal() {
    const terminal = document.getElementById('remote-terminal');
    terminal.innerHTML = '<div style="color: #4ec9b0;">Terminal cleared</div>';
}

// Load initial data
loadPis();
