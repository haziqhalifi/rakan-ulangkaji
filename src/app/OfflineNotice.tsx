import { useEffect, useState } from 'react';
import { useI18n } from '../core/i18n';

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** Polite notice shown while the device is offline. Rules-based features keep working. */
export function OfflineNotice() {
  const { t } = useI18n();
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-notice" role="status">
      <span aria-hidden="true">⚠ </span>
      {t('offline.notice')}
    </div>
  );
}
