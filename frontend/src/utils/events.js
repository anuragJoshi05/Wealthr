import { useEffect } from 'react';

const EVENT_NAME = 'wealthr:data-changed';

// Fired after any transaction/lending/budget mutation so mounted lists and
// the dashboard can silently refetch without prop drilling or a global store.
export function emitDataChanged(scope = 'all') {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { scope } }));
}

export function useDataChangedListener(callback, scopes = ['all']) {
  useEffect(() => {
    const handler = (e) => {
      if (scopes.includes('all') || scopes.includes(e.detail?.scope)) callback();
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [callback, scopes]); // eslint-disable-line react-hooks/exhaustive-deps
}
