import type { AIProvider, Reply, ReplyRequest } from './types';

/** Deterministic and offline. The reply was already computed from the rule templates. */
export const rulesProvider: AIProvider = {
  id: 'rules',
  generateReply(request: ReplyRequest): Promise<Reply> {
    return Promise.resolve({ ...request.ruleReply, source: 'rules' });
  },
};
