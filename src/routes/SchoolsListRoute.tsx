import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { NetworkOverview } from '../components/NetworkOverview';
import type { School } from '../data/networkData';
import type { Student } from '../data/studentsData';
import { canAccessPage } from '../types/roles';
import type { NetworkMainTab } from '../components/layout/MainSidebar';
import type { AppShellOutletContext } from './shellContext';

export function SchoolsListRoute() {
  const navigate = useNavigate();
  const { students, schools, userRole, teamMembers } = useOutletContext<AppShellOutletContext>();

  function handleSelectSchool(school: School) {
    if (!canAccessPage(userRole, 'school')) return;
    navigate(`/school/${school.id}`);
  }

  function handleSelectStudent(student: Student) {
    if (!canAccessPage(userRole, 'student')) return;
    navigate(`/student/${student.id}`);
  }

  function onNetworkTabChange(tab: NetworkMainTab) {
    if (tab === 'students') navigate('/students');
  }

  return (
    <NetworkOverview
      students={students}
      schools={schools}
      teamMembers={teamMembers}
      userRole={userRole}
      networkTab="schools"
      onNetworkTabChange={onNetworkTabChange}
      onSelectSchool={handleSelectSchool}
      onSelectStudent={handleSelectStudent}
    />
  );
}
