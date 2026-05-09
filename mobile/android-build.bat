@echo off
setlocal enabledelayedexpansion

adb kill-server
adb start-server

REM Check if any device/emulator is already online
adb devices 2>nul | findstr /r "device$" >nul
if %errorlevel% neq 0 (
    echo No device found. Starting emulator...
    start "" "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" @Medium_Phone
    echo Waiting for emulator to come online...
    adb wait-for-device
    echo Emulator online. Waiting for full boot...
    :wait_boot
    for /f %%b in ('adb shell getprop sys.boot_completed 2^>nul') do set BOOT=%%b
    if not "!BOOT!"=="1" (
        timeout /t 3 /nobreak >nul
        goto wait_boot
    )
    echo Emulator fully booted!
    timeout /t 2 /nobreak >nul
) else (
    echo Device already connected. Proceeding...
)

cd android
call gradlew --stop
cd ..
powershell -Command "Remove-Item -Recurse -Force 'node_modules\@react-native\gradle-plugin\build' -ErrorAction SilentlyContinue"
call react-native run-android
