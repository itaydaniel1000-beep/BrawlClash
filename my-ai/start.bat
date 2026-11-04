@echo off
rem Opens "My Assistant" in Chrome. Keep this window open while chatting.
cd /d "%~dp0"
start "" "http://127.0.0.1:5950/"
python -m http.server 5950 --bind 127.0.0.1
