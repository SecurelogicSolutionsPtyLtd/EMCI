import { useCallback, useState } from 'react';

export type SidebarPinMode = 'dynamic' | 'open' | 'closed';

const STORAGE_KEY = 'emci:main-sidebar-pin-mode';

const CYCLE: Record<SidebarPinMode, SidebarPinMode> = {
  dynamic: 'open',
  open: 'closed',
  closed: 'dynamic',
};

const PIN_MODE_LABELS: Record<SidebarPinMode, string> = {
  dynamic: 'Expand on hover — click to pin open',
  open: 'Pinned open — click to pin closed',
  closed: 'Pinned closed — click for hover expand',
};

function readPinMode(): SidebarPinMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dynamic' || stored === 'open' || stored === 'closed') {
      return stored;
    }
  } catch {
    // localStorage unavailable — default to dynamic
  }
  return 'dynamic';
}

export function useMainSidebarPin() {
  const [pinMode, setPinMode] = useState<SidebarPinMode>(readPinMode);

  const cyclePinMode = useCallback(() => {
    setPinMode(prev => {
      const next = CYCLE[prev];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // best-effort persistence
      }
      return next;
    });
  }, []);

  return { pinMode, cyclePinMode, pinModeLabel: PIN_MODE_LABELS[pinMode] };
}
