export interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export interface RealtimeSessionConfig {
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
  tools?: RealtimeTool[];
  tool_choice?: string;
  temperature?: number;
  max_response_output_tokens?: number;
}

export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AudioChunk {
  delta: string;
}

export interface TranscriptDelta {
  delta: string;
}

export interface FunctionCall {
  call_id: string;
  name: string;
  arguments: string;
}

export interface RealtimeError {
  type: string;
  code?: string;
  message: string;
  param?: string;
}
