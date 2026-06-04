@echo off
echo ============================================
echo  Vendor Dashboard - Setup Script
echo  Imperium Infrastructure Partners
echo ============================================
echo.
echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo.
echo Step 2: Starting Convex dev server (local backend)...
echo This will initialize the project and generate API bindings.
echo Press Ctrl+C after the server starts to continue setup.
echo.
npx convex dev
