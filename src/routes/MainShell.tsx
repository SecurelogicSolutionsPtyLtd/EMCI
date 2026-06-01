import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { MainSidebar } from '../components/layout/MainSidebar';
import type { AppShellOutletContext } from './shellContext';

interface MainShellProps {
  context: AppShellOutletContext;
}

export function MainShell({ context }: MainShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, dataError, token, loadData } = context;

  const path = location.pathname;
  const dashboardActive = path === '/dashboard';
  const schoolsNavActive = path === '/schools' || path.startsWith('/school/');
  const studentsNavActive = path === '/students' || path.startsWith('/student/');
  const counsellorsNavActive = path === '/counsellors';
  const deAnalyticsActive = path.startsWith('/de');

  const ErrorBanner = dataError ? (
    <div className="shrink-0 bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-3">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
      <p className="text-sm text-red-700 flex-1">{dataError}</p>
      <button
        type="button"
        onClick={() => token && loadData(token)}
        className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <MainSidebar
          dashboardActive={dashboardActive}
          schoolsNavActive={schoolsNavActive}
          studentsNavActive={studentsNavActive}
          counsellorsNavActive={counsellorsNavActive}
          deAnalyticsActive={deAnalyticsActive}
          onGoToDashboard={() => navigate('/dashboard')}
          onGoToSchools={() => navigate('/schools')}
          onGoToStudents={() => navigate('/students')}
          onGoToCounsellors={() => navigate('/counsellors')}
          onGoToDeAnalytics={() => navigate('/de/analytics')}
          onGoToDevLab={() => navigate('/devlab')}
          onGoToTeam={() => navigate('/team')}
          userRole={userRole}
        />
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {ErrorBanner}
          <Outlet context={context} />
        </div>
      </div>
    </div>
  );
}
