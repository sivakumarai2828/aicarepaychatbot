# Backend Configuration Guide

## 🎯 Overview
Your backend now supports **dynamic configuration** using Pydantic models. You can adjust temperature, voice, and other OpenAI parameters **without touching the UI code**.

## 🚀 How to Enable Backend

### Step 1: Update Frontend Config
Edit `src/config/env.ts`:
```typescript
export const config = {
  // ... other config
  useBackendVoice: true  // ⬅️ Change from false to true
};
```

### Step 2: Start the Backend
```bash
cd backend
python app.py
```

The backend will run on `http://localhost:8000`

## 📡 API Endpoints

### 1. **Get Default Configuration**
```bash
GET http://localhost:8000/api/config/default
```

**Response:**
```json
{
  "config": {
    "temperature": 0.8,
    "max_response_output_tokens": 4096,
    "voice": "alloy",
    "vad_threshold": 0.3,
    "vad_prefix_padding_ms": 500,
    "vad_silence_duration_ms": 2000
  },
  "description": "Default configuration for voice sessions"
}
```

### 2. **Update Global Configuration**
```bash
POST http://localhost:8000/api/config
Content-Type: application/json

{
  "temperature": 0.5,
  "voice": "nova",
  "vad_threshold": 0.5
}
```

### 3. **Get Current Configuration**
```bash
GET http://localhost:8000/api/config
```

### 4. **Pre-configure a Specific Session**
```bash
POST http://localhost:8000/api/config/session/{session_id}
Content-Type: application/json

{
  "temperature": 0.7,
  "max_response_output_tokens": 2048
}
```

## 🎛️ Configuration Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `temperature` | float | 0.0 - 2.0 | 0.8 | Controls creativity (0=deterministic, 2=very creative) |
| `max_response_output_tokens` | int | 1 - 4096 | 4096 | Maximum tokens in response |
| `voice` | string | - | "alloy" | Voice: alloy, echo, fable, onyx, nova, shimmer |
| `vad_threshold` | float | 0.0 - 1.0 | 0.3 | Voice Activity Detection sensitivity |
| `vad_prefix_padding_ms` | int | 0+ | 500 | Padding before speech (milliseconds) |
| `vad_silence_duration_ms` | int | 0+ | 2000 | Silence to end turn (milliseconds) |

## 💡 Use Cases

### Payment Processing (More Precise)
```json
{
  "temperature": 0.5,
  "vad_threshold": 0.5
}
```

### General Conversation (Balanced)
```json
{
  "temperature": 0.7,
  "vad_threshold": 0.4
}
```

### Creative/Engaging (Current Default)
```json
{
  "temperature": 0.8,
  "vad_threshold": 0.3
}
```

## 🧪 Testing with cURL

```bash
# Get default config
curl http://localhost:8000/api/config/default

# Update config for payment processing
curl -X POST http://localhost:8000/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 0.5,
    "voice": "alloy",
    "vad_threshold": 0.5
  }'

# Check health
curl http://localhost:8000/health
```

## 📊 Benefits

✅ **No UI Changes Required** - Adjust parameters via API  
✅ **Type Safety** - Pydantic validates all inputs  
✅ **Flexible** - Different configs for different scenarios  
✅ **Centralized** - All OpenAI logic in backend  
✅ **Secure** - API key stays on server  

## 🔄 Switching Between Frontend/Backend

**Use Frontend Direct (Current):**
- Faster (no proxy overhead)
- Simpler setup
- API key in browser (less secure)

**Use Backend Proxy:**
- More secure (API key on server)
- Centralized configuration
- Easy A/B testing
- Better monitoring/logging

## 🎯 Next Steps

1. Enable backend: `useBackendVoice: true`
2. Start backend: `python backend/app.py`
3. Test configuration API
4. Adjust temperature based on your needs
5. Monitor logs for configuration changes
