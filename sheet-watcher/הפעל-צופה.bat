@echo off
chcp 65001 > nul
title צופה הגיליון
cd /d "%~dp0"
echo.
echo   צופה הגיליון - בודק כל 30 שניות אם נוסף משהו חדש.
echo   אפשר להשאיר את החלון הזה פתוח ברקע. Ctrl+C עוצר.
echo.
python watch.py
echo.
echo   הצופה נעצר.
pause
