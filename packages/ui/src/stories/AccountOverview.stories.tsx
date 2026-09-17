import type { Meta, StoryObj } from '@storybook/react';
import type { VisitorVM } from '../model';
import { AccountOverview } from '../patterns/AccountOverview';
import { visits } from './fixtures';

const visitor: VisitorVM = {
  ip: '192.0.2.1',
  city: 'Demo city',
  country: 'US',
  isp: 'Demo network',
  asn: 'AS0',
  networkType: 'datacenter',
  deviceCount: 1,
  firstSeen: visits[0].startedAt,
  lastSeen: visits.at(-1)!.startedAt,
  status: 'blocked',
  reviewed: false,
  riskScore: 94,
  threshold: 70,
  blockedAt: visits[5].startedAt,
  blockedAtVisitId: visits[5].id,
  visits,
  exclusions: [],
  paidVisits: 6,
  unpaidVisits: 2,
  paidVisitsBeforeBlock: 6,
  wastedSpend: 24.6,
  protectedSpendEst: 50,
  topSignals: visits[5].signals,
  maxBotProbability: 0.96,
  avgBotProbability: 0.8,
  typicalInteraction: 'none',
  vpnProxyAny: false,
  conversions: 0,
  conversionValueTotal: 0,
  formFills: { valid: 0, invalid: 0, disposable: 0 },
  priority: 100,
  needsReview: true,
  verdict: 'Demo block decision.',
};
const meta = {
  title: 'Patterns/Live account overview',
  component: AccountOverview,
  tags: ['autodocs'],
  args: { visitors: [visitor], onView: () => undefined },
} satisfies Meta<typeof AccountOverview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LiveDemo: Story = {};
export const ProtectionPaused: Story = { args: { protectionMode: 'paused' } };
export const EmptyAccount: Story = { args: { visitors: [] } };
export const Inactive: Story = { args: { enabled: false } };
export const Mobile: Story = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
export const Tablet: Story = { parameters: { viewport: { defaultViewport: 'tablet' } } };
