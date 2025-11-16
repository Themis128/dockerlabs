# Code Analysis Script using Ollama
# Analyzes code files and provides AI-powered suggestions for improvements

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
    [int]$ChunkSize = 0,
    [string]$LogFile = "",
    [switch]$PreloadModel
)

$ErrorActionPreference = "Stop"
$script:VerboseMode = $Verbose
$script:StartTime = Get-Date
$script:LogEntries = @()

# Initialize log file
if ([string]::IsNullOrEmpty($LogFile)) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $LogFile = "$env:TEMP\ollama-analysis-$timestamp.log"
}

# Logging functions
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    $script:LogEntries += $logEntry

    # Write to console
    Write-ColorOutput $logEntry $Color

    # Write to file
    try {
        Add-Content -Path $LogFile -Value $logEntry -ErrorAction SilentlyContinue
    } catch {
        # Ignore log file errors
    }
}

function Write-DebugLog {
    param([string]$Message)

    if ($script:VerboseMode) {
        Write-Log "DEBUG: $Message" "DEBUG" "DarkGray"
    }
}

function Write-VerboseLog {
    param([string]$Message, [string]$Color = "Gray")

    if ($script:VerboseMode) {
        Write-Log "VERBOSE: $Message" "VERBOSE" $Color
    }
}

# Colors for output
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

# Check Ollama server status and get running models
function Get-OllamaStatus {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/ps" -Method Get -ErrorAction Stop -TimeoutSec 5
        return $response
    } catch {
        return $null
    }
}

# Pre-load model into memory
function Invoke-PreloadModel {
    param([string]$Model)

    Write-VerboseLog "Checking if model '$Model' is already loaded..." "Gray"

    $status = Get-OllamaStatus
    if ($status -and $status.models) {
        $loadedModels = $status.models | ForEach-Object { $_.name }
        if ($loadedModels -contains $Model) {
            Write-VerboseLog "Model '$Model' is already loaded in memory" "Green"
            return $true
        }
    }

    Write-Log "Pre-loading model '$Model' into memory..." "INFO" "Cyan"
    Write-VerboseLog "This may take a moment on first use..." "Gray"

    try {
        # Use the /api/generate endpoint with a minimal prompt to load the model
        $preloadBody = @{
            model = $Model
            prompt = "test"
            stream = $false
            options = @{
                num_predict = 1
            }
        } | ConvertTo-Json

        $preloadStart = Get-Date
        $preloadResponse = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/generate" -Method Post -Body $preloadBody -ContentType "application/json" -TimeoutSec 120

        $preloadTime = ((Get-Date) - $preloadStart).TotalSeconds
        Write-VerboseLog "Model loaded in $([math]::Round($preloadTime, 2)) seconds" "Green"
        return $true
    } catch {
        Write-Log "Warning: Could not pre-load model: $_" "WARN" "Yellow"
        Write-VerboseLog "Analysis will continue, but may be slower on first request" "Gray"
        return $false
    }
}

# Check if Ollama is running and verify model availability
function Test-OllamaConnection {
    param([string]$Model, [switch]$PreloadModel)

    Write-DebugLog "Testing Ollama connection..."
    Write-VerboseLog "Checking Ollama server at http://127.0.0.1:11434/api/tags"

    try {
        $connectionStart = Get-Date
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -ErrorAction Stop -TimeoutSec 5
        $connectionTime = ((Get-Date) - $connectionStart).TotalMilliseconds

        Write-DebugLog "Connection successful (${connectionTime}ms)"
        Write-VerboseLog "Ollama server is running" "Green"

        $availableModels = $response.models | ForEach-Object { $_.name }
        Write-VerboseLog "Available models: $($availableModels -join ', ')" "Gray"

        if ($Model -and $availableModels -notcontains $Model) {
            Write-Log "Model '$Model' not found. Available models:" "WARN" "Yellow"
            $availableModels | ForEach-Object {
                Write-ColorOutput "  - $_" "Gray"
                Write-DebugLog "Found model: $_"
            }
            Write-Log "You may need to pull the model: ollama pull $Model" "INFO" "Yellow"
            return $false
        }

        Write-VerboseLog "Model '$Model' is available" "Green"

        # Pre-load model if requested
        if ($PreloadModel -and $Model) {
            Invoke-PreloadModel -Model $Model | Out-Null
        }

        return $true
    } catch {
        Write-Log "Ollama server connection failed: $_" "ERROR" "Red"
        Write-Log "Start Ollama with: ollama serve" "INFO" "Yellow"
        Write-Log "Or check if it's running on a different port" "INFO" "Yellow"
        return $false
    }
}

