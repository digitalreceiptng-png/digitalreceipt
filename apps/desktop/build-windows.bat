@echo off
echo Building DigitalReceipt Windows App...
echo This may take a few minutes on first run (downloads Electron ~80MB)
echo.
cd /d "%~dp0"
call npx electron-packager . DigitalReceipt --platform=win32 --arch=x64 --icon=assets/icon.ico --out=dist --overwrite --asar
echo.
if exist "dist\DigitalReceipt-win32-x64\DigitalReceipt.exe" (
  echo SUCCESS! App built at:
  echo dist\DigitalReceipt-win32-x64\DigitalReceipt.exe
) else (
  echo Build may still be in progress or failed. Check output above.
)
pause
