import React, { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { motion } from 'motion/react';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, canSeeStudentNames, canViewStudentRoster } from '../types/roles';
import type { AppShellOutletContext } from '../routes/shellContext';
import { buildProgramKpiCards, getProgramStatsScope, getProgramVisibleScope, resolveProgramStatsOptions } from '../lib/networkProgramMetrics';
import { isFlaggedForFollowUp } from '../lib/deAnalyticsMetrics';
import { countPriorityAlerts } from '../lib/priorityAlerts';
import { useStudentRatingScores } from '../hooks/useStudentRatingScores';
import { DashboardStageDistribution } from './dashboard/DashboardStageDistribution';
import { DashboardSchoolsSnapshot } from './dashboard/DashboardSchoolsSnapshot';
import { DashboardQuickAccess } from './dashboard/DashboardQuickAccess';
import { DashboardLetterhead } from './dashboard/DashboardLetterhead';
import { DashboardAdvisories } from './dashboard/DashboardAdvisories';
import { EMCI_BRAND, EMCI_PROGRAM_NAME } from '../lib/programNaming';

export function DashboardHome() {
  const navigate = useNavigate();
  const { students, schools, userRole, teamMembers, studentEventsMap, ownerMap, inactiveCounsellorOverrides } = useOutletContext<AppShellOutletContext>();
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
    resolveProgramStatsOptions(teamMembers, ownerMap, inactiveCounsellorOverrides),
  );
  const { statsSchools, statsStudents } = getProgramStatsScope(visibleSchools, visibleStudents);
  const atRiskCount = statsStudents.filter(isFlaggedForFollowUp).length;
  const statsStudentIds = useMemo(() => statsStudents.map(s => s.id), [statsStudents]);
  const { ratingFlags } = useStudentRatingScores(statsStudentIds);
  const priorityAlertCount = countPriorityAlerts(statsStudents, studentEventsMap, ratingFlags);

  const scopeLabel =
    visibleSchools.length === 1
      ? visibleSchools[0].name
      : 'Network-wide scope';

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
          title={EMCI_PROGRAM_NAME}
          subtitle={scopeLabel}
        />

        {/* ── KPI strip ────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 divide-x divide-y xl:divide-y-0 divide-slate-100">
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
              priorityAlertCount={priorityAlertCount}
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
          <span>{EMCI_BRAND}</span>
          <span>Confidential — internal use only</span>
        </div>
      </div>
    </main>
  );
}
