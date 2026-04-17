@echo off
:: ============================================================
:: start.bat - Lance l'API FastAPI et le frontend React
:: Usage : double-cliquer ou executer depuis la racine du projet
:: ============================================================

echo.
echo ============================================================
echo   Agent IA - Prediction Gasoil
echo   Demarrage de l'API et du frontend...
echo ============================================================
echo.

:: Recuperer le repertoire du script (racine du projet)
set PROJECT_DIR=%~dp0

:: -------------------------------------------------------
:: Fenetre 1 : API FastAPI sur le port 8000
:: -------------------------------------------------------
echo [INFO] Lancement de l'API FastAPI (port 8000)...
start "API FastAPI - Brent" cmd /k "cd /d %PROJECT_DIR% && python -m uvicorn api.main:app --reload --port 8000"

:: Pause pour laisser le serveur demarrer
timeout /t 3 /nobreak >nul

:: -------------------------------------------------------
:: Fenetre 2 : Serveur de developpement React (port 5173)
:: -------------------------------------------------------
echo [INFO] Lancement du frontend React (port 5173)...
start "Frontend React - Brent" cmd /k "cd /d %PROJECT_DIR%frontend && npm run dev"

:: Pause supplementaire pour que Vite soit pret
echo [INFO] Attente du demarrage des serveurs (5 secondes)...
timeout /t 5 /nobreak >nul

:: -------------------------------------------------------
:: Ouverture du navigateur
:: -------------------------------------------------------
echo [INFO] Ouverture du navigateur sur http://localhost:5173
start "" "http://localhost:5173"

echo.
echo ============================================================
echo   Serveurs demarres :
echo     API     : http://localhost:8000
echo     Docs    : http://localhost:8000/docs
echo     Frontend: http://localhost:5173
echo ============================================================
echo.
echo   Fermez les fenetres "API FastAPI" et "Frontend React"
echo   pour arreter les serveurs.
echo.
pause
