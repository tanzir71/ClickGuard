import type { Meta, StoryObj } from '@storybook/react';
import tokens from '@clickguard/tokens/tokens.json';
import { Stack, Text } from '../primitives';
import styles from '../styles/ClickGuard.module.css';

const meta = { title: 'Foundations/Tokens', component: Stack, tags: ['autodocs'] } satisfies Meta<
  typeof Stack
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TokenSource: Story = {
  render: () => (
    <Stack gap="6">
      <section>
        <h2>Typography</h2>
        <Text as="p">Host Grotesk product text · calm, dense, and legible</Text>
        <Text as="p" mono>
          JETBRAINS MONO · IPS, SCORES, LABELS
        </Text>
      </section>
      <section>
        <h2>Spacing</h2>
        <p>
          {Object.entries(tokens.space)
            .map(([name, value]) => `${name}: ${value}`)
            .join(' · ')}
        </p>
      </section>
      <section>
        <h2>Radii</h2>
        <p>
          {Object.entries(tokens.radius)
            .map(([name, value]) => `${name}: ${value}`)
            .join(' · ')}
        </p>
      </section>
      <section>
        <h2>Primitive colors</h2>
        <div className={styles.tokenGrid}>
          {Object.entries(tokens.color).map(([name, value]) => (
            <div key={name}>
              <i data-token={name} />
              <strong>{name}</strong>
              <code>{value}</code>
            </div>
          ))}
        </div>
      </section>
    </Stack>
  ),
};
