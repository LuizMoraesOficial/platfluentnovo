@echo off
cd /d "%~dp0"
title Be Fluent School

echo.
echo  =========================================
echo   Be Fluent School - Iniciando Sistema
echo  =========================================
echo.

:: ── BACKEND ──
echo [1/2] Abrindo Backend na porta 5000...
start "BACKEND - Be Fluent" cmd /k "cd /d "%~dp0backend" && set DATABASE_URL=postgresql://neondb_owner:npg_XUxrp9yQ5LRv@ep-broad-meadow-acws98ey.sa-east-1.aws.neon.tech/neondb?sslmode=require && set SESSION_SECRET=be-fluent-super-secret-session-key-minimum-32-chars-2024 && set NODE_ENV=development && set PORT=5000 && set CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173 && echo. && echo  BACKEND iniciando... && echo. && node src/index.js"

:: Aguarda backend subir
echo Aguardando backend iniciar (10 segundos)...
timeout /t 10 /nobreak >nul

:: ── FRONTEND ──
echo [2/2] Abrindo Frontend na porta 5173...
start "FRONTEND - Be Fluent" cmd /k "cd /d "%~dp0frontend" && echo. && echo  FRONTEND iniciando... && echo. && npm run dev"

echo.
echo  =========================================
echo   Pronto! Aguarde os terminais abrirem.
echo.
echo   Acesse: http://localhost:5173
echo.
echo   Login:
echo   E-mail: befluentschooll@gmail.com
echo   Senha:  Netinhoss2!
echo  =========================================
echo.
echo  Pode fechar esta janela.
pause
