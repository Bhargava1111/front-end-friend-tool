let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
let unlockListenersAttached = false;
let onGestureUnlock: (() => void) | null = null;
let alarmTimer: ReturnType<typeof setInterval> | null = null;
let alarmStopAt = 0;
let pendingAlarmDurationMs: number | null = null;
let pendingChime = false;
const unlockSubscribers = new Set<() => void>();

type AudioContextConstructor = typeof AudioContext;

const UNLOCK_EVENTS = ["pointerdown", "click", "touchstart", "touchend", "keydown"] as const;

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
  if (!audioUnlocked) return null;
  const ctx = createAudioContext();
  if (!ctx || ctx.state !== "running") return null;
  return ctx;
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

async function tryUnlockAudio(): Promise<boolean> {
  if (audioUnlocked) return true;

  const ctx = createAudioContext();
  if (!ctx) return false;

  try {
    await ctx.resume();
  } catch {
    return false;
  }

  if (ctx.state !== "running") return false;

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

function playAdminNotificationSoundInternal() {
  const ctx = getRunningAudioContext();
  if (!ctx) {
    pendingChime = true;
    return;
  }
  beepBurst(ctx, ctx.currentTime);
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
  if (!ctx) {
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
    if (!active) return;
    beepBurst(active, active.currentTime);
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
