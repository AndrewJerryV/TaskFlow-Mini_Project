# PowerShell Script to List Code Files and Line Counts (Excluding .json and Unwanted Files)

# Get the list of code files, excluding all .json files and other unwanted files/folders
$files = git ls-files | findstr /V /I "node_modules .next .git __pycache__ .env .DS_Store dist build diagrams/ .svg .txt .sql .ico .md .mmd temp/cli-latest .json"

# Create an array to hold file/line info
$fileLineCounts = @()

foreach ($file in $files) {
    if (Test-Path $file) {
        # Count only non-empty lines
        $nonEmptyLines = (Get-Content $file | Where-Object { $_.Trim() -ne "" } | Measure-Object -Line).Lines
        $fileLineCounts += [PSCustomObject]@{ File = $file; Lines = $nonEmptyLines }
    }
}

# Sort and display
$sorted = $fileLineCounts | Sort-Object Lines -Descending
$sorted | Format-Table -AutoSize

# Calculate total non-empty lines
$totalLines = ($fileLineCounts | Measure-Object -Property Lines -Sum).Sum
Write-Host "`nTotal non-empty lines of code: $totalLines`n" -ForegroundColor Cyan

# Save output to a file (including total)
$sorted | Out-File code_line_counts.txt
Add-Content code_line_counts.txt "`nTotal non-empty lines of code: $totalLines`n"
