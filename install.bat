@echo off
echo ========================================
echo Origami Language Extension Installer
echo ========================================
echo.

set "VSIX_FILE=origami-language-fixed.vsix"
set "CURRENT_DIR=%~dp0"

echo Checking extension file...
if not exist "%CURRENT_DIR%%VSIX_FILE%" (
    echo Error: Extension file %VSIX_FILE% not found
    echo Please ensure the file exists in current directory
    pause
    exit /b 1
)

echo Found extension file: %VSIX_FILE%
dir "%CURRENT_DIR%%VSIX_FILE%" | findstr "%VSIX_FILE%"
echo.

echo Trying installation methods...
echo.

echo [Method 1] Installing with relative path...
code --install-extension "%VSIX_FILE%"
if %errorlevel% equ 0 (
    echo Success! Extension installed.
    goto :success
)

echo [Method 1] Failed, trying method 2...
echo.

echo [Method 2] Installing with absolute path...
code --install-extension "%CURRENT_DIR%%VSIX_FILE%"
if %errorlevel% equ 0 (
    echo Success! Extension installed.
    goto :success
)

echo [Method 2] Failed, checking VS Code...
echo.

echo [Method 3] Checking if VS Code is in PATH...
where code >nul 2>&1
if %errorlevel% neq 0 (
    echo VS Code not found in PATH
    echo Please install manually or use VS Code interface
    goto :manual
)

echo VS Code found in PATH, but installation still failed
echo.

:manual
echo ========================================
echo Auto-install failed, use manual methods:
echo ========================================
echo.
echo Method A: VS Code Interface
echo 1. Open VS Code
echo 2. Press Ctrl+Shift+P
echo 3. Type "Extensions: Install from VSIX..."
echo 4. Select file: %CURRENT_DIR%%VSIX_FILE%
echo.
echo Method B: Development Mode
echo 1. Open folder in VS Code: %CURRENT_DIR%
echo 2. Press F5 to start debugging
echo 3. Select "VS Code Extension Development"
echo.
echo Method C: Manual Copy
echo 1. Rename %VSIX_FILE% to .zip
echo 2. Extract to %%USERPROFILE%%\.vscode\extensions\origami-language-0.0.1\
echo 3. Restart VS Code
echo.
goto :end

:success
echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Please restart VS Code to activate the extension
echo Create .cjp or .cj files to test syntax highlighting
echo.

:end
echo Press any key to exit...
pause >nul