@echo off
chcp 65001 >nul
title TCHIKONG - Installation
cd /d "%~dp0"

echo.
echo  ============================================
echo    TCHIKONG - Installation (Windows)
echo  ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo  [ERREUR] Node.js n'est pas installe.
    echo.
    echo  1. Allez sur https://nodejs.org
    echo  2. Telechargez la version 22 LTS
    echo  3. Installez, fermez cette fenetre, relancez INSTALLER.bat
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo  Node detecte : %NODE_VER%

echo %NODE_VER% | findstr /r "^v2[4-9]" >nul
if not errorlevel 1 (
    echo.
    echo  [ATTENTION] Node 24+ cause souvent des erreurs.
    echo  Installez Node.js 22 LTS depuis https://nodejs.org
    echo.
    pause
)

if not exist package.json (
    echo.
    echo  [ERREUR] package.json introuvable.
    echo  Ce fichier doit etre dans le dossier app-tchikong
    echo  (la ou se trouve INSTALLER.bat).
    echo.
    pause
    exit /b 1
)

echo.
echo  Installation en cours... (2 a 5 minutes)
echo.

call npm install
if errorlevel 1 (
    echo.
    echo  ============================================
    echo    INSTALLATION ECHOUEE
    echo  ============================================
    echo.
    echo  Solution 1 - Outils C++ Windows :
    echo    https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo    Cochez "Developpement Desktop en C++"
    echo    Redemarrez le PC, relancez INSTALLER.bat
    echo.
    echo  Solution 2 - Telecharger l'application deja compilee :
    echo    GitHub ^> Actions ^> Build Windows ^> Artifacts
    echo    (pas besoin d'installer Node.js)
    echo.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo    Installation terminee !
echo    Double-cliquez sur LANCER.bat
echo  ============================================
echo.
pause
