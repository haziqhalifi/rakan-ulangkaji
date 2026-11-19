import { rulesProvider } from './rulesProvider';
import type { AIProvider, Reply, ReplyRequest } from './types';

export interface GenerateDeps {
  /** Defaults to the rules provider. Tests and later tasks can inject others. */
  provider?: AIProvider;
}

/**
 * Resolve a reply for the request. The rules provider is the default and the fallback:
 * if the chosen provider fails, the already computed rule reply is returned silently.
 */
export async function generateReply(request: ReplyRequest, deps: GenerateDeps = {}): Promise<Reply> {
  const provider = deps.provider ?? rulesProvider;
  if (provider.id === 'rules') return rulesProvider.generateReply(request);
  try {
    const reply = await provider.generateReply(request);
    if (typeof reply.text === 'string' && reply.text.trim() !== '') return reply;
  } catch {
    // Fall through to the rules reply.
  }
  return rulesProvider.generateReply(request);
}
