import { useI18n, type StringKey } from '../core/i18n';
import { useProfileState, type StorageStatus } from '../core/profile';
import { useStatus } from './StatusContext';

const STORAGE_MESSAGES: Record<StorageStatus, StringKey | null> = {
  ok: null,
  write_failed: 'status.writeFailed',
  memory_only: 'status.memoryOnly',
  unreadable: 'status.unreadable',
};

export function StatusBanner() {
  const { t } = useI18n();
  const { storageStatus } = useProfileState();
  const { messages, dismiss } = useStatus();
  const storageKey = STORAGE_MESSAGES[storageStatus];

  if (!storageKey && messages.length === 0) return null;

  return (
    <div className="status-banner" role="status">
      {storageKey && <p>{t(storageKey)}</p>}
      {messages.map((m) => (
        <p key={m.id}>
          {t(m.key)}
          <button type="button" className="tap" onClick={() => dismiss(m.id)}>
            {t('status.dismiss')}
          </button>
        </p>
      ))}
    </div>
  );
}
