import type { Meta, StoryObj } from '@storybook/react';
import { BatchBar, DataTable, EmptyState, FilterChip, KeyValue, Stat } from '../data';
import { Button, Stack } from '../primitives';

const meta = { title: 'Data display/Component gallery', component: Stat, tags: ['autodocs'], args: { label: 'Visitors', value: '160' } } satisfies Meta<typeof Stat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Components: Story = { render: () => <Stack gap="4"><Stack direction="row" gap="3"><Stat label="Visitors" value="160" caption="evaluated in range" /><Stat label="Blocked" value="31" caption="across platforms" tone="danger" /><Stat label="Protected" value="~$1,940" caption="estimated" tone="success" /></Stack><Stack direction="row" gap="2"><FilterChip label="Status" value="Blocked, Monitoring" active onRemove={() => undefined} /><FilterChip label="Paid visits only" /></Stack><dl><KeyValue label="IP address" value="185.220.101.4" mono /><KeyValue label="Network" value="Hetzner Online · AS24940" /></dl><BatchBar count={3} onClear={() => undefined}><Button size="sm">Mark reviewed</Button></BatchBar><DataTable><thead><tr><th>Visitor</th><th>Status</th></tr></thead><tbody><tr><td>185.220.101.4</td><td>Blocked</td></tr></tbody></DataTable></Stack> };
export const EmptyStates: Story = { render: () => <Stack gap="6"><EmptyState variant="no-results" title="No visitors match these filters" body="Try removing a filter." /><EmptyState variant="error" title="Couldn’t load visitors" body="Retry when you’re ready." /></Stack> };
