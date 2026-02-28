@echo off
REM Gradle-Clean + Android-Run. Vorher: Android Studio und alle Terminals in diesem Projekt schließen,
REM damit "Failed to clean up output files" / "Unable to delete directory" nicht auftritt.

cd /d "%~dp0"

echo Stopping Gradle daemons...
cd android
call gradlew.bat --stop 2>nul

echo Cleaning Android build...
call gradlew.bat clean
set CLEAN_OK=0
if not errorlevel 1 set CLEAN_OK=1
cd ..

if %CLEAN_OK%==0 (
  echo.
  echo Clean fehlgeschlagen (Ordner vermutlich gesperrt). Versuche, Build-Ordner umzubenennen...
  if exist "android\build" (
    ren "android\build" "build_old" 2>nul && echo   android\build -> build_old || echo   Umbenennen android\build fehlgeschlagen.
  )
  if exist "android\app\build" (
    ren "android\app\build" "build_old" 2>nul && echo   android\app\build -> build_old || echo   Umbenennen android\app\build fehlgeschlagen.
  )
  echo   Beim naechsten Lauf legt Gradle neue Build-Ordner an.
  echo.
)

echo Starting app on device/emulator...
call npx cap run android
pause
