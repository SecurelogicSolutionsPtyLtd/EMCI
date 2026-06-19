import React from 'react';
import { motion } from 'motion/react';
import { Construction, LogOut } from 'lucide-react';
import { AuthShell, SectionHeader, BTN_PRIMARY } from './auth/AuthShell';
import { useAuth } from '../context/AuthContext';
import { useMaintenance } from '../context/MaintenanceContext';

export function MaintenanceScreen() {
  const { stage, signOutUser } = useAuth();
  const { maintenanceMessage } = useMaintenance();
  const isSignedIn = stage === 'ready' || stage === 'no_role';

  return (
    <AuthShell>
      <SectionHeader
        icon={<Construction className="w-5 h-5 text-primary" />}
        title="Under maintenance"
        subtitle={maintenanceMessage}
      />

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="text-xs text-slate-500 leading-relaxed mb-6"
      >
        Only SecureLogic administrators can access the platform during maintenance. If you believe you
        should have access, contact your programme administrator.
      </motion.p>

      {isSignedIn && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          onClick={() => void signOutUser()}
          className={BTN_PRIMARY}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </motion.button>
      )}
    </AuthShell>
  );
}