# Calculate optimal chunk size based on file size
function Get-OptimalChunkSize {
    param([int]$FileSize)

    # Dynamic chunk sizing based on file size
    if ($FileSize -le 500) {
        # Very small files: no chunking needed
        return $FileSize + 100
    } elseif ($FileSize -le 2000) {
        # Small files: 1000 char chunks
        return 1000
    } elseif ($FileSize -le 10000) {
        # Medium files: 2000 char chunks
        return 2000
    } elseif ($FileSize -le 50000) {
        # Large files: 3000 char chunks
        return 3000
    } elseif ($FileSize -le 100000) {
        # Very large files: 4000 char chunks
        return 4000
    } else {
        # Huge files: 5000 char chunks
        return 5000
    }
}

# Split code into chunks for large files
function Split-CodeIntoChunks {
    param(
        [string]$Code,
        [int]$MaxChunkSize
    )

    Write-DebugLog "Splitting code into chunks (max size: $MaxChunkSize characters)"
    Write-DebugLog "Input code length: $($Code.Length) characters"

    # Use strongly-typed List to avoid PowerShell string enumeration issues
    $chunks = New-Object 'System.Collections.Generic.List[string]'

    if ($Code.Length -le $MaxChunkSize) {
        Write-VerboseLog "Code is small enough, no splitting needed" "Gray"
        Write-DebugLog "Returning single chunk with length: $($Code.Length) characters"
        $chunks.Add($Code)
        Write-DebugLog "List count: $($chunks.Count), First element length: $($chunks[0].Length)"
        return $chunks
    }

    # Split into multiple chunks
    $lines = $Code -split "`n"
    $currentChunk = ""
    $chunkNumber = 1

    foreach ($line in $lines) {
        $lineWithNewline = $line + "`n"
        $potentialSize = $currentChunk.Length + $lineWithNewline.Length

        if ($potentialSize -gt $MaxChunkSize -and $currentChunk.Length -gt 0) {
            Write-DebugLog "Creating chunk $chunkNumber (size: $($currentChunk.Length) chars)"
            $chunks.Add($currentChunk)
            $currentChunk = $lineWithNewline
            $chunkNumber++
        } else {
            $currentChunk += $lineWithNewline
        }
    }

    if ($currentChunk.Length -gt 0) {
        Write-DebugLog "Creating final chunk $chunkNumber (size: $($currentChunk.Length) chars)"
        $chunks.Add($currentChunk)
    }

    Write-VerboseLog "Split code into $($chunks.Count) chunks" "Cyan"
    Write-DebugLog "Chunk sizes: $(($chunks | ForEach-Object { $_.Length }) -join ', ')"
    return $chunks
}

