/**
 * Synthesis of simple audio cues using Web Audio API.
 * High-fidelity, lightweight sound design.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSound(type: string) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'ding': {
        // High-pitched crystal alert sound
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05); // A6
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3); // E6

        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case 'swoosh': {
        // Whoosh sound using noise with swept filter
        const bufferSize = ctx.sampleRate * 0.4; // 0.4 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Fill buffer with white noise
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.18);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.4);
        break;
      }

      case 'pop': {
        // Fun bubble-pop sound
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.warn("Could not play sound cue:", err);
  }
}
