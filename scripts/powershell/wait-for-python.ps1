# Wait for Python server to be ready, then start Nuxt
# This script waits 3 seconds for Python to start, then checks the health endpoint

Write-Host "[WAIT] Waiting 3 seconds for Python server to start..."
Start-Sleep -Seconds 3

Write-Host "[WAIT] Checking if Python server is ready on http://127.0.0.1:3000/api/health..."
$maxAttempts = 15
$attempt = 0
$ready = $false
$healthUrl = "http://127.0.0.1:3000/api/health"

while ($attempt -lt $maxAttempts -and -not $ready) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "[WAIT] Python server is ready!"
            $ready = $true
            break
        }
    } catch {
        # Connection failed, continue waiting
    }

    if (-not $ready) {
        Write-Host "[WAIT] Attempt $attempt/$maxAttempts - Python server not ready yet, waiting 2 seconds..."
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host "[WAIT] Starting Nuxt server..."
    npm run start:nuxt
} else {
    Write-Host "[WAIT] Timeout: Python server did not become ready after $maxAttempts attempts"
    exit 1
}
