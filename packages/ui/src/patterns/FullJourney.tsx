import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, Flag, Globe, LogIn, LogOut, MousePointer2, ShieldCheck, ShieldX, ShoppingBag, TrendingUp } from 'lucide-react';
import type { VisitVM, VisitorVM } from '../model';
import { KeyValue } from '../data';
import { BehaviorScrubber, EventTimeline, RiskChart, ScoreWaterfall, SignalMeter, SourceTag, StatusPill, formatDuration, platformName, shortTime } from '../domain';
import { buildJourneyNarrative, describeJourneyVisit, keyRecordedEvents, visitSource, type JourneyChapter } from '../domain/journeyNarrative';
import { Button, IconButton, Stack, Tabs } from '../primitives';
import { VisitSequence } from './VisitSequence';
import styles from '../styles/ClickGuard.module.css';

export type JourneyTab = 'events' | 'score' | 'device';
type VisitFilter = 'all' | 'paid' | 'signals' | 'after' | 'converted';
const chapterIcons = { arrival: LogIn, pattern: TrendingUp, decision: ShieldX, after: ArrowRight, conversion: ShoppingBag, allowed: ShieldCheck, monitoring: Eye };
const time = (at: string) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const day = (at: string) => new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const eventIcons: Record<string, typeof Flag> = { landed: LogIn, exit: LogOut, signal: Flag, conversion: ShoppingBag, click: MousePointer2, scroll: ArrowRight, form_submit: Check };
const eventNames: Record<string, string> = { landed: 'Arrived', exit: 'Session ended', signal: 'Signal detected', conversion: 'Converted', click: 'Clicked', scroll: 'Scrolled', form_submit: 'Form submitted' };

function Chapter({ chapter, selected, onSelect }: { chapter: JourneyChapter; selected: boolean; onSelect: (id: string) => void }) {
  const Icon = chapterIcons[chapter.kind];
  return <li data-tone={chapter.tone}><button type="button" aria-label={`${chapter.title}. Inspect visit`} aria-pressed={selected} onClick={() => onSelect(chapter.visitId)}>
    <i><Icon aria-hidden="true" /></i><span><small>{shortTime(chapter.at)}</small><strong>{chapter.title}</strong><span>{chapter.detail}</span></span><ChevronRight aria-hidden="true" />
  </button></li>;
}

function RecordedActivity({ visit, onEvents }: { visit: VisitVM; onEvents: () => void }) {
  const events = keyRecordedEvents(visit);
  return <section className={styles.recordedActivity} aria-label="Recorded activity">
    <header><h4>What was recorded</h4><Button variant="link" size="sm" onClick={onEvents}>All {visit.events.length} events <ArrowUpRight aria-hidden="true" /></Button></header>
    {events.length ? <ol className={styles.recordedRail}>{events.map((event, index) => {
      const Icon = eventIcons[event.kind] ?? Flag;
      return <li key={`${event.t}-${index}`} data-kind={event.kind}><time>+{(event.t / 1000).toFixed(event.t % 1000 ? 2 : 0)}s</time><i><Icon aria-hidden="true" /></i><strong>{eventNames[event.kind] ?? 'Activity'}</strong><span>{event.label}</span></li>;
    })}</ol> : <p className={styles.noBehavior}>{visit.jsExecuted ? 'No events were recorded for this visit.' : 'The tracking tag did not run. Behavior is unknown—not evidence of inactivity.'}</p>}
    <p className={styles.recordedNote}>Reconstructed from recorded events · not a screen recording{events.length < visit.events.length ? ` · showing ${events.length} of ${visit.events.length} events` : ''}</p>
  </section>;
}

