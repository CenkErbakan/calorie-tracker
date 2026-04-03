/**
 * Varsayılan kapalı — UI’da log paneli görünmez, appendOnDeviceLog no-op.
 * Test / TestFlight için: .env veya EAS env ile EXPO_PUBLIC_SHOW_DEVICE_LOGS=1
 */

const MAX_LINES = 120;

let lines: string[] = [];
const listeners = new Set<(next: string[]) => void>();

export function isOnDeviceLogEnabled(): boolean {
  return process.env.EXPO_PUBLIC_SHOW_DEVICE_LOGS === '1';
}

function formatArg(v: unknown): string {
  if (v === undefined) return '';
  if (v === null) return 'null';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 600 ? `${s.slice(0, 600)}…` : s;
  } catch {
    return String(v);
  }
}

export function appendOnDeviceLog(tag: string, ...parts: unknown[]) {
  if (!isOnDeviceLogEnabled()) return;
  const ts = new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const body = parts.map(formatArg).filter((x) => x.length > 0).join(' ');
  const line = `[${ts}] ${tag} ${body}`;
  lines = [...lines.slice(-(MAX_LINES - 1)), line];
  listeners.forEach((cb) => cb([...lines]));
}

export function clearOnDeviceLog() {
  lines = [];
  listeners.forEach((cb) => cb([]));
}

export function subscribeOnDeviceLog(cb: (next: string[]) => void) {
  listeners.add(cb);
  cb([...lines]);
  return () => listeners.delete(cb);
}
