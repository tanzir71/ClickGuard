import type { SignalHit } from './types';
import { clamp } from './seed';

export const SIGNAL_LABELS: Record<SignalHit['signalId'], string> = {
  bot_probability: 'Likely automated', interaction_none: 'No real interaction', interaction_low: 'Minimal interaction', vpn_proxy: 'VPN or proxy',
  form_invalid_email: 'Undeliverable email', location_outside_targeting: 'Outside targeting', click_frequency: 'Click burst', datacenter_ip: 'Data-center network',
  timezone_mismatch: 'Timezone mismatch', device_spoofing: 'Device spoofing', fingerprint_rotation: 'Device rotation', gclid_reuse: 'Reused ad click ID',
  gclid_missing: 'Missing ad click ID', click_cadence: 'Machine-like cadence', keyword_fixation: 'Keyword fixation', business_hours_competitor: 'Office-hours pattern',
  converted: 'Converted', form_valid_email: 'Valid email', interaction_high: 'Real engagement', shared_ip: 'Shared IP', returning_organic: 'Organic return',
  no_js: 'No JavaScript', quick_back: 'Quick back', human_friction: 'Human frustration', network_intel: 'Network intelligence',
};

export function scoreSignals(signals: SignalHit[]) { return clamp(signals.reduce((sum, signal) => sum + signal.points, 0)); }
export function riskBand(score: number, threshold = 70) { return score >= threshold ? 'High' : score >= 40 ? 'Elevated' : 'Low'; }
