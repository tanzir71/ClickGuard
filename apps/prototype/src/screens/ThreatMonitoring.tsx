import { ThreatMonitor } from '@clickguard/ui';
import { FIXED_NOW, visitorViewModels } from '../data';

export function ThreatMonitoring() {
  return <ThreatMonitor visitors={visitorViewModels} now={FIXED_NOW} />;
}
