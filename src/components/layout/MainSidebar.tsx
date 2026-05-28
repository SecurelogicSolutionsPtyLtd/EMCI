import React, { useState } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  Network,
  FlaskConical,
  UsersRound,
  LogOut,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';
import type { AppRole } from '../../types/roles';
import { canAccessPage, canViewStudentRoster, isAdminRole, ROLE_LABELS } from '../../types/roles';
import { useAuth } from '../../context/AuthContext';

export type NetworkMainTab = 'schools' | 'students';

interface MainSidebarProps {
  dashboardActive: boolean;
  schoolsNavActive: boolean;
  studentsNavActive: boolean;
  counsellorsNavActive: boolean;
  onGoToDashboard: () => void;
  onGoToSchools: () => void;
  onGoToStudents: () => void;
  onGoToCounsellors: () => void;
  onGoToDevLab: () => void;
  onGoToTeam: () => void;
  userRole: AppRole;
}

export function MainSidebar({
  dashboardActive,
  schoolsNavActive,
  studentsNavActive,
  counsellorsNavActive,
  onGoToDashboard,
  onGoToSchools,
  onGoToStudents,
  onGoToCounsellors,
  onGoToDevLab,
  onGoToTeam,
  userRole,
}: MainSidebarProps) {
  const { authUser, signOutUser } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const showStudentRoster = canViewStudentRoster(userRole);
  const showCounsellors    = canAccessPage(userRole, 'counsellors');
  const showDevLab         = canAccessPage(userRole, 'devlab');
  const showTeam           = isAdminRole(userRole);

  const SECONDARY_NAV = [
    { label: 'Schools',     icon: Building2,  show: true,                onClick: onGoToSchools,   isActive: schoolsNavActive },
    { label: 'Students',    icon: Users,      show: showStudentRoster,   onClick: onGoToStudents, isActive: studentsNavActive },
    { label: 'Counsellors', icon: UserCheck,  show: showCounsellors,     onClick: onGoToCounsellors, isActive: counsellorsNavActive },
  ].filter(item => item.show);

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary rounded-lg p-2 text-white shrink-0">
          <Network className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">EMCI</h1>
          <p className="text-xs text-slate-500 leading-tight">Student Management Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2">
        <button
          type="button"
          onClick={onGoToDashboard}
          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer
            ${dashboardActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          Dashboard
        </button>

        {SECONDARY_NAV.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer
              ${item.isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.label}
          </button>
        ))}

        {showDevLab && (
          <button
            type="button"
            onClick={onGoToDevLab}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <FlaskConical className="w-5 h-5 shrink-0" />
            Dataverse Lab
          </button>
        )}

        {showTeam && (
          <button
            type="button"
            onClick={onGoToTeam}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <UsersRound className="w-5 h-5 shrink-0" />
            Team Management
          </button>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3 px-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {(authUser?.firstName ?? authUser?.email ?? 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{authUser?.displayName ?? authUser?.email ?? '—'}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[userRole]}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={signingOut}
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOutUser();
            } finally {
              setSigningOut(false);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sign out
        </button>
      </div>
    </aside>
  );
}
