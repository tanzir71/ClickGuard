import { useSyncExternalStore } from 'react';

const query = '(max-width: 48rem), (max-height: 32rem) and (max-width: 64rem)';
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia?.(query);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
};

export function useCompactLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}
