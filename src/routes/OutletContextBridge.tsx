import React from 'react';
import { Outlet } from 'react-router-dom';
import type { AppShellOutletContext } from './shellContext';

/** Passes shared app data to all descendant routes (MainShell, student journey, PDF, etc.). */
export function OutletContextBridge({ context }: { context: AppShellOutletContext }) {
  return <Outlet context={context} />;
}
