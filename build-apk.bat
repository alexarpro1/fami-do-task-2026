@echo off
REM FamiApp – Debug-APK bauen (Doppelklick oder: build-apk.bat)
REM Vorher: npm run mobile:update (oder Projekt bereits synchronisiert)
cd /d "%~dp0"
echo.
echo [FamiApp] Baue Debug-APK ...
echo.
cd android
call gradlew.bat assembleDebug
cd ..
if %ERRORLEVEL% EQU 0 (
  echo.
  echo APK erstellt:
  echo   android\app\build\outputs\apk\debug\app-debug.apk
  echo.
  echo Auf Handy: Datei kopieren und oeffnen zum Installieren.
  pause
) else (
  echo.
  echo Build fehlgeschlagen. Tipp: Cursor/IDE schliessen und erneut versuchen,
  echo oder Android Studio oeffnen: npm run android:open ^> Build ^> Build APK(s)
  pause
)
