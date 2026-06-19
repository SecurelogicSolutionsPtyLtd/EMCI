import React, { useState, useEffect } from 'react';
import { Construction, Loader2 } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';

export function MaintenanceAdminPanel() {
  const { maintenanceMode, maintenanceMessage, setMaintenanceMode } = useMaintenance();
  const [message, setMessage] = useState(maintenanceMessage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessage(maintenanceMessage);
  }, [maintenanceMessage]);

  async function handleToggle() {
    setSaving(true);
    setError(null);
    try {
      await setMaintenanceMode(!maintenanceMode, message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update maintenance mode');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMessage() {
    setSaving(true);
    setError(null);
    try {
      await setMaintenanceMode(maintenanceMode, message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save message');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Construction className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-bold text-slate-900">Maintenance mode</span>
        <span className="text-xs text-slate-500">— blocks all users except ACCE Admin</span>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-3">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            maintenanceMode ? 'bg-primary' : 'bg-slate-300'
          } disabled:opacity-60`}
          aria-pressed={maintenanceMode}
          aria-label={maintenanceMode ? 'Disable maintenance mode' : 'Enable maintenance mode'}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              maintenanceMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-semibold ${maintenanceMode ? 'text-primary' : 'text-slate-600'}`}>
          {maintenanceMode ? 'Maintenance active' : 'Platform live'}
        </span>
        {saving && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
      </div>

      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        Message shown to users
      </label>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        placeholder="Scheduled maintenance message…"
      />
      <button
        type="button"
        onClick={() => void handleSaveMessage()}
        disabled={saving}
        className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-60"
      >
        Save message
      </button>
    </div>
  );
}
