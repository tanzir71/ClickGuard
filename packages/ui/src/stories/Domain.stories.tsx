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
