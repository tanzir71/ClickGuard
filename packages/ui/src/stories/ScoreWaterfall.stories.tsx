import type { Meta, StoryObj } from '@storybook/react';
import { ScoreWaterfall } from '../domain';
import { visits } from './fixtures';

const meta = {
  title: 'Domain/ScoreWaterfall',
  component: ScoreWaterfall,
  tags: ['autodocs'],
  args: { visit: visits[5], threshold: 70, journey: visits },
} satisfies Meta<typeof ScoreWaterfall>;
export default meta;
type Story = StoryObj<typeof meta>;
export const CrossingThreshold: Story = {};
export const CapReached: Story = { args: { visit: visits[7] } };
export const Mitigating: Story = { args: { visit: visits[6] } };
export const WholeJourney: Story = { args: { initialScope: 'journey' } };
