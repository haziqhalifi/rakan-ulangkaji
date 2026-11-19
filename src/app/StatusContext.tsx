import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StringKey } from '../core/i18n';

export interface StatusApi {
  messages: ReadonlyArray<{ id: string; key: StringKey }>;
  /** Show a kind message. Reporting the same id again replaces it. */
  report(id: string, key: StringKey): void;
  dismiss(id: string): void;
}

const StatusContext = createContext<StatusApi | null>(null);

export function StatusProvider(props: { children: ReactNode }) {
  const [messages, setMessages] = useState<Array<{ id: string; key: StringKey }>>([]);
  const report = useCallback((id: string, key: StringKey) => {
    setMessages((prev) => [...prev.filter((m) => m.id !== id), { id, key }]);
  }, []);
  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);
  const value = useMemo(() => ({ messages, report, dismiss }), [messages, report, dismiss]);
  return <StatusContext.Provider value={value}>{props.children}</StatusContext.Provider>;
}

/** Features report problems here instead of importing the banner. */
export function useStatus(): StatusApi {
  const api = useContext(StatusContext);
  if (!api) throw new Error('useStatus must be used inside StatusProvider');
  return api;
}
