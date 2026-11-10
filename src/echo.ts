export type EchoSample = {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

export type EchoRecording = {
  version: 1;
  seed: string;
  duration: number;
  createdAt: number;
  samples: EchoSample[];
};

const STORAGE_KEY = 'flowstate-echo-v1';
export const ECHO_SAMPLE_INTERVAL = 0.1;
export const ECHO_MAX_SAMPLES = 900;

export function sanitizeEcho(value: unknown): EchoRecording | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<EchoRecording>;
  if (raw.version !== 1 || typeof raw.seed !== 'string' || !Array.isArray(raw.samples)) return null;
  const samples = raw.samples.slice(0, ECHO_MAX_SAMPLES).filter((sample): sample is EchoSample =>
    !!sample && Number.isFinite(sample.t) && Number.isFinite(sample.x) &&
    Number.isFinite(sample.y) && Number.isFinite(sample.z) &&
    Number.isFinite(sample.yaw) && Number.isFinite(sample.pitch)
  ).map(sample => ({
    t: Math.max(0, sample.t),
    x: Math.max(-40, Math.min(40, sample.x)),
    y: Math.max(0, Math.min(30, sample.y)),
    z: Math.max(-120, Math.min(40, sample.z)),
    yaw: sample.yaw,
    pitch: Math.max(-1.6, Math.min(1.6, sample.pitch)),
  })).sort((a, b) => a.t - b.t);
  if (samples.length < 2) return null;
  return {
    version: 1,
    seed: raw.seed,
    duration: Math.max(samples[samples.length - 1].t, Number(raw.duration) || 0),
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : 0,
    samples,
  };
}

export function loadEcho(): EchoRecording | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeEcho(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveEcho(recording: EchoRecording): EchoRecording | null {
  const safe = sanitizeEcho(recording);
  if (!safe) return null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return safe;
  } catch {
    return null;
  }
}

export function sampleEcho(recording: EchoRecording, time: number): EchoSample | null {
  const samples = recording.samples;
  if (time < samples[0].t || time > samples[samples.length - 1].t) return null;
  let low = 0, high = samples.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (samples[mid].t <= time) low = mid;
    else high = mid;
  }
  const a = samples[low], b = samples[high];
  const span = b.t - a.t;
  const mix = span > 0 ? Math.max(0, Math.min(1, (time - a.t) / span)) : 0;
  let yawDelta = b.yaw - a.yaw;
  while (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
  while (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
  return {
    t: time,
    x: a.x + (b.x - a.x) * mix,
    y: a.y + (b.y - a.y) * mix,
    z: a.z + (b.z - a.z) * mix,
    yaw: a.yaw + yawDelta * mix,
    pitch: a.pitch + (b.pitch - a.pitch) * mix,
  };
}
