# Codebase Review Script using Ollama
# Reviews multiple files and generates a comprehensive report

param(
    [string]$Directory = ".",
    [string[]]$Extensions = @("*.ts", "*.js", "*.vue", "*.py"),
    [int]$MaxFiles = 10,
    [string]$Model = "qwen2.5-coder:14b",
    [switch]$Quick
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")

    # Validate color parameter
    $validColors = @("Black", "DarkBlue", "DarkGreen", "DarkCyan", "DarkRed", "DarkMagenta",
                     "DarkYellow", "Gray", "DarkGray", "Blue", "Green", "Cyan", "Red",
                     "Magenta", "Yellow", "White")

    if ($Color -notin $validColors) {
        $Color = "White"
    }

    Write-Host $Message -ForegroundColor $Color
}

# Check Ollama connection
function Test-OllamaConnection {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -ErrorAction Stop
        return $true
    } catch {
        Write-ColorOutput "[FAIL] Ollama server is not running. Please start it with: ollama serve" "Red"
        return $false
    }
}

# Get code files
function Get-CodeFiles {
    param([string]$Dir, [string[]]$Exts, [int]$Max)

    $files = @()
    foreach ($ext in $Exts) {
        $found = Get-ChildItem -Path $Dir -Filter $ext -Recurse -File |
            Where-Object {
                $_.FullName -notmatch "node_modules" -and
                $_.FullName -notmatch "\.output" -and
                $_.FullName -notmatch "dist" -and
                $_.FullName -notmatch "__pycache__"
            } |
            Select-Object -First $Max

        $files += $found
    }

    return $files | Select-Object -Unique -First $Max
}

# Analyze file
function Analyze-File {
    param([string]$FilePath)

    $code = Get-Content $FilePath -Raw -Encoding UTF8
    $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()

    $lang = switch ($ext) {
        ".ts" { "TypeScript" }
        ".js" { "JavaScript" }
        ".vue" { "Vue" }
        ".py" { "Python" }
        default { "Code" }
    }

    $codeSnippet = $code.Substring(0, [Math]::Min(2000, $code.Length))
    $prompt = "Quickly review this $lang file and identify:`n1. Critical issues (bugs, security, performance)`n2. Code quality problems`n3. Best practice violations`n4. Quick improvement suggestions`n`nFile: $FilePath`n```$lang`n$codeSnippet`n````n`nProvide a brief, focused analysis."

    $body = @{
        model = $Model
        prompt = $prompt
        stream = $false
        options = @{
            temperature = 0.2
            num_predict = 500
        }
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $body -ContentType "application/json"
        return $response.response
    } catch {
        return "Error: $_"
    }
}

# Main execution
Write-ColorOutput "`n" "White"
Write-ColorOutput ("=" * 60) "Cyan"
Write-ColorOutput "  Ollama Codebase Review" "Cyan"
Write-ColorOutput ("=" * 60) "Cyan"
Write-ColorOutput ""

if (-not (Test-OllamaConnection)) {
    exit 1
}

Write-ColorOutput "[SCAN] Scanning for code files..." "Yellow"
$files = Get-CodeFiles -Dir $Directory -Exts $Extensions -Max $MaxFiles

if ($files.Count -eq 0) {
    Write-ColorOutput "[FAIL] No code files found" "Red"
    exit 1
}

    Write-ColorOutput "[OK] Found $($files.Count) files to analyze" "Green"
Write-ColorOutput ""

$results = @()
$counter = 0

foreach ($file in $files) {
    $counter++
    Write-ColorOutput "[$counter/$($files.Count)] Analyzing: $($file.Name)" "Cyan"

    $analysis = Analyze-File -FilePath $file.FullName
    $results += @{
        File = $file.FullName
        Analysis = $analysis
    }

    Start-Sleep -Milliseconds 500  # Rate limiting
}

# Generate summary
Write-ColorOutput "`n[GEN] Generating summary report..." "Yellow"

# Build summary prompt
$reviewText = $results | ForEach-Object {
    "File: $($_.File)`n$($_.Analysis)`n---`n"
} | Out-String

$summaryPrompt = "Based on the following code reviews, provide a comprehensive summary:`n`n$reviewText`nProvide:`n1. Common issues across files`n2. Priority improvements`n3. Code quality trends`n4. Actionable recommendations"

$summaryBody = @{
    model = $Model
    prompt = $summaryPrompt
    stream = $false
} | ConvertTo-Json -Depth 10

try {
    $summary = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $summaryBody -ContentType "application/json"

    Write-ColorOutput "`n" "White"
    Write-ColorOutput ("=" * 60) "Cyan"
    Write-ColorOutput "  Summary Report" "Cyan"
    Write-ColorOutput ("=" * 60) "Cyan"
    Write-ColorOutput ""
    Write-ColorOutput $summary.response "White"

    # Save report
    $reportFile = "ollama-codebase-review-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
    $detailedAnalysis = $results | ForEach-Object {
        "### $($_.File)`n$($_.Analysis)`n"
    } | Out-String

    $report = "# Codebase Review Report`nGenerated: $(Get-Date)`n`n## Summary`n$($summary.response)`n`n## Detailed Analysis`n`n$detailedAnalysis"

    $report | Out-File -FilePath $reportFile -Encoding UTF8
    Write-ColorOutput "`n[OK] Report saved to: $reportFile" "Green"
} catch {
    Write-ColorOutput "[FAIL] Failed to generate summary: $_" "Red"
}
