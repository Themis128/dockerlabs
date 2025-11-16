# Prepare and Analyze Script
# Pre-loads model, pre-processes file, and runs analysis

param(
    [string]$FilePath = "",
    [string]$Language = "auto",
    [switch]$Quick,
    [switch]$Detailed,
    [string]$Model = "qwen2.5-coder:7b",
    [int]$Timeout = 300,
    [switch]$Stream,
    [int]$MaxRetries = 3,
    [switch]$Verbose,
    [switch]$SkipPreload,
    [switch]$PreprocessCode
)

$ErrorActionPreference = "Stop"

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
Write-ColorOutput "  Prepare and Analyze with Ollama" "Cyan"
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput ""

# Step 1: Check Ollama connection
Write-ColorOutput "[1/4] Checking Ollama server..." "Yellow"
try {
    $tagsResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-ColorOutput "  [OK] Ollama server is running" "Green"
} catch {
    Write-ColorOutput "  [FAIL] Ollama server is not running" "Red"
    Write-ColorOutput "  Start it with: ollama serve" "Yellow"
    exit 1
}

# Step 2: Pre-load model
if (-not $SkipPreload) {
    Write-ColorOutput ""
    Write-ColorOutput "[2/4] Pre-loading model '$Model'..." "Yellow"
    
    # Check if model is already loaded
    try {
        $psResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/ps" -Method Get -TimeoutSec 5 -ErrorAction Stop
        $loadedModels = $psResponse.models | ForEach-Object { $_.name }
        
        if ($loadedModels -contains $Model) {
            Write-ColorOutput "  [OK] Model is already loaded in memory" "Green"
        } else {
            Write-ColorOutput "  Loading model into memory (this may take 30-60 seconds)..." "Gray"
            
            # Pre-load with a minimal request
            $preloadBody = @{
                model = $Model
                prompt = "test"
                stream = $false
                options = @{
                    num_predict = 1
                }
            } | ConvertTo-Json
            
            $preloadStart = Get-Date
            try {
                $preloadResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $preloadBody -ContentType "application/json" -TimeoutSec 180 -ErrorAction Stop
                $preloadTime = ((Get-Date) - $preloadStart).TotalSeconds
                Write-ColorOutput "  [OK] Model loaded in $([math]::Round($preloadTime, 2)) seconds" "Green"
            } catch {
                Write-ColorOutput "  [WARN] Pre-load timed out, but model may still be loading" "Yellow"
                Write-ColorOutput "  Analysis will continue..." "Gray"
            }
        }
    } catch {
        Write-ColorOutput "  [WARN] Could not check model status: $_" "Yellow"
    }
} else {
    Write-ColorOutput ""
    Write-ColorOutput "[2/4] Skipping model pre-load (as requested)" "Gray"
}

# Step 3: Pre-process file
Write-ColorOutput ""
Write-ColorOutput "[3/4] Pre-processing file..." "Yellow"

if ([string]::IsNullOrEmpty($FilePath)) {
    Write-ColorOutput "  [FAIL] No file path provided" "Red"
    exit 1
}

if (-not (Test-Path $FilePath)) {
    Write-ColorOutput "  [FAIL] File not found: $FilePath" "Red"
    exit 1
}

