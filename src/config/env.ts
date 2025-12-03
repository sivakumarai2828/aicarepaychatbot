export const config = {
  elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
  openAiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  environment: import.meta.env.NODE_ENV || 'development',
  // Backend WebSocket URL for Pipecat pipeline (not used when useBackendVoice is false)
  backendVoiceUrl: import.meta.env.VITE_BACKEND_VOICE_URL || (import.meta.env.PROD ? 'wss://aicarepaychatbot.onrender.com/ws/voice' : 'ws://localhost:8000/ws/voice'),
  // Use backend service instead of direct OpenAI real-time API
  // Set to 'true' to use backend (proxies OpenAI Real-Time API), 'false' to use OpenAI Real-Time API directly
  useBackendVoice: true
};

// Debug log to verify which service is being used
if (import.meta.env.DEV) {
  console.log('🔧 Voice service config:', {
    useBackendVoice: config.useBackendVoice,
    hasOpenAIKey: !!config.openAiApiKey,
    backendUrl: config.backendVoiceUrl
  });
}