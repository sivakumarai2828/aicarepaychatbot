# Backend Setup Guide

This guide will help you set up the Pipecat backend pipeline with Speechmatics STT + OpenAI LLM + Cartesia TTS.

## Architecture

```
Frontend (React/TypeScript)
    ↓ WebSocket (Audio Stream)
Backend (Python + Pipecat)
    ↓
Pipeline:
    Speechmatics STT → OpenAI LLM → Cartesia TTS
```

## Prerequisites

- Python 3.9 or higher
- API keys for:
  - Speechmatics (https://www.speechmatics.com/)
  - OpenAI (https://platform.openai.com/)
  - Cartesia (https://cartesia.ai/)

## Step 1: Backend Setup

### 1.1 Navigate to backend directory

```bash
cd backend
```

### 1.2 Create virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 1.3 Install dependencies

```bash
pip install -r requirements.txt
```

### 1.4 Create environment file

Create a `.env` file in the `backend` directory:

```env
# Speechmatics API Configuration
SPEECHMATICS_API_KEY=your_speechmatics_api_key_here
SPEECHMATICS_URL=wss://eu2.rt.speechmatics.com/v2

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Cartesia API Configuration
CARTESIA_API_KEY=your_cartesia_api_key_here
CARTESIA_VOICE_ID=your_voice_id_here

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 1.5 Get API Keys

#### Speechmatics
1. Sign up at https://www.speechmatics.com/
2. Get your API key from the dashboard
3. Note the WebSocket URL (usually `wss://eu2.rt.speechmatics.com/v2`)

#### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Recommended model: `gpt-4o-mini` (cheaper) or `gpt-4o` (better quality)

#### Cartesia
1. Sign up at https://cartesia.ai/
2. Get your API key from the dashboard
3. Get a voice ID (you can list available voices via their API)

### 1.6 Run the backend

```bash
python app.py
```

Or use the run script:
```bash
./run.sh
```

The server should start on `http://localhost:8000`

## Step 2: Frontend Configuration

### 2.1 Update environment variables

Create or update `.env` in the root directory:

```env
# Use backend voice service
VITE_USE_BACKEND_VOICE=true
VITE_BACKEND_VOICE_URL=ws://localhost:8000/ws/voice
```

### 2.2 Start frontend

```bash
npm run dev
```

## Step 3: Testing

1. Open your browser to `http://localhost:5173`
2. Click the voice mode toggle
3. Allow microphone permissions
4. Start speaking - you should see:
   - Your speech transcribed
   - LLM responses
   - Audio playback of responses

## Troubleshooting

### Backend won't start
- Check that all API keys are set in `.env`
- Verify Python version: `python3 --version` (should be 3.9+)
- Check if port 8000 is available: `lsof -i :8000`

### WebSocket connection fails
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in `backend/app.py`
- Ensure `VITE_BACKEND_VOICE_URL` matches backend URL

### No audio playback
- Check browser console for errors
- Verify microphone permissions
- Check that Cartesia API key and voice ID are correct

### Function calling not working
- Verify OpenAI API key has function calling enabled
- Check backend logs for function call errors
- Ensure function definitions match in `backend/app.py`

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `WS /ws/voice` - WebSocket endpoint for voice communication

## Deployment

### Environment Variables for Production

Set these in your deployment platform:

```env
SPEECHMATICS_API_KEY=...
OPENAI_API_KEY=...
CARTESIA_API_KEY=...
CARTESIA_VOICE_ID=...
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
CORS_ORIGINS=https://yourdomain.com
```

### Recommended Platforms

- **Railway**: Easy Python deployment
- **Render**: Free tier available
- **Fly.io**: Good for WebSocket apps
- **AWS ECS/Fargate**: Enterprise scale
- **Google Cloud Run**: Serverless option

## Cost Estimation

Per 1000 minutes of conversation:

- Speechmatics: ~$15-20
- OpenAI (gpt-4o-mini): ~$1-2
- Cartesia: ~$5-10
- **Total: ~$21-32** (vs ~$60 for OpenAI Real-Time API)

**Savings: ~50-65%**

## Next Steps

1. Test the pipeline end-to-end
2. Customize system instructions in `backend/app.py`
3. Add more function definitions as needed
4. Deploy to production
5. Monitor costs and optimize

## Support

For issues with:
- **Pipecat**: https://github.com/pipecat-ai/pipecat
- **Speechmatics**: https://docs.speechmatics.com/
- **OpenAI**: https://platform.openai.com/docs
- **Cartesia**: https://docs.cartesia.ai/

