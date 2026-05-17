import React from 'react';
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { SchoolDashboard } from '../components/SchoolDashboard';
import { useAuth } from '../context/AuthContext';
import { canAccessPage, getRoleGroup } from '../types/roles';
import type { AppShellOutletContext } from './shellContext';
import { isPlausibleRecordIdParam } from '../lib/recordIdParam';

export function SchoolRoute() {
  const { schoolId: schoolIdParam } = useParams();
  const navigate = useNavigate();
  const { students, schools, userRole } = useOutletContext<AppShellOutletContext>();
  const { schoolId: authSchoolId } = useAuth();

  if (!isPlausibleRecordIdParam(schoolIdParam)) {
    return <Navigate to="/schools" replace />;
  }

  if (getRoleGroup(userRole) === 'school' && authSchoolId && schoolIdParam !== authSchoolId) {
    return <Navigate to={`/school/${authSchoolId}`} replace />;
  }

  if (!canAccessPage(userRole, 'school')) {
    return <Navigate to="/dashboard" replace />;
  }

  const school = schools.find(s => s.id === schoolIdParam) ?? null;

  if (schools.length > 0 && !school) {
    return <Navigate to="/schools" replace />;
  }

  return (
    <SchoolDashboard
      students={students}
      school={school}
      onSelectStudent={canAccessPage(userRole, 'student')
        ? st => navigate(`/student/${st.id}`)
        : undefined}
    />
  );
}
