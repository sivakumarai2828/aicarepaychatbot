import { config } from '../../config/env';
import type { RealtimeEvent, RealtimeSessionConfig, RealtimeTool } from '../../types/openai';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;
  private eventHandlers: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      const apiKey = config.openAiApiKey;

      if (!apiKey) {
        reject(new Error('OpenAI API key not configured'));
        return;
      }

      this.ws = new WebSocket(OPENAI_REALTIME_URL, ['realtime', `openai-insecure-api-key.${apiKey}`, 'openai-beta.realtime-v1']);

      this.ws.addEventListener('open', () => {
        this.isConnected = true;
        this.initializeSession();
        resolve();
      });

      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      this.ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.addEventListener('close', () => {
        this.isConnected = false;
        this.cleanup();
      });
    });
  }

  private initializeSession(): void {
    const sessionConfig: RealtimeSessionConfig = {
      modalities: ['text', 'audio'],
      instructions: this.getSystemInstructions(),
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      tools: this.getTools(),
      tool_choice: 'auto',
      temperature: 0.8,
      max_response_output_tokens: 4096
    };

    this.sendEvent({
      type: 'session.update',
      session: sessionConfig
    });
  }

  private getSystemInstructions(): string {
    return `You are a helpful voice assistant for a bill payment system. You can help users:
- Look up their account information
- View their bills
- Make payments
- Set up payment plans
- Send receipts via email or SMS

Be conversational, friendly, and efficient. When handling payments, confirm amounts and important details.
Use the provided functions to perform actions. Always acknowledge what you're doing.`;
  }

  private getTools(): RealtimeTool[] {
    return [
      {
        type: 'function',
        name: 'lookup_account',
        description: 'Look up customer account by phone number or email',
        parameters: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Phone number or email address'
            }
          },
          required: ['identifier']
        }
      },
      {
        type: 'function',
        name: 'get_bills',
        description: 'Get list of bills for an account',
        parameters: {
          type: 'object',
          properties: {
            account_id: {
              type: 'string',
              description: 'Account identifier'
            }
          },
          required: ['account_id']
        }
      },
      {
        type: 'function',
        name: 'process_payment',
        description: 'Process a payment for a bill',
        parameters: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'Bill identifier'
            },
            amount: {
              type: 'number',
              description: 'Payment amount'
            },
            payment_method: {
              type: 'string',
              description: 'Payment method (card, bank)',
              enum: ['card', 'bank']
            }
          },
          required: ['bill_id', 'amount', 'payment_method']
        }
      },
      {
        type: 'function',
        name: 'send_receipt',
        description: 'Send payment receipt via email or SMS',
        parameters: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'Delivery method',
              enum: ['email', 'sms']
            },
            recipient: {
              type: 'string',
              description: 'Email address or phone number'
            },
            transaction_id: {
              type: 'string',
              description: 'Transaction identifier'
            }
          },
          required: ['method', 'recipient', 'transaction_id']
        }
      }
    ];
  }

  private handleMessage(data: string): void {
    try {
      const event: RealtimeEvent = JSON.parse(data);

      console.log('📡 Realtime event received:', event.type);

      this.emit(event.type, event);
      this.emit('*', event);

      switch (event.type) {
        case 'response.audio.delta':
          this.handleAudioDelta(event);
          break;
        case 'response.function_call_arguments.done':
          this.handleFunctionCall(event);
          break;
        case 'conversation.item.input_audio_transcription.completed':
        case 'response.audio_transcript.delta':
        case 'response.audio_transcript.done':
          console.log('📝 Transcript event:', event.type, event);
          break;
        case 'error':
          console.error('Realtime API error:', event);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  private async handleAudioDelta(event: RealtimeEvent): Promise<void> {
    if (!this.audioContext || !event.delta) {
      return;
    }

    try {
      const binaryString = atob(event.delta);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        this.playNextAudio();
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }

  private async playNextAudio(): Promise<void> {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextAudio();
    };

    source.start();
  }

  private handleFunctionCall(event: RealtimeEvent): void {
    this.emit('function_call', {
      type: 'function_call',
      call_id: event.call_id,
      name: event.name,
      arguments: event.arguments
    });
  }

  async startRecording(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!this.isConnected) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));

        this.sendEvent({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        });
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  sendEvent(event: RealtimeEvent): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(event));
    }
  }

  sendFunctionResult(callId: string, result: any): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    });

    this.sendEvent({
      type: 'response.create'
    });
  }

  on(eventType: string, handler: (event: RealtimeEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: string, handler: (event: RealtimeEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(eventType: string, event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  private cleanup(): void {
    this.stopRecording();
    this.audioQueue = [];
    this.isPlaying = false;
    this.eventHandlers.clear();
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export const realtimeService = new OpenAIRealtimeService();
