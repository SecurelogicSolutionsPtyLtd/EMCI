import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessPage } from '../types/roles';
import type { Page } from '../types/roles';

export function RequirePage({ page, children }: { page: Page; children: React.ReactNode }) {
  const { userRole, counsellorScope } = useAuth();
  if (!userRole || !canAccessPage(userRole, page, counsellorScope)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
