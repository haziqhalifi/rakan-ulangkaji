import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './registerSW';

type Listener = () => void;

function fakeEnv(hasController: boolean) {
  const swListeners: Record<string, Listener[]> = {};
  const worker = {
    state: 'installing',
    listeners: [] as Listener[],
    addEventListener(_: string, l: Listener) {
      this.listeners.push(l);
    },
  };
  const regListeners: Record<string, Listener[]> = {};
  const reg = {
    waiting: null,
    installing: worker,
    addEventListener(name: string, l: Listener) {
      (regListeners[name] ??= []).push(l);
    },
  };
  const container = {
    controller: hasController ? {} : null,
    register: vi.fn().mockResolvedValue(reg),
    addEventListener: vi.fn((name: string, l: Listener) => {
      (swListeners[name] ??= []).push(l);
    }),
  };
  const install = async () => {
    await Promise.resolve();
    await Promise.resolve();
    regListeners.updatefound?.forEach((l) => l());
    worker.state = 'installed';
    worker.listeners.forEach((l) => l());
  };
  return { nav: { serviceWorker: container } as unknown as Navigator, container, install };
}

describe('registerServiceWorker', () => {
  it('announces an update when no exam is running', async () => {
    const env = fakeEnv(true);
    const onUpdateReady = vi.fn();
    registerServiceWorker({ isExamInProgress: () => false, onUpdateReady, nav: env.nav });
    await env.install();
    expect(onUpdateReady).toHaveBeenCalledTimes(1);
  });

  it('registers the worker under the app base URL', async () => {
    const env = fakeEnv(false);
    registerServiceWorker({ isExamInProgress: () => false, onUpdateReady: () => undefined, nav: env.nav });
    await env.install();
    expect(env.container.register).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}sw.js`);
  });

  it('holds the notice during an exam and shows it after flush', async () => {
    const env = fakeEnv(true);
    let inExam = true;
    const onUpdateReady = vi.fn();
    const h = registerServiceWorker({ isExamInProgress: () => inExam, onUpdateReady, nav: env.nav });
    await env.install();
    expect(onUpdateReady).not.toHaveBeenCalled();
    inExam = false;
    h.flush();
    h.flush();
    expect(onUpdateReady).toHaveBeenCalledTimes(1);
  });

  it('does not announce the first install', async () => {
    const env = fakeEnv(false);
    const onUpdateReady = vi.fn();
    registerServiceWorker({ isExamInProgress: () => false, onUpdateReady, nav: env.nav });
    await env.install();
    expect(onUpdateReady).not.toHaveBeenCalled();
  });

  it('never listens for controllerchange, so it cannot reload the page', async () => {
    const env = fakeEnv(true);
    registerServiceWorker({ isExamInProgress: () => false, onUpdateReady: () => undefined, nav: env.nav });
    await env.install();
    expect(env.container.addEventListener).not.toHaveBeenCalledWith('controllerchange', expect.anything());
  });

  it('does nothing when service workers are unsupported', () => {
    expect(() =>
      registerServiceWorker({ isExamInProgress: () => false, onUpdateReady: () => undefined, nav: {} as Navigator }),
    ).not.toThrow();
  });
});
