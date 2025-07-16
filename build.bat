@echo off
echo ========================================
echo   Cosmic Gardener - Build Script
echo ========================================
echo.

echo [1/2] Checking development directory...
cd /d "%~dp0cosmic-gardener\frontend"
if not exist "tsconfig.json" (
    echo ERROR: TypeScript configuration not found!
    echo Please ensure you're in the correct directory.
    pause
    exit /b 1
)

echo [2/2] Compiling TypeScript...
call npx tsc

if errorlevel 1 (
    echo.
    echo ERROR: TypeScript compilation failed!
    echo Please fix the compilation errors above.
    pause
    exit /b 1
) else (
    echo.
    echo SUCCESS: TypeScript compilation completed!
    echo Generated files are in the dist/ directory.
    echo.
    echo To run the game:
    echo   1. Run: start-dev.bat
    echo   2. Open: http://localhost:8000
)

echo.
pause