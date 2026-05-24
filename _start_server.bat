@echo off
cd /d c:\Users\lamb\WorkBuddy\20260412222433
start "WorkBuddyServer" python -m http.server 9090 --bind 0.0.0.0
timeout /t 2 >nul
echo SERVER_STARTED
