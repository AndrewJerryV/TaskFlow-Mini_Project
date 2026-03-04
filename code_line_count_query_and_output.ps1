# PowerShell Script to List Code Files and Line Counts (Excluding .json and Unwanted Files)

# Get the list of code files, excluding all .json files and other unwanted files/folders
$files = git ls-files | findstr /V /I "node_modules .next .git __pycache__ .env .DS_Store dist build diagrams/ .svg .txt .sql .ico .md .mmd temp/cli-latest .json"

# Create an array to hold file/line info
$fileLineCounts = @()

foreach ($file in $files) {
    if (Test-Path $file) {
        $lines = (Get-Content $file | Measure-Object -Line).Lines
        $fileLineCounts += [PSCustomObject]@{ File = $file; Lines = $lines }
    }
}

# Sort and display
$fileLineCounts | Sort-Object Lines -Descending | Format-Table -AutoSize

# Save output to a file
$fileLineCounts | Sort-Object Lines -Descending | Out-File code_line_counts.txt
