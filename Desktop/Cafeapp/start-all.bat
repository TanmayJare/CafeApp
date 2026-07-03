@echo off
title CafeConnect Launcher
echo Starting CafeConnect apps with automatic IP detection...
powershell -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
