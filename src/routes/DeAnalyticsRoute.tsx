import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProgramVisibleScope } from '../lib/networkProgramMetrics';
import { DeAnalyticsDashboard } from '../components/de/DeAnalyticsDashboard';
import type { AppShellOutletContext } from './shellContext';

export function DeAnalyticsRoute() {
  const { students, schools, userRole, studentEventsMap } = useOutletContext<AppShellOutletContext>();
  const { schoolId, counsellorScope } = useAuth();

  const { visibleSchools, visibleStudents } = getProgramVisibleScope(
    students,
    schools,
    userRole,
    schoolId,
    counsellorScope,
  );

  return (
    <DeAnalyticsDashboard
      students={visibleStudents}
      schools={visibleSchools}
      studentEventsMap={studentEventsMap}
    />
  );
}