# Analyze a single code chunk
function Invoke-ChunkAnalysis {
    param(
        [string]$CodeChunk,
        [string]$FilePath,
        [string]$Language,
        [int]$ChunkIndex,
        [int]$TotalChunks
    )

    Write-DebugLog "Analyzing chunk $($ChunkIndex + 1)/$TotalChunks"
    Write-DebugLog "Received chunk type: $($CodeChunk.GetType().Name)"
    Write-DebugLog "Received chunk actual length: $($CodeChunk.Length) characters"
    Write-VerboseLog "Chunk size: $($CodeChunk.Length) characters" "Gray"

    if ($CodeChunk.Length -eq 0) {
        Write-Log "Error: Received empty chunk!" "ERROR" "Red"
        return $null
    }

    # Create chunk-specific prompt
    $chunkInfo = if ($TotalChunks -gt 1) {
        " (Part $($ChunkIndex + 1) of $TotalChunks)"
    } else {
        ""
    }

    if ($Quick) {
        $prompt = @"
Provide a quick code review of this $Language code${chunkInfo} focusing on critical issues:

1. **Critical Issues:** Bugs, security vulnerabilities, major performance problems
2. **Quick Fixes:** Easy improvements that can be made immediately
3. **Score:** Overall quality (1-10)

Code:
```$Language
$CodeChunk
```

Keep response concise and actionable.
"@
    } elseif ($Detailed) {
        $prompt = @"
Provide a comprehensive, detailed analysis of this $Language code${chunkInfo}:

1. **Code Quality Analysis:**
   - Code smells and anti-patterns (with examples)
   - Potential bugs or logic errors (with line references)
   - Performance bottlenecks (with measurements)
   - Security vulnerabilities (with CVSS scores if applicable)

2. **Architecture & Design:**
   - Design patterns used and their appropriateness
   - SOLID principles adherence
   - Code organization and modularity
   - Dependency management

3. **Best Practices:**
   - Language-specific best practices
   - Framework-specific conventions (Nuxt/Vue if applicable)
   - Naming conventions and consistency
   - Error handling and edge cases
   - Testing considerations

4. **Improvements & Refactoring:**
   - Specific, actionable suggestions with code examples
   - Refactoring opportunities with before/after examples
   - Performance optimizations
   - Security hardening

5. **Documentation:**
   - Missing documentation
   - Code comments quality
   - Type definitions completeness

6. **Summary:**
   - Overall code quality score (1-10) with breakdown
   - Priority matrix (High/Medium/Low)
   - Estimated effort for improvements
   - Recommended action plan

Code to analyze:
```$Language
$CodeChunk
```

Provide a thorough, structured analysis with clear sections and actionable recommendations.
"@
    } else {
        # Build language-specific context hints
        $contextHints = ""
        if ($Language -eq "Vue") {
            $contextHints = "This is a Vue.js component. Pay attention to: template structure, script setup patterns, reactivity, component composition, and Vue 3 best practices."
        } elseif ($Language -match "TypeScript|JavaScript") {
            $contextHints = "This is $Language code. Pay attention to: type safety (if TypeScript), ES6+ features, module patterns, async/await usage, and modern JavaScript best practices."
        } elseif ($Language -eq "Python") {
            $contextHints = "This is Python code. Pay attention to: PEP 8 style, type hints, error handling, and Pythonic patterns."
        }
        
        $prompt = @"
Analyze the following $Language code${chunkInfo} and provide a comprehensive code review.

**Context:** $contextHints

**Focus Areas:**

1. **Code Quality Issues:**
   - Code smells and anti-patterns
   - Potential bugs or logic errors
   - Performance issues
   - Security vulnerabilities

2. **Best Practices:**
   - Adherence to language-specific best practices
   - Code organization and structure
   - Naming conventions
   - Error handling

3. **Improvements:**
   - Specific, actionable suggestions
   - Code examples for improvements
   - Refactoring opportunities

4. **Summary:**
   - Overall code quality score (1-10)
   - Priority issues to address first

**Code to analyze:**
```$Language
$CodeChunk
```

Provide a structured analysis with clear sections and actionable recommendations. Be specific about line numbers or code sections when identifying issues.
"@
    }

    # Ensure stream is a proper boolean
    $streamValue = if ($Stream) { $true } else { $false }

    $body = @{
        model = $Model
        prompt = $prompt
        stream = $streamValue
        options = @{
            temperature = 0.3
            top_p = 0.9
            top_k = 40
            num_ctx = 16384
            num_predict = 8192
        }
    }

    Write-DebugLog "Request body prepared (model: $Model, stream: $streamValue)"
    Write-VerboseLog "Sending request to Ollama API..." "Cyan"

    $bodyJson = $body | ConvertTo-Json -Depth 10
    Write-DebugLog "Request JSON size: $($bodyJson.Length) characters"
    if ($script:VerboseMode) {
        Write-DebugLog "Request options: temperature=0.3, top_p=0.9, top_k=40, num_ctx=16384, num_predict=8192"
    }

    $attempt = 0
    while ($attempt -lt $MaxRetries) {
        try {
            $requestStart = Get-Date
            Write-VerboseLog "Attempt $($attempt + 1)/$MaxRetries - Sending request..." "Yellow"

            # Use WebRequest for better timeout and error handling
            $request = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:11434/api/generate")
            $request.Method = "POST"
            $request.ContentType = "application/json"
            $request.Timeout = $Timeout * 1000  # Convert to milliseconds

            $requestStream = $request.GetRequestStream()
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($bodyJson)
            $requestStream.Write($bytes, 0, $bytes.Length)
            $requestStream.Close()

            try {
                $responseStream = $request.GetResponse().GetResponseStream()
                $reader = New-Object System.IO.StreamReader($responseStream)
                $responseJson = $reader.ReadToEnd()
                $reader.Close()
                $responseStream.Close()

                $response = $responseJson | ConvertFrom-Json
            } catch {
                throw "Request failed: $($_.Exception.Message)"
            }

            $requestTime = ((Get-Date) - $requestStart).TotalSeconds
            Write-VerboseLog "Request completed in $([math]::Round($requestTime, 2)) seconds" "Green"
            Write-DebugLog "Response received, checking content..."

            if ($response.response) {
                $responseLength = $response.response.Length
                Write-DebugLog "Response length: $responseLength characters"
                Write-VerboseLog "Analysis successful for chunk $($ChunkIndex + 1)" "Green"
                return $response.response
            } else {
                Write-DebugLog "Empty response received"
                throw "Empty response from Ollama"
            }
        } catch {
            $attempt++
            $errorDetails = $_.Exception.Message
            Write-DebugLog "Request failed: $errorDetails"

            if ($attempt -lt $MaxRetries) {
                $delay = $attempt * 2
                Write-Log "Analysis attempt $attempt failed, retrying in ${delay}s... ($errorDetails)" "WARN" "Yellow"
                Write-VerboseLog "Waiting $delay seconds before retry..." "Gray"
                Start-Sleep -Seconds $delay
            } else {
                Write-Log "Analysis failed after $MaxRetries attempts: $errorDetails" "ERROR" "Red"
                if ($script:VerboseMode) {
                    Write-DebugLog "Full error: $($_.Exception | ConvertTo-Json -Depth 5)"
                }
                return $null
            }
        }
    }

    return $null
}

