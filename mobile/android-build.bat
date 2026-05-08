@echo off
adb kill-server
adb start-server
cd android
call gradlew --stop
cd ..
powershell -Command "Remove-Item -Recurse -Force 'node_modules\@react-native\gradle-plugin\build' -ErrorAction SilentlyContinue"
call react-native run-android
