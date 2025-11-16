// Use current host and port for API calls (works with localhost and network IP)
const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

// Debug mode - set to true to see all server responses
const DEBUG_MODE = true;

// Response logger - logs all server responses to console and debug panel
let lastServerResponse = null;
const responseLog = [];

function logServerResponse(url, method, requestData, response, responseData, error = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    url,
    method,
    requestData,
    status: response?.status,
    statusText: response?.statusText,
    responseData,
    error: error?.message || null,
    headers: response?.headers ? Object.fromEntries(response.headers.entries()) : null,
  };

  lastServerResponse = logEntry;
  responseLog.push(logEntry);

  // Keep only last 50 responses
  if (responseLog.length > 50) {
    responseLog.shift();
  }

  if (DEBUG_MODE) {
    console.group(`🔵 ${method} ${url}`);
    console.log('Request:', requestData || '(no body)');
    console.log('Response Status:', response?.status, response?.statusText);
    console.log('Response Headers:', logEntry.headers);
    console.log('Response Data:', responseData);
    if (error) {
      console.error('Error:', error);
    }
    console.groupEnd();

    // Update debug panel if it exists
    updateDebugPanel(logEntry);
  }
}

// Create and update debug panel
function createDebugPanel() {
  if (document.getElementById('server-response-debug')) return;

  const panel = document.createElement('div');
  panel.id = 'server-response-debug';
  panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 2px solid #0078D4;
        border-radius: 8px;
        padding: 15px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        z-index: 10000;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: none;
    `;

  panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 10px;">
            <h3 style="margin: 0; color: #0078D4; font-size: 14px;">🔵 Server Response Debug</h3>
            <div>
                <button id="debug-panel-clear" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 11px;">Clear</button>
                <button id="debug-panel-close" style="background: #666; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">×</button>
            </div>
        </div>
        <div id="debug-panel-content" style="max-height: 400px; overflow-y: auto;"></div>
    `;

  document.body.appendChild(panel);

  document.getElementById('debug-panel-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  document.getElementById('debug-panel-clear').addEventListener('click', () => {
    responseLog.length = 0;
    lastServerResponse = null;
    updateDebugPanel(null);
  });

  // Toggle panel with Ctrl+Shift+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
}

function updateDebugPanel(logEntry) {
  const panel = document.getElementById('server-response-debug');
  if (!panel) {
    createDebugPanel();
    return;
  }

  const content = document.getElementById('debug-panel-content');
  if (!content) return;

  if (!logEntry) {
    content.innerHTML =
      '<p style="color: #888; text-align: center; padding: 20px;">No responses yet. Click on elements to see server responses.</p>';
    return;
  }

  const statusColor =
    logEntry.status >= 200 && logEntry.status < 300
      ? '#28a745'
      : logEntry.status >= 400
        ? '#dc3545'
        : '#ffc107';

  content.innerHTML = `
        <div style="margin-bottom: 15px; padding: 10px; background: #2d2d2d; border-radius: 4px; border-left: 3px solid ${statusColor};">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <strong style="color: ${statusColor};">${logEntry.method} ${logEntry.url}</strong>
                <span style="color: #888; font-size: 10px;">${new Date(logEntry.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style="margin-bottom: 5px;">
                <span style="color: #888;">Status:</span>
                <span style="color: ${statusColor}; font-weight: bold;">${logEntry.status} ${logEntry.statusText || ''}</span>
            </div>
            ${
              logEntry.requestData
                ? `
            <div style="margin-bottom: 5px;">
                <span style="color: #888;">Request:</span>
                <pre style="margin: 5px 0; padding: 5px; background: #1a1a1a; border-radius: 3px; overflow-x: auto; font-size: 11px;">${JSON.stringify(logEntry.requestData, null, 2)}</pre>
            </div>
            `
                : ''
            }
            <div style="margin-bottom: 5px;">
                <span style="color: #888;">Response:</span>
                <pre style="margin: 5px 0; padding: 5px; background: #1a1a1a; border-radius: 3px; overflow-x: auto; font-size: 11px; max-height: 200px; overflow-y: auto;">${JSON.stringify(logEntry.responseData, null, 2)}</pre>
            </div>
            ${
              logEntry.error
                ? `
            <div style="color: #dc3545; margin-top: 5px;">
                <strong>Error:</strong> ${logEntry.error}
            </div>
            `
                : ''
            }
        </div>
        <div style="text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
            <small style="color: #888;">Press Ctrl+Shift+D to toggle panel</small>
        </div>
    `;

  // Auto-scroll to top
  content.scrollTop = 0;
}

// Global guard to prevent script from running multiple times
if (window.__APP_INITIALIZED__) {
  console.warn('App.js already initialized, skipping duplicate initialization');
  // Exit early if already initialized - wrap everything in IIFE to prevent execution
}
window.__APP_INITIALIZED__ = true;

// Enhanced fetch wrapper that logs all responses
async function fetchWithLogging(url, options = {}) {
  const method = options.method || 'GET';
  let requestData = null;

  if (options.body) {
    try {
      requestData = JSON.parse(options.body);
    } catch {
      requestData = options.body;
    }
  }

  try {
    const response = await fetch(url, options);

    // Clone the response so we can read it multiple times
    const responseClone = response.clone();

    // Try to get response as text first to check if it's JSON
    const text = await responseClone.text();
    let responseData;

    try {
      // Only try to parse if text is not empty and looks like JSON
      if (text && text.trim()) {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          responseData = JSON.parse(trimmed);
        } else {
          responseData = text;
        }
      } else {
        responseData = text;
      }
    } catch (e) {
      // If JSON parsing fails, use text as-is
      console.warn('Failed to parse response as JSON:', e);
      responseData = text;
    }

    logServerResponse(url, method, requestData, response, responseData);

    // Return the original response (it can still be read once)
    // But we've already logged the data, so the caller can use response.json() normally
    return response;
  } catch (error) {
    // Provide more detailed error information
    let errorMessage = error.message || 'Unknown error';
    let errorDetails = '';

    if (error.message === 'Failed to fetch') {
      errorMessage = 'Network error: Unable to connect to server';
      errorDetails = 'Please ensure the server is running and accessible.';

      // Check if it's a CORS issue
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        const currentOrigin = window.location.origin;
        if (urlObj.origin !== currentOrigin) {
          errorDetails += ' This may be a CORS (Cross-Origin Resource Sharing) issue.';
        }
      }
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'Network request failed';
      errorDetails = 'The server may be unreachable or the request was blocked.';
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.details = errorDetails;

    logServerResponse(url, method, requestData, null, null, enhancedError);
    throw enhancedError;
  }
}

