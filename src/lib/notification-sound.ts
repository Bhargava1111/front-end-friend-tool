let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let unlockListenersAttached = false;
let onGestureUnlock: (() => void) | null = null;
let alarmTimer: ReturnType<typeof setInterval> | null = null;
let alarmStopAt = 0;
let pendingAlarmDurationMs: number | null = null;
let pendingChime = false;
let useHtmlAudioFallback = false;
let fallbackAudio: HTMLAudioElement | null = null;
const unlockSubscribers = new Set<() => void>();

type AudioContextConstructor = typeof AudioContext;

const UNLOCK_EVENTS = ["pointerdown", "click", "touchstart", "touchend", "keydown"] as const;
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAA==";

function createBeepDataUri(freq = 880, durationSec = 0.2): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.35;
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getFallbackAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!fallbackAudio) {
    fallbackAudio = new Audio();
    fallbackAudio.preload = "auto";
  }
  return fallbackAudio;
}

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext) as AudioContextConstructor | undefined;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function getRunningAudioContext(): AudioContext | null {
  if (!audioUnlocked || useHtmlAudioFallback) return null;
  const ctx = createAudioContext();
  if (!ctx || ctx.state !== "running") return null;
  return ctx;
}

function playHtmlBeepBurst() {
  const audio = getFallbackAudio();
  if (!audio) return;

  const tones = [880, 1320, 880, 1320];
  tones.forEach((freq, index) => {
    window.setTimeout(() => {
      const clip = getFallbackAudio();
      if (!clip) return;
      clip.src = createBeepDataUri(freq, index === tones.length - 1 ? 0.28 : 0.22);
      clip.volume = 0.65;
      clip.currentTime = 0;
      void clip.play().catch(() => {});
    }, index * 240);
  });
}

function flushPendingPlayback() {
  if (pendingChime) {
    pendingChime = false;
    playAdminNotificationSoundInternal();
  }
  if (pendingAlarmDurationMs != null) {
    const duration = pendingAlarmDurationMs;
    pendingAlarmDurationMs = null;
    startAlarmLoop(duration);
  }
}

async function tryUnlockHtmlAudio(): Promise<boolean> {
  const audio = getFallbackAudio();
  if (!audio) return false;

  try {
    audio.src = SILENT_WAV;
    audio.volume = 0.01;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    useHtmlAudioFallback = true;
    return true;
  } catch {
    return false;
  }
}

async function tryUnlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;

  const ctx = createAudioContext();
  if (ctx) {
    try {
      await ctx.resume();
      if (ctx.state === "running") {
        audioUnlocked = true;
        useHtmlAudioFallback = false;
        detachUnlockListeners();
        unlockSubscribers.forEach((listener) => listener());
        flushPendingPlayback();
        return true;
      }
    } catch {
      // Fall back to HTMLAudio below.
    }
  }

  const htmlUnlocked = await tryUnlockHtmlAudio();
  if (!htmlUnlocked) return false;

  audioUnlocked = true;
  detachUnlockListeners();
  unlockSubscribers.forEach((listener) => listener());
  flushPendingPlayback();
  return true;
}

function attachUnlockListeners() {
  if (unlockListenersAttached || typeof window === "undefined") return;

  unlockListenersAttached = true;
  onGestureUnlock = () => {
    void tryUnlockAudio();
  };

  const options: AddEventListenerOptions = { capture: true, passive: true };
  for (const event of UNLOCK_EVENTS) {
    window.addEventListener(event, onGestureUnlock, options);
  }
}

function detachUnlockListeners() {
  if (!unlockListenersAttached || !onGestureUnlock || typeof window === "undefined") return;

  const options: AddEventListenerOptions = { capture: true };
  for (const event of UNLOCK_EVENTS) {
    window.removeEventListener(event, onGestureUnlock, options);
  }

  unlockListenersAttached = false;
  onGestureUnlock = null;
}

if (typeof window !== "undefined") {
  attachUnlockListeners();
}

function beepBurst(ctx: AudioContext, startAt: number) {
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

function playAdminNotificationSoundInternal() {
  const ctx = getRunningAudioContext();
  if (ctx) {
    beepBurst(ctx, ctx.currentTime);
    return;
  }

  if (audioUnlocked && useHtmlAudioFallback) {
    playHtmlBeepBurst();
    return;
  }

  pendingChime = true;
}

/** Short one-shot chime (legacy helper). */
export function playAdminNotificationSound() {
  if (!audioUnlocked) {
    pendingChime = true;
    return;
  }
  playAdminNotificationSoundInternal();
}

/** Stop any looping order alarm. */
export function stopAdminOrderAlarm() {
  if (alarmTimer) {
    clearInterval(alarmTimer);
    alarmTimer = null;
  }
  alarmStopAt = 0;
  pendingAlarmDurationMs = null;
  pendingChime = false;
}

function startAlarmLoop(durationMs: number) {
  const ctx = getRunningAudioContext();
  const canUseHtml = audioUnlocked && useHtmlAudioFallback;
  if (!ctx && !canUseHtml) {
    pendingAlarmDurationMs = durationMs;
    return;
  }

  if (alarmTimer) {
    clearInterval(alarmTimer);
    alarmTimer = null;
  }

  alarmStopAt = Date.now() + durationMs;

  const tick = () => {
    if (Date.now() >= alarmStopAt) {
      stopAdminOrderAlarm();
      return;
    }

    const active = getRunningAudioContext();
    if (active) {
      beepBurst(active, active.currentTime);
      return;
    }

    if (canUseHtml) playHtmlBeepBurst();
  };

  tick();
  alarmTimer = setInterval(tick, 1400);
}

/**
 * Loud repeating alarm for new admin orders.
 * Loops for `durationMs` (default 45s) or until stopAdminOrderAlarm().
 * If the browser blocks autoplay, playback starts on the next user gesture.
 */
export function playAdminOrderAlarm(durationMs = 45_000) {
  if (!audioUnlocked) {
    pendingAlarmDurationMs = durationMs;
    return;
  }
  startAlarmLoop(durationMs);
}

/** Whether sound is blocked until the user interacts with the page. */
export function isNotificationSoundBlocked() {
  return !audioUnlocked;
}

export function subscribeNotificationSoundUnlock(listener: () => void) {
  unlockSubscribers.add(listener);
  return () => {
    unlockSubscribers.delete(listener);
  };
}
