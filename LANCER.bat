@echo off
chcp 65001 >nul
title TCHIKONG Gestion Scolaire
cd /d "%~dp0"

if not exist node_modules\electron (
    echo.
    echo  Les dependances ne sont pas installees.
    echo  Double-cliquez d'abord sur INSTALLER.bat
    echo.
    pause
    exit /b 1
)

echo.
echo  Demarrage de TCHIKONG...
echo  Connexion : admin / admin123
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo  Erreur au demarrage. Relancez INSTALLER.bat
    echo.
    pause
)
