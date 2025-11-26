export const config = {
  elevenLabsApiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
  openAiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  environment: import.meta.env.NODE_ENV || 'development'
};