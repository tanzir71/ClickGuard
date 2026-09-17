export type Platform = 'google_ads' | 'meta_ads' | 'microsoft_ads';
export type Source = 'paid' | 'organic' | 'direct' | 'referral';
export type VisitorStatus = 'blocked' | 'monitoring' | 'clean' | 'allowed' | 'pending' | 'failed';
export type NetworkType = 'residential' | 'mobile' | 'datacenter' | 'vpn' | 'proxy' | 'corporate' | 'tor';
export type SignalSeverity = 'low' | 'med' | 'high';

export interface SignalVM {
  id: string;
  label: string;
  value: string;
  points: number;
  severity: SignalSeverity;
}

export interface EventVM {
  t: number;
  kind: string;
  label: string;
  meta?: Record<string, string | number>;
}

export interface ScoreStep {
  signalId: string;
  label: string;
  reason?: string;
  points: number;
  rawPoints?: number;
}

export interface VisitVM {
  id: string;
  startedAt: string;
  durationMs: number;
  source: Source;
  platform?: Platform;
  campaign?: string;
  adGroup?: string;
  keyword?: string;
  clickId?: string;
  cpc?: number;
  landingPath: string;
  landingUrl: string;
  interaction: {
    level: 'none' | 'low' | 'medium' | 'high';
    scrollPct: number;
    clicks: number;
    pointerMoves: number;
  };
  botProbability: number;
  vpnProxy: boolean;
  formFill?: { emailMasked: string; deliverability: 'valid' | 'invalid' | 'disposable' | 'unknown' };
  conversion?: { type: string; value?: number };
  jsExecuted: boolean;
  events: EventVM[];
  activityBuckets: number[];
  signals: SignalVM[];
  scoreSteps: ScoreStep[];
  scoreBefore: number;
  scoreAfter: number;
  afterBlock: boolean;
  device: {
    type: string;
    os: string;
    browser: string;
    ua: string;
    screen: string;
    language: string;
    timezone: string;
  };
}

export interface ExclusionVM {
  platform: Platform;
  state: 'excluded' | 'syncing' | 'failed' | 'not_connected' | 'removed' | 'if_blocked';
  at?: string;
  error?: string;
}

export type VisitorAction = 'block' | 'unblock' | 'allow' | 'remove_allowance';

export interface VisitorVM {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  asn?: string;
  networkType: NetworkType;
  deviceCount: number;
  firstSeen: string;
  lastSeen: string;
  status: VisitorStatus;
  reviewed: boolean;
  riskScore: number;
  threshold: number;
  blockedAt?: string;
  blockedAtVisitId?: string;
  decisionBy?: string;
  exclusions: ExclusionVM[];
  allowedBy?: { user: string; at: string; note?: string };
  manualAction?: { type: VisitorAction; user: string; at: string };
  visits: VisitVM[];
  paidVisits: number;
  unpaidVisits: number;
  paidVisitsBeforeBlock: number;
  wastedSpend: number;
  protectedSpendEst: number;
  topSignals: SignalVM[];
  maxBotProbability: number;
  avgBotProbability: number;
  typicalInteraction: string;
  vpnProxyAny: boolean;
  conversions: number;
  conversionValueTotal: number;
  formFills: { valid: number; invalid: number; disposable: number };
  priority: number;
  needsReview: boolean;
  verdict: string;
  related?: {
    sameFingerprintIps: number;
    subnet24Ips: number;
    asnVisitorCount: number;
    asnBlockedCount: number;
    networkBlockedAccounts30d: number;
  };
}

export interface ThreatMonitorProps {
  visitors: VisitorVM[];
  now: string;
  initialSimulation?: 'normal' | 'empty' | 'error' | 'slow';
  onSimulationChange?: (value: 'normal' | 'empty' | 'error' | 'slow') => void;
}
