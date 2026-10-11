@echo off
setlocal EnableDelayedExpansion
REM FamiApp – Debug-APK bauen + versioniert speichern
REM Doppelklick oder: build-apk.bat
REM Vorher: npm run mobile:update (oder Projekt bereits synchronisiert)
cd /d "%~dp0"
echo.
echo [FamiApp] Lese Version aus version.json ...

REM Version per Node aus version.json (z. B. V2.6.0.21)
for /f "delims=" %%v in ('node scripts\get-apk-version.js') do set "VERSION=%%v"
set "VERSION=!VERSION: =!"
if not defined VERSION set "VERSION=V0.0.0.0"
echo [FamiApp] Version: !VERSION!
echo.

REM Build-Ordner wird NICHT bereinigt, damit bestehende versionierte APK-Builds erhalten bleiben.
REM Bei "Unable to delete directory": vorher manuell "npm run android:clean" ausfuehren.
echo.

REM 1. Web-Build + Capacitor Sync
echo [FamiApp] Web-Build + Capacitor Sync ...
call npm run mobile:update
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [FEHLER] mobile:update fehlgeschlagen.
  pause
  exit /b 1
)

REM 2. Gradle Debug-APK bauen
echo.
echo [FamiApp] Baue Debug-APK ...
cd android
call gradlew.bat assembleDebug
set BUILD_RESULT=%ERRORLEVEL%
cd ..

if %BUILD_RESULT% NEQ 0 (
  echo.
  echo [FEHLER] Build fehlgeschlagen. Tipp: Cursor/IDE schliessen und erneut versuchen,
  echo oder Android Studio oeffnen: npm run android:open ^> Build ^> Build APK(s)
  pause
  exit /b 1
)

REM 3. APK in versionierten Ordner kopieren
set "APK_SRC=android\app\build\outputs\apk\debug\app-debug.apk"
set "APK_DIR=android\app\build\outputs\apk\!VERSION!"
set "APK_DST=!APK_DIR!\FamiApp-!VERSION!.apk"

if not exist "!APK_DIR!" mkdir "!APK_DIR!"
copy /Y "!APK_SRC!" "!APK_DST!" >nul

echo.
echo [FamiApp] Optional: Google Drive ^(FAMIDO_DRIVE_FOLDER / rclone^) ...
call node scripts\sync-apk-to-drive.js

echo.
echo ============================================================
echo   BUILD SUCCESSFUL!
echo.
echo   Version:  !VERSION!
echo   APK:      !APK_DST!
echo   Groesse:  
for %%F in ("!APK_DST!") do echo              %%~zF Bytes
echo.
echo   Auf Handy: Datei kopieren und oeffnen zum Installieren.
echo ============================================================
echo.
pause
