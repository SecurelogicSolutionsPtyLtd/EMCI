import React, { useState } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  FlaskConical,
  UsersRound,
  LogOut,
  Loader2,
  LayoutDashboard,
  BarChart3,
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
  deAnalyticsActive: boolean;
  onGoToDashboard: () => void;
  onGoToSchools: () => void;
  onGoToStudents: () => void;
  onGoToCounsellors: () => void;
  onGoToDeAnalytics: () => void;
  onGoToDevLab: () => void;
  onGoToTeam: () => void;
  userRole: AppRole;
}

export function MainSidebar({
  dashboardActive,
  schoolsNavActive,
  studentsNavActive,
  counsellorsNavActive,
  deAnalyticsActive,
  onGoToDashboard,
  onGoToSchools,
  onGoToStudents,
  onGoToCounsellors,
  onGoToDeAnalytics,
  onGoToDevLab,
  onGoToTeam,
  userRole,
}: MainSidebarProps) {
  const { authUser, signOutUser } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [hovered, setHovered] = useState(false);

  const showStudentRoster = canViewStudentRoster(userRole);
  const showCounsellors    = canAccessPage(userRole, 'counsellors');
  const showDeAnalytics    = canAccessPage(userRole, 'de_analytics');
  const showDevLab         = canAccessPage(userRole, 'devlab');
  const showTeam           = isAdminRole(userRole);

  const SECONDARY_NAV = [
    { label: 'Schools',      icon: Building2,  show: true,                onClick: onGoToSchools,     isActive: schoolsNavActive },
    { label: 'Students',     icon: Users,      show: showStudentRoster,   onClick: onGoToStudents,    isActive: studentsNavActive },
    { label: 'Counsellors',  icon: UserCheck,  show: showCounsellors,     onClick: onGoToCounsellors, isActive: counsellorsNavActive },
    { label: 'DE Analytics', icon: BarChart3,  show: showDeAnalytics,     onClick: onGoToDeAnalytics, isActive: deAnalyticsActive },
  ].filter(item => item.show);

  const labelClass = `whitespace-nowrap overflow-hidden transition-opacity duration-200 ${
    hovered ? 'opacity-100 delay-100' : 'opacity-0'
  }`;

  return (
    <aside
      className={`shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out ${
        hovered ? 'w-64' : 'w-14'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex items-center p-4 ${hovered ? 'gap-3' : 'justify-center'}`}>
        <img
          src="/favicon.png"
          alt=""
          className="w-9 h-9 shrink-0 object-contain"
          draggable={false}
        />
        <div className={labelClass}>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">EMCI</h1>
          <p className="text-xs text-slate-500 leading-tight">Student Management Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-1 mt-2">
        <button
          type="button"
          onClick={onGoToDashboard}
          title={hovered ? undefined : 'Dashboard'}
          className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
            hovered ? 'gap-3' : 'justify-center'
          } ${dashboardActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span className={labelClass}>Dashboard</span>
        </button>

        {SECONDARY_NAV.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            title={hovered ? undefined : item.label}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
              hovered ? 'gap-3' : 'justify-center'
            } ${item.isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className={labelClass}>{item.label}</span>
          </button>
        ))}

        {showDevLab && (
          <button
            type="button"
            onClick={onGoToDevLab}
            title={hovered ? undefined : 'Dataverse Lab'}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer ${
              hovered ? 'gap-3' : 'justify-center'
            }`}
          >
            <FlaskConical className="w-5 h-5 shrink-0" />
            <span className={labelClass}>Dataverse Lab</span>
          </button>
        )}

        {showTeam && (
          <button
            type="button"
            onClick={onGoToTeam}
            title={hovered ? undefined : 'Team Management'}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer ${
              hovered ? 'gap-3' : 'justify-center'
            }`}
          >
            <UsersRound className="w-5 h-5 shrink-0" />
            <span className={labelClass}>Team Management</span>
          </button>
        )}
      </nav>

      <div className="p-3 border-t border-slate-200 space-y-2">
        <div className={`flex items-center px-1 ${hovered ? 'gap-3' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {(authUser?.firstName ?? authUser?.email ?? 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className={`min-w-0 flex-1 ${labelClass}`}>
            <p className="text-sm font-semibold text-slate-800 truncate">{authUser?.displayName ?? authUser?.email ?? '—'}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[userRole]}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={signingOut}
          title={hovered ? undefined : 'Sign out'}
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOutUser();
            } finally {
              setSigningOut(false);
            }
          }}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer ${
            hovered ? 'gap-2 justify-center' : 'justify-center'
          }`}
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          <span className={labelClass}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