export function FullJourney({ visitor, protectionPaused = false, selectedVisitId, setSelectedVisitId, tab, setTab, onBack, onAllow }: { visitor: VisitorVM; protectionPaused?: boolean; selectedVisitId: string; setSelectedVisitId: (id: string) => void; tab: JourneyTab; setTab: (tab: JourneyTab) => void; onBack: () => void; onAllow: () => void }) {
  const [filter, setFilter] = useState<VisitFilter>('all');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const detailRef = useRef<HTMLElement>(null);
  const streamRef = useRef<HTMLElement>(null);
  const evidenceContentRef = useRef<HTMLDivElement>(null);
  const pendingEvidenceScroll = useRef(false);
  const evidenceId = useId();
  const story = buildJourneyNarrative(visitor);
  const visit = story.visits.find((item) => item.id === selectedVisitId) ?? story.decision ?? story.last;
  useEffect(() => {
    const stream = streamRef.current;
    const marker = stream?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!stream || !marker) return;
    const bounds = stream.getBoundingClientRect(); const row = marker.getBoundingClientRect();
    const inset = stream.querySelector('header')?.getBoundingClientRect().height ?? 0;
    // Keep the selected row visible without scrolling the whole sheet away from the chart.
    if (row.top < bounds.top + inset) stream.scrollTop += row.top - bounds.top - inset;
    else if (row.bottom > bounds.bottom) stream.scrollTop += row.bottom - bounds.bottom;
  }, [visit?.id, filter]);
  useEffect(() => {
    if (evidenceOpen && pendingEvidenceScroll.current) {
      evidenceContentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      pendingEvidenceScroll.current = false;
    }
  }, [evidenceOpen, tab]);
  const selectVisit = (id: string, reveal = false) => {
    setSelectedVisitId(id);
    if (id === visitor.blockedAtVisitId) setTab('score');
    if (reveal) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const openEvidence = (nextTab: JourneyTab) => {
    pendingEvidenceScroll.current = true;
    setTab(nextTab); setEvidenceOpen(true);
    if (evidenceOpen && tab === nextTab) {
      evidenceContentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      pendingEvidenceScroll.current = false;
    }
  };
  const shown = story.visits.filter((item, index) => filter === 'all' || filter === 'paid' && item.source === 'paid' || filter === 'signals' && item.signals.length > 0 || filter === 'converted' && Boolean(item.conversion) || filter === 'after' && story.decisionIndex >= 0 && index > story.decisionIndex);
  const groups = new Map<string, VisitVM[]>();
  shown.forEach((item) => { const key = day(item.startedAt); groups.set(key, [...(groups.get(key) ?? []), item]); });
  const index = story.visits.findIndex((item) => item.id === visit?.id);
  const episode = visit ? describeJourneyVisit(visit, visitor) : undefined;
  const activeChapter = [...story.chapters].reverse().find((chapter) => chapter.visitId === visit?.id)?.id;
  const filters: Array<{ value: VisitFilter; label: string }> = [{ value: 'all', label: 'All visits' }, { value: 'paid', label: 'Paid' }, { value: 'signals', label: 'With signals' }, { value: 'after', label: 'After decision' }, { value: 'converted', label: 'Converted' }];

  return <div className={styles.fullJourney}>
    <header className={styles.sheetHeader}>
      <Button variant="ghost" iconStart={<ArrowLeft aria-hidden="true" />} onClick={onBack}>Back</Button>
      <div className={styles.journeyIdentity}><div><h2 className={styles.mono}>{visitor.ip}</h2><StatusPill status={visitor.status} /></div><small>{[visitor.city, visitor.country, visitor.isp].filter(Boolean).join(' · ') || 'Location and network unknown'}</small></div>
      {visitor.status !== 'allowed' && <Button size="sm" onClick={onAllow}>Always allow</Button>}
    </header>
    {protectionPaused && <p className={styles.journeyNotice} data-warning="true">All protection paused · these are recorded decisions, not active enforcement.</p>}
    <section className={styles.journeySynopsis} aria-label="Journey overview">
      <div className={styles.journeyHeadline}><span className={styles.eyebrow}>The visitor’s story</span><h3>{story.headline}</h3><p>{story.noInteraction > 0 ? `${story.noInteraction} of ${story.visits.length} visits had no recorded interaction. ` : ''}{story.visits.length ? `${story.visits.length} ${story.visits.length === 1 ? 'visit' : 'visits'} over ${story.span}. ` : 'No visits recorded. '}{story.after.length ? `${story.afterPaid} paid ${story.afterPaid === 1 ? 'visit' : 'visits'} recorded after the decision.` : `Current risk ${visitor.riskScore} / 100.`}</p></div>
      <div className={styles.journeyOutcome} aria-label="Current protection status">{visitor.exclusions.filter((item) => item.state !== 'not_connected').map((item) => <span key={item.platform} data-state={protectionPaused && item.state !== 'removed' ? 'failed' : item.state} title={[item.at && shortTime(item.at), item.error].filter(Boolean).join(' · ')}><i />{platformName(item.platform)} · {protectionPaused && item.state !== 'removed' ? 'Protection paused' : ({ excluded: 'Excluded', syncing: 'Syncing', failed: 'Failed', removed: 'Removed', not_connected: 'Not connected' })[item.state]}</span>)}</div>
      {visitor.allowedBy && <p className={styles.journeyNotice}>Allowed by {visitor.allowedBy.user} · {shortTime(visitor.allowedBy.at)}{visitor.allowedBy.note ? ` · “${visitor.allowedBy.note}”` : ''}</p>}
      {visitor.status === 'failed' && <p className={styles.journeyNotice} data-warning="true">{visitor.exclusions.find((item) => item.state === 'failed')?.error ?? 'An ad platform rejected the exclusion.'} Paid traffic may still arrive.</p>}
      <dl className={styles.journeyTotals}>
        <div><dt>Traffic</dt><dd>{story.visits.length} <small>visits</small></dd><span>{story.paid} paid · {story.visits.length - story.paid} unpaid</span></div>
        <div><dt>Recorded time on site</dt><dd>{formatDuration(story.totalDuration)}</dd><span>{visitor.deviceCount} {visitor.deviceCount === 1 ? 'device' : 'devices'} · {story.conversions} {story.conversions === 1 ? 'conversion' : 'conversions'}</span></div>
        <div><dt>{story.decision ? 'Ad spend through decision' : 'Ad spend so far'}</dt><dd>${visitor.wastedSpend.toFixed(2)}</dd><span>Recorded click cost</span></div>
        <div><dt>Protected spend estimate</dt><dd>~${visitor.protectedSpendEst.toFixed(0)}</dd><span>Estimated over 7 days</span></div>
      </dl>
    </section>
    <section className={styles.storyOverview}>
      <article className={styles.chapterCard}><header><h3>How it unfolded</h3><span>Choose a moment to inspect</span></header><ol className={styles.chapterTrail}>{story.chapters.map((chapter) => <Chapter key={chapter.id} chapter={chapter} selected={activeChapter === chapter.id} onSelect={(id) => selectVisit(id, true)} />)}</ol></article>
      <article className={styles.wideChart}><header className={styles.journeyChartHeading}><div><h3>Risk across the journey</h3><span>Every point is a recorded visit</span></div><strong>{visitor.riskScore}<small> / 100 now</small></strong></header><RiskChart visits={story.visits} threshold={visitor.threshold} blockedAtVisitId={visitor.blockedAtVisitId} selectedVisitId={visit?.id} size="wide" onSelectVisit={(id) => selectVisit(id)} /></article>
    </section>
    <section className={styles.storyInvestigation} aria-label="Visit investigation">
      <aside className={styles.storyStream} aria-label="Journey visits" ref={streamRef}>
        <header><div><h3>Follow the visits</h3><span>{shown.length} / {story.visits.length}</span></div><p>First arrival → latest activity</p><div className={styles.storyFilters} role="group" aria-label="Filter journey visits">{filters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div></header>
        {shown.length === 0 && <div className={styles.streamEmpty}><p>No visits match this filter.</p><Button variant="link" onClick={() => setFilter('all')}>Show all visits</Button></div>}
        {[...groups].map(([date, items]) => <section key={date} className={styles.storyDay}><h4>{date} <span>{items.length} {items.length === 1 ? 'visit' : 'visits'}</span></h4><ol>{items.map((item) => {
          const number = story.visits.indexOf(item) + 1; const isDecision = item.id === story.decision?.id;
          const Icon = isDecision ? ShieldX : item.conversion ? ShoppingBag : item.source === 'paid' ? MousePointer2 : Globe;
          return <li key={item.id} data-decision={isDecision}><button type="button" aria-label={`Inspect visit ${number}, ${visitSource(item)}, risk ${item.scoreAfter}`} aria-current={item.id === visit?.id ? 'step' : undefined} onClick={() => selectVisit(item.id)} onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); event.stopPropagation(); const next = shown[Math.max(0, Math.min(shown.length - 1, shown.indexOf(item) + (event.key === 'ArrowDown' ? 1 : -1)))]; selectVisit(next.id); const buttons = event.currentTarget.closest('aside')?.querySelectorAll<HTMLButtonElement>('li button'); buttons?.[shown.indexOf(next)]?.focus(); }
          }}><i><Icon aria-hidden="true" /></i><span><small>Visit {number} · {time(item.startedAt)}</small><strong>{isDecision ? 'Block decision' : item.conversion ? `${item.conversion.type} recorded` : visitSource(item)}</strong><span>{item.landingPath}</span><em>{!item.jsExecuted ? 'Behavior unavailable' : item.afterBlock ? `${item.source === 'paid' ? 'Paid' : 'Unpaid'} after decision` : item.interaction.level === 'none' ? 'No interaction recorded' : `${item.interaction.scrollPct}% scroll · ${item.interaction.clicks} clicks`}</em></span><b title="Risk after visit">{item.scoreAfter}</b></button></li>;
        })}</ol></section>)}
      </aside>
      {visit && episode ? <article className={styles.storyDetail} ref={detailRef} aria-label={`Visit ${index + 1} overview`}>
        <header className={styles.episodeHeader}><div><span className={styles.eyebrow}>Visit {index + 1} of {story.visits.length}</span><Stack direction="row" gap="1"><IconButton label="Previous visit" disabled={index === 0} onClick={() => selectVisit(story.visits[index - 1].id)}><ChevronLeft /></IconButton><IconButton label="Next visit" disabled={index === story.visits.length - 1} onClick={() => selectVisit(story.visits[index + 1].id)}><ChevronRight /></IconButton></Stack></div><h3>{episode.title}</h3><p><Clock3 aria-hidden="true" />{shortTime(visit.startedAt)} · {formatDuration(visit.durationMs)} on site</p>{filter !== 'all' && !shown.includes(visit) && <small>This selected visit is outside the list filter. <button type="button" onClick={() => setFilter('all')}>Show all visits</button></small>}</header>
        <VisitSequence visit={visit} visitor={visitor} />
        {visit.signals.length > 0 && <div className={styles.episodeSignals}><span>Evidence on this visit</span>{[...visit.signals].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 3).map((signal) => <button key={signal.id} type="button" data-lowers={signal.points < 0} title={signal.value} onClick={() => openEvidence('score')}>{signal.points < 0 ? '↓' : '↑'} {signal.label}</button>)}<Button variant="link" size="sm" onClick={() => openEvidence('score')}>Why this score?</Button></div>}
        <RecordedActivity visit={visit} onEvents={() => openEvidence('events')} />
        <div className={styles.evidenceDisclosure}><button type="button" aria-expanded={evidenceOpen} aria-controls={evidenceId} onClick={() => setEvidenceOpen((open) => !open)}><span><strong>Inspect the underlying evidence</strong><small>Events, score contributions, source details, and device data</small></span><ChevronDown aria-hidden="true" /></button>
          <div id={evidenceId} hidden={!evidenceOpen}>
            <div className={styles.sourceEvidence}><SourceTag source={visit.source} platform={visit.platform} /><p>{[visit.campaign, visit.adGroup, visit.keyword && `“${visit.keyword}”`].filter(Boolean).join(' › ')}</p><dl><KeyValue label="Landing URL" value={visit.landingUrl} mono />{visit.clickId && <KeyValue label="Click ID" value={visit.clickId} mono />}{visit.cpc !== undefined && <KeyValue label="Click cost" value={`$${visit.cpc.toFixed(2)}`} />}</dl></div>
            <section className={styles.officialSignals}><SignalMeter label="Interaction" value={visit.jsExecuted ? `${visit.interaction.level} · ${visit.interaction.scrollPct}% scroll` : 'Unknown'} level={visit.jsExecuted ? { none: 0, low: 1, medium: 2, high: 4 }[visit.interaction.level] : 0} /><SignalMeter label="Bot probability" value={`${Math.round(visit.botProbability * 100)}%`} level={Math.ceil(visit.botProbability * 4)} tone={visit.botProbability >= .7 ? 'danger' : 'neutral'} /><SignalMeter label="VPN / proxy" value={visit.vpnProxy ? 'Yes' : 'No'} level={visit.vpnProxy ? 4 : 0} /><SignalMeter label="Form" value={visit.formFill?.deliverability ?? 'None'} level={visit.formFill ? 3 : 0} /><SignalMeter label="Conversion" value={visit.conversion?.type ?? 'None'} level={visit.conversion ? 4 : 0} tone={visit.conversion ? 'success' : 'neutral'} /></section>
            <section className={styles.scrubberSection}><h3>Recorded activity density</h3><BehaviorScrubber visit={visit} /></section>
            <div ref={evidenceContentRef} className={styles.evidenceContent}><Tabs value={tab} onChange={setTab} items={[{ value: 'events', label: 'Events' }, { value: 'score', label: 'Score' }, { value: 'device', label: 'Device & network' }]} /></div>
            <div className={styles.tabPanel} role="tabpanel">{tab === 'events' ? <EventTimeline events={visit.events} /> : tab === 'score' ? <ScoreWaterfall visit={visit} threshold={visitor.threshold} /> : <div className={styles.deviceGrid}><section><h3>This visit</h3><dl><KeyValue label="User agent" value={visit.device.ua} mono /><KeyValue label="Browser" value={visit.device.browser} /><KeyValue label="Operating system" value={visit.device.os} /><KeyValue label="Device" value={visit.device.type} /><KeyValue label="Screen" value={visit.device.screen} /><KeyValue label="Language" value={visit.device.language} /><KeyValue label="Timezone" value={visit.device.timezone} /></dl></section><section><h3>Network</h3><dl><KeyValue label="IP address" value={visitor.ip} mono /><KeyValue label="ASN" value={`${visitor.asn ?? '—'} · ${visitor.isp ?? '—'}`} /><KeyValue label="Network type" value={visitor.networkType} /><KeyValue label="VPN / proxy" value={visit.vpnProxy ? 'Detected' : 'No'} /><KeyValue label="Location" value={[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || 'Unknown'} /></dl></section></div>}</div>
          </div>
        </div>
      </article> : <div className={styles.chartEmpty}>No visits recorded for this visitor.</div>}
    </section>
  </div>;
}
