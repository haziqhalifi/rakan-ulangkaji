// Test doubles for the remote path. No network.
import { defaultSettings, type RemoteProviderId, type Settings } from '../profile/types';
import type { AIProvider, Reply, ReplyRequest } from './types';

export function consentedSettings(ids: RemoteProviderId[] = ['proxy']): Settings {
  const s = defaultSettings();
  for (const id of ids) {
    s.remote[id].enabled = true;
    s.remote[id].consentAt = '2026-11-20T10:00:00.000Z';
  }
  return s;
}

export function makeRequest(over: Partial<ReplyRequest> = {}): ReplyRequest {
  return {
    question: 'What is a ratio?',
    language: 'en',
    intent: 'topic_help',
    topic: 'ratio',
    ruleReply: { text: 'RULES REPLY', chips: ['quiz'], source: 'rules' },
    ...over,
  };
}

export interface FakeProvider extends AIProvider {
  calls: ReplyRequest[];
}

export function fakeProvider(id: RemoteProviderId, behave: (req: ReplyRequest, signal?: AbortSignal) => Promise<Reply>): FakeProvider {
  const calls: ReplyRequest[] = [];
  return {
    id,
    calls,
    generateReply(req, signal) {
      calls.push(req);
      return behave(req, signal);
    },
  };
}

export const okProvider = (id: RemoteProviderId = 'proxy') =>
  fakeProvider(id, () => Promise.resolve({ text: 'Remote words', source: id }));
