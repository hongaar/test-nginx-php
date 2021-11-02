@echo off

echo Stopping PHP...
taskkill /f /IM php-cgi.exe

echo Stopping NGINX...
taskkill /f /IM nginx.exe
