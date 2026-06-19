import React from 'react';
import { Construction } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';

export function MaintenanceNotice() {
  const { maintenanceMode, maintenanceMessage } = useMaintenance();
  if (!maintenanceMode) return null;

  return (
    <div className="flex items-start gap-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-3 mb-5 shadow-sm shadow-amber-900/[0.06]">
      <Construction className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-bold text-amber-900 mb-0.5">Platform under maintenance</p>
        <p className="text-xs text-amber-800 leading-relaxed">{maintenanceMessage}</p>
        <p className="text-[11px] text-amber-700/80 mt-1.5">Only SecureLogic administrators can sign in during maintenance.</p>
      </div>
    </div>
  );
}
