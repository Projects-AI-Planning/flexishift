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
    echo Waiting for package manager service...
    :wait_pm
    adb shell "pm list packages" >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 3 /nobreak >nul
        goto wait_pm
    )
    echo Package manager ready.
    timeout /t 3 /nobreak >nul
) else (
    echo Device already connected. Proceeding...
)

cd android
call gradlew --stop
cd ..
powershell -Command "Remove-Item -Recurse -Force 'node_modules\@react-native\gradle-plugin\build' -ErrorAction SilentlyContinue"

REM Build APK only (skip Gradle's install which hits StorageManager NPE on fresh emulators)
cd android
call gradlew app:assembleDebug
if %errorlevel% neq 0 (
    echo Build failed.
    exit /b 1
)
cd ..

REM Install via adb push + pm install -f to bypass StorageManager volume resolver bug
set APK_PATH=C:\FreightFlexBuild\app\outputs\apk\debug\app-debug.apk
echo Installing APK...
adb push "%APK_PATH%" /data/local/tmp/app-debug.apk
adb shell "pm install -r -t -f /data/local/tmp/app-debug.apk"
if %errorlevel% neq 0 (
    echo Install failed.
    exit /b 1
)
echo APK installed. Starting app...
adb shell "am start -n com.mobile/com.mobile.MainActivity"

REM Start Metro bundler
call react-native start
