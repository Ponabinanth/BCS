<#
Start both Flask (react-app/backend) and Node servers in separate PowerShell windows.

Usage: Run from repository root in PowerShell (not as Administrator):
    .\start-all.ps1
#>

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting SecureChain dev servers..." -ForegroundColor Cyan

# Start Flask backend
$flaskFolder = Join-Path $repoRoot 'react-app\backend'
$venvPython = Join-Path $flaskFolder '.venv\Scripts\python.exe'
# Ensure virtualenv exists and requirements are installed before spawning new windows
if (-Not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtualenv and installing backend requirements..." -ForegroundColor Yellow
    Push-Location $flaskFolder
    python -m venv .venv
    # Use venv pip to install requirements
    & .\.venv\Scripts\python.exe -m pip install --upgrade pip
    & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    Pop-Location
}

# Command to run the Flask app using the venv Python
$flaskCmd = "cd '$flaskFolder'; .\\.venv\\Scripts\\python.exe app.py"
Start-Process -FilePath powershell -ArgumentList '-NoExit','-Command',$flaskCmd -WorkingDirectory $flaskFolder

# Start Node server (npm start)
$nodeCmd = "cd '$repoRoot'; npm start"
Start-Process -FilePath powershell -ArgumentList '-NoExit','-Command',$nodeCmd -WorkingDirectory $repoRoot

Write-Host "Both processes started. Node -> http://127.0.0.1:5500, Flask -> http://127.0.0.1:5501" -ForegroundColor Green
