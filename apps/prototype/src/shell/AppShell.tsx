import type { ReactNode } from 'react';

// DECISION: Navigation chrome is owned by the ThreatMonitor pattern so the
// prototype remains pure composition and every rendered visual comes from @clickguard/ui.
export function AppShell({ children }: { children: ReactNode }) { return children; }
