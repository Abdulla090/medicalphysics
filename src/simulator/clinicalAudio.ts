/** Locally synthesized interaction cues. Muted by default and never streamed. */
type Cue = 'confirm' | 'door' | 'warning' | 'exposure';
let context: AudioContext | null = null;

export function playClinicalCue(cue: Cue, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return;
  try {
    context ??= new AudioContextConstructor();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const notes: Record<Cue, Array<[number, number, number]>> = {
      confirm: [[640, 0, .08], [790, .09, .09]],
      door: [[112, 0, .12]],
      warning: [[480, 0, .12], [360, .15, .18]],
      exposure: [[850, 0, .15], [850, .28, .2]],
    };
    for (const [frequency, delay, length] of notes[cue]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = cue === 'door' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(cue === 'door' ? .018 : .012, now + delay + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + delay + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + delay);
      oscillator.stop(now + delay + length + .015);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
  } catch { /* Audio is optional; simulations remain fully functional if unavailable. */ }
}
