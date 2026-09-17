export type Platform = 'google_ads' | 'meta_ads' | 'microsoft_ads';
export type Source = 'paid' | 'organic' | 'direct' | 'referral';
export type VisitorStatus = 'blocked' | 'monitoring' | 'clean' | 'allowed' | 'pending' | 'failed';
export type NetworkType = 'residential' | 'mobile' | 'datacenter' | 'vpn' | 'proxy' | 'corporate' | 'tor';
export type InteractionLevel = 'none' | 'low' | 'medium' | 'high';
export type SignalId = 'bot_probability' | 'interaction_none' | 'interaction_low' | 'vpn_proxy' | 'form_invalid_email' | 'location_outside_targeting' | 'click_frequency' | 'datacenter_ip' | 'timezone_mismatch' | 'device_spoofing' | 'fingerprint_rotation' | 'gclid_reuse' | 'gclid_missing' | 'click_cadence' | 'keyword_fixation' | 'business_hours_competitor' | 'converted' | 'form_valid_email' | 'interaction_high' | 'shared_ip' | 'returning_organic' | 'no_js' | 'quick_back' | 'human_friction' | 'network_intel';

export interface SignalHit { signalId: SignalId; value: string; points: number; severity: 'low' | 'med' | 'high'; }
export interface VisitEvent { t: number; kind: 'landed' | 'page_view' | 'scroll' | 'click' | 'form_focus' | 'form_submit' | 'idle' | 'tab_hidden' | 'exit' | 'signal' | 'rage_click' | 'dead_click' | 'quick_back' | 'conversion'; label: string; meta?: Record<string, string | number>; }
export interface Geo { city?: string; region?: string; country: string; lat?: number; lon?: number; }

export interface Visit {
  id: string; ip: string; fingerprint: string; startedAt: string; durationMs: number; source: Source; platform?: Platform;
  campaign?: string; adGroup?: string; keyword?: string; matchType?: 'exact' | 'phrase' | 'broad'; gclid?: string; fbclid?: string; cpc?: number;
  referrer?: string; landingPath: string; landingUrl: string; geo?: Geo;
  pages: Array<{ path: string; t: number }>; activityBuckets: number[]; conversionType?: 'purchase' | 'add_to_cart' | 'begin_checkout' | 'submit_form' | 'sign_up' | 'request_quote'; conversionValue?: number;
  jsExecuted: boolean; device: { type: 'desktop' | 'mobile' | 'tablet'; os: string; browser: string; ua: string; screen: string; language: string; timezone: string };
  interaction: { level: InteractionLevel; scrollPct: number; clicks: number; timeMs: number; pointerMoves: number };
  botProbability: number; vpnProxy: boolean; formFill?: { emailMasked: string; deliverability: 'valid' | 'invalid' | 'disposable' | 'unknown' };
  events: VisitEvent[]; signals: SignalHit[]; scoreBefore: number; scoreAfter: number; afterBlock: boolean; converted?: boolean;
}

export interface Visitor {
  scenario?: string; ip: string; geo: Geo; isp?: string; asn?: string; networkType: NetworkType; fingerprints: string[]; firstSeen: string; lastSeen: string;
  asnName?: string; reverseDns?: string; abuseListHits?: string[]; decision?: { by: 'auto' | { user: string }; at: string; rule: string }; reviewed: boolean;
  related: { sameFingerprintIps: string[]; subnet24Ips: string[]; asnVisitorCount: number; asnBlockedCount: number };
  networkBlockedAccounts30d: number; status: VisitorStatus; riskScore: number; threshold: number; blockedAt?: string; blockedAtVisitId?: string;
  exclusions: Array<{ platform: Platform; state: 'excluded' | 'syncing' | 'failed' | 'not_connected' | 'removed'; at?: string; error?: string }>;
  allowedBy?: { user: string; at: string; note?: string }; visitIds: string[];
}

export interface DataSet { visitors: Visitor[]; visits: Visit[]; }
