import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchPlatformSettings,
  updateMaintenanceMode,
  supabase,
  type PlatformSettings,
} from '../services/supabase';
import { EMCI_PLATFORM } from '../lib/programNaming';

const ENV_MAINTENANCE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

interface MaintenanceContextValue {
  /** True when maintenance is active (DB flag or VITE_MAINTENANCE_MODE). */
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setMaintenanceMode: (enabled: boolean, message?: string | null) => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

const DEFAULT_MESSAGE =
  `The ${EMCI_PLATFORM} is temporarily unavailable while we perform scheduled maintenance. Please check back soon.`;

export function useMaintenance(): MaintenanceContextValue {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) throw new Error('useMaintenance must be used inside <MaintenanceProvider>');
  return ctx;
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const row = await fetchPlatformSettings();
      setSettings(row);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel('emci_platform_settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emci_platform_settings' },
        payload => {
          const row = payload.new as PlatformSettings;
          setSettings(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const setMaintenanceMode = useCallback(async (enabled: boolean, message?: string | null) => {
    const row = await updateMaintenanceMode(enabled, message);
    setSettings(row);
  }, []);

  const maintenanceMode = ENV_MAINTENANCE || (settings?.maintenance_mode ?? false);
  const maintenanceMessage = settings?.maintenance_message?.trim() || DEFAULT_MESSAGE;

  return (
    <MaintenanceContext.Provider value={{
      maintenanceMode,
      maintenanceMessage,
      loading,
      refresh,
      setMaintenanceMode,
    }}>
      {children}
    </MaintenanceContext.Provider>
  );
}
