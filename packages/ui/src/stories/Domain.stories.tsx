import type { Meta, StoryObj } from '@storybook/react';
import { EventTimeline, RiskChart, RiskScore, SignalBar, SignalMeter, SourceTag, StatusPill, VisitRibbon } from '../domain';
import { Stack } from '../primitives';
import { signals, visits } from './fixtures';

const meta = { title: 'Domain/Threat monitoring', component: StatusPill, tags: ['autodocs'], args: { status: 'blocked' } } satisfies Meta<typeof StatusPill>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Statuses: Story = { render: () => <Stack direction="row" gap="2">{(['blocked', 'monitoring', 'clean', 'allowed', 'pending', 'failed'] as const).map((status) => <StatusPill key={status} status={status} withPlatforms={status === 'blocked' ? ['google_ads', 'meta_ads'] : []} />)}</Stack> };
export const SourcesAndRisk: Story = { render: () => <Stack gap="4"><Stack direction="row" gap="3">{(['paid', 'organic', 'direct', 'referral'] as const).map((source) => <SourceTag key={source} source={source} platform={source === 'paid' ? 'google_ads' : undefined} />)}</Stack><Stack direction="row" gap="4">{[12, 55, 69, 70, 94].map((value) => <RiskScore key={value} value={value} />)}</Stack></Stack> };
export const Evidence: Story = { render: () => <Stack gap="2">{signals.map((signal) => <SignalBar key={signal.id} signal={signal} />)}<Stack direction="row" gap="2"><SignalMeter label="Interaction" value="None" level={0} tone="warning" /><SignalMeter label="Bot probability" value="96%" level={4} tone="danger" /><SignalMeter label="Conversion" value="Purchase" level={4} tone="success" /></Stack></Stack> };
export const Journey: Story = { render: () => <Stack gap="6"><VisitRibbon visits={visits} blockedAtVisitId={visits[5].id} /><RiskChart visits={visits} threshold={70} blockedAtVisitId={visits[5].id} size="wide" /><EventTimeline events={visits[5].events} /></Stack> };
export const JourneyEdgeStates: Story = { render: () => <Stack gap="6"><RiskChart visits={[visits[0]]} threshold={70} /><RiskChart visits={[]} threshold={70} /><EventTimeline events={[]} /></Stack> };

const miniature = (scores: number[], minutes: number[], paidCount: number) => scores.map((score, index) => ({
  ...visits[0], id: `mini_${index}`, scoreBefore: scores[index - 1] ?? 0, scoreAfter: score,
  startedAt: new Date(Date.UTC(2026, 8, 14, 8, minutes[index])).toISOString(),
  source: index < paidCount ? 'paid' as const : 'organic' as const, afterBlock: false,
}));
const quickBlock = miniature([14, 30, 66, 82, 86], [0, 2, 4, 6, 45], 4).map((visit, index) => ({ ...visit, afterBlock: index > 3 }));
const converted = miniature([12, 32, 48, 23], [0, 240, 1440, 3000], 2).map((visit, index) => ({ ...visit, conversion: index === 3 ? { type: 'purchase' } : undefined }));
export const TableJourneys: Story = { render: () => <Stack gap="6">
  <p>Risk uses the same 0–100 scale. Each chart runs from its first to last visit. ● Paid · ○ Unpaid · ◆ Block decision · ▪ Conversion.</p>
  <Stack direction="row" gap="6">
    <Stack><strong>Quick block + unpaid return</strong><VisitRibbon visits={quickBlock} blockedAtVisitId="mini_3" status="blocked" /></Stack>
    <Stack><strong>Gradual risk, not blocked</strong><VisitRibbon visits={miniature([8, 15, 31, 42, 64], [0, 1440, 2880, 4320, 7200], 3)} /></Stack>
    <Stack><strong>Conversion + risk reduction</strong><VisitRibbon visits={converted} /></Stack>
  </Stack>
  <Stack direction="row" gap="6">
    <Stack><strong>Low-risk activity</strong><VisitRibbon visits={miniature([8, 5, 12, 7], [0, 120, 180, 1400], 1)} /></Stack>
    <Stack><strong>Single visit</strong><VisitRibbon visits={miniature([18], [0], 1)} /></Stack>
    <Stack><strong>60 visits, all keyboard reachable</strong><VisitRibbon visits={miniature(Array.from({ length: 60 }, (_, index) => Math.min(100, index * 2)), Array.from({ length: 60 }, (_, index) => index * 720), 40)} blockedAtVisitId="mini_35" /></Stack>
    <Stack><strong>Empty</strong><VisitRibbon visits={[]} /></Stack>
  </Stack>
</Stack> };