# Main analysis function
function Invoke-CodeAnalysis {
    param(
        [string]$Code,
        [string]$FilePath,
        [string]$Language
    )

    Write-Log "Starting code analysis..." "INFO" "Cyan"
    Write-DebugLog "Code length: $($Code.Length) characters"
    Write-DebugLog "Language: $Language"
    Write-DebugLog "Analysis mode: $(if ($Quick) { 'Quick' } elseif ($Detailed) { 'Detailed' } else { 'Standard' })"

    # Detect language if auto
    if ($Language -eq "auto") {
        Write-VerboseLog "Auto-detecting language..." "Gray"
        $ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
        Write-DebugLog "File extension: $ext"

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

        Write-VerboseLog "Detected language: $Language" "Green"
    }

    # Calculate optimal chunk size if not specified
    if ($ChunkSize -eq 0) {
        $ChunkSize = Get-OptimalChunkSize -FileSize $Code.Length
        Write-VerboseLog "Auto-calculated chunk size: $ChunkSize characters (file size: $($Code.Length))" "Cyan"
    } else {
        Write-VerboseLog "Using custom chunk size: $ChunkSize characters" "Gray"
    }

    # Split code into chunks if needed
    Write-Log "Preparing code for analysis..." "INFO" "Cyan"
    $chunks = Split-CodeIntoChunks -Code $Code -MaxChunkSize $ChunkSize
    $totalChunks = $chunks.Count

    Write-Log "Analyzing $totalChunks chunk(s)..." "INFO" "Cyan"

    # Debug: Check what's actually in the chunks list
    Write-DebugLog "Chunks list type: $($chunks.GetType().FullName)"
    for ($j = 0; $j -lt $chunks.Count; $j++) {
        $testChunk = if ($chunks -is [System.Collections.Generic.List[string]]) {
            $chunks.Item($j)
        } else {
            $chunks[$j]
        }
        Write-DebugLog "Chunk $($j + 1) in list: type=$($testChunk.GetType().Name), length=$($testChunk.Length)"
    }

    $allResults = @()

    for ($i = 0; $i -lt $chunks.Count; $i++) {
        $chunkStart = Get-Date
        Write-Log "Processing chunk $($i + 1)/$totalChunks..." "INFO" "Cyan"

        # Get chunk content - ensure we get the full string, not enumerated
        if ($chunks -is [System.Collections.Generic.List[string]]) {
            # Use ToArray() to get a proper array, then access by index
            $chunkArray = $chunks.ToArray()
            $currentChunk = $chunkArray[$i]
        } elseif ($chunks -is [string]) {
            # If somehow it's a string, use it directly
            $currentChunk = $chunks
        } else {
            # For arrays, get the element
            $currentChunk = $chunks[$i]
        }

        # Ensure it's a string and not a single character
        if ($currentChunk -is [char]) {
            Write-Log "Error: Chunk retrieved as character instead of string!" "ERROR" "Red"
            continue
        }

        $currentChunk = [string]$currentChunk

        Write-DebugLog "Retrieved chunk $($i + 1), type: $($currentChunk.GetType().Name), length: $($currentChunk.Length) characters"

        if ($null -eq $currentChunk -or $currentChunk.Length -eq 0) {
            Write-Log "Warning: Chunk $($i + 1) is empty!" "WARN" "Yellow"
            continue
        }

        $chunkResult = Invoke-ChunkAnalysis -CodeChunk $currentChunk -FilePath $FilePath -Language $Language -ChunkIndex $i -TotalChunks $totalChunks

        $chunkTime = ((Get-Date) - $chunkStart).TotalSeconds

        if ($chunkResult) {
            Write-VerboseLog "Chunk $($i + 1) completed in $([math]::Round($chunkTime, 2))s" "Green"
            $allResults += $chunkResult

            if ($totalChunks -gt 1) {
                Write-VerboseLog "Chunk $($i + 1) analysis length: $($chunkResult.Length) characters" "Gray"
            }
        } else {
            Write-Log "Chunk $($i + 1) analysis failed" "ERROR" "Red"
            return $null
        }

        # Add delay between chunks to avoid overwhelming the API
        if ($i -lt ($chunks.Count - 1)) {
            Write-DebugLog "Waiting 1 second before next chunk..."
            Start-Sleep -Seconds 1
        }
    }

    # Combine results
    Write-DebugLog "Combining $totalChunks chunk results..."
    $combinedResult = if ($totalChunks -gt 1) {
        $separator = "`n`n--- Chunk $($i + 1) Analysis ---`n`n"
        $allResults -join $separator
    } else {
        $allResults[0]
    }

    Write-VerboseLog "Analysis complete. Total result length: $($combinedResult.Length) characters" "Green"
    return $combinedResult
}

