@echo off
rem Lance StockFlow : base PostgreSQL locale, API (port 3001) et site (port 5173).
rem Double-cliquer sur ce fichier. Fermer les fenetres "StockFlow API" et "StockFlow Site" pour arreter.
chcp 65001 >nul
title StockFlow - lancement
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installe. Telechargez-le sur https://nodejs.org puis relancez.
  pause
  exit /b 1
)

rem Premiere fois sur ce PC : installation des bibliotheques
if not exist "node_modules" (
  echo Installation des bibliotheques du site...
  call npm install || goto :erreur
)
if not exist "backend\node_modules" (
  echo Installation des bibliotheques de l'API...
  pushd backend
  call npm install || (popd & goto :erreur)
  popd
)
if not exist "backend\.env" (
  echo [ERREUR] backend\.env est absent : copiez backend\.env.example vers backend\.env et completez-le.
  pause
  exit /b 1
)

echo [1/3] Demarrage de la base de donnees...
pushd backend
call node scripts\local-db.mjs || (popd & goto :erreur)
if not exist "dist\main.js" (
  echo Compilation de l'API...
  call npm run build || (popd & goto :erreur)
)
popd

call :port_occupe 3001
if errorlevel 1 (
  echo [2/3] Demarrage de l'API sur http://127.0.0.1:3001 ...
  start "StockFlow API" /min /d "%~dp0backend" cmd /k npm start
) else (
  echo [2/3] L'API tourne deja sur le port 3001.
)

call :port_occupe 5173
if errorlevel 1 (
  echo [3/3] Demarrage du site sur http://localhost:5173 ...
  start "StockFlow Site" /min /d "%~dp0" cmd /k npm run dev -- --port 5173 --strictPort
) else (
  echo [3/3] Le site tourne deja sur le port 5173.
)

echo Attente du site...
set /a essais=0
:attente
timeout /t 2 /nobreak >nul
set /a essais+=1
powershell -NoProfile -Command "try { Invoke-WebRequest http://localhost:5173 -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 goto :pret
if %essais% lss 45 goto :attente
echo [ATTENTION] Le site met du temps a demarrer : regardez la fenetre "StockFlow Site".

:pret
start "" "http://localhost:5173/#/accueil"
echo.
echo StockFlow est lance. Pour l'arreter, fermez les fenetres "StockFlow API" et "StockFlow Site".
timeout /t 5 >nul
exit /b 0

:port_occupe
rem Renvoie 0 si un programme ecoute deja sur le port %1, sinon 1.
powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -LocalPort %1 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
exit /b %errorlevel%

:erreur
echo.
echo [ERREUR] Le lancement a echoue (voir le message ci-dessus).
pause
exit /b 1
