import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  FullJourney,
  buildJourneyNarrative,
  describeJourneyVisit,
  keyRecordedEvents,
  type JourneyTab,
  type VisitorVM,
} from '@clickguard/ui';
import { visitorViewModels } from '.';

const hero = (ip: string) => visitorViewModels.find((visitor) => visitor.ip === ip)!;
const blocked = hero('185.220.101.4');
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }),
);
afterEach(cleanup);

function JourneyHarness({ visitor = blocked }: { visitor?: VisitorVM }) {
  const [selected, setSelected] = useState(visitor.blockedAtVisitId ?? visitor.visits.at(-1)?.id ?? '');
  const [tab, setTab] = useState<JourneyTab>('score');
  return (
    <FullJourney
      visitor={visitor}
      selectedVisitId={selected}
      setSelectedVisitId={setSelected}
      tab={tab}
      setTab={setTab}
      onBack={() => {}}
      onAllow={() => {}}
    />
  );
}

describe('story-led full journey', () => {
  it('derives the blocked story from actual visits without mutating input', () => {
    const story = buildJourneyNarrative({ ...blocked, visits: [...blocked.visits].reverse() });
    expect(story.headline).toBe('A block decision after 5 paid visits.');
    expect(story.chapters.map((chapter) => chapter.kind)).toEqual([
      'arrival',
      'pattern',
      'decision',
      'after',
    ]);
    expect(story.chapters[2].detail).toBe('Risk 58 → 100 · threshold 70');
    expect(story.chapters[3].detail).toBe('0 paid · 6 unpaid returns');
    expect(story.noInteraction).toBe(3);
    expect(story.visits[0].id).toBe(blocked.visits[0].id);
  });

  it('keeps monitoring, unpaid risk, conversions, allowance and delivery failure distinct', () => {
    const unpaid = buildJourneyNarrative(hero('45.83.64.9'));
    expect(unpaid.decision).toBeUndefined();
    expect(unpaid.headline).toContain('no ad spend');
    expect(unpaid.chapters.some((chapter) => chapter.kind === 'decision')).toBe(false);
    const buyer = buildJourneyNarrative(hero('203.0.113.77'));
    expect(buyer.headline).toContain('monitored');
    expect(buyer.chapters.at(-1)?.kind).toBe('conversion');
    expect(buildJourneyNarrative(hero('81.2.69.160')).chapters.at(-1)?.title).toBe('Allowed by Sarah Chen');
    expect(buildJourneyNarrative(hero('198.51.100.23')).afterPaid).toBe(1);
    expect(buildJourneyNarrative(hero('198.51.100.23')).headline).toContain('incomplete');
    expect(buildJourneyNarrative(hero('192.0.2.44')).headline).toContain('still syncing');
  });

  it('never turns missing tracking into inactivity, and summarizes real events in time order', () => {
    const visit = { ...blocked.visits[0], jsExecuted: false, events: [] };
    expect(describeJourneyVisit(visit, blocked).behavior).toBe('Behavior unavailable');
    expect(buildJourneyNarrative({ ...blocked, visits: [visit] }).noInteraction).toBe(0);
    expect(keyRecordedEvents(visit)).toEqual([]);
    const buyer = hero('66.249.70.11').visits.at(-1)!;
    const events = keyRecordedEvents(buyer);
    expect(events).toHaveLength(4);
    expect(events.some((event) => event.kind === 'conversion')).toBe(true);
    expect(events.every((event) => buyer.events.includes(event))).toBe(true);
    expect(events.map((event) => event.t)).toEqual(events.map((event) => event.t).sort((a, b) => a - b));
  });

  it('links chapters, chart and visit list to the same visit and preserves evidence on demand', () => {
    render(<JourneyHarness />);
    expect(screen.getByRole('heading', { name: 'A block decision after 5 paid visits.' })).toBeTruthy();
    const evidence = screen.getByRole('button', { name: /Inspect the underlying evidence/ });
    expect(evidence.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('tabpanel')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Arrived via Direct traffic. Inspect visit' }));
    expect(screen.getByRole('article', { name: 'Visit 1 overview' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Visit 1, score 34' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Block decision at visit 6. Inspect visit' }));
    expect(screen.getByRole('heading', { name: 'The visit that triggered a block decision' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Why this score?' }));
    expect(screen.getByRole('tab', { name: 'Score' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toContain('Score before this visit');
    fireEvent.click(screen.getByRole('tab', { name: 'Device & network' }));
    expect(screen.getByRole('tabpanel').textContent).toContain(blocked.visits[5].device.ua);
    fireEvent.click(screen.getByRole('button', { name: /All \d+ events/ }));
    expect(screen.getByRole('tab', { name: 'Events' }).getAttribute('aria-selected')).toBe('true');
  });

  it('presents three ordered stages with decorative connectors and truthful metric footers', () => {
    render(<JourneyHarness />);
    const sequence = screen.getByRole('list', { name: 'Visit story' });
    const stages = within(sequence).getAllByRole('listitem');
    expect(stages).toHaveLength(3);
    expect(stages.map((stage) => stage.querySelector('header')?.textContent)).toEqual([
      '01Arrival',
      '02On the site',
      '03Result',
    ]);
    expect(sequence.querySelectorAll('svg[class*="sequenceConnector"][aria-hidden="true"]')).toHaveLength(2);
    expect(within(sequence).queryByRole('button')).toBeNull();
    expect(stages[0].textContent).toContain('Click cost$4.10');
    expect(stages[1].textContent).toContain('Bot probability96%');
    expect(stages[2].textContent).toContain('Block decision');
    expect(stages[2].textContent).toContain('Risk score58 to 100');
    expect(stages[2].getAttribute('data-tone')).toBe('risk');
  });

  it('keeps unavailable behavior and unknown click cost explicit in the flow', () => {
    render(
      <JourneyHarness
        visitor={{
          ...blocked,
          visits: blocked.visits.map((visit) => ({
            ...visit,
            jsExecuted: false,
            cpc: undefined,
            events: [],
          })),
        }}
      />,
    );
    const sequence = screen.getByRole('list', { name: 'Visit story' });
    expect(within(sequence).getByText('Not recorded')).toBeTruthy();
    expect(within(sequence).getByText('Behavior unavailable')).toBeTruthy();
    expect(within(sequence).getByText('Unavailable')).toBeTruthy();
    expect(within(sequence).queryByText('Bot probability')).toBeNull();
    expect(within(sequence).queryByText('No interaction recorded')).toBeNull();
  });

  it('shows chronological day groups and functional filters, including the empty state', () => {
    render(<JourneyHarness />);
    const stream = within(screen.getByRole('complementary', { name: 'Journey visits' }));
    const visits = stream.getAllByRole('button', { name: /Inspect visit/ });
    expect(visits[0].getAttribute('aria-label')).toContain('Inspect visit 1,');
    expect(visits.at(-1)?.getAttribute('aria-label')).toContain('Inspect visit 12,');
    fireEvent.click(stream.getByRole('button', { name: 'After decision' }));
    expect(stream.getAllByRole('button', { name: /Inspect visit/ })).toHaveLength(6);
    fireEvent.click(stream.getByRole('button', { name: 'Converted' }));
    expect(stream.getByText('No visits match this filter.')).toBeTruthy();
    fireEvent.click(stream.getByRole('button', { name: 'Show all visits' }));
    fireEvent.keyDown(stream.getAllByRole('button', { name: /Inspect visit/ })[0], { key: 'ArrowDown' });
    expect(screen.getByRole('article', { name: 'Visit 2 overview' })).toBeTruthy();
    expect(document.activeElement?.getAttribute('aria-label')).toContain('Inspect visit 2,');
  });

  it('handles single, empty and dense histories without fabricated milestones', () => {
    const { rerender } = render(<JourneyHarness visitor={hero('192.0.2.212')} />);
    expect(screen.getByRole('button', { name: 'Previous visit' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Next visit' }).hasAttribute('disabled')).toBe(true);
    rerender(<JourneyHarness visitor={{ ...blocked, visits: [] }} />);
    expect(screen.getByText('No visits recorded for this visitor.')).toBeTruthy();
    rerender(<JourneyHarness visitor={hero('5.188.10.120')} />);
    const stream = within(screen.getByRole('complementary', { name: 'Journey visits' }));
    expect(stream.getAllByRole('button', { name: /Inspect visit/ })).toHaveLength(60);
    expect(stream.getAllByRole('heading', { level: 4 }).length).toBeGreaterThan(20);
  });
});
