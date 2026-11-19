import { useEffect } from 'react';
import { useStatus } from './StatusContext';
import { UPDATE_READY_EVENT } from './registerSW';

/** Turns the service worker update signal into a dismissible status message. */
export function UpdateNotice() {
  const { report } = useStatus();
  useEffect(() => {
    const onReady = () => report('sw-update', 'status.updateReady');
    window.addEventListener(UPDATE_READY_EVENT, onReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onReady);
  }, [report]);
  return null;
}
