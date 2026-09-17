import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ProtectionMode } from '../data/protectionSimulation';
import { PauseProtectionDialog, ProtectionControl, ProtectionPausedBanner } from '../patterns/ProtectionControl';
import { Stack } from '../primitives';

function Demo({ mode: initialMode }: { mode: ProtectionMode }) {
  const [mode, setMode] = useState(initialMode);
  return <Stack gap="4">
    <ProtectionControl mode={mode} onChange={setMode} />
    {mode === 'paused' && <ProtectionPausedBanner onResume={() => setMode('active')} />}
  </Stack>;
}

const meta = {
  title: 'Patterns/Protection control', component: ProtectionControl, tags: ['autodocs'],
  args: { mode: 'active', onChange: () => undefined },
  render: (args) => <Demo key={args.mode} mode={args.mode} />,
} satisfies Meta<typeof ProtectionControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Paused: Story = { args: { mode: 'paused' } };
export const Confirmation: Story = {
  render: () => <PauseProtectionDialog onCancel={() => undefined} onConfirm={() => undefined} />,
};
