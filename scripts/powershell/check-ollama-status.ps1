# Ollama Status Checker
# Checks Ollama server status, running models, and system health

param(
    [switch]$Detailed,
    [switch]$CheckModels
)

$ErrorActionPreference = "Continue"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    $validColors = @("Black", "DarkBlue", "DarkGreen", "DarkCyan", "DarkRed", "DarkMagenta",
                     "DarkYellow", "Gray", "DarkGray", "Blue", "Green", "Cyan", "Red",
                     "Magenta", "Yellow", "White")
    if ($Color -notin $validColors) { $Color = "White" }
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput ""
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput "  Ollama Status Check" "Cyan"
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput ""

# Check if Ollama server is running
Write-ColorOutput "[1] Checking Ollama server..." "Yellow"
try {
    $tagsResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-ColorOutput "  [OK] Ollama server is running" "Green"

    if ($Detailed) {
        $availableModels = $tagsResponse.models | ForEach-Object { $_.name }
        Write-ColorOutput "  Available models: $($availableModels.Count)" "Gray"
        if ($CheckModels) {
            $availableModels | ForEach-Object { Write-ColorOutput "    - $_" "Gray" }
        }
    }
} catch {
    Write-ColorOutput "  [FAIL] Ollama server is not running or not accessible" "Red"
    Write-ColorOutput "  Start it with: ollama serve" "Yellow"
    exit 1
}

# Check running models
Write-ColorOutput ""
Write-ColorOutput "[2] Checking running models..." "Yellow"
try {
    $psResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/ps" -Method Get -TimeoutSec 5 -ErrorAction Stop

    if ($psResponse.models -and $psResponse.models.Count -gt 0) {
        Write-ColorOutput "  [OK] $($psResponse.models.Count) model(s) loaded in memory:" "Green"
        $psResponse.models | ForEach-Object {
            $sizeGB = [math]::Round($_.size_vram / 1GB, 2)
            Write-ColorOutput "    - $($_.name) ($sizeGB GB)" "Gray"
            if ($Detailed) {
                Write-ColorOutput "      Context: $($_.context_size), Processor: $($_.processor_type)" "DarkGray"
            }
        }
    } else {
        Write-ColorOutput "  [WARN] No models currently loaded in memory" "Yellow"
        Write-ColorOutput "  Pre-load a model with: ollama run <model-name>" "Gray"
    }
} catch {
    Write-ColorOutput "  [WARN] Could not retrieve running models info" "Yellow"
}

# Test API endpoint
Write-ColorOutput ""
Write-ColorOutput "[3] Testing API endpoint..." "Yellow"
try {
    $testBody = @{
        model = "qwen2.5-coder:7b"
        prompt = "test"
        stream = $false
        options = @{
            num_predict = 1
        }
    } | ConvertTo-Json

    $testStart = Get-Date
    $testResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $testBody -ContentType "application/json" -TimeoutSec 30 -ErrorAction Stop
    $testTime = ((Get-Date) - $testStart).TotalMilliseconds

    Write-ColorOutput "  [OK] API endpoint is responding" "Green"
    Write-ColorOutput "  Response time: $([math]::Round($testTime, 2))ms" "Gray"
} catch {
    Write-ColorOutput "  [FAIL] API endpoint test failed: $($_.Exception.Message)" "Red"
    if ($_.Exception.Message -like "*timeout*") {
        Write-ColorOutput "  Model may need to be loaded first" "Yellow"
    }
}

# System info
if ($Detailed) {
    Write-ColorOutput ""
    Write-ColorOutput "[4] System Information..." "Yellow"
    try {
        $systemInfo = Get-WmiObject Win32_OperatingSystem
        $totalRAM = [math]::Round($systemInfo.TotalVisibleMemorySize / 1MB, 2)
        $freeRAM = [math]::Round($systemInfo.FreePhysicalMemory / 1MB, 2)
        Write-ColorOutput "  Total RAM: $totalRAM GB" "Gray"
        Write-ColorOutput "  Free RAM: $freeRAM GB" "Gray"
    } catch {
        Write-ColorOutput "  Could not retrieve system info" "Gray"
    }
}

Write-ColorOutput ""
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput "Status check complete" "Cyan"
Write-ColorOutput ""
