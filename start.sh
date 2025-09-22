#!/bin/bash

# Server Shepherd Startup Script

echo "🐑 Starting Server Shepherd..."

# Create logs directory
mkdir -p logs

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Generate sample logs
echo "📝 Generating sample logs..."
python sample_log_generator.py logs/sample.log 1 &
LOG_GEN_PID=$!

# Wait a moment for logs to generate
sleep 2

# Start the backend
echo "🚀 Starting backend server..."
python backend.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start the log agent
echo "👁️ Starting log agent..."
python log_agent.py logs/sample.log localhost 9999 &
AGENT_PID=$!

# Wait for agent to connect
sleep 2

# Start the frontend
echo "🎨 Starting frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Server Shepherd is running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Server Shepherd..."
    kill $LOG_GEN_PID $BACKEND_PID $AGENT_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait
