let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let alarmTimer: ReturnType<typeof setInterval> | null = null;
let alarmStopAt = 0;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();
  audioUnlocked = true;
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
}

function beepBurst(ctx: AudioContext, startAt: number) {
  // Urgent alternating alarm tones
  const tones = [
    { freq: 880, start: 0, duration: 0.22 },
    { freq: 1320, start: 0.24, duration: 0.22 },
    { freq: 880, start: 0.48, duration: 0.22 },
    { freq: 1320, start: 0.72, duration: 0.28 },
  ];

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = tone.freq;
    const t0 = startAt + tone.start;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + tone.duration + 0.04);
  }
}

/** Short one-shot chime (legacy helper). */
export function playAdminNotificationSound() {
  unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  beepBurst(ctx, ctx.currentTime);
}

/** Stop any looping order alarm. */
export function stopAdminOrderAlarm() {
  if (alarmTimer) {
    clearInterval(alarmTimer);
    alarmTimer = null;
  }
  alarmStopAt = 0;
}

/**
 * Loud repeating alarm for new admin orders.
 * Loops for `durationMs` (default 45s) or until stopAdminOrderAlarm().
 */
export function playAdminOrderAlarm(durationMs = 45_000) {
  unlockAudio();
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  stopAdminOrderAlarm();
  alarmStopAt = Date.now() + durationMs;

  const tick = () => {
    if (Date.now() >= alarmStopAt) {
      stopAdminOrderAlarm();
      return;
    }
    const active = getAudioContext();
    if (!active) return;
    if (active.state === "suspended") void active.resume();
    beepBurst(active, active.currentTime);
  };

  tick();
  alarmTimer = setInterval(tick, 1400);
}