// Tab switching - setup event listeners when DOM is ready
function setupTabSwitching() {
  const buttons = document.querySelectorAll('.tab-button');
  if (buttons.length === 0) {
    // Buttons not ready yet, try again
    setTimeout(setupTabSwitching, 50);
    return;
  }

  buttons.forEach((button, index) => {
    // Check if listener already attached
    if (button.dataset.listenerAttached === 'true') {
      return;
    }

    // Click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tabName = button.dataset.tab;
      if (tabName) {
        switchTab(tabName);
        // Update URL hash for deep linking
        if (history.pushState) {
          history.pushState(null, null, `#${tabName}`);
        }
      }
    });

    // Keyboard navigation support
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (index + 1) % buttons.length;
        buttons[nextIndex].focus();
        buttons[nextIndex].click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (index - 1 + buttons.length) % buttons.length;
        buttons[prevIndex].focus();
        buttons[prevIndex].click();
      } else if (e.key === 'Home') {
        e.preventDefault();
        buttons[0].focus();
        buttons[0].click();
      } else if (e.key === 'End') {
        e.preventDefault();
        buttons[buttons.length - 1].focus();
        buttons[buttons.length - 1].click();
      }
    });

    // Make buttons focusable and set tabindex
    button.setAttribute('tabindex', '0');
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');

    // Mark as having listener attached
    button.dataset.listenerAttached = 'true';
  });

  // Handle mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const tabsNav = document.querySelector('.tabs');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      tabsNav.classList.toggle('mobile-menu-open');
      mobileMenuToggle.setAttribute(
        'aria-expanded',
        tabsNav.classList.contains('mobile-menu-open') ? 'true' : 'false'
      );
    });
  }

  // Close mobile menu when clicking outside (only if menu is open)
  document.addEventListener('click', (e) => {
    if (tabsNav && tabsNav.classList.contains('mobile-menu-open')) {
      if (!tabsNav.contains(e.target) && mobileMenuToggle && !mobileMenuToggle.contains(e.target)) {
        tabsNav.classList.remove('mobile-menu-open');
        if (mobileMenuToggle) {
          mobileMenuToggle.setAttribute('aria-expanded', 'false');
        }
      }
    }
  });

  // Handle URL hash on page load
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
      switchTab(hash);
    }
  }

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
      switchTab(hash);
    } else {
      switchTab('dashboard');
    }
  });
}

// Setup immediately if DOM is already loaded, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTabSwitching);
} else {
  // DOM is already loaded, but wait a tick to ensure all elements are ready
  setTimeout(setupTabSwitching, 0);
}

// Track current active tab to prevent unnecessary switches
let currentActiveTab = null;

function switchTab(tabName) {
  if (!tabName) {
    console.error('switchTab called without tabName');
    return;
  }

  // Prevent switching to the same tab (unless forced)
  if (currentActiveTab === tabName) {
    return;
  }

  // Update buttons - batch reads and writes
  const buttons = document.querySelectorAll('.tab-button');
  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);

  if (!activeButton) {
    console.error(`Tab button not found for: ${tabName}`);
    return;
  }

  // Update button states
  buttons.forEach((btn) => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('tabindex', '-1');
  });
  activeButton.classList.add('active');
  activeButton.setAttribute('aria-selected', 'true');
  activeButton.setAttribute('tabindex', '0');

  // Update content - batch reads and writes
  const contents = document.querySelectorAll('.tab-content');
  const activeContent = document.getElementById(tabName);

  if (!activeContent) {
    console.error(`Tab content not found for: ${tabName}`);
    return;
  }

  contents.forEach((content) => {
    content.classList.remove('active');
    content.setAttribute('aria-hidden', 'true');
  });
  activeContent.classList.add('active');
  activeContent.setAttribute('aria-hidden', 'false');

  // Focus management for accessibility (only if keyboard navigation was used)
  // Don't auto-focus on mouse clicks to avoid disrupting user flow
  if (document.activeElement && document.activeElement.classList.contains('tab-button')) {
    activeButton.focus();
  }

  // Close mobile menu if open
  const tabsNav = document.querySelector('.tabs');
  if (tabsNav) {
    tabsNav.classList.remove('mobile-menu-open');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  // Update current active tab
  currentActiveTab = tabName;

  // Load data for the tab (use requestAnimationFrame for async operations only)
  if (tabName === 'dashboard' || tabName === 'pis') {
    // Cancel any pending requestAnimationFrame
    if (loadPisRafId !== null) {
      cancelAnimationFrame(loadPisRafId);
      loadPisRafId = null;
    }

    // Check debounce BEFORE queuing requestAnimationFrame
    const now = Date.now();
    if (!isLoadingPis && now - lastLoadPisTime >= LOAD_PIS_DEBOUNCE_MS) {
      loadPisRafId = requestAnimationFrame(() => {
        loadPisRafId = null;
        loadPis();
      });
    }
  } else if (tabName === 'sdcard') {
    // Auto-refresh SD cards when tab is opened (only if auto-detection is not enabled)
    if (!autoDetectEnabled) {
      // Cancel any pending requestAnimationFrame
      if (refreshSDCardsRafId !== null) {
        cancelAnimationFrame(refreshSDCardsRafId);
        refreshSDCardsRafId = null;
      }

      // Check debounce BEFORE queuing requestAnimationFrame
      const now = Date.now();
      if (!isRefreshingSDCards && now - lastRefreshSDCardsTime >= REFRESH_SDCARDS_DEBOUNCE_MS) {
        refreshSDCardsRafId = requestAnimationFrame(() => {
          refreshSDCardsRafId = null;
          setTimeout(() => refreshSDCards(true), 100);
        });
      }
    }
  }
}

// Load Raspberry Pis - with guard to prevent duplicate calls
let isLoadingPis = false;
let lastLoadPisTime = 0;
let loadPisRafId = null; // Track requestAnimationFrame ID
const LOAD_PIS_DEBOUNCE_MS = 500; // Minimum time between calls

async function loadPis() {
  // Prevent duplicate calls - check BEFORE queuing
  const now = Date.now();
  if (isLoadingPis || now - lastLoadPisTime < LOAD_PIS_DEBOUNCE_MS) {
    return;
  }

  isLoadingPis = true;
  lastLoadPisTime = now;

  try {
    const response = await fetchWithLogging(`${API_BASE}/pis`);
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
  } finally {
    isLoadingPis = false;
  }
}

