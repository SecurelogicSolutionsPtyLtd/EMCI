import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  FlaskConical,
  UsersRound,
  LogOut,
  Loader2,
  LayoutDashboard,
  PanelLeft,
  PanelLeftClose,
  Pin,
} from 'lucide-react';
import type { AppRole } from '../../types/roles';
import { canAccessPage, canViewStudentRoster, isAdminRole, ROLE_LABELS } from '../../types/roles';
import { useAuth } from '../../context/AuthContext';
import { useMainSidebarPin, type SidebarPinMode } from '../../hooks/useMainSidebarPin';
import { EMCI_PROGRAM_NAME } from '../../lib/programNaming';

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

function SidebarPinModeIcon({ mode }: { mode: SidebarPinMode }) {
  switch (mode) {
    case 'dynamic':
      return <PanelLeft className="w-5 h-5 shrink-0" />;
    case 'open':
      return <Pin className="w-5 h-5 shrink-0" />;
    case 'closed':
      return <PanelLeftClose className="w-5 h-5 shrink-0" />;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
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
  const { authUser, signOutUser, counsellorScope } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { pinMode, cyclePinMode, pinModeLabel } = useMainSidebarPin();

  const expanded = pinMode === 'open' || (pinMode === 'dynamic' && hovered);

  useEffect(() => {
    if (pinMode !== 'dynamic') {
      setHovered(false);
    }
  }, [pinMode]);

  const showStudentRoster = canViewStudentRoster(userRole);
  const showCounsellors    = canAccessPage(userRole, 'counsellors', counsellorScope);
  const showDevLab         = canAccessPage(userRole, 'devlab', counsellorScope);
  const showTeam           = isAdminRole(userRole);

  const SECONDARY_NAV = [
    { label: 'Schools / Campuses', icon: Building2, show: true, onClick: onGoToSchools, isActive: schoolsNavActive },
    { label: 'Students',     icon: Users,      show: showStudentRoster,   onClick: onGoToStudents,    isActive: studentsNavActive },
    { label: 'Counsellors',  icon: UserCheck,  show: showCounsellors,     onClick: onGoToCounsellors, isActive: counsellorsNavActive },
  ].filter(item => item.show);

  const labelClass = `whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200 ${
    expanded ? 'opacity-100 delay-100 max-w-none' : 'opacity-0 w-0 max-w-0'
  }`;

  return (
    <aside
      className={`shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out ${
        expanded ? 'w-64' : 'w-14'
      }`}
      onMouseEnter={() => pinMode === 'dynamic' && setHovered(true)}
      onMouseLeave={() => pinMode === 'dynamic' && setHovered(false)}
    >
      <div className={expanded ? 'p-4 space-y-3' : 'pt-4 pb-1'}>
        <div className={`flex items-center ${expanded ? 'gap-3' : 'justify-center px-2'}`}>
          <img
            src="/favicon.png"
            alt=""
            className="w-9 h-9 shrink-0 object-contain"
            draggable={false}
          />
          <div className={`min-w-0 flex-1 ${labelClass}`}>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">EMCI</h1>
            <p className="text-xs text-slate-500 leading-tight">{EMCI_PROGRAM_NAME}</p>
          </div>
        </div>
        <div className={expanded ? undefined : 'px-2'}>
          <button
            type="button"
            onClick={cyclePinMode}
            title={pinModeLabel}
            aria-label={pinModeLabel}
            className={`w-full flex items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer ${
              expanded ? 'gap-2 px-3 py-2 text-xs font-medium' : 'justify-center px-3 py-3'
            }`}
          >
            <SidebarPinModeIcon mode={pinMode} />
            <span className={labelClass}>
              {pinMode === 'dynamic' ? 'Hover to expand' : pinMode === 'open' ? 'Pinned open' : 'Pinned closed'}
            </span>
          </button>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-1 mt-2">
        <button
          type="button"
          onClick={onGoToDashboard}
          title={expanded ? undefined : 'Dashboard'}
          className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
            expanded ? 'gap-3' : 'justify-center'
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
            title={expanded ? undefined : item.label}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
              expanded ? 'gap-3' : 'justify-center'
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
            title={expanded ? undefined : 'Dataverse Lab'}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer ${
              expanded ? 'gap-3' : 'justify-center'
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
            title={expanded ? undefined : 'Team Management'}
            className={`w-full flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors text-left text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer ${
              expanded ? 'gap-3' : 'justify-center'
            }`}
          >
            <UsersRound className="w-5 h-5 shrink-0" />
            <span className={labelClass}>Team Management</span>
          </button>
        )}
      </nav>

      <div className={`border-t border-slate-200 space-y-2 ${expanded ? 'p-3' : 'px-2 py-3'}`}>
        <div className={`flex items-center px-1 ${expanded ? 'gap-3' : 'justify-center'}`}>
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
          title={expanded ? undefined : 'Sign out'}
          onClick={async () => {
            setSigningOut(true);
            try {
              await signOutUser();
            } finally {
              setSigningOut(false);
            }
          }}
          className={`w-full flex items-center py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer ${
            expanded ? 'gap-2 px-3' : 'justify-center px-0'
          }`}
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          <span className={labelClass}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
