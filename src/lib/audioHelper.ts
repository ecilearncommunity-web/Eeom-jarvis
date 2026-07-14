/**
 * Audio conversion & helper utilities for Gemini Live API & Speech Transcription
 */

// Convert float audio buffer to 16-bit PCM (little endian)
export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Simple raw 24kHz PCM Player for Live API chunks
export class PCMPlayer {
  private audioCtx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
      this.nextStartTime = this.audioCtx.currentTime;
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Play a base64 encoded raw 16-bit PCM little-endian audio chunk
  playChunk(base64Data: string) {
    this.init();
    if (!this.audioCtx) return;

    // Convert base64 to array buffer
    const binary = atob(base64Data);
    const len = binary.length;
    const buffer = new ArrayBuffer(len);
    const view = new DataView(buffer);
    for (let i = 0; i < len; i++) {
      view.setUint8(i, binary.charCodeAt(i));
    }

    // Convert 16-bit Int16 PCM to Float32
    const numSamples = len / 2;
    const floatData = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const pcm16 = view.getInt16(i * 2, true);
      floatData[i] = pcm16 / 32768.0;
    }

    // Create audio buffer and schedule playback
    const audioBuffer = this.audioCtx.createBuffer(1, numSamples, this.sampleRate);
    audioBuffer.getChannelData(0).set(floatData);

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);

    // Track state to avoid overlaps/gaps
    const currentTime = this.audioCtx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  stop() {
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.nextStartTime = 0;
  }
}
