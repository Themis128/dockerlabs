# Wait for Python server to be ready, then start Nuxt
# This script waits 4 seconds for Python to start, then checks HTTP endpoints

Write-Host "[WAIT] Waiting 4 seconds for Python server to start..."
Start-Sleep -Seconds 4

# Nuxt uses http://localhost:3000 by default (from nuxt.config.ts)
# Check this URL first to ensure Nuxt can connect when it starts
$nuxtPythonUrl = "http://localhost:3000"
$healthUrl = "$nuxtPythonUrl/api/health"
$fallbackUrl = "http://127.0.0.1:3000/api/health"

Write-Host "[WAIT] Checking if Python server is ready (Nuxt will use: $nuxtPythonUrl)..."
Write-Host "[WAIT] Primary check: $healthUrl"

# Function to test TCP connection (more reliable than Test-NetConnection)
function Test-TcpConnection {
    param([string]$ComputerName, [int]$Port, [int]$TimeoutMs = 2000)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.ReceiveTimeout = $TimeoutMs
        $tcpClient.SendTimeout = $TimeoutMs

        # Use synchronous connect with timeout
        $result = $tcpClient.BeginConnect($ComputerName, $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne($TimeoutMs, $false)

        if ($success) {
            try {
                $tcpClient.EndConnect($result)
                $connected = $tcpClient.Connected
                $tcpClient.Close()
                return $connected
            } catch {
                $tcpClient.Close()
                return $false
            }
        } else {
            $tcpClient.Close()
            return $false
        }
    } catch {
        return $false
    }
}

# Function to make HTTP request with better error handling
function Test-HealthEndpoint {
    param([string]$Url)
    try {
        # Try Invoke-RestMethod first (more reliable for API calls)
        # Use reasonable timeout - server might be slow to respond initially
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 5 -ErrorAction Stop
        return @{ Success = $true; StatusCode = 200; Response = $response }
    } catch {
        $statusCode = $null
        $errorMsg = $_.Exception.Message

        # Only extract status code from actual HTTP response exceptions
        # This ensures we only get real HTTP status codes, not random numbers from error messages
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            try {
                $statusCode = [int]$_.Exception.Response.StatusCode.value__
                # Validate it's a real HTTP status code (100-599)
                if ($statusCode -lt 100 -or $statusCode -gt 599) {
                    $statusCode = $null
                }
            } catch {
                # If we can't extract the status code properly, treat as connection error
                $statusCode = $null
            }
        }

        # If we got a valid HTTP status code (even error codes), server is responding
        if ($statusCode -ne $null) {
            return @{ Success = $true; StatusCode = $statusCode; Response = $null }
        }

        # Connection failed or server not ready yet
        return @{ Success = $false; StatusCode = $null; Error = $errorMsg }
    }
}

$maxAttempts = 20
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    $attempt++

    # Try 127.0.0.1 first (more reliable on Windows), then localhost (what Nuxt uses)
    $urls = @($fallbackUrl, $healthUrl)
    $connected = $false

    foreach ($url in $urls) {
        $result = Test-HealthEndpoint -Url $url

        if ($result.Success) {
            # Accept both 200 (healthy) and 503 (unhealthy but server is responding)
            # The important thing is that the server is accepting connections
            if ($result.StatusCode -eq 200 -or $result.StatusCode -eq 503) {
                $urlType = if ($url -eq $healthUrl) { "primary (localhost - Nuxt will use this)" } else { "fallback (127.0.0.1)" }
                Write-Host "[WAIT] Python server is ready! (Status: $($result.StatusCode), URL: $urlType)"
                $ready = $true
                $connected = $true
                break
            } else {
                Write-Host "[WAIT] Attempt $attempt/$maxAttempts - Unexpected status code: $($result.StatusCode) from $url, waiting 1 second..."
            }
        } else {
            # Connection failed, try next URL or continue waiting
            if ($url -eq $urls[-1]) {
                # Last URL failed, log and continue
                if ($attempt -le 3) {
                    Write-Host "[WAIT] Attempt $attempt/$maxAttempts - Connection failed: $($result.Error), waiting 1 second..."
                } elseif ($attempt % 5 -eq 0) {
                    # Every 5 attempts, show more detail
                    Write-Host "[WAIT] Attempt $attempt/$maxAttempts - Still waiting for server... (Error: $($result.Error))"
                } else {
                    Write-Host "[WAIT] Attempt $attempt/$maxAttempts - Python server not ready yet, waiting 1 second..."
                }
            }
        }
    }

    if ($connected) {
        break
    }

    if (-not $ready) {
        Start-Sleep -Seconds 1
    }
}

if ($ready) {
    # Verify server is stable by testing an actual API endpoint using the same URL Nuxt will use
    Write-Host "[WAIT] Verifying Python server can handle API requests (using Nuxt's URL: $nuxtPythonUrl)..."
    Start-Sleep -Seconds 2

    # Test using the same URL format Nuxt will use (localhost:3000)
    $apiTestUrl = "$nuxtPythonUrl/api/pis"
    $apiReady = $false
    $apiAttempts = 0
    $maxApiAttempts = 5

    while ($apiAttempts -lt $maxApiAttempts -and -not $apiReady) {
        $apiAttempts++
        try {
            $apiResponse = Invoke-WebRequest -Uri $apiTestUrl -Method Get -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
            if ($apiResponse.StatusCode -eq 200) {
                Write-Host "[WAIT] Python server API verified and ready! (Status: $($apiResponse.StatusCode))"
                Write-Host "[WAIT] Connection test successful - Nuxt will be able to connect to Python server"
                $apiReady = $true
            } else {
                Write-Host "[WAIT] API test attempt $apiAttempts/$maxApiAttempts - Status: $($apiResponse.StatusCode), waiting 2 seconds..."
                Start-Sleep -Seconds 2
            }
        } catch {
            if ($apiAttempts -lt $maxApiAttempts) {
                Write-Host "[WAIT] API test attempt $apiAttempts/$maxApiAttempts - Not ready yet, waiting 2 seconds..."
                Start-Sleep -Seconds 2
            }
        }
    }

    if ($apiReady) {
        # Give Python server a moment to fully stabilize after API test
        Write-Host "[WAIT] Python server fully verified and ready for Nuxt connections"
        Write-Host "[WAIT] Waiting 1 second for full stabilization..."
        Start-Sleep -Seconds 1
        Write-Host "[WAIT] Starting Nuxt server (will connect to: $nuxtPythonUrl)..."
        npm run start:nuxt
    } else {
        Write-Host "[WAIT] Warning: API endpoint test failed, but health check passed."
        Write-Host "[WAIT] Nuxt may have connection issues. Waiting 3 seconds before starting..."
        Start-Sleep -Seconds 3
        Write-Host "[WAIT] Starting Nuxt server (will connect to: $nuxtPythonUrl)..."
        npm run start:nuxt
    }
} else {
    Write-Host "[WAIT] Timeout: Python server did not become ready after $maxAttempts attempts"
    Write-Host "[WAIT] Please check if the Python server is running and accessible at $healthUrl"
    exit 1
}