# Main execution
Write-ColorOutput "`n" "White"
Write-ColorOutput ("=" * 60) "Cyan"
Write-ColorOutput "  Ollama Code Analysis Tool" "Cyan"
Write-ColorOutput ("=" * 60) "Cyan"
Write-ColorOutput ""

Write-Log "Analysis session started" "INFO" "Cyan"
Write-Log "Log file: $LogFile" "INFO" "Gray"
if ($script:VerboseMode) {
    Write-Log "Verbose mode enabled" "INFO" "Yellow"
    Write-Log "Debug logging enabled" "INFO" "Yellow"
}

Write-VerboseLog "Configuration:" "Cyan"
Write-VerboseLog "  Model: $Model" "Gray"
Write-VerboseLog "  Timeout: $Timeout seconds" "Gray"
Write-VerboseLog "  Max Retries: $MaxRetries" "Gray"
Write-VerboseLog "  Chunk Size: $(if ($ChunkSize -eq 0) { 'Auto (based on file size)' } else { "$ChunkSize characters" })" "Gray"
Write-VerboseLog "  Stream: $Stream" "Gray"
Write-VerboseLog "  Mode: $(if ($Quick) { 'Quick' } elseif ($Detailed) { 'Detailed' } else { 'Standard' })" "Gray"

# Check Ollama connection and model availability
Write-Log "Checking Ollama connection..." "INFO" "Cyan"
if (-not (Test-OllamaConnection -Model $Model -PreloadModel:$PreloadModel)) {
    Write-Log "Connection check failed" "ERROR" "Red"
    exit 1
}
Write-Log "Connection check passed" "INFO" "Green"

