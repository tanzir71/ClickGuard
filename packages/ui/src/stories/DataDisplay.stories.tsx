import type { Meta, StoryObj } from '@storybook/react';
import { ActivityFunnel, BatchBar, DataTable, EmptyState, FilterChip, KeyValue, Stat, type ActivityFunnelStage } from '../data';
import { Button, Stack } from '../primitives';

const meta = { title: 'Data display/Component gallery', component: Stat, tags: ['autodocs'], args: { label: 'Visitors', value: '160' } } satisfies Meta<typeof Stat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Components: Story = { render: () => <Stack gap="4"><Stack direction="row" gap="3"><Stat label="Visitors" value="160" caption="evaluated in range" /><Stat label="Blocked" value="31" caption="across platforms" tone="danger" /><Stat label="Protected" value="~$1,940" caption="estimated" tone="success" /></Stack><Stack direction="row" gap="2"><FilterChip label="Status" value="Blocked, Monitoring" active onRemove={() => undefined} /><FilterChip label="Paid visits only" /></Stack><dl><KeyValue label="IP address" value="185.220.101.4" mono /><KeyValue label="Network" value="Hetzner Online · AS24940" /></dl><BatchBar count={3} onClear={() => undefined}><Button size="sm">Mark reviewed</Button></BatchBar><DataTable><thead><tr><th>Visitor</th><th>Status</th></tr></thead><tbody><tr><td>185.220.101.4</td><td>Blocked</td></tr></tbody></DataTable></Stack> };
const funnelStages: ActivityFunnelStage[] = [
  { id: 'evaluated', label: 'Evaluated', value: 160, detail: '833 visits in the selected range.' },
  { id: 'paid', label: 'Paid traffic', value: 156, detail: '510 paid clicks in the selected range.', tone: 'paid' },
  { id: 'risk', label: 'At risk', value: 55, detail: 'Current risk score ≥ 40.', tone: 'warning' },
  { id: 'threshold', label: 'Threshold met', value: 39, detail: 'Current score meets policy threshold.', tone: 'danger' },
  { id: 'blocked', label: 'Block decision', value: 35, detail: '31 blocked · 1 pending · 3 failed.', tone: 'danger' },
];
const funnelWithValues = (values: number[]) => funnelStages.map((stage, index) => ({ ...stage, value: values[index], detail: `${stage.label} criterion in this example cohort.` }));
export const Funnel: Story = { render: () => <ActivityFunnel filtered={160} total={160} rangeLabel="Last 7 days" stages={funnelStages} /> };
export const FilteredFunnel: Story = { render: () => <ActivityFunnel filtered={41} total={160} rangeLabel="Last 7 days" stages={funnelWithValues([41, 39, 39, 39, 35])} /> };
export const EmptyFunnel: Story = { render: () => <ActivityFunnel filtered={0} total={160} rangeLabel="Last 7 days" stages={funnelWithValues([0, 0, 0, 0, 0])} /> };
export const SingleVisitorFunnel: Story = { render: () => <ActivityFunnel filtered={1} total={160} rangeLabel="Last 24 hours" stages={funnelWithValues([1, 1, 0, 0, 0])} /> };
export const FlatFunnel: Story = { render: () => <ActivityFunnel filtered={35} total={160} rangeLabel="Last 30 days" stages={funnelWithValues([35, 35, 35, 35, 35])} /> };
export const EmptyStates: Story = { render: () => <Stack gap="6"><EmptyState variant="no-results" title="No visitors match these filters" body="Try removing a filter." /><EmptyState variant="error" title="Couldn’t load visitors" body="Retry when you’re ready." /></Stack> };
