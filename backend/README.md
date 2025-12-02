# Voice AI Pipeline Backend

Backend service using Pipecat framework to combine:
- **Speechmatics** for Speech-to-Text (STT)
- **OpenAI** for Large Language Model (LLM)
- **Cartesia** for Text-to-Speech (TTS)

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SPEECHMATICS_API_KEY=your_speechmatics_api_key
SPEECHMATICS_URL=wss://eu2.rt.speechmatics.com/v2

OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

CARTESIA_API_KEY=your_cartesia_api_key
CARTESIA_VOICE_ID=your_voice_id

SERVER_HOST=0.0.0.0
SERVER_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 3. Get API Keys

- **Speechmatics**: Sign up at https://www.speechmatics.com/
- **OpenAI**: Get API key from https://platform.openai.com/api-keys
- **Cartesia**: Sign up at https://cartesia.ai/ and get API key + voice ID

### 4. Run the Server

```bash
python app.py
```

Or with uvicorn directly:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`

## API Endpoints

### WebSocket: `/ws/voice`
Real-time voice communication endpoint. The frontend connects here to send audio and receive responses.

### Health Check: `/health`
Returns server status and active sessions count.

### Root: `/`
Returns API information.

## Architecture

```
Frontend (Browser)
    ↓ (WebSocket, Audio Stream)
Backend (FastAPI + Pipecat)
    ↓
Pipeline:
    Audio Input → Speechmatics STT → OpenAI LLM → Cartesia TTS → Audio Output
```

## Usage from Frontend

The frontend connects via WebSocket and streams audio data. The pipeline handles:
1. Receiving audio chunks
2. Transcribing with Speechmatics
3. Processing with OpenAI LLM (with function calling)
4. Synthesizing speech with Cartesia
5. Streaming audio back to frontend

## Function Calling

The LLM supports these functions:
- `lookup_account` - Find account by phone/email
- `get_bills` - Get bills for an account
- `process_payment` - Process a payment
- `send_receipt` - Send receipt via email/SMS

Function results are handled by the backend and can trigger additional LLM responses.

## Deployment

This backend can be deployed to any platform that supports Python:
- AWS (EC2, ECS, Lambda)
- Google Cloud (Cloud Run, Compute Engine)
- Azure (App Service, Container Instances)
- Heroku
- Railway
- Render

Make sure to set environment variables in your deployment platform.