function displayPis(pis) {
  const piList = document.getElementById('pi-list');
  if (!piList) return;

  if (pis.length === 0) {
    piList.innerHTML = '<p class="loading">No Raspberry Pis configured</p>';
    return;
  }

  // Group Pis by device number (pi-ethernet-1 and pi-wifi-1 are the same Pi)
  const groupedPis = {};
  pis.forEach((pi) => {
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
  piList.innerHTML = Object.keys(groupedPis)
    .sort()
    .map((piNumber) => {
      const piConnections = groupedPis[piNumber];
      const ethernetPi = piConnections.find((p) => p.connection === 'Wired');
      const wifiPi = piConnections.find((p) => p.connection === '2.4G');

      return `
        <div class="pi-card">
            <h3>Raspberry Pi ${piNumber}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div>
                    <h4 style="margin-bottom: 10px; color: #667eea;">Ethernet Connection</h4>
                    ${
                      ethernetPi
                        ? `
                        <p><strong>IP:</strong> ${ethernetPi.ip}</p>
                        <p><strong>MAC:</strong> ${ethernetPi.mac}</p>
                        <span class="pi-badge badge-wired">Wired</span>
                    `
                        : '<p style="color: #999;">Not configured</p>'
                    }
                </div>
                <div>
                    <h4 style="margin-bottom: 10px; color: #667eea;">WiFi Connection</h4>
                    ${
                      wifiPi
                        ? `
                        <p><strong>IP:</strong> ${wifiPi.ip}</p>
                        <p><strong>MAC:</strong> ${wifiPi.mac}</p>
                        <span class="pi-badge badge-wifi">2.4G</span>
                    `
                        : '<p style="color: #999;">Not configured</p>'
                    }
                </div>
            </div>
        </div>
        `;
    })
    .join('');
}

function updateDashboard(pis) {
  // Count unique Pis by grouping (each Pi has both Ethernet and WiFi)
  // Group by the base name (pi-ethernet-1 and pi-wifi-1 are the same Pi)
  const uniquePis = new Set();
  pis.forEach((pi) => {
    // Extract Pi number from ID (e.g., "pi-ethernet-1" -> "1", "pi-wifi-2" -> "2")
    const match = pi.id.match(/(\d+)$/);
    if (match) {
      uniquePis.add(match[1]);
    }
  });

  const totalPisEl = document.getElementById('total-pis');
  const ethernetCountEl = document.getElementById('ethernet-count');
  const wifiCountEl = document.getElementById('wifi-count');

  if (totalPisEl) {
    totalPisEl.textContent = uniquePis.size || pis.length;
  }
  if (ethernetCountEl) {
    ethernetCountEl.textContent = pis.filter((p) => p.connection === 'Wired').length;
  }
  if (wifiCountEl) {
    wifiCountEl.textContent = pis.filter((p) => p.connection === '2.4G').length;
  }
}

// Test connections
document.getElementById('test-all')?.addEventListener('click', async () => {
  const resultsDiv = document.getElementById('test-results');
  resultsDiv.textContent = 'Testing connections...';

  try {
    const response = await fetchWithLogging(`${API_BASE}/test-connections`);
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
    const response = await fetchWithLogging(`${API_BASE}/test-ssh?pi=${piNumber}`);
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

function showSuccess(message) {
  console.log(message);
  // Show success message
  const statusElement = document.querySelector('[id*="status"], .status-message');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.classList.remove('error-message');
    statusElement.style.color = '#28a745';
    // Clear after 3 seconds
    setTimeout(() => {
      if (statusElement.textContent === message) {
        statusElement.textContent = '';
      }
    }, 3000);
  } else {
    // Fallback: use alert for now
    alert(message);
  }
}

// SD Card Management - Auto-detection state
let autoDetectEnabled = false;
let autoDetectInterval = null;
let lastSDCardCount = 0;
const AUTO_DETECT_INTERVAL = 2000; // Check every 2 seconds

// Reusable function to refresh SD cards - with guard to prevent duplicate calls
let isRefreshingSDCards = false;
let lastRefreshSDCardsTime = 0;
let refreshSDCardsRafId = null; // Track requestAnimationFrame ID
const REFRESH_SDCARDS_DEBOUNCE_MS = 500; // Minimum time between calls

async function refreshSDCards(showLoading = true) {
  // Prevent duplicate calls - check BEFORE executing
  const now = Date.now();
  if (isRefreshingSDCards || now - lastRefreshSDCardsTime < REFRESH_SDCARDS_DEBOUNCE_MS) {
    return;
  }

  isRefreshingSDCards = true;
  lastRefreshSDCardsTime = now;

  const sdcardList = document.getElementById('sdcard-list');
  if (showLoading && sdcardList) {
    sdcardList.innerHTML = '<p class="loading">Detecting SD cards...</p>';
  }

  try {
    const response = await fetchWithLogging(`${API_BASE}/sdcards`);
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

      sdcardList.innerHTML = data.sdcards
        .map(
          (card) => `
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
            `
        )
        .join('');

      // Show notification if a new card was detected
      if (wasEmpty && currentCount > 0 && autoDetectEnabled) {
        updateAutoDetectStatus(
          `SD card detected! (${currentCount} card${currentCount > 1 ? 's' : ''})`,
          '#28a745'
        );
        setTimeout(() => updateAutoDetectStatus('', ''), 3000);
      }

      // Update OS install dropdown
      updateOSInstallDropdown(data.sdcards);
    } else {
      lastSDCardCount = 0;
      if (showLoading || !autoDetectEnabled) {
        sdcardList.innerHTML =
          '<p class="loading">No SD cards detected. Please insert an SD card and try again.</p>';
      }
    }
  } catch (error) {
    console.error('Error refreshing SD cards:', error);
    const errorMessage = error.details
      ? `${error.message}. ${error.details}`
      : error.message || 'Unknown error occurred';

    if (showLoading || !autoDetectEnabled) {
      if (sdcardList) {
        sdcardList.innerHTML = `
                    <div class="error" style="padding: 1rem; background: #fee; border: 1px solid #fcc; border-radius: 4px;">
                        <p><strong>Error loading SD cards:</strong></p>
                        <p>${errorMessage}</p>
                        <p style="margin-top: 0.5rem; font-size: 0.9em; color: #666;">
                            Make sure the server is running and accessible at ${API_BASE.replace('/api', '')}
                        </p>
                    </div>
                `;
      }
    }
  } finally {
    isRefreshingSDCards = false;
  }
}

// Update OS install dropdown with SD cards
function updateOSInstallDropdown(sdcards) {
  const select = document.getElementById('os-sdcard-select');
  if (select && sdcards) {
    select.innerHTML = '<option value="">-- Select SD Card --</option>';
    sdcards.forEach((card) => {
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
document.querySelectorAll('input[name="os-source"]').forEach((radio) => {
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
    if (e.target.checked) {
      wifiSettings.classList.remove('hidden');
    } else {
      wifiSettings.classList.add('hidden');
    }
  }
});

// WPA3 Security type change handler
document.getElementById('os-wifi-security')?.addEventListener('change', (e) => {
  const securityType = e.target.value;
  const passwordSection = document.getElementById('os-wifi-password-section');
  const transitionMode = document.getElementById('os-wifi-transition-mode');
  const enterpriseSettings = document.getElementById('os-wifi-enterprise-settings');

  // Show/hide password section based on security type
  if (securityType === 'Open' || securityType === 'OWE') {
    passwordSection.classList.add('hidden');
    transitionMode.classList.add('hidden');
  } else {
    passwordSection.classList.remove('hidden');
  }

  // Show/hide transition mode (only for WPA3-Personal)
  if (securityType === 'WPA3_Personal') {
    transitionMode.classList.remove('hidden');
  } else {
    transitionMode.classList.add('hidden');
  }

  // Show/hide enterprise settings
  if (securityType === 'WPA3_Enterprise' || securityType === 'WPA2_Enterprise') {
    enterpriseSettings.classList.remove('hidden');
  } else {
    enterpriseSettings.classList.add('hidden');
  }
});

// Enhanced password strength checker with WPA-specific requirements
function checkPasswordStrength(password, securityType) {
  if (!password) return { strength: 'none', score: 0, valid: false, message: '' };

  let score = 0;
  let messages = [];
  let valid = true;

  // WPA3 requires minimum 8 characters
  const minLength = securityType === 'WPA3_Personal' || securityType === 'WPA3_Enterprise' ? 8 : 8;

  if (password.length < minLength) {
    valid = false;
    messages.push(`Password must be at least ${minLength} characters`);
  } else {
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
  }

  // Character variety checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z\d]/.test(password);

  if (hasLower && hasUpper) score++;
  if (hasDigit) score++;
  if (hasSpecial) score++;

  // WPA3 recommendations
  if (securityType === 'WPA3_Personal' || securityType === 'WPA3_Enterprise') {
    if (password.length < 12) {
      messages.push('WPA3 recommends passwords of 12+ characters');
    }
    if (!hasSpecial) {
      messages.push('WPA3 recommends including special characters');
    }
  }

  let strength = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return {
    strength,
    score,
    valid: valid && score >= 2,
    message: messages.length > 0 ? messages.join('; ') : '',
    hasLower,
    hasUpper,
    hasDigit,
    hasSpecial,
  };
}

// Enhanced password strength indicator
document.getElementById('os-wifi-password')?.addEventListener('input', (e) => {
  const password = e.target.value;
  const strengthDiv = document.getElementById('os-wifi-password-strength');
  if (!strengthDiv) return;

  const securityType = document.getElementById('os-wifi-security')?.value || 'WPA3_Personal';
  const result = checkPasswordStrength(password, securityType);

  strengthDiv.className = 'password-strength';
  strengthDiv.innerHTML = '';

  if (result.strength !== 'none') {
    strengthDiv.classList.add(result.strength);

    // Show detailed feedback
    const feedback = document.createElement('div');
    feedback.className = 'password-feedback';

    if (result.message) {
      feedback.innerHTML = `<small style="color: var(--color-warning);">${result.message}</small>`;
    } else if (result.strength === 'strong') {
      feedback.innerHTML = '<small style="color: var(--color-success);">✓ Strong password</small>';
    }

    strengthDiv.appendChild(feedback);
  }
});

// Update password validation when security type changes
document.getElementById('os-wifi-security')?.addEventListener('change', () => {
  const passwordInput = document.getElementById('os-wifi-password');
  if (passwordInput && passwordInput.value) {
    passwordInput.dispatchEvent(new Event('input'));
  }
});

// Advanced options toggle
document.getElementById('os-wifi-advanced-toggle')?.addEventListener('click', (e) => {
  const advancedOptions = document.getElementById('os-wifi-advanced-options');
  const toggleButton = e.target;

  if (advancedOptions) {
    const isVisible = advancedOptions.classList.contains('show');
    if (isVisible) {
      advancedOptions.classList.remove('show');
      toggleButton.textContent = 'Show Advanced Options';
    } else {
      advancedOptions.classList.add('show');
      toggleButton.textContent = 'Hide Advanced Options';
    }
  }
});

// Fast roaming toggle
document.getElementById('os-wifi-enable-fast-roaming')?.addEventListener('change', (e) => {
  const fastRoamingOptions = document.getElementById('os-wifi-fast-roaming-options');
  if (fastRoamingOptions) {
    if (e.target.checked) {
      fastRoamingOptions.classList.add('show');
    } else {
      fastRoamingOptions.classList.remove('show');
    }
  }
});

// Phase 2: 802.11k (RRM) toggle
document.getElementById('os-wifi-enable-rrm')?.addEventListener('change', (e) => {
  const rrmOptions = document.getElementById('os-wifi-rrm-options');
  if (rrmOptions) {
    if (e.target.checked) {
      rrmOptions.classList.add('show');
    } else {
      rrmOptions.classList.remove('show');
    }
  }
});

// Phase 2: 802.11v (WNM) toggle
document.getElementById('os-wifi-enable-wnm')?.addEventListener('change', (e) => {
  const wnmOptions = document.getElementById('os-wifi-wnm-options');
  if (wnmOptions) {
    if (e.target.checked) {
      wnmOptions.classList.add('show');
    } else {
      wnmOptions.classList.remove('show');
    }
  }
});

// WiFi Network Scanning
document.getElementById('os-wifi-scan-button')?.addEventListener('click', async () => {
  const scanButton = document.getElementById('os-wifi-scan-button');
  const scanResults = document.getElementById('os-wifi-scan-results');
  const scanList = document.getElementById('os-wifi-scan-list');
  const ssidInput = document.getElementById('os-wifi-ssid');

  if (!scanButton || !scanResults || !scanList) return;

  // Show loading state
  scanButton.disabled = true;
  scanButton.textContent = 'Scanning...';
  scanList.innerHTML = '<div style="padding: 8px; color: #666;">Scanning for networks...</div>';
  scanResults.classList.add('show');

  try {
    const response = await fetchWithLogging(`${API_BASE}/scan-wifi`);
    const data = await response.json();

    if (data.success && data.networks && data.networks.length > 0) {
      // Display networks
      scanList.innerHTML = data.networks
        .map((network) => {
          const signalBars = Math.min(
            5,
            Math.max(1, Math.floor((network.signal_strength || -100) / -20))
          );
          const signalIcon = '📶'.repeat(signalBars);
          const security = network.security || (network.encrypted ? 'Encrypted' : 'Open');
          const band = network.band || '';

          return `
                    <div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; hover:background: #f0f0f0;"
                         onclick="document.getElementById('os-wifi-ssid').value='${network.ssid || ''}'; document.getElementById('os-wifi-scan-results').classList.remove('show');">
                        <div style="font-weight: bold;">${network.ssid || 'Hidden Network'}</div>
                        <div style="font-size: 0.9em; color: #666;">
                            ${signalIcon} ${network.signal_strength || 'N/A'} dBm | ${security} ${band ? '| ' + band : ''}
                        </div>
                    </div>
                `;
        })
        .join('');
    } else {
      scanList.innerHTML = `<div style="padding: 8px; color: #999;">${data.error || 'No networks found'}</div>`;
    }
  } catch (error) {
    scanList.innerHTML = `<div style="padding: 8px; color: #d00;">Error scanning: ${error.message}</div>`;
  } finally {
    scanButton.disabled = false;
    scanButton.textContent = '🔍 Scan Networks';
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
  userDiv.style.cssText =
    'margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;';
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
// Note: Form data is collected from two separate forms (os-selection-form and os-config-form)
// to comply with Chrome's requirement that forms represent single actions
(
  document.getElementById('install-os-button') || document.getElementById('install-os')
)?.addEventListener('click', async () => {
  // Batch all DOM reads first to minimize forced reflows
  // Collect data from os-selection-form (SD Card and OS Image selection)
  const deviceId = document.getElementById('os-sdcard-select')?.value;
  if (!deviceId) {
    alert('Please select an SD card');
    return;
  }

  const osSource = document.querySelector('input[name="os-source"]:checked')?.value;
  const progressDiv = document.getElementById('os-install-progress');
  const progressBar = document.getElementById('os-progress-bar');
  const statusText = document.getElementById('os-status-text');

  // Batch DOM writes
  requestAnimationFrame(() => {
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.textContent = 'Starting OS installation...';
  });

  try {
    // Collect all configuration options from os-config-form - batch all DOM reads
    const config = {
      boot: {
        enable_ssh: document.getElementById('os-enable-ssh')?.checked ?? true,
        enable_serial: document.getElementById('os-enable-serial')?.checked ?? false,
        disable_overscan: document.getElementById('os-disable-overscan')?.checked ?? true,
        gpu_memory: parseInt(document.getElementById('os-gpu-memory')?.value || '64'),
      },
      system: {
        hostname: document.getElementById('os-hostname')?.value || 'raspberrypi',
        timezone: document.getElementById('os-timezone')?.value || 'UTC',
        locale: document.getElementById('os-locale')?.value || 'en_US.UTF-8',
        enable_camera: document.getElementById('os-enable-camera')?.checked ?? false,
        enable_spi: document.getElementById('os-enable-spi')?.checked ?? false,
        enable_i2c: document.getElementById('os-enable-i2c')?.checked ?? false,
        enable_serial_hw: document.getElementById('os-enable-serial-hw')?.checked ?? false,
      },
      network: {
        enable_ethernet: document.getElementById('os-enable-ethernet')?.checked ?? true,
        enable_wifi: document.getElementById('os-enable-wifi')?.checked ?? false,
        wifi_ssid: document.getElementById('os-wifi-ssid')?.value || '',
        wifi_password: document.getElementById('os-wifi-password')?.value || '',
        wifi_country: document.getElementById('os-wifi-country')?.value || 'US',
        wifi_security_type: document.getElementById('os-wifi-security')?.value || 'WPA3_Personal',
        wifi_transition_mode: document.getElementById('os-wifi-transition')?.checked ?? true,
        wifi_hidden: document.getElementById('os-wifi-hidden')?.checked ?? false,
        use_precomputed_psk: document.getElementById('os-wifi-precomputed-psk')?.checked ?? false,
        wifi_band: document.getElementById('os-wifi-band')?.value || '',
        priority: parseInt(document.getElementById('os-wifi-priority')?.value || '0', 10),
        auto_connect: document.getElementById('os-wifi-auto-connect')?.checked ?? true,
        min_signal_strength: document.getElementById('os-wifi-min-signal')?.value
          ? parseInt(document.getElementById('os-wifi-min-signal').value, 10)
          : null,
        enable_fast_roaming:
          document.getElementById('os-wifi-enable-fast-roaming')?.checked ?? false,
        mobility_domain: document.getElementById('os-wifi-mobility-domain')?.value
          ? parseInt(document.getElementById('os-wifi-mobility-domain').value, 10)
          : null,
        use_ft_psk: document.getElementById('os-wifi-ft-psk')?.checked ?? false,
        use_ft_eap: document.getElementById('os-wifi-ft-eap')?.checked ?? false,
        // Phase 2: 802.11k (Radio Resource Management)
        enable_rrm: document.getElementById('os-wifi-enable-rrm')?.checked ?? false,
        rrm_neighbor_report:
          document.getElementById('os-wifi-rrm-neighbor-report')?.checked ?? false,
        // Phase 2: 802.11v (Wireless Network Management)
        enable_wnm: document.getElementById('os-wifi-enable-wnm')?.checked ?? false,
        bss_transition: document.getElementById('os-wifi-bss-transition')?.checked ?? false,
        wnm_sleep_mode: document.getElementById('os-wifi-wnm-sleep-mode')?.checked ?? false,
        // Phase 3: Connection Timeout Settings
        connection_timeout: document.getElementById('os-wifi-connection-timeout')?.value
          ? parseInt(document.getElementById('os-wifi-connection-timeout').value, 10)
          : null,
        max_retries: document.getElementById('os-wifi-max-retries')?.value
          ? parseInt(document.getElementById('os-wifi-max-retries').value, 10)
          : null,
        // Phase 3: Guest Network Isolation
        is_guest_network: document.getElementById('os-wifi-is-guest-network')?.checked ?? false,
        enable_isolation: document.getElementById('os-wifi-enable-isolation')?.checked ?? false,
        vlan_id: document.getElementById('os-wifi-vlan-id')?.value
          ? parseInt(document.getElementById('os-wifi-vlan-id').value, 10)
          : null,
        // Phase 3: MAC Address Filtering
        enable_mac_filtering:
          document.getElementById('os-wifi-enable-mac-filtering')?.checked ?? false,
        allowed_mac_addresses: (document.getElementById('os-wifi-allowed-macs')?.value || '')
          .split('\n')
          .map((m) => m.trim())
          .filter((m) => m),
        blocked_mac_addresses: (document.getElementById('os-wifi-blocked-macs')?.value || '')
          .split('\n')
          .map((m) => m.trim())
          .filter((m) => m),
        // Phase 3: Hotspot 2.0 / Passpoint
        enable_hotspot20: document.getElementById('os-wifi-enable-hotspot20')?.checked ?? false,
        domain_name: document.getElementById('os-wifi-domain-name')?.value || '',
        wifi_eap_method: document.getElementById('os-wifi-eap-method')?.value || '',
        wifi_identity: document.getElementById('os-wifi-identity')?.value || '',
        wifi_anonymous_identity: document.getElementById('os-wifi-anonymous-identity')?.value || '',
        wifi_ca_cert: document.getElementById('os-wifi-ca-cert')?.value || '',
        wifi_client_cert: document.getElementById('os-wifi-client-cert')?.value || '',
        wifi_private_key: document.getElementById('os-wifi-private-key')?.value || '',
        wifi_private_key_passphrase:
          document.getElementById('os-wifi-private-key-passphrase')?.value || '',
        wifi_phase2: document.getElementById('os-wifi-phase2')?.value || '',
        wifi_eap_password: document.getElementById('os-wifi-eap-password')?.value || '',
        use_static_ip: document.getElementById('os-use-static-ip')?.checked ?? false,
        static_ip: document.getElementById('os-static-ip')?.value || '',
        gateway: document.getElementById('os-gateway')?.value || '',
        dns: document.getElementById('os-dns')?.value || '',
      },
      users: {
        default_password: document.getElementById('os-default-password')?.value || '',
        additional_users: [],
      },
      ssh: {
        port: parseInt(document.getElementById('os-ssh-port')?.value || '22'),
        enable_password_auth: document.getElementById('os-ssh-password-auth')?.checked ?? true,
        disable_root_login: document.getElementById('os-ssh-disable-root')?.checked ?? true,
        authorized_keys: (document.getElementById('os-ssh-keys')?.value || '')
          .split('\n')
          .filter((k) => k.trim()),
      },
      packages: {
        update_package_list: document.getElementById('os-update-packages')?.checked ?? true,
        upgrade_packages: document.getElementById('os-upgrade-packages')?.checked ?? false,
        packages_to_install: (document.getElementById('os-packages')?.value || '')
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p),
      },
      scripts: {
        pre_install: (document.getElementById('os-pre-scripts')?.value || '')
          .split('\n')
          .filter((s) => s.trim()),
        post_install: (document.getElementById('os-post-scripts')?.value || '')
          .split('\n')
          .filter((s) => s.trim()),
        first_boot: (document.getElementById('os-firstboot-scripts')?.value || '')
          .split('\n')
          .filter((s) => s.trim()),
      },
    };

    // Collect additional users - batch DOM reads
    const userEntries = document.querySelectorAll('.user-entry');
    for (const entry of userEntries) {
      const username = entry.querySelector('.os-user-username')?.value;
      if (username) {
        config.users.additional_users.push({
          username: username,
          password: entry.querySelector('.os-user-password')?.value || '',
          has_sudo: entry.querySelector('.os-user-sudo')?.checked ?? false,
          groups: (entry.querySelector('.os-user-groups')?.value || '')
            .split(',')
            .map((g) => g.trim())
            .filter((g) => g),
        });
      }
    }

    // Get selected OS version and download URL
    const osSelect = document.getElementById('os-version-select');
    const selectedOption = osSelect.options[osSelect.selectedIndex];
    const osVersion = osSource === 'download' ? selectedOption.value : null;
    const downloadUrl = selectedOption ? selectedOption.getAttribute('data-url') : null;

    const requestData = {
      device_id: deviceId,
      os_version: osVersion,
      download_url: downloadUrl, // Include the download URL for the backend to fetch
      custom_image:
        osSource === 'custom' ? document.getElementById('os-custom-file').files[0]?.name : null,
      configuration: config,
    };

    const response = await fetchWithLogging(`${API_BASE}/install-os`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();

    // Batch DOM writes using requestAnimationFrame
    requestAnimationFrame(() => {
      if (data.success) {
        progressBar.style.width = '100%';
        statusText.textContent = data.message || 'OS installation completed!';
      } else {
        statusText.textContent = `Error: ${data.error}`;
        statusText.style.color = '#dc3545';
      }
    });
  } catch (error) {
    requestAnimationFrame(() => {
      statusText.textContent = `Error: ${error.message}`;
      statusText.style.color = '#dc3545';
    });
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
      ssh_port: parseInt(document.getElementById('settings-ssh-port').value) || 22,
    },
    telnet: {
      enable_telnet: document.getElementById('settings-telnet-enable').checked,
      telnet_port: parseInt(document.getElementById('settings-telnet-port').value) || 23,
    },
    network: {
      hostname: document.getElementById('settings-hostname').value,
      wifi_enable: document.getElementById('settings-wifi-enable').checked,
      wifi_ssid: document.getElementById('settings-wifi-ssid')?.value || '',
      wifi_password: document.getElementById('settings-wifi-password')?.value || '',
      wifi_security_type:
        document.getElementById('settings-wifi-security')?.value || 'WPA3_Personal',
      wifi_transition_mode: document.getElementById('settings-wifi-transition')?.checked ?? true,
      enable_pmf: true, // Protected Management Frames
    },
  };

  const statusDiv = document.getElementById('settings-status');

  // Batch DOM writes
  requestAnimationFrame(() => {
    statusDiv.textContent = 'Applying settings...';
    statusDiv.style.color = '#333';
  });

  try {
    const response = await fetchWithLogging(`${API_BASE}/configure-pi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pi_number: parseInt(piNumber),
        settings: settings,
      }),
    });

    const data = await response.json();

    // Batch DOM writes
    requestAnimationFrame(() => {
      if (data.success) {
        statusDiv.textContent = `Settings applied successfully! ${data.message || ''}`;
        statusDiv.style.color = '#28a745';
      } else {
        statusDiv.textContent = `Error: ${data.error || 'Failed to apply settings'}`;
        statusDiv.style.color = '#dc3545';
      }
    });
  } catch (error) {
    requestAnimationFrame(() => {
      statusDiv.textContent = `Error: ${error.message}`;
      statusDiv.style.color = '#dc3545';
    });
  }
});

// Helper function to create format progress component
function createFormatProgressComponent(deviceId, piModelName) {
  const progressId = `format-progress-${deviceId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  return `<div id="${progressId}" class="format-progress-container">
    <div class="format-progress-header">
        <h3 class="format-progress-title">Formatting SD Card for ${piModelName}</h3>
        <div class="format-progress-percent" id="${progressId}-percent">0%</div>
    </div>
    <div class="format-progress-bar-container">
        <div class="format-progress-bar" id="${progressId}-bar" style="width: 0%"></div>
    </div>
    <div class="format-progress-log" id="${progressId}-log"></div>
    <div class="format-progress-status processing" id="${progressId}-status" style="display: none;">Processing...</div>
</div>`;
}

// Helper function to add log entry
function addFormatLogEntry(progressId, message, type = 'info') {
  const logContainer = document.getElementById(`${progressId}-log`);
  if (!logContainer) return;

  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `format-progress-log-entry ${type}`;
  entry.innerHTML = `<span class="format-progress-log-timestamp">[${timestamp}]</span>${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Helper function to update progress
function updateFormatProgress(progressId, percent, message, type = 'info') {
  const percentEl = document.getElementById(`${progressId}-percent`);
  const barEl = document.getElementById(`${progressId}-bar`);
  const statusEl = document.getElementById(`${progressId}-status`);

  if (percentEl && percent !== null && percent !== undefined) {
    percentEl.textContent = `${Math.round(percent)}%`;
  }
  if (barEl && percent !== null && percent !== undefined) {
    barEl.style.width = `${percent}%`;
    if (percent > 0) {
      barEl.textContent = `${Math.round(percent)}%`;
    }
  }
  if (message) {
    addFormatLogEntry(progressId, message, type);
  }
  if (statusEl) {
    statusEl.className = 'format-progress-status processing';
    statusEl.style.display = 'block';
    statusEl.textContent = message || 'Processing...';
  }
}

// Helper function for SD card formatting with verbose progress
async function formatSDCard(deviceId, elementId) {
  const modelSelect = document.getElementById(`pi-model-${elementId}`);
  const piModel = modelSelect ? modelSelect.value : 'pi5';
  const piModelName = piModel === 'pi5' ? 'Raspberry Pi 5' : 'Raspberry Pi 3B';

  if (
    !confirm(
      `Are you sure you want to format ${deviceId} for ${piModelName}?\n\nThis will:\n- Erase ALL data on the card\n- Create boot partition (FAT32, 512MB)\n- Create root partition (ext4, remaining space)\n\nThis action cannot be undone!`
    )
  ) {
    return;
  }

  // Show formatting progress component
  const sdcardList = document.getElementById('sdcard-list');
  const originalContent = sdcardList.innerHTML;
  const progressId = `format-progress-${deviceId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  sdcardList.innerHTML = createFormatProgressComponent(deviceId, piModelName);

  // Initialize progress
  updateFormatProgress(progressId, 0, 'Initializing formatting process...', 'info');

  try {
    // Use fetch with streaming for Server-Sent Events
    const response = await fetchWithLogging(`${API_BASE}/format-sdcard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        device_id: deviceId,
        pi_model: piModel,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const TIMEOUT_MS = 300000; // 5 minutes timeout
    const startTime = Date.now();

    while (true) {
      // Check for timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error('Stream reading timeout - operation took too long');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.substring(6).trim();
            if (!jsonStr) continue; // Skip empty data lines
            const data = JSON.parse(jsonStr);

            if (data.type === 'progress') {
              // Update progress
              const percent =
                data.percent !== null && data.percent !== undefined ? data.percent : null;
              const message = data.message || '';
              let logType = 'info';

              if (
                message.toLowerCase().includes('error') ||
                message.toLowerCase().includes('failed')
              ) {
                logType = 'error';
              } else if (
                message.toLowerCase().includes('success') ||
                message.toLowerCase().includes('completed')
              ) {
                logType = 'success';
              } else if (message.toLowerCase().includes('warning')) {
                logType = 'warning';
              }

              updateFormatProgress(progressId, percent, message, logType);
            } else if (data.success !== undefined) {
              // Final result
              const statusEl = document.getElementById(`${progressId}-status`);
              if (data.success) {
                updateFormatProgress(
                  progressId,
                  100,
                  data.message || 'Formatting completed successfully!',
                  'success'
                );
                if (statusEl) {
                  statusEl.className = 'format-progress-status success';
                  statusEl.textContent = '✓ ' + (data.message || 'SD card formatted successfully!');
                }
                // Refresh the SD card list after a short delay
                setTimeout(() => {
                  refreshSDCards(true);
                }, 2000);
              } else {
                updateFormatProgress(
                  progressId,
                  null,
                  'Error: ' + (data.error || 'Formatting failed'),
                  'error'
                );
                if (statusEl) {
                  statusEl.className = 'format-progress-status error';
                  statusEl.textContent = '✗ Error: ' + (data.error || 'Formatting failed');
                }
                setTimeout(() => {
                  refreshSDCards(true);
                }, 3000);
              }
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Formatting error:', error);
    const errorMessage = error.details
      ? `${error.message}. ${error.details}`
      : error.message || 'Unknown error occurred';

    updateFormatProgress(progressId, null, 'Error: ' + errorMessage, 'error');
    const statusEl = document.getElementById(`${progressId}-status`);
    if (statusEl) {
      statusEl.className = 'format-progress-status error';
      statusEl.textContent = '✗ Error: ' + errorMessage;
    }
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
      // Page is visible, resume polling (only if not already running)
      if (!autoDetectInterval) {
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
      const response = await fetchWithLogging(`${API_BASE}/get-pi-info?pi=${piNumber}`);
      const data = await response.json();

      if (data.success) {
        remoteConnected = true;
        currentPiNumber = piNumber;
        currentConnectionType = connectionType;
        statusDiv.textContent = `Connected to Pi ${piNumber} (${data.pi.ip}) via ${connectionType.toUpperCase()}`;
        statusDiv.style.color = '#28a745';
        document.getElementById('remote-connect-btn').textContent = 'Disconnect';
        appendToTerminal(
          `Connected to Raspberry Pi ${piNumber} (${data.pi.ip}) via ${connectionType.toUpperCase()}`,
          '#4ec9b0'
        );
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

    const response = await fetchWithLogging(`${API_BASE}/execute-remote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pi_number: piNumber,
        command: command,
        connection_type: connectionType,
        network_type: networkType,
        username: username,
        password: password,
        key_path: keyPath,
      }),
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

// Setup remote command event listeners
document.getElementById('remote-execute-btn')?.addEventListener('click', executeRemoteCommand);
document.getElementById('remote-clear-btn')?.addEventListener('click', clearRemoteTerminal);
document.getElementById('remote-command-input')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    executeRemoteCommand();
  }
});

// Setup quick command buttons (using event delegation for dynamic content)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.quick-command-btn');
  if (btn) {
    const command = btn.dataset.command;
    if (command) {
      runQuickCommand(command);
    }
  }
});

// Phase 2: Network Profile Export/Import
document.getElementById('export-network-profile')?.addEventListener('click', () => {
  try {
    // Collect current WiFi configuration
    const networkProfile = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      network: {
        enable_wifi: document.getElementById('os-enable-wifi')?.checked ?? false,
        wifi_ssid: document.getElementById('os-wifi-ssid')?.value || '',
        wifi_password: document.getElementById('os-wifi-password')?.value || '',
        wifi_country: document.getElementById('os-wifi-country')?.value || 'US',
        wifi_security_type: document.getElementById('os-wifi-security')?.value || 'WPA3_Personal',
        wifi_transition_mode: document.getElementById('os-wifi-transition')?.checked ?? true,
        wifi_hidden: document.getElementById('os-wifi-hidden')?.checked ?? false,
        use_precomputed_psk: document.getElementById('os-wifi-precomputed-psk')?.checked ?? false,
        wifi_band: document.getElementById('os-wifi-band')?.value || '',
        priority: parseInt(document.getElementById('os-wifi-priority')?.value || '0', 10),
        auto_connect: document.getElementById('os-wifi-auto-connect')?.checked ?? true,
        min_signal_strength: document.getElementById('os-wifi-min-signal')?.value
          ? parseInt(document.getElementById('os-wifi-min-signal').value, 10)
          : null,
        enable_fast_roaming:
          document.getElementById('os-wifi-enable-fast-roaming')?.checked ?? false,
        mobility_domain: document.getElementById('os-wifi-mobility-domain')?.value
          ? parseInt(document.getElementById('os-wifi-mobility-domain').value, 10)
          : null,
        use_ft_psk: document.getElementById('os-wifi-ft-psk')?.checked ?? false,
        use_ft_eap: document.getElementById('os-wifi-ft-eap')?.checked ?? false,
        enable_rrm: document.getElementById('os-wifi-enable-rrm')?.checked ?? false,
        rrm_neighbor_report:
          document.getElementById('os-wifi-rrm-neighbor-report')?.checked ?? false,
        enable_wnm: document.getElementById('os-wifi-enable-wnm')?.checked ?? false,
        bss_transition: document.getElementById('os-wifi-bss-transition')?.checked ?? false,
        wnm_sleep_mode: document.getElementById('os-wifi-wnm-sleep-mode')?.checked ?? false,
        // Phase 3: Connection Timeout Settings
        connection_timeout: document.getElementById('os-wifi-connection-timeout')?.value
          ? parseInt(document.getElementById('os-wifi-connection-timeout').value, 10)
          : null,
        max_retries: document.getElementById('os-wifi-max-retries')?.value
          ? parseInt(document.getElementById('os-wifi-max-retries').value, 10)
          : null,
        // Phase 3: Guest Network Isolation
        is_guest_network: document.getElementById('os-wifi-is-guest-network')?.checked ?? false,
        enable_isolation: document.getElementById('os-wifi-enable-isolation')?.checked ?? false,
        vlan_id: document.getElementById('os-wifi-vlan-id')?.value
          ? parseInt(document.getElementById('os-wifi-vlan-id').value, 10)
          : null,
        // Phase 3: MAC Address Filtering
        enable_mac_filtering:
          document.getElementById('os-wifi-enable-mac-filtering')?.checked ?? false,
        allowed_mac_addresses: (document.getElementById('os-wifi-allowed-macs')?.value || '')
          .split('\n')
          .map((m) => m.trim())
          .filter((m) => m),
        blocked_mac_addresses: (document.getElementById('os-wifi-blocked-macs')?.value || '')
          .split('\n')
          .map((m) => m.trim())
          .filter((m) => m),
        // Phase 3: Hotspot 2.0 / Passpoint
        enable_hotspot20: document.getElementById('os-wifi-enable-hotspot20')?.checked ?? false,
        domain_name: document.getElementById('os-wifi-domain-name')?.value || '',
        wifi_eap_method: document.getElementById('os-wifi-eap-method')?.value || '',
        wifi_identity: document.getElementById('os-wifi-identity')?.value || '',
        wifi_anonymous_identity: document.getElementById('os-wifi-anonymous-identity')?.value || '',
        wifi_ca_cert: document.getElementById('os-wifi-ca-cert')?.value || '',
        wifi_client_cert: document.getElementById('os-wifi-client-cert')?.value || '',
        wifi_private_key: document.getElementById('os-wifi-private-key')?.value || '',
        wifi_private_key_passphrase:
          document.getElementById('os-wifi-private-key-passphrase')?.value || '',
        wifi_phase2: document.getElementById('os-wifi-phase2')?.value || '',
        wifi_eap_password: document.getElementById('os-wifi-eap-password')?.value || '',
      },
    };

    // Create download
    const blob = new Blob([JSON.stringify(networkProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ssid = networkProfile.network.wifi_ssid || 'network';
    a.href = url;
    a.download = `wifi-profile-${ssid.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Network profile exported successfully!');
  } catch (error) {
    showError(`Error exporting profile: ${error.message}`);
  }
});

document.getElementById('import-network-profile')?.addEventListener('click', () => {
  document.getElementById('import-network-profile-file')?.click();
});

document.getElementById('import-network-profile-file')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const profile = JSON.parse(text);

    if (!profile.network) {
      throw new Error('Invalid profile format: missing network configuration');
    }

    const net = profile.network;

    // Populate form fields
    if (document.getElementById('os-enable-wifi')) {
      document.getElementById('os-enable-wifi').checked = net.enable_wifi ?? false;
    }
    if (document.getElementById('os-wifi-ssid')) {
      document.getElementById('os-wifi-ssid').value = net.wifi_ssid || '';
    }
    if (document.getElementById('os-wifi-password')) {
      document.getElementById('os-wifi-password').value = net.wifi_password || '';
    }
    if (document.getElementById('os-wifi-country')) {
      document.getElementById('os-wifi-country').value = net.wifi_country || 'US';
    }
    if (document.getElementById('os-wifi-security')) {
      document.getElementById('os-wifi-security').value = net.wifi_security_type || 'WPA3_Personal';
    }
    if (document.getElementById('os-wifi-transition')) {
      document.getElementById('os-wifi-transition').checked = net.wifi_transition_mode ?? true;
    }
    if (document.getElementById('os-wifi-hidden')) {
      document.getElementById('os-wifi-hidden').checked = net.wifi_hidden ?? false;
    }
    if (document.getElementById('os-wifi-precomputed-psk')) {
      document.getElementById('os-wifi-precomputed-psk').checked = net.use_precomputed_psk ?? false;
    }
    if (document.getElementById('os-wifi-band')) {
      document.getElementById('os-wifi-band').value = net.wifi_band || '';
    }
    if (document.getElementById('os-wifi-priority')) {
      document.getElementById('os-wifi-priority').value = net.priority || 0;
    }
    if (document.getElementById('os-wifi-auto-connect')) {
      document.getElementById('os-wifi-auto-connect').checked = net.auto_connect ?? true;
    }
    if (document.getElementById('os-wifi-min-signal')) {
      document.getElementById('os-wifi-min-signal').value = net.min_signal_strength || '';
    }
    if (document.getElementById('os-wifi-enable-fast-roaming')) {
      document.getElementById('os-wifi-enable-fast-roaming').checked =
        net.enable_fast_roaming ?? false;
      document.getElementById('os-wifi-enable-fast-roaming').dispatchEvent(new Event('change'));
    }
    if (document.getElementById('os-wifi-mobility-domain')) {
      document.getElementById('os-wifi-mobility-domain').value = net.mobility_domain || '1234';
    }
    if (document.getElementById('os-wifi-ft-psk')) {
      document.getElementById('os-wifi-ft-psk').checked = net.use_ft_psk ?? false;
    }
    if (document.getElementById('os-wifi-ft-eap')) {
      document.getElementById('os-wifi-ft-eap').checked = net.use_ft_eap ?? false;
    }
    // Phase 2 fields
    if (document.getElementById('os-wifi-enable-rrm')) {
      document.getElementById('os-wifi-enable-rrm').checked = net.enable_rrm ?? false;
      document.getElementById('os-wifi-enable-rrm').dispatchEvent(new Event('change'));
    }
    if (document.getElementById('os-wifi-rrm-neighbor-report')) {
      document.getElementById('os-wifi-rrm-neighbor-report').checked =
        net.rrm_neighbor_report ?? false;
    }
    if (document.getElementById('os-wifi-enable-wnm')) {
      document.getElementById('os-wifi-enable-wnm').checked = net.enable_wnm ?? false;
      document.getElementById('os-wifi-enable-wnm').dispatchEvent(new Event('change'));
    }
    if (document.getElementById('os-wifi-bss-transition')) {
      document.getElementById('os-wifi-bss-transition').checked = net.bss_transition ?? false;
    }
    if (document.getElementById('os-wifi-wnm-sleep-mode')) {
      document.getElementById('os-wifi-wnm-sleep-mode').checked = net.wnm_sleep_mode ?? false;
    }
    // Phase 3 fields
    if (document.getElementById('os-wifi-connection-timeout')) {
      document.getElementById('os-wifi-connection-timeout').value = net.connection_timeout || '';
    }
    if (document.getElementById('os-wifi-max-retries')) {
      document.getElementById('os-wifi-max-retries').value = net.max_retries || '';
    }
    if (document.getElementById('os-wifi-is-guest-network')) {
      document.getElementById('os-wifi-is-guest-network').checked = net.is_guest_network ?? false;
      document.getElementById('os-wifi-is-guest-network').dispatchEvent(new Event('change'));
    }
    if (document.getElementById('os-wifi-enable-isolation')) {
      document.getElementById('os-wifi-enable-isolation').checked = net.enable_isolation ?? false;
    }
    if (document.getElementById('os-wifi-vlan-id')) {
      document.getElementById('os-wifi-vlan-id').value = net.vlan_id || '';
    }
    if (document.getElementById('os-wifi-enable-mac-filtering')) {
      document.getElementById('os-wifi-enable-mac-filtering').checked =
        net.enable_mac_filtering ?? false;
      document.getElementById('os-wifi-enable-mac-filtering').dispatchEvent(new Event('change'));
    }
    if (document.getElementById('os-wifi-allowed-macs')) {
      document.getElementById('os-wifi-allowed-macs').value = (
        net.allowed_mac_addresses || []
      ).join('\n');
    }
    if (document.getElementById('os-wifi-blocked-macs')) {
      document.getElementById('os-wifi-blocked-macs').value = (
        net.blocked_mac_addresses || []
      ).join('\n');
    }
    if (document.getElementById('os-wifi-enable-hotspot20')) {
      document.getElementById('os-wifi-enable-hotspot20').checked = net.enable_hotspot20 ?? false;
      document.getElementById('os-wifi-enable-hotspot20').dispatchEvent(new Event('change'));
    }
    if (document.getElementById('os-wifi-domain-name')) {
      document.getElementById('os-wifi-domain-name').value = net.domain_name || '';
    }
    // Enterprise fields
    if (document.getElementById('os-wifi-eap-method')) {
      document.getElementById('os-wifi-eap-method').value = net.wifi_eap_method || '';
    }
    if (document.getElementById('os-wifi-identity')) {
      document.getElementById('os-wifi-identity').value = net.wifi_identity || '';
    }
    if (document.getElementById('os-wifi-anonymous-identity')) {
      document.getElementById('os-wifi-anonymous-identity').value =
        net.wifi_anonymous_identity || '';
    }
    if (document.getElementById('os-wifi-ca-cert')) {
      document.getElementById('os-wifi-ca-cert').value = net.wifi_ca_cert || '';
    }
    if (document.getElementById('os-wifi-client-cert')) {
      document.getElementById('os-wifi-client-cert').value = net.wifi_client_cert || '';
    }
    if (document.getElementById('os-wifi-private-key')) {
      document.getElementById('os-wifi-private-key').value = net.wifi_private_key || '';
    }
    if (document.getElementById('os-wifi-private-key-passphrase')) {
      document.getElementById('os-wifi-private-key-passphrase').value =
        net.wifi_private_key_passphrase || '';
    }
    if (document.getElementById('os-wifi-phase2')) {
      document.getElementById('os-wifi-phase2').value = net.wifi_phase2 || '';
    }
    if (document.getElementById('os-wifi-eap-password')) {
      document.getElementById('os-wifi-eap-password').value = net.wifi_eap_password || '';
    }

    // Trigger security type change to show/hide appropriate fields
    document.getElementById('os-wifi-security')?.dispatchEvent(new Event('change'));

    showSuccess('Network profile imported successfully!');
  } catch (error) {
    showError(`Error importing profile: ${error.message}`);
  } finally {
    // Reset file input
    e.target.value = '';
  }
});

// Append text to terminal
function appendToTerminal(text, color = '#d4d4d4') {
  const terminal = document.getElementById('remote-terminal');
  if (!terminal) return;
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
  if (terminal) {
    terminal.innerHTML = '<div style="color: #4ec9b0;">Terminal cleared</div>';
  }
}

// Load initial data when DOM is ready - with guard to prevent multiple initializations
let isInitialized = false;
function initializeApp() {
  if (isInitialized) {
    return; // Already initialized
  }
  isInitialized = true;

  createDebugPanel(); // Initialize debug panel

  // Only load Pis if we're on dashboard or pis tab initially
  const hash = window.location.hash.substring(1);
  const initialTab = hash && document.getElementById(hash) ? hash : 'dashboard';
  if (initialTab === 'dashboard' || initialTab === 'pis') {
    // Use a small delay to ensure everything is ready
    setTimeout(() => {
      loadPis();
    }, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM is already loaded
  initializeApp();
}
