import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, canSeeStudentNames, canViewStudentRoster } from '../types/roles';
import type { AppShellOutletContext } from '../routes/shellContext';
import { buildProgramKpiCards, getProgramStatsScope, getProgramVisibleScope, resolveProgramStatsOptions } from '../lib/networkProgramMetrics';
import { DashboardStageDistribution } from './dashboard/DashboardStageDistribution';
import { DashboardSchoolsSnapshot } from './dashboard/DashboardSchoolsSnapshot';
import { DashboardQuickAccess } from './dashboard/DashboardQuickAccess';
import { DashboardLetterhead } from './dashboard/DashboardLetterhead';
import { DashboardAdvisories } from './dashboard/DashboardAdvisories';

export function DashboardHome() {
  const navigate = useNavigate();
  const { students, schools, userRole, teamMembers } = useOutletContext<AppShellOutletContext>();
  const { schoolId, counsellorScope } = useAuth();
  const showStudentRoster = canViewStudentRoster(userRole);
  const showStudentNames = canSeeStudentNames(userRole);

  const { visibleSchools, visibleStudents } = getProgramVisibleScope(
    students,
    schools,
    userRole,
    schoolId,
    counsellorScope,
  );
  const kpis = buildProgramKpiCards(
    visibleSchools,
    visibleStudents,
    resolveProgramStatsOptions(teamMembers),
  );
  const { statsSchools, statsStudents } = getProgramStatsScope(visibleSchools, visibleStudents);
  const atRiskCount = statsStudents.filter(s => s.riskLevel !== 'none').length;

  const scopeLabel =
    visibleSchools.length === 1
      ? visibleSchools[0].name
      : `${visibleSchools.length} participating schools — network-wide scope`;

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-slate-50">
      <header className="shrink-0 h-16 bg-white border-b border-slate-200 flex items-center px-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary shrink-0" />
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        </div>
      </header>

      <div className="p-8 w-full space-y-6 pb-16">
        {/* ── Official letterhead ──────────────────────────────── */}
        <DashboardLetterhead
          eyebrow="EMCI · Official Programme Overview"
          title="Enhanced My Career Insights (Pilot Program)"
          subtitle={scopeLabel}
        />

        {/* ── KPI strip ────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 divide-x divide-y xl:divide-y-0 divide-slate-100">
            {kpis.map((k, i) => (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="px-6 py-5 hover:bg-slate-50/60 transition-colors"
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                <p className={`text-3xl font-bold tracking-tight tabular-nums ${k.highlight ? 'text-primary' : 'text-slate-900'}`}>
                  {k.value}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Two-column dashboard body ────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left column — programme data */}
          <div className="xl:col-span-8 space-y-6 min-w-0">
            <DashboardStageDistribution students={statsStudents} />

            {statsSchools.length > 1 && (
              <DashboardSchoolsSnapshot
                schools={statsSchools}
                students={statsStudents}
                onOpenSchools={() => navigate('/schools')}
                onSelectSchool={
                  canAccessPage(userRole, 'school')
                    ? school => navigate(`/school/${school.id}`)
                    : undefined
                }
              />
            )}
          </div>

          {/* Right column — advisories & registers */}
          <div className="xl:col-span-4 space-y-6 min-w-0">
            <DashboardAdvisories
              atRiskCount={atRiskCount}
              scopeSuffix="within your scope"
              onReviewRoster={showStudentRoster ? () => navigate('/students') : undefined}
            />

            <DashboardQuickAccess
              showStudentRoster={showStudentRoster}
              showStudentNames={showStudentNames}
              onOpenSchools={() => navigate('/schools')}
              onOpenStudents={() => navigate('/students')}
            />
          </div>
        </div>

        {/* ── Official footer rule ─────────────────────────────── */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          <span>EMCI Student Management Platform</span>
          <span>Confidential — internal use only</span>
        </div>
      </div>
    </main>
  );
}
