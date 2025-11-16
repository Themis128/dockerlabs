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
            piList.innerHTML = `<p class="loading" style="color: #dc3545;">Error loading Raspberry Pis: ${error.message}</p>`;
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
        statusElement.style.color = '#dc3545';
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
                    <button class="btn btn-secondary" onclick="formatSDCard('${card.device_id}')" style="margin-top: 10px;">Format</button>
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

document.getElementById('install-os')?.addEventListener('click', async () => {
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
        const requestData = {
            device_id: deviceId,
            os_version: osSource === 'download' ? document.getElementById('os-version-select').value : null,
            custom_image: osSource === 'custom' ? document.getElementById('os-custom-file').files[0]?.name : null
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
            wifi_ssid: document.getElementById('settings-wifi-ssid').value,
            wifi_password: document.getElementById('settings-wifi-password').value
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
async function formatSDCard(deviceId) {
    if (!confirm(`Are you sure you want to format ${deviceId}? This will erase all data!`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/format-sdcard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: deviceId })
        });

        const data = await response.json();
        alert(data.message || (data.success ? 'Formatting initiated' : `Error: ${data.error}`));
    } catch (error) {
        alert(`Error: ${error.message}`);
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

// Load initial data
loadPis();
