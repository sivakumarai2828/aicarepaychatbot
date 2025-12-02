# How to View Backend Logs

## Method 1: Terminal Where Server is Running (Recommended)

If you started the backend with:
```bash
cd backend
source venv/bin/activate
python app.py
```

The logs will appear directly in that terminal window. You'll see:
- `INFO: Uvicorn running on http://0.0.0.0:8000`
- `🔌 WebSocket client connected - Session: ...`
- `📥 Received X bytes of audio data`
- Any errors or exceptions

## Method 2: Check if Server is Running

```bash
# Check if port 8000 is in use
lsof -i:8000

# Or check the process
ps aux | grep "python.*app.py"
```

## Method 3: View Logs from Background Process

If the server is running in the background, you can:

### Option A: Find the process and view its output
```bash
# Find the process ID
ps aux | grep "python.*app.py" | grep -v grep

# If it's writing to a log file, view it
tail -f /tmp/backend.log
```

### Option B: Restart with logging to file
```bash
cd backend
source venv/bin/activate
python app.py > backend.log 2>&1 &
tail -f backend.log
```

## Method 4: Check Recent Logs

```bash
# If logs are in /tmp/backend.log
tail -50 /tmp/backend.log

# Or check for any log files
find backend -name "*.log" -type f
```

## What to Look For

### ✅ Good Signs:
- `INFO: Uvicorn running on http://0.0.0.0:8000`
- `🔌 WebSocket client connected - Session: ...`
- `✅ Transport created for session ...`
- `🚀 Starting pipeline for session ...`
- `📥 Received X bytes of audio data`

### ❌ Problems:
- `ERROR:` messages
- `❌ Error in pipeline`
- `ImportError` or `ModuleNotFoundError`
- Connection refused errors
- WebSocket errors

## Real-time Log Monitoring

To watch logs in real-time:
```bash
# If server is running in foreground, just watch the terminal
# If in background with log file:
tail -f backend.log

# Or if using systemd/journalctl:
journalctl -u your-service-name -f
```

## Restart Server with Better Logging

```bash
cd backend
source venv/bin/activate

# Run with detailed logging
python app.py 2>&1 | tee backend.log

# Or with Python logging level
PYTHONUNBUFFERED=1 python app.py
```

## Quick Check Commands

```bash
# Check if server is responding
curl http://localhost:8000/health

# Check WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:8000/ws/voice
```