try {
    $originalCode = Get-Content $FilePath -Raw -Encoding UTF8
    $fileSize = $originalCode.Length
    Write-ColorOutput "  [OK] File loaded: $FilePath ($fileSize characters)" "Green"
    
    # Detect language if auto
    if ($Language -eq "auto") {
        $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
        switch ($ext) {
            ".ts" { $Language = "TypeScript" }
            ".js" { $Language = "JavaScript" }
            ".vue" { $Language = "Vue" }
            ".py" { $Language = "Python" }
            ".cs" { $Language = "C#" }
            ".html" { $Language = "HTML" }
            ".css" { $Language = "CSS" }
            default { $Language = "Code" }
        }
        Write-ColorOutput "  [INFO] Detected language: $Language" "Gray"
    }
    
    $processedCode = $originalCode
    
    if ($PreprocessCode) {
        Write-ColorOutput "  Pre-processing code for optimal model analysis..." "Gray"
        
        # Step 1: Normalize line endings to Unix-style (LF)
        $processedCode = $processedCode -replace '\r\n', "`n" -replace '\r', "`n"
        
        # Step 2: Remove trailing whitespace from each line (preserves indentation)
        $lines = $processedCode -split "`n"
        $lines = $lines | ForEach-Object { 
            if ($_ -match '^\s*$') {
                # Keep blank lines as-is
                ""
            } else {
                # Remove trailing whitespace but keep leading (indentation)
                $_ -replace '\s+$', ''
            }
        }
        $processedCode = $lines -join "`n"
        
        # Step 3: Normalize consecutive blank lines (max 2 blank lines)
        $processedCode = $processedCode -replace "(`n\s*){3,}", "`n`n"
        
        # Step 4: Remove lines with only whitespace (but keep intentional blank lines)
        # This is already handled above, but ensure no lines with only spaces/tabs remain
        $lines = $processedCode -split "`n"
        $cleanedLines = @()
        $prevWasBlank = $false
        
        foreach ($line in $lines) {
            if ($line -match '^\s*$') {
                # Allow max 2 consecutive blank lines
                if (-not $prevWasBlank) {
                    $cleanedLines += ""
                    $prevWasBlank = $true
                }
            } else {
                $cleanedLines += $line
                $prevWasBlank = $false
            }
        }
        $processedCode = $cleanedLines -join "`n"
        
        # Step 5: Ensure file ends with a newline (standard practice)
        if ($processedCode -notmatch "`n$") {
            $processedCode += "`n"
        }
        
        # Step 6: For Vue files, ensure proper structure visibility
        if ($Language -eq "Vue" -or $FilePath -match '\.vue$') {
            # Ensure template, script, and style sections are clearly separated
            $processedCode = $processedCode -replace '(<template>)', "`n`$1" -replace '(</template>)', "`$1`n"
            $processedCode = $processedCode -replace '(<script)', "`n`$1" -replace '(</script>)', "`$1`n"
            $processedCode = $processedCode -replace '(<style)', "`n`$1" -replace '(</style>)', "`$1`n"
            # Normalize again after adding newlines
            $processedCode = $processedCode -replace "(`n\s*){3,}", "`n`n"
        }
        
        # Step 7: For TypeScript/JavaScript, ensure imports are at top and clearly visible
        if ($Language -match "TypeScript|JavaScript") {
            $lines = $processedCode -split "`n"
            $importLines = @()
            $otherLines = @()
            $inImportBlock = $false
            
            foreach ($line in $lines) {
                if ($line -match '^\s*(import|export\s+.*\s+from)') {
                    $importLines += $line
                    $inImportBlock = $true
                } elseif ($inImportBlock -and $line -match '^\s*$') {
                    $importLines += $line
                } else {
                    if ($inImportBlock -and -not ($line -match '^\s*$')) {
                        $inImportBlock = $false
                        if ($otherLines.Count -eq 0 -or $otherLines[-1] -notmatch '^\s*$') {
                            $otherLines += ""
                        }
                    }
                    $otherLines += $line
                }
            }
            
            if ($importLines.Count -gt 0) {
                $processedCode = ($importLines + "" + $otherLines) -join "`n"
            }
        }
        
        # Step 8: Remove BOM if present (UTF-8 BOM can cause issues)
        if ($processedCode.StartsWith([char]0xFEFF)) {
            $processedCode = $processedCode.Substring(1)
        }
        
        $processedSize = $processedCode.Length
        $reduction = $fileSize - $processedSize
        if ($reduction -gt 0) {
            Write-ColorOutput "  [INFO] Code optimized: reduced by $reduction characters" "Gray"
        } elseif ($processedSize -gt $fileSize) {
            $increase = $processedSize - $fileSize
            Write-ColorOutput "  [INFO] Code formatted: added $increase characters for clarity" "Gray"
        } else {
            Write-ColorOutput "  [INFO] Code cleaned and normalized" "Gray"
        }
        
        Write-ColorOutput "  [INFO] Code formatted for optimal AI analysis" "Green"
    } else {
        # Even without full preprocessing, do basic normalization
        Write-ColorOutput "  Normalizing code format..." "Gray"
        # Normalize line endings
        $processedCode = $processedCode -replace '\r\n', "`n" -replace '\r', "`n"
        # Ensure proper file ending
        if ($processedCode -notmatch "`n$") {
            $processedCode += "`n"
        }
    }
    
    # Create a temporary processed file if preprocessing was done
    $tempFile = $null
    if ($PreprocessCode -and $processedCode -ne $originalCode) {
        $tempFile = "$FilePath.processed"
        $processedCode | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
        Write-ColorOutput "  [INFO] Processed file saved to: $tempFile" "Gray"
        $analysisFile = $tempFile
    } else {
        $analysisFile = $FilePath
    }
    
    Write-ColorOutput "  [OK] File ready for analysis" "Green"
} catch {
    Write-ColorOutput "  [FAIL] Error processing file: $_" "Red"
    exit 1
}

# Step 4: Run analysis
Write-ColorOutput ""
Write-ColorOutput "[4/4] Running analysis..." "Yellow"
Write-ColorOutput ""

# Build analysis command using splatting
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$analysisScript = Join-Path $scriptDir "analyze-code-with-ollama.ps1"

# Build parameter hashtable for splatting
$analysisParams = @{
    FilePath = $analysisFile
    Language = $Language
    Model = $Model
    Timeout = $Timeout
    MaxRetries = $MaxRetries
}

if ($Quick) { $analysisParams.Quick = $true }
if ($Detailed) { $analysisParams.Detailed = $true }
if ($Stream) { $analysisParams.Stream = $true }
if ($Verbose) { $analysisParams.Verbose = $true }

try {
    & $analysisScript @analysisParams
    
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-ColorOutput ""
        Write-ColorOutput "============================================================" "Cyan"
        Write-ColorOutput "  Analysis Complete!" "Green"
        Write-ColorOutput "============================================================" "Cyan"
        
        # Clean up temp file if created
        if ($tempFile -and (Test-Path $tempFile)) {
            Remove-Item $tempFile -Force
            if ($Verbose) {
                Write-ColorOutput "  Cleaned up temporary processed file" "Gray"
            }
        }
    } else {
        Write-ColorOutput ""
        Write-ColorOutput "  [WARN] Analysis completed with exit code: $exitCode" "Yellow"
    }
} catch {
    Write-ColorOutput ""
    Write-ColorOutput "  [FAIL] Analysis failed: $_" "Red"
    
    # Clean up temp file on error
    if ($tempFile -and (Test-Path $tempFile)) {
        Remove-Item $tempFile -Force
    }
    
    exit 1
}

