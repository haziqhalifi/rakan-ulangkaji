// A neutral, in-memory flag for the Settings status line. Never shown in chat, never saved.
let failed = false;
const listeners = new Set<() => void>();

export const remoteStatus = {
  get: (): boolean => failed,
  set(value: boolean): void {
    if (failed === value) return;
    failed = value;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
