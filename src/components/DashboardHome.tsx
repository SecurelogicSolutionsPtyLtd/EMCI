import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Building2, LayoutDashboard, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canSeeStudentNames, canViewStudentRoster } from '../types/roles';
import type { AppShellOutletContext } from '../routes/shellContext';
import { buildProgramKpiCards, getProgramVisibleScope } from '../lib/networkProgramMetrics';

export function DashboardHome() {
  const navigate = useNavigate();
  const { students, schools, userRole } = useOutletContext<AppShellOutletContext>();
  const { schoolId } = useAuth();
  const showStudentRoster = canViewStudentRoster(userRole);
  const showStudentNames = canSeeStudentNames(userRole);

  const { visibleSchools, visibleStudents } = getProgramVisibleScope(
    students,
    schools,
    userRole,
    schoolId,
  );
  const kpis = buildProgramKpiCards(visibleSchools, visibleStudents);

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50">
      <header className="shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary shrink-0" />
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        <p className="text-slate-600 text-sm leading-relaxed">
          Programme overview for your scope. Open the schools directory or the student roster for full tables and actions.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k, i) => (
            <div
              key={i}
              className={`rounded-xl border px-4 py-3 shadow-sm ${
                k.highlight ? 'bg-primary/5 border-primary/20' : 'bg-white border-slate-200'
              }`}
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-lg font-bold ${k.highlight ? 'text-primary' : 'text-slate-800'}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate('/schools')}
            className="flex items-start gap-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left"
          >
            <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Schools</h2>
              <p className="text-sm text-slate-500 mt-1">
                Browse all schools, completion KPIs, and open a school cohort.
              </p>
            </div>
          </button>

          {showStudentRoster ? (
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="flex items-start gap-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-primary/40 hover:shadow-md transition-all text-left"
            >
              <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Students</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {showStudentNames
                    ? 'Network student roster, filters, and journey access (where permitted).'
                    : 'Anonymized student roster and read-only redacted journey.'}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-start gap-4 p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
              <div className="rounded-xl bg-slate-100 p-3 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-500">Students</h2>
                <p className="text-sm mt-1">Not available for your role.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
