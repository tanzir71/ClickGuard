import React from 'react';
import ReactDOM from 'react-dom/client';
import '@clickguard/ui/global.css';
import { ThreatMonitoring } from './screens/ThreatMonitoring';
import { AppShell } from './shell/AppShell';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AppShell><ThreatMonitoring /></AppShell></React.StrictMode>,
);
