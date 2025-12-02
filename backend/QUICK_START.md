# Quick Start Guide

## ✅ API Keys Configured

Your API keys have been set up:
- ✅ **Speechmatics**: `VzK0vI02iHnCYLKb9CcQxA6rLcMD7uMz`
- ✅ **Cartesia**: `sk_car_qHChLu4sAHNgAmEKBBQD7w`
- ⚠️ **OpenAI**: Needs to be added

## 🚀 Next Steps

### 1. Add OpenAI API Key

Edit `backend/.env` and replace `your_openai_api_key_here` with your actual OpenAI API key:

```bash
cd backend
nano .env  # or use your preferred editor
```

Or use this command:
```bash
# Replace YOUR_OPENAI_KEY with your actual key
sed -i '' 's|OPENAI_API_KEY=.*|OPENAI_API_KEY=YOUR_OPENAI_KEY|' backend/.env
```

### 2. (Optional) Get Cartesia Voice ID

To see available voices:
```bash
cd backend
pip install requests  # if not already installed
python get_cartesia_voices.py
```

Then update `CARTESIA_VOICE_ID` in `.env` with your preferred voice.

### 3. Install Dependencies

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Start the Backend Server

```bash
python app.py
```

The server will start on `http://localhost:8000`

### 5. Start the Frontend

In a new terminal:
```bash
# From project root
npm run dev
```

### 6. Test the Connection

1. Open `http://localhost:5173` in your browser
2. Click the voice mode toggle
3. Allow microphone permissions
4. Start speaking!

## 🔍 Verify Setup

Check if the backend is running:
```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "active_sessions": 0,
  "services": {
    "speechmatics": true,
    "openai": true,  // Will be false until you add the key
    "cartesia": true
  }
}
```

## 🐛 Troubleshooting

### Backend won't start
- Make sure all API keys are in `backend/.env`
- Check Python version: `python3 --version` (needs 3.9+)
- Verify port 8000 is free: `lsof -i :8000`

### WebSocket connection fails
- Ensure backend is running: `curl http://localhost:8000/health`
- Check frontend `.env` has: `VITE_USE_BACKEND_VOICE=true`
- Verify `VITE_BACKEND_VOICE_URL=ws://localhost:8000/ws/voice`

### Import errors
- Make sure you activated the virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`
- Check Pipecat package versions match requirements

