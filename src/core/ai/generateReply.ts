import type { RemoteProviderId, Settings } from '../profile/types';
import { REPHRASABLE_INTENTS, buildRemotePayload, MAX_PAYLOAD_BYTES, payloadBytes, requestFromPayload } from './payload';
import { rulesProvider } from './rulesProvider';
import { remoteStatus } from './status';
import type { AIProvider, Reply, ReplyRequest } from './types';

export const REMOTE_TIMEOUT_MS = 8000;

export interface GenerateDeps {
  /** Current settings. Without them, no consent is known and only rules run. */
  settings?: Settings;
  /** Remote providers by id. Absent means unavailable. */
  providers?: Partial<Record<RemoteProviderId, AIProvider>>;
  /** Defaults to `navigator.onLine`. */
  online?: () => boolean;
  timeoutMs?: number;
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** The first remote provider that is both enabled and has recorded consent. */
function chooseProvider(deps: GenerateDeps): AIProvider | null {
  const { settings, providers } = deps;
  if (!settings || !providers) return null;
  for (const id of ['userKey', 'proxy'] as const) {
    const s = settings.remote[id];
    const p = providers[id];
    if (s.consentAt && s.enabled && p) return p;
  }
  return null;
}

async function callWithTimeout(provider: AIProvider, request: ReplyRequest, ms: number): Promise<Reply> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, ms);
  });
  try {
    return await Promise.race([provider.generateReply(request, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a reply. The rule reply is always computed first and is the answer unless every
 * gate passes and the remote call returns text. Any failure returns the rule reply silently.
 */
export async function generateReply(request: ReplyRequest, deps: GenerateDeps = {}): Promise<Reply> {
  const fallback = () => rulesProvider.generateReply(request);
  // Gate order: consent and enabled, online, rephrasable intent.
  const provider = chooseProvider(deps);
  if (!provider || !deps.settings) return fallback();
  if (!(deps.online ?? isOnline)()) return fallback();
  if (!REPHRASABLE_INTENTS.includes(request.intent)) return fallback();

  const payload = buildRemotePayload(request, deps.settings.share);
  if (payloadBytes(payload) > MAX_PAYLOAD_BYTES) return fallback();

  try {
    const reply = await callWithTimeout(provider, requestFromPayload(request, payload), deps.timeoutMs ?? REMOTE_TIMEOUT_MS);
    const text = typeof reply?.text === 'string' ? reply.text.trim() : '';
    if (text === '') throw new Error('empty');
    remoteStatus.set(false);
    return { text, chips: request.ruleReply.chips, source: provider.id };
  } catch {
    remoteStatus.set(true);
    return fallback();
  }
}
