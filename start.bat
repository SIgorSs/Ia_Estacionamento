@echo off
title ParkVision AI — Backend
color 0A
echo.
echo  ================================================
echo   ParkVision AI — Iniciando servidor backend
echo  ================================================
echo.

:: Ativa o ambiente virtual
call "%~dp0.venv\Scripts\activate.bat"

echo  [1/2] Verificando dependencias...
pip install -r "%~dp0backend\requirements.txt" --quiet
echo  [OK] Dependencias OK
echo.
echo  [2/2] Iniciando Flask em http://127.0.0.1:8000
echo.
echo  Mantenha esta janela aberta enquanto usar o sistema.
echo  Para encerrar, pressione Ctrl+C
echo.

python "%~dp0backend\app.py"

pause
