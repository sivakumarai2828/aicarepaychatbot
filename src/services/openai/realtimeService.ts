import { config } from '../../config/env';
import type { RealtimeEvent, RealtimeSessionConfig, RealtimeTool } from '../../types/openai';
import { BackendVoiceService } from '../backend/voiceService';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview';

export class OpenAIRealtimeService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;
  private eventHandlers: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private audioPlaybackStartTime: number = 0;
  private hasActiveResponse: boolean = false;

  constructor() {
    // AudioContext will be created when needed to ensure it's in the right state
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
        threshold: 0.8,           // Increased to 0.8 to aggressively filter background noise
        prefix_padding_ms: 500,   // Increased padding
        silence_duration_ms: 1000 // Increased silence duration
      },
      tools: this.getTools(),
      tool_choice: 'auto',
      temperature: 0.8,
      max_response_output_tokens: 250
    };

    this.sendEvent({
      type: 'session.update',
      session: sessionConfig
    });

    // Initialize audio context when session is created
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      // Resume audio context (browsers require user interaction)
      this.audioContext.resume().catch(err => {
        console.warn('Could not resume audio context:', err);
      });
    }
  }

  private getSystemInstructions(): string {
    return `You are a helpful voice assistant for a bill payment system called CareCredit QuickPayBot. You can help users:
• Look up their account information
• View their bills
• Make payments
• Set up payment plans
• Send receipts via email or SMS

IMPORTANT FORMATTING RULES:
- Do NOT use markdown syntax like ** for bold or - for bullet points
- Present information in clear, natural sentences
- Keep responses conversational and easy to read

CRITICAL INTERACTION RULES:
1. WAIT for the user to speak first and tell you what they need
2. DO NOT proactively ask for phone numbers, emails, or offer to look up accounts
3. DO NOT assume what the user wants - let them tell you
4. Only call functions when the user explicitly requests that action
5. Be responsive and helpful, but not pushy

CRITICAL RULES FOR BILL DISPLAY:
When you call the get_bills function:
1. DO NOT say "hold on", "please wait", "let me check", or "one moment"
2. DO NOT describe the bills (amounts, providers, payment options)
3. The bills appear INSTANTLY in the visual UI when you call the function
4. Simply acknowledge briefly like: "I can see your bills are displayed" or "Your bills are showing on screen"
5. Then ask what they'd like to do next

CRITICAL RULES FOR PAYMENT PLANS:
When you call the show_payment_plans function:
1. DO NOT describe the payment plan options (6-month, 12-month, 18-month, etc.)
2. DO NOT mention monthly payment amounts or interest rates
3. The payment plans appear INSTANTLY in the visual UI
4. Simply say: "I've displayed the payment plan options for your [bill name]"
5. Then ask which plan they'd like to choose

Remember: Bills and payment plans appear visually on screen automatically and INSTANTLY. Your job is just to acknowledge this briefly.

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
        description: 'Get list of bills for an account. ONLY call this function when the user EXPLICITLY asks to see their bills, view bills, show bills, or check their bills. DO NOT call this function proactively or as a greeting.',
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
      },
      {
        type: 'function',
        name: 'show_payment_plans',
        description: 'Show available payment plans for a specific bill. Call this when user asks about installment or payment plan options for a bill.',
        parameters: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'Bill identifier (e.g., bill_1, bill_2, bill_3)'
            }
          },
          required: ['bill_id']
        }
      },
      {
        type: 'function',
        name: 'select_payment_plan',
        description: 'Select a specific payment plan after user has chosen one from the displayed options',
        parameters: {
          type: 'object',
          properties: {
            bill_id: {
              type: 'string',
              description: 'Bill identifier'
            },
            plan_id: {
              type: 'string',
              description: 'Payment plan identifier (e.g., plan_6mo, plan_12mo, plan_18mo)'
            }
          },
          required: ['bill_id', 'plan_id']
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
        case 'response.created':
          console.log('🎬 Response created - hasActiveResponse: true');
          this.hasActiveResponse = true;
          break;
        case 'response.audio.delta':
          console.log('🔊 Audio delta received, size:', event.delta?.length || 0, 'isPlaying:', this.isPlaying, 'hasActiveResponse:', this.hasActiveResponse);
          this.handleAudioDelta(event);
          break;
        case 'response.audio.done':
          console.log('✅ Audio response complete - resetting playback state');
          this.isPlaying = false;
          this.currentAudioSource = null;
          this.audioPlaybackStartTime = 0; // Reset playback start time
          break;
        case 'response.done':
          console.log('🏁 Response done - hasActiveResponse: false');
          this.hasActiveResponse = false;
          break;
        case 'response.cancelled':
          console.log('🛑 Response cancelled by OpenAI');
          this.hasActiveResponse = false;
          this.stopAudioPlayback();
          break;
        case 'conversation.item.input_audio_transcription.completed':
          const transcript = event.transcript || '';
          const playbackDuration = Date.now() - this.audioPlaybackStartTime;
          console.log('🎤 Transcription completed:', {
            transcript: transcript.substring(0, 50),
            hasActiveResponse: this.hasActiveResponse,
            isPlaying: this.isPlaying,
            playbackDuration,
            audioPlaybackStartTime: this.audioPlaybackStartTime
          });

          // DISABLED: Manual interruption detection causes false positives from ambient noise
          // OpenAI's server-side VAD (Voice Activity Detection) handles turn-taking automatically
          // The server will naturally stop generating responses when it detects user speech
          console.log('ℹ️ Manual interruption disabled - relying on OpenAI server-side VAD');

          /* ORIGINAL INTERRUPTION LOGIC - DISABLED
          if (this.hasActiveResponse && this.isPlaying) {
            if (playbackDuration > 300) {
              console.log('🗣️ User speaking detected via transcription, cancelling active response');
              this.stopAudioPlayback();
            } else {
              console.log('⏭️ Skipping cancellation - playback duration too short:', playbackDuration);
            }
          } else {
            console.log('⏭️ Skipping cancellation - hasActiveResponse:', this.hasActiveResponse, 'isPlaying:', this.isPlaying);
          }
          */
          break;
        case 'response.function_call_arguments.done':
          this.handleFunctionCall(event);
          break;
        case 'response.audio_transcript.delta':
        case 'response.audio_transcript.done':
          console.log('📝 Transcript event:', event.type, event);
          break;
        case 'input_audio_buffer.speech_started':
          console.log('🎙️ OpenAI VAD: Speech started (server detected user speaking)');
          this.stopAudioPlayback();
          break;
        case 'input_audio_buffer.speech_stopped':
          console.log('🔇 OpenAI VAD: Speech stopped (server detected user stopped speaking)');
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
    if (!event.delta) {
      return;
    }

    try {
      // Ensure audio context is created and resumed
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

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
      console.log('🔇 No more audio to play - stopping playback');
      this.isPlaying = false;
      this.currentAudioSource = null;
      return;
    }

    // Ensure audio context is resumed
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    // Track when playback starts (for interruption detection)
    if (this.audioPlaybackStartTime === 0) {
      this.audioPlaybackStartTime = Date.now();
      console.log('🎵 Starting audio playback - timestamp:', this.audioPlaybackStartTime);
    }

    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    this.currentAudioSource = source;

    source.onended = () => {
      this.currentAudioSource = null;
      this.playNextAudio();
    };

    try {
      source.start(0);
      console.log('🔊 Playing audio chunk, queue length:', this.audioQueue.length);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isPlaying = false;
      this.currentAudioSource = null;
      this.playNextAudio();
    }
  }

  /**
   * Stop current audio playback and clear queue
   * Called when user interrupts by speaking
   */
  public stopAudioPlayback(): void {
    console.log('🛑 Stopping audio playback due to user interruption');

    // Stop current audio source
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch (e) {
        // Source may have already ended
      }
      this.currentAudioSource = null;
    }

    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;
    this.audioPlaybackStartTime = 0; // Reset playback start time

    // Cancel current response in OpenAI only if there's an active response
    if (this.hasActiveResponse && this.isConnected && this.ws) {
      this.sendEvent({
        type: 'response.cancel'
      });
      console.log('📤 Sent response.cancel to OpenAI');
      this.hasActiveResponse = false;
    }
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

      // Resume audio context if suspended (required for browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔊 Audio context resumed for recording');
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Throttle audio sending to avoid sending too frequently
      let lastSendTime = 0;
      const minSendInterval = 50; // Send at most every 50ms

      processor.onaudioprocess = (e) => {
        if (!this.isConnected) return;

        const now = Date.now();
        if (now - lastSendTime < minSendInterval) {
          return; // Skip this chunk to throttle
        }
        lastSendTime = now;

        const inputData = e.inputBuffer.getChannelData(0);

        // Disable audio-level based interruption - rely on OpenAI's turn detection instead
        // Audio level detection was causing false positives from background noise
        // OpenAI's server-side VAD is more reliable for detecting actual user speech

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
      // Connect processor to a dummy gain node to avoid feedback, but keep it active
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Mute the output to prevent feedback
      processor.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
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
      const eventStr = JSON.stringify(event);
      console.log('📤 Sending event:', event.type);
      this.ws.send(eventStr);
    } else {
      console.warn('⚠️ Cannot send event - WebSocket not connected');
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
    this.stopAudioPlayback();
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

// Use backend service if configured, otherwise use OpenAI real-time API directly
export const realtimeService = config.useBackendVoice
  ? new BackendVoiceService(config.backendVoiceUrl)
  : new OpenAIRealtimeService();

// Debug log
// @ts-ignore - import.meta.env is available in Vite
if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  console.log('🎤 Using voice service:', config.useBackendVoice ? 'BackendVoiceService' : 'OpenAIRealtimeService');
}
