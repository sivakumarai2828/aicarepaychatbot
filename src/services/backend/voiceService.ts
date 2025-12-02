/**
 * Backend Voice Service
 * Simple WebSocket connection to backend voice pipeline
 */
import type { RealtimeEvent } from '../../types/openai';

export class BackendVoiceService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;
  private eventHandlers: Map<string, Set<(event: RealtimeEvent) => void>> = new Map();
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private backendUrl: string;

  constructor(backendUrl: string = 'ws://localhost:8000/ws/voice') {
    this.backendUrl = backendUrl;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to ${this.backendUrl}...`);
        this.ws = new WebSocket(this.backendUrl);

        this.ws.addEventListener('open', () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnected = true;
          this.initializeAudio();
          resolve();
        });

        this.ws.addEventListener('message', (event) => {
          if (event.data instanceof Blob) {
            // Audio data from backend
            this.handleAudioData(event.data);
          } else if (typeof event.data === 'string') {
            // Text/JSON messages
            try {
              const data = JSON.parse(event.data);
              this.handleMessage(data);
            } catch (e) {
              // Plain text
              this.handleTranscript(event.data);
            }
          }
        });

        this.ws.addEventListener('error', (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.ws.addEventListener('close', (event) => {
          console.log('🔌 WebSocket closed', event.code, event.reason);
          this.isConnected = false;
          this.cleanup();
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            console.error('❌ WebSocket connection timeout');
            this.ws?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private initializeAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
  }

  private async handleAudioData(blob: Blob): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const arrayBuffer = await blob.arrayBuffer();

      // Convert raw PCM16 to Float32 for Web Audio API
      const int16Array = new Int16Array(arrayBuffer);
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

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playNextAudio();
    };

    try {
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isPlaying = false;
      this.playNextAudio();
    }
  }

  private async handleMessage(data: any): Promise<void> {
    console.log('📩 Received message type:', data.type); // Debug log

    // Handle error messages from backend
    if (data.type === 'error') {
      console.error('❌ Backend error:', data.error);
      this.emit('error', data as RealtimeEvent);
      return;
    }

    // Handle structured messages from backend
    if (data.type === 'message' && data.text) {
      console.log('💬 Received text message:', data.text);
      this.emit('response.audio_transcript.delta', {
        type: 'response.audio_transcript.delta',
        delta: data.text
      } as RealtimeEvent);
    } else if (data.type === 'response.audio.delta' && data.delta) {
      // console.log('🔊 Processing audio delta, length:', data.delta.length); // Debug log

      // Handle audio delta from OpenAI (base64 encoded PCM16)
      try {
        const binaryString = atob(data.delta);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);

        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        if (!this.audioContext) {
          this.audioContext = new AudioContext({ sampleRate: 24000 });
        }

        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        this.audioQueue.push(audioBuffer);
        // console.log('🎵 Audio chunk queued. Queue length:', this.audioQueue.length); // Debug log

        if (!this.isPlaying) {
          this.playNextAudio();
        }
      } catch (error) {
        console.error('Error processing audio delta:', error);
      }

      // Still emit the event for UI visualization
      this.emit(data.type, data);
      this.emit('*', data);
    } else if (data.type === 'function_call') {
      // Handle function call events from backend
      console.log('🔧 FUNCTION CALL RECEIVED:', data);
      this.emit('function_call', data);
      this.emit('*', data);
    } else if (data.type) {
      this.emit(data.type, data);
      this.emit('*', data);
    }
  }

  private handleTranscript(text: string): void {
    // Handle plain text transcripts
    this.emit('response.audio_transcript.delta', {
      type: 'response.audio_transcript.delta',
      delta: text
    } as RealtimeEvent);
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

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      let lastSendTime = 0;
      const minSendInterval = 50; // Send at most every 50ms

      processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.ws) return;

        const now = Date.now();
        if (now - lastSendTime < minSendInterval) {
          return;
        }
        lastSendTime = now;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send audio data to backend
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(pcm16.buffer);
        }
      };

      source.connect(processor);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0; // Mute to prevent feedback
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
    // Send events as JSON messages to backend, which will proxy to OpenAI
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(event));
      } catch (error) {
        console.error('❌ Error sending event:', error);
      }
    } else {
      const state: number | string = this.ws ? this.ws.readyState : 'NO_WS';
      const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      const stateStr = typeof state === 'number' ? states[state] : state;
      console.warn(`⚠️ Cannot send event - WebSocket state: ${stateStr}, connected: ${this.isConnected}`);
    }
  }

  sendFunctionResult(callId: string, result: any): void {
    // Send function results to backend, which will proxy to OpenAI
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result)
      }
    } as RealtimeEvent);

    // Trigger response generation immediately after function result
    this.sendEvent({
      type: 'response.create'
    } as RealtimeEvent);
  }

  disconnect(): void {
    this.stopRecording();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.cleanup();
  }

  private cleanup(): void {
    this.stopRecording();
    this.audioQueue = [];
    this.isPlaying = false;
  }

  on(event: string, handler: (event: RealtimeEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (event: RealtimeEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
    const allHandlers = this.eventHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(handler => handler(data));
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}
