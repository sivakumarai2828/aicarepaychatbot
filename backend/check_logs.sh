#!/bin/bash

# Script to check backend logs

echo "🔍 Checking Backend Status..."
echo ""

# Check if server is running
if lsof -ti:8000 > /dev/null 2>&1; then
    PID=$(lsof -ti:8000 | head -1)
    echo "✅ Backend is running (PID: $PID)"
    echo ""
    
    # Check health
    echo "📊 Health Check:"
    curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "Could not reach server"
    echo ""
    
    # Check for log files
    if [ -f backend.log ]; then
        echo "📋 Recent logs from backend.log:"
        tail -20 backend.log
    elif [ -f /tmp/backend.log ]; then
        echo "📋 Recent logs from /tmp/backend.log:"
        tail -20 /tmp/backend.log
    else
        echo "ℹ️  No log file found. Logs are in the terminal where you started the server."
        echo ""
        echo "To see logs in real-time, restart the server with:"
        echo "  cd backend"
        echo "  source venv/bin/activate"
        echo "  python app.py"
    fi
else
    echo "❌ Backend is not running on port 8000"
    echo ""
    echo "To start it:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  python app.py"
fi

