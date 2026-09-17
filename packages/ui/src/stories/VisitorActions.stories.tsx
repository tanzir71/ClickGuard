import type { Meta, StoryObj } from '@storybook/react';
import { VisitorActions } from '../patterns/VisitorActions';
import { Stack } from '../primitives';

const meta = {
  title: 'Patterns/Visitor actions',
  component: VisitorActions,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Stack direction="row" gap="2">
        <Story />
      </Stack>
    ),
  ],
  args: { visitor: { status: 'monitoring' }, protectionPaused: false, onAction: () => {} },
  argTypes: { onAction: { action: 'request confirmation' } },
  parameters: {
    docs: {
      description: {
        component:
          'IP-level controls used in row menus, visitor details and full journeys. Unblock removes current ' +
          'exclusions without creating a permanent allowance. In the prototype these actions open a confirmation with Undo after applying.',
      },
    },
  },
} satisfies Meta<typeof VisitorActions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Monitoring: Story = {};
export const Blocked: Story = { args: { visitor: { status: 'blocked' } } };
export const Pending: Story = { args: { visitor: { status: 'pending' } } };
export const Failed: Story = { args: { visitor: { status: 'failed' } } };
export const AlwaysAllowed: Story = { args: { visitor: { status: 'allowed' } } };
export const ProtectionPaused: Story = { args: { protectionPaused: true } };
export const UnblockWhilePaused: Story = { args: { visitor: { status: 'blocked' }, protectionPaused: true } };
