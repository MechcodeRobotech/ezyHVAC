# ezyHVAC Backend Auto-Start Script
Write-Host "Starting ezyHVAC Backend API Server..." -ForegroundColor Green

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptPath
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

try {
    # Check if Python is installed
    $pythonVersion = python --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Python is not installed or not in PATH" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "Found Python: $pythonVersion" -ForegroundColor Green

    # Install/Update requirements
    Write-Host "Installing/Updating Python packages..." -ForegroundColor Yellow
    pip install -r requirements.txt

    # Create .env from .env.example if it doesn't exist
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
    }

    # Start the FastAPI server
    Write-Host "Starting FastAPI server on http://localhost:8000..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Cyan
    
    python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
}
catch {
    Write-Host "Error occurred: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}