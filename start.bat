@echo off
echo 🐑 Starting Server Shepherd...

REM Create logs directory
if not exist logs mkdir logs

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is required but not installed.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is required but not installed.
    pause
    exit /b 1
)

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
npm install

REM Generate sample logs
echo 📝 Generating sample logs...
start /b python sample_log_generator.py logs\sample.log 1

REM Wait a moment for logs to generate
timeout /t 2 /nobreak >nul

REM Start the backend
echo 🚀 Starting backend server...
start /b python backend.py

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start the log agent
echo 👁️ Starting log agent...
start /b python log_agent.py logs\sample.log localhost 9999

REM Wait for agent to connect
timeout /t 2 /nobreak >nul

REM Start the frontend
echo 🎨 Starting frontend...
start /b npm start

echo.
echo ✅ Server Shepherd is running!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Press any key to stop all services
pause >nul

echo.
echo 🛑 Stopping Server Shepherd...
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo ✅ All services stopped
