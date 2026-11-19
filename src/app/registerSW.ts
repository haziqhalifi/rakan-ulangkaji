// Registers the service worker. Safety rules (requirements 15.8 and 15.9):
// never call skipWaiting or clients.claim, never reload on controllerchange,
// and never tell the student about an update while an exam is in progress.

export const UPDATE_READY_EVENT = 'rakan:update-ready';

export interface RegisterOptions {
  isExamInProgress: () => boolean;
  onUpdateReady: () => void;
  /** Injected for tests. */
  nav?: Pick<Navigator, 'serviceWorker'>;
  swUrl?: string;
}

export interface SWHandle {
  /** Call when the exam state changes. Shows a held back notice once the exam is over. */
  flush(): void;
}

export function registerServiceWorker(opts: RegisterOptions): SWHandle {
  const nav = opts.nav ?? (typeof navigator !== 'undefined' ? navigator : undefined);
  let pending = false;

  const flush = () => {
    if (pending && !opts.isExamInProgress()) {
      pending = false;
      opts.onUpdateReady();
    }
  };
  const handle: SWHandle = { flush };
  if (!nav || !('serviceWorker' in nav) || !nav.serviceWorker) return handle;
  const container = nav.serviceWorker;

  const announce = () => {
    pending = true;
    flush();
  };

  const watch = (reg: ServiceWorkerRegistration) => {
    const check = (worker: ServiceWorker | null) => {
      if (!worker) return;
      const done = () => {
        // A controller means this is an update, not the first install.
        if (worker.state === 'installed' && container.controller) announce();
      };
      worker.addEventListener('statechange', done);
      done();
    };
    check(reg.waiting);
    reg.addEventListener('updatefound', () => check(reg.installing));
  };

  void container
    .register(opts.swUrl ?? `${import.meta.env.BASE_URL}sw.js`)
    .then(watch)
    .catch(() => undefined); // The app works without a worker.
  return handle;
}
