@echo off
echo ========================================
echo Local Workflow Test
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    exit /b 1
)
echo.

echo Running test workflow...
python test_workflow.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Tests failed!
    pause
    exit /b 1
)
echo.

echo Do you want to run getDetailedPlayers.py now? (Y/N)
set /p run_script=
if /i "%run_script%"=="Y" (
    echo.
    echo Running getDetailedPlayers.py...
    python getDetailedPlayers.py
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Script failed!
        pause
        exit /b 1
    )
    echo.
    echo Checking output...
    if exist detailed_players.json (
        echo SUCCESS: detailed_players.json created!
        echo.
        echo Copying to public folder...
        copy /Y detailed_players.json ..\public\detailed_players.json
        if %errorlevel% equ 0 (
            echo SUCCESS: File copied to public folder!
        )
    ) else (
        echo ERROR: detailed_players.json not found!
    )
)

echo.
echo ========================================
echo Done!
echo ========================================
pause
