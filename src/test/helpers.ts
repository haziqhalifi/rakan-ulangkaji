import { createLocalBackend } from '../core/storage/localStore';
import type { StorageBackend } from '../core/storage/types';

/** Minimal in-memory Storage, so tests can exercise the localStorage backend with no browser. */
export class FakeLocalStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

/** A durable-looking backend (not "memory"), so the store does not show the memory-only banner. */
export function fakeDurableBackend(): StorageBackend {
  return createLocalBackend(new FakeLocalStorage());
}