# Get file path
if ([string]::IsNullOrEmpty($FilePath)) {
    Write-Log "No file path provided" "ERROR" "Red"
    Write-ColorOutput 'Usage: .\analyze-code-with-ollama.ps1 -FilePath <path> [options]' "Yellow"
    Write-ColorOutput ""
    Write-ColorOutput "Options:" "Yellow"
    Write-ColorOutput '  -FilePath <path>    Path to the code file to analyze' "White"
    Write-ColorOutput '  -Language <lang>   Language (auto, TypeScript, Python, etc.)' "White"
    Write-ColorOutput "  -Quick              Quick analysis mode (faster, less detailed)" "White"
    Write-ColorOutput "  -Detailed           Detailed analysis mode (comprehensive)" "White"
    Write-ColorOutput '  -Model <model>     Ollama model to use (default: qwen2.5-coder:7b)' "White"
    Write-ColorOutput '  -Timeout <seconds> Request timeout in seconds (default: 300)' "White"
    Write-ColorOutput "  -Stream             Enable streaming responses" "White"
    Write-ColorOutput '  -MaxRetries <num>   Maximum retry attempts (default: 3)' "White"
    Write-ColorOutput "  -Verbose            Enable verbose logging and debugging" "White"
    Write-ColorOutput '  -ChunkSize <size>   Maximum chunk size in characters (default: auto, based on file size)' "White"
    Write-ColorOutput '  -LogFile <path>    Custom log file path (default: temp directory)' "White"
    Write-ColorOutput "  -PreloadModel       Pre-load model into memory before analysis (faster first request)" "White"
    exit 1
}

# Check if file exists
Write-DebugLog "Checking if file exists: $FilePath"
if (-not (Test-Path $FilePath)) {
    Write-Log "File not found: $FilePath" "ERROR" "Red"
    exit 1
}
Write-VerboseLog "File exists: $FilePath" "Green"

# Read file content
Write-Log "Reading file..." "INFO" "Cyan"
try {
    $readStart = Get-Date
    $code = Get-Content $FilePath -Raw -Encoding UTF8
    $readTime = ((Get-Date) - $readStart).TotalMilliseconds

    Write-Log "File loaded: $FilePath" "INFO" "Green"
    Write-VerboseLog "File size: $($code.Length) characters" "Gray"
    Write-VerboseLog "Read time: $([math]::Round($readTime, 2))ms" "Gray"
    Write-DebugLog "File encoding: UTF8"
} catch {
    Write-Log "Failed to read file: $_" "ERROR" "Red"
    if ($script:VerboseMode) {
        Write-DebugLog "Error details: $($_.Exception | ConvertTo-Json -Depth 5)"
    }
    exit 1
}

# Perform analysis
Write-Log "Starting analysis..." "INFO" "Cyan"
$analysisStart = Get-Date
$analysis = Invoke-CodeAnalysis -Code $code -FilePath $FilePath -Language $Language
$analysisTime = ((Get-Date) - $analysisStart).TotalSeconds

if ($analysis) {
    Write-Log "Analysis completed successfully" "INFO" "Green"
    Write-VerboseLog "Total analysis time: $([math]::Round($analysisTime, 2)) seconds" "Cyan"

    Write-ColorOutput "`n" "White"
    Write-ColorOutput ("=" * 60) "Cyan"
    Write-ColorOutput "  Analysis Results" "Cyan"
    Write-ColorOutput ("=" * 60) "Cyan"
    Write-ColorOutput ""
    Write-ColorOutput $analysis "White"
    Write-ColorOutput ""
    Write-ColorOutput ("=" * 60) "Cyan"

    # Save to file
    Write-Log "Saving analysis results..." "INFO" "Cyan"
    $outputFile = "$FilePath.ollama-analysis.md"
    try {
        $analysis | Out-File -FilePath $outputFile -Encoding UTF8
        Write-Log "Analysis saved to: $outputFile" "INFO" "Green"
        Write-VerboseLog "Output file size: $((Get-Item $outputFile).Length) bytes" "Gray"
    } catch {
        Write-Log "Failed to save analysis: $_" "ERROR" "Red"
    }
} else {
    Write-Log "Analysis failed" "ERROR" "Red"
    exit 1
}

# Summary
$totalTime = ((Get-Date) - $script:StartTime).TotalSeconds
Write-Log "Session completed in $([math]::Round($totalTime, 2)) seconds" "INFO" "Cyan"
Write-Log "Log file saved to: $LogFile" "INFO" "Gray"

if ($script:VerboseMode) {
    Write-ColorOutput "`n=== Session Summary ===" "Cyan"
    Write-ColorOutput "Total time: $([math]::Round($totalTime, 2))s" "White"
    Write-ColorOutput "Analysis time: $([math]::Round($analysisTime, 2))s" "White"
    Write-ColorOutput "Log entries: $($script:LogEntries.Count)" "White"
    Write-ColorOutput "Log file: $LogFile" "White"
}
