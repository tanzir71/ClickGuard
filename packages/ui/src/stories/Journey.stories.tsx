import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { VisitorVM } from '../model';
import { FullJourney, type JourneyTab } from '../patterns/FullJourney';
import { visits } from './fixtures';

const visitor: VisitorVM = {
  ip: '185.220.101.4', city: 'Frankfurt', country: 'DE', isp: 'Hetzner Online', asn: 'AS24940', networkType: 'datacenter', deviceCount: 1,
  firstSeen: visits[0].startedAt, lastSeen: visits.at(-1)!.startedAt, status: 'blocked', reviewed: false, riskScore: 94, threshold: 70,
  blockedAt: visits[5].startedAt, blockedAtVisitId: visits[5].id, visits,
  exclusions: [{ platform: 'google_ads', state: 'excluded', at: visits[5].startedAt }, { platform: 'meta_ads', state: 'excluded', at: visits[5].startedAt }],
  paidVisits: 6, unpaidVisits: 2, paidVisitsBeforeBlock: 6, wastedSpend: 24.6, protectedSpendEst: 50,
  topSignals: visits[5].signals, maxBotProbability: .96, avgBotProbability: .8, typicalInteraction: 'none', vpnProxyAny: false,
  conversions: 0, conversionValueTotal: 0, formFills: { valid: 0, invalid: 0, disposable: 0 }, priority: 100, needsReview: false, verdict: 'A block decision after six paid visits.',
};
function JourneyExample({ visitor }: { visitor: VisitorVM }) {
  const [selected, setSelected] = useState(visitor.blockedAtVisitId ?? visitor.visits.at(-1)?.id ?? '');
  const [tab, setTab] = useState<JourneyTab>('score');
  return <FullJourney visitor={visitor} selectedVisitId={selected} setSelectedVisitId={setSelected} tab={tab} setTab={setTab} onBack={() => {}} onAllow={() => {}} />;
}
const meta = { title: 'Patterns/Visitor story', component: JourneyExample, parameters: { layout: 'fullscreen' }, args: { visitor } } satisfies Meta<typeof JourneyExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const BlockedJourney: Story = {};
export const FailedExclusion: Story = { args: { visitor: { ...visitor, status: 'failed', exclusions: [{ platform: 'google_ads', state: 'failed', error: 'Campaign reached its IP exclusion limit.' }, { platform: 'meta_ads', state: 'excluded' }], visits: visits.map((visit, index) => index === 7 ? { ...visit, source: 'paid', platform: 'google_ads' } : visit) } } };
export const ConversionWhileMonitoring: Story = { args: { visitor: { ...visitor, status: 'monitoring', blockedAtVisitId: undefined, blockedAt: undefined, riskScore: 58, exclusions: [], conversions: 1, protectedSpendEst: 0, visits: visits.slice(0, 4).map((visit, index) => ({ ...visit, afterBlock: false, scoreBefore: [0, 15, 32, 65][index], scoreAfter: [15, 32, 65, 58][index], conversion: index === 3 ? { type: 'purchase', value: 84 } : undefined, interaction: { level: 'high', scrollPct: 78, clicks: 5, pointerMoves: 48 }, events: [{ t: 0, kind: 'landed', label: 'Landed on /sale/trail-runners' }, { t: 200, kind: 'click', label: 'Clicked View product' }, ...(index === 3 ? [{ t: 900, kind: 'conversion', label: 'Completed purchase' }] : []), { t: 1100, kind: 'exit', label: 'Session ended' }] })) } } };
export const MissingBehavior: Story = { args: { visitor: { ...visitor, status: 'monitoring', blockedAtVisitId: undefined, blockedAt: undefined, riskScore: 12, exclusions: [], wastedSpend: 4.1, protectedSpendEst: 0, visits: [{ ...visits[0], jsExecuted: false, events: [], scoreAfter: 12 }] } } };
