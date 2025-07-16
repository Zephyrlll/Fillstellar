@echo off
echo ========================================
echo   Cosmic Gardener - Development Setup
echo ========================================
echo.

echo [1/3] Checking development directory...
cd /d "%~dp0cosmic-gardener\frontend"
if not exist "index.html" (
    echo ERROR: Frontend files not found!
    echo Please ensure you're in the correct directory.
    pause
    exit /b 1
)

echo [2/3] Compiling TypeScript...
call npx tsc
if errorlevel 1 (
    echo ERROR: TypeScript compilation failed!
    echo Please fix compilation errors and try again.
    pause
    exit /b 1
)

echo [3/3] Starting development server...
echo.
echo Game will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.

python -m http.server 8000

pause