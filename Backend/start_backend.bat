@echo off
echo Starting ezyHVAC Backend API Server...
cd /d "%~dp0"
echo Current directory: %cd%

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Install requirements if needed
echo Installing/Updating Python packages...
pip install -r requirements.txt

REM Create .env from .env.example if it doesn't exist
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy ".env.example" ".env"
)

REM Start the FastAPI server
echo Starting FastAPI server on http://localhost:8000...
echo Press Ctrl+C to stop the server
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000

pause