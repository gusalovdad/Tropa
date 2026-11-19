@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  echo Откройте в браузере http://127.0.0.1:8000
  echo Для остановки сервера нажмите Ctrl+C.
  py -m http.server 8000 --bind 127.0.0.1
  goto :eof
)
where python >nul 2>nul
if %errorlevel% equ 0 (
  echo Откройте в браузере http://127.0.0.1:8000
  echo Для остановки сервера нажмите Ctrl+C.
  python -m http.server 8000 --bind 127.0.0.1
  goto :eof
)
echo Python не найден. Откройте папку сайта в VS Code и запустите Live Server.
pause
