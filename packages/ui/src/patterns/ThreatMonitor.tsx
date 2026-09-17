import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Search,
  Shield,
  X,
} from 'lucide-react';
import type { ThreatMonitorProps, VisitVM, VisitorAction, VisitorStatus, VisitorVM } from '../model';
import { ActivityFunnel, BatchBar, DataTable, EmptyState, FilterChip, KeyValue, LoadingRows } from '../data';
import { getActivityFunnelStages } from '../data/activityFunnel';
import { getVisitorsInRange } from '../data/dateRange';
import {
  DecisionRoute,
  ExclusionList,
  RiskChart,
  RiskScore,
  SignalBar,
  SignalMeter,
  SourceTag,
  SpendReceipt,
  StatusPill,
  VerdictCard,
  VisitRibbon,
  formatDuration,
  platformName,
  shortTime,
} from '../domain';
import {
  Button,
  Checkbox,
  IconButton,
  Menu,
  SegmentedControl,
  Sheet,
  Stack,
  TextInput,
  Toast,
} from '../primitives';
import { FullJourney, type JourneyTab } from './FullJourney';
import { AccountOverview } from './AccountOverview';
import { ProtectionControl, ProtectionPausedBanner } from './ProtectionControl';
import { useProtectionMode } from './useProtectionDemo';
import { useCompactLayout } from './useCompactLayout';
import { VisitorActions } from './VisitorActions';
import { actionDescription, actionLabel, applyVisitorAction, hasBlock } from './visitorEnforcement';
import styles from '../styles/ClickGuard.module.css';

type ViewMode = 'visitors' | 'visits';
type SavedView = 'all' | 'review' | 'blocked' | 'wasted' | 'shared';
type SortKey = 'priority' | 'visitor' | 'status' | 'risk' | 'visits' | 'bot' | 'wasted' | 'seen';
type SortDirection = 'asc' | 'desc';
type Simulation = 'normal' | 'empty' | 'error' | 'slow';

const statusRank: Record<VisitorStatus, number> = {
  failed: 6,
  pending: 5,
  blocked: 4,
  monitoring: 3,
  allowed: 2,
  clean: 1,
};
const emptyVisitors: VisitorVM[] = [];

function readUrl() {
  const params =
    typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
  return {
    search: params.get('q') ?? '',
    status: params.get('status') ?? 'all',
    paid: params.get('paid') === '1',
    platform: params.get('platform') ?? 'all',
    risk: params.get('risk') ?? 'all',
    visitor: params.get('visitor') ?? '',
    journey: params.get('journey') === '1',
    visit: params.get('visit') ?? '',
    range: Number(params.get('range') ?? 7),
    simulate: (params.get('simulate') ?? 'normal') as Simulation,
  };
}

export function ThreatMonitor({
  visitors: initialVisitors,
  now,
  initialSimulation,
  onSimulationChange,
}: ThreatMonitorProps) {
  const compactLayout = useCompactLayout();
  const initial = useMemo(readUrl, []);
  const [visitors, setVisitors] = useState(initialVisitors);
  const [search, setSearch] = useState(initial.search);
  const [status, setStatus] = useState(initial.status);
  const [paidOnly, setPaidOnly] = useState(initial.paid);
  const [platform, setPlatform] = useState(initial.platform);
  const [risk, setRisk] = useState(initial.risk);
  const [rangeDays, setRangeDays] = useState([1, 7, 30].includes(initial.range) ? initial.range : 7);
  const [viewMode, setViewMode] = useState<ViewMode>('visitors');
  const [savedView, setSavedView] = useState<SavedView>('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'priority',
    direction: 'desc',
  });
  const [selectedIp, setSelectedIp] = useState(initial.visitor);
  const [expandedIp, setExpandedIp] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [journeyOpen, setJourneyOpen] = useState(initial.journey);
  const [selectedVisitId, setSelectedVisitId] = useState(initial.visit);
  const [journeyTab, setJourneyTab] = useState<JourneyTab>('events');
  const [pendingAction, setPendingAction] = useState<{ ip: string; action: VisitorAction } | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [simulation, setSimulation] = useState<Simulation>(initialSimulation ?? initial.simulate);
  const [loading, setLoading] = useState(simulation === 'slow');
  const [protectionMode, setProtectionMode] = useProtectionMode();
  const protectionPaused = protectionMode === 'paused';
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setVisitors(initialVisitors), [initialVisitors]);
  useEffect(() => {
    if (simulation !== 'slow') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), 1400);
    return () => window.clearTimeout(id);
  }, [simulation]);

  const selected = visitors.find((visitor) => visitor.ip === selectedIp);
  useEffect(() => {
    if (!selected) return;
    if (!selectedVisitId || !selected.visits.some((visit) => visit.id === selectedVisitId)) {
      const trigger = selected.visits.find((visit) => visit.id === selected.blockedAtVisitId);
      const peak = [...selected.visits].sort((a, b) => b.scoreAfter - a.scoreAfter)[0];
      setSelectedVisitId(
        (trigger ?? (selected.status === 'monitoring' ? peak : selected.visits.at(-1)))?.id ?? '',
      );
      setJourneyTab(trigger ? 'score' : 'events');
    }
  }, [selected, selectedVisitId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status !== 'all') params.set('status', status);
    if (paidOnly) params.set('paid', '1');
    if (platform !== 'all') params.set('platform', platform);
    if (risk !== 'all') params.set('risk', risk);
    if (selectedIp) params.set('visitor', selectedIp);
    if (rangeDays !== 7) params.set('range', String(rangeDays));
    if (journeyOpen) params.set('journey', '1');
    if (journeyOpen && selectedVisitId) params.set('visit', selectedVisitId);
    if (simulation !== 'normal') params.set('simulate', simulation);
    window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }, [
    search,
    status,
    paidOnly,
    platform,
    risk,
    rangeDays,
    selectedIp,
    journeyOpen,
    selectedVisitId,
    simulation,
  ]);

  const rangeLabel = rangeDays === 1 ? 'Last 24 hours' : `Last ${rangeDays} days`;
  const rangeVisitors = useMemo(
    () => getVisitorsInRange(visitors, now, rangeDays),
    [visitors, now, rangeDays],
  );
  const changeRange = (days: number) => {
    setRangeDays(days);
    setChecked(new Set());
    setExpandedIp('');
  };

  const filtered = useMemo(
    () =>
      rangeVisitors.filter((visitor) => {
        if (simulation === 'empty') return false;
        const haystack = [
          visitor.ip,
          visitor.city,
          visitor.region,
          visitor.country,
          visitor.isp,
          visitor.asn,
          ...visitor.visits.flatMap((visit) => [visit.campaign, visit.keyword, visit.clickId]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (search && !haystack.includes(search.toLowerCase())) return false;
        if (status !== 'all' && visitor.status !== status) return false;
        if (paidOnly && visitor.paidVisits === 0) return false;
        if (platform !== 'all' && !visitor.visits.some((visit) => visit.platform === platform)) return false;
        if (risk === 'high' && visitor.riskScore < visitor.threshold) return false;
        if (risk === 'elevated' && (visitor.riskScore < 40 || visitor.riskScore >= visitor.threshold))
          return false;
        if (risk === 'low' && visitor.riskScore >= 40) return false;
        if (savedView === 'review' && !visitor.needsReview) return false;
        if (savedView === 'blocked' && !['blocked', 'pending', 'failed'].includes(visitor.status))
          return false;
        if (savedView === 'wasted' && visitor.wastedSpend <= 20) return false;
        if (savedView === 'shared' && visitor.deviceCount < 3) return false;
        return true;
      }),
    [rangeVisitors, simulation, search, status, paidOnly, platform, risk, savedView],
  );

  const activityFunnel = useMemo(
    () => getActivityFunnelStages(filtered, now, rangeDays),
    [filtered, now, rangeDays],
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const values: Record<SortKey, [string | number, string | number]> = {
          priority: [a.priority, b.priority],
          visitor: [a.ip, b.ip],
          status: [statusRank[a.status], statusRank[b.status]],
          risk: [a.riskScore, b.riskScore],
          visits: [a.visits.length, b.visits.length],
          bot: [a.maxBotProbability, b.maxBotProbability],
          wasted: [a.wastedSpend, b.wastedSpend],
          seen: [a.lastSeen, b.lastSeen],
        };
        const [av, bv] = values[sort.key];
        const result =
          typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sort.direction === 'asc' ? result : -result;
      }),
    [filtered, sort],
  );

  const allVisits = useMemo(
    () =>
      sorted
        .flatMap((visitor) => visitor.visits.map((visit) => ({ visitor, visit })))
        .sort((a, b) => b.visit.startedAt.localeCompare(a.visit.startedAt)),
    [sorted],
  );

  const activeFilters =
    (search ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (paidOnly ? 1 : 0) +
    (platform !== 'all' ? 1 : 0) +
    (risk !== 'all' ? 1 : 0);
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setPaidOnly(false);
    setPlatform('all');
    setRisk('all');
    setSavedView('all');
  };
  const cycleSort = (key: SortKey) =>
    setSort((current) =>
      current.key !== key
        ? { key, direction: 'desc' }
        : current.direction === 'desc'
          ? { key, direction: 'asc' }
          : { key: 'priority', direction: 'desc' },
    );
  const openVisitor = (ip: string, visitId?: string) => {
    setSelectedIp((current) => (current === ip && !visitId ? '' : ip));
    if (visitId) setSelectedVisitId(visitId);
    setPendingAction(null);
  };
  const toggleChecked = (ip: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(ip)) next.delete(ip);
      else next.add(ip);
      return next;
    });

  const onKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (
      (event.target as HTMLElement).closest('dialog, [role="dialog"]') ||
      (event.target as HTMLElement).matches('input, select, button, textarea')
    )
      return;
    const currentIndex = Math.max(
      0,
      sorted.findIndex((visitor) => visitor.ip === selectedIp),
    );
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setSelectedIp(sorted[Math.max(0, Math.min(sorted.length - 1, currentIndex + delta))]?.ip ?? '');
    }
    if (event.key === 'Enter' && sorted[currentIndex]) setSelectedIp(sorted[currentIndex].ip);
    if (event.key === 'Escape') {
      setJourneyOpen(false);
      setSelectedIp('');
      setChecked(new Set());
    }
    if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      searchRef.current?.focus();
    }
    if (event.key.toLowerCase() === 'o' && selected) setJourneyOpen(true);
  };

  const requestAction = (ip: string, action: VisitorAction) => {
    if (action === 'block' && protectionPaused) return;
    setSelectedIp(ip);
    setJourneyOpen(false);
    setPendingAction({ ip, action });
  };

  const updateVisitor = (ip: string, action: VisitorAction) => {
    if (action === 'block' && protectionPaused) return;
    const before = visitors.find((visitor) => visitor.ip === ip);
    if (!before) return;
    setVisitors((current) =>
      current.map((visitor) => (visitor.ip === ip ? applyVisitorAction(visitor, action, now) : visitor)),
    );
    setPendingAction(null);
    const outcome = {
      block: 'Blocked',
      unblock: 'Unblocked',
      allow: 'Always allowed',
      remove_allowance: 'Allowance removed for',
    };
    setToast({
      message: `${outcome[action]} ${ip} · demo only`,
      undo: () => {
        setVisitors((current) => current.map((visitor) => (visitor.ip === ip ? before : visitor)));
        setToast({ message: `Restored ${ip}` });
      },
    });
  };

  const batchAction = (action: VisitorAction | 'review') => {
    if (action === 'block' && protectionPaused) return;
    const targets = visitors.filter(
      (visitor) => checked.has(visitor.ip) && (action !== 'unblock' || hasBlock(visitor)),
    );
    const snapshot = new Map(targets.map((visitor) => [visitor.ip, visitor]));
    setVisitors((current) =>
      current.map((visitor) =>
        !snapshot.has(visitor.ip)
          ? visitor
          : action === 'review'
            ? { ...visitor, reviewed: true, needsReview: false }
            : applyVisitorAction(visitor, action, now),
      ),
    );
    setToast({
      message: `${targets.length} ${targets.length === 1 ? 'visitor' : 'visitors'} updated · demo only`,
      undo: () => setVisitors((current) => current.map((visitor) => snapshot.get(visitor.ip) ?? visitor)),
    });
    setChecked(new Set());
  };

  const changeSimulation = (value: Simulation) => {
    setSimulation(value);
    onSimulationChange?.(value);
  };

  const visitorPanel = selected ? (
    <VisitorPanel
      protectionPaused={protectionPaused}
      visitor={selected}
      onClose={() => setSelectedIp('')}
      onPrevious={() =>
        setSelectedIp(
          sorted[Math.max(0, sorted.findIndex((visitor) => visitor.ip === selected.ip) - 1)]?.ip ??
            selected.ip,
        )
      }
      onNext={() =>
        setSelectedIp(
          sorted[Math.min(sorted.length - 1, sorted.findIndex((visitor) => visitor.ip === selected.ip) + 1)]
            ?.ip ?? selected.ip,
        )
      }
      onOpenJourney={(visitId) => {
        if (visitId) setSelectedVisitId(visitId);
        setJourneyOpen(true);
      }}
      onAction={(action) => (action ? requestAction(selected.ip, action) : setPendingAction(null))}
      confirmAction={pendingAction?.ip === selected.ip ? pendingAction.action : null}
      onConfirm={() => pendingAction?.ip === selected.ip && updateVisitor(selected.ip, pendingAction.action)}
      selectedVisitId={selectedVisitId}
      onSelectVisit={setSelectedVisitId}
    />
  ) : null;

  return (
    <div className={styles.app} onKeyDown={onKeyboard}>
      <header className={styles.appHeader}>
        <a className={styles.brand} href="#top" aria-label="ClickGuard home">
          <Shield />
          <strong>ClickGuard</strong>
        </a>
        <nav aria-label="Primary">
          <a href="#dashboard">Dashboard</a>
          <a className={styles.navActive} href="#threats">
            Threat Monitoring
          </a>
          <a href="#rules">Rules</a>
          <a href="#reports">Reports</a>
        </nav>
        <button type="button" className={styles.account}>
          acme-shoes.com <ChevronDown />
        </button>
        <span className={styles.avatar}>T</span>
      </header>
      <main id="top" className={styles.main}>
        <section className={styles.pageIntro}>
          <div>
            <span className={styles.eyebrow}>Traffic protection</span>
            <h1>Threat Monitoring</h1>
            <p>Every visitor we evaluated, and why we did or didn’t block them.</p>
          </div>
          <Stack direction="row" gap="2">
            <Button iconStart={<Download />} onClick={() => exportCsv(sorted)}>
              Export CSV
            </Button>
            <Menu label={rangeLabel}>
              <button type="button" onClick={() => changeRange(1)}>
                Last 24 hours {rangeDays === 1 ? '✓' : ''}
              </button>
              <button type="button" onClick={() => changeRange(7)}>
                Last 7 days {rangeDays === 7 ? '✓' : ''}
              </button>
              <button type="button" onClick={() => changeRange(30)}>
                Last 30 days {rangeDays === 30 ? '✓' : ''}
              </button>
            </Menu>
          </Stack>
        </section>
        <div className={styles.protectionBar}>
          <ProtectionControl
            mode={protectionMode}
            onChange={(mode) => {
              setProtectionMode(mode);
              setPendingAction(null);
            }}
          />
          <span>Prototype simulation · no ad accounts are changed</span>
        </div>
        {protectionPaused && <ProtectionPausedBanner onResume={() => setProtectionMode('active')} />}
        <AccountOverview
          visitors={simulation === 'empty' ? emptyVisitors : rangeVisitors}
          rangeLabel={rangeLabel}
          protectionMode={protectionMode}
          enabled={simulation !== 'error' && !loading}
          onView={(view) => {
            clearFilters();
            setSavedView(view);
          }}
        />
        <section className={styles.resultsGroup} aria-label="Traffic results">
          <section className={styles.viewBar}>
            <SegmentedControl
              label="Result type"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'visitors', label: 'Visitors' },
                { value: 'visits', label: 'Visits' },
              ]}
            />
            <div className={styles.savedViews} role="group" aria-label="Saved views">
              {(
                [
                  ['all', 'All visitors'],
                  ['review', 'Needs review'],
                  ['blocked', 'Blocked'],
                  ['wasted', 'Wasted > $20'],
                  ['shared', 'Shared IPs'],
                ] as Array<[SavedView, string]>
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={savedView === value}
                  onClick={() => setSavedView(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          {checked.size ? (
            <BatchBar count={checked.size} onClear={() => setChecked(new Set())}>
              <Button
                size="sm"
                variant="danger"
                disabled={protectionPaused}
                title={protectionPaused ? 'Resume protection to block visitors' : undefined}
                onClick={() => batchAction('block')}
              >
                Block now
              </Button>
              <Button
                size="sm"
                disabled={!visitors.some((visitor) => checked.has(visitor.ip) && hasBlock(visitor))}
                onClick={() => batchAction('unblock')}
              >
                Unblock
              </Button>
              <Button size="sm" onClick={() => batchAction('allow')}>
                Always allow
              </Button>
              <Button size="sm" onClick={() => batchAction('review')}>
                Mark reviewed
              </Button>
            </BatchBar>
          ) : (
            <section className={styles.filterBar} aria-label="Filters">
              <TextInput
                ref={searchRef}
                icon={<Search />}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search IP, network, city, campaign, click ID…"
                aria-label="Search visitors"
              />
              <label className={styles.selectFilter}>
                <Filter />
                <span>Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">Any</option>
                  {Object.keys(statusRank).map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <FilterChip
                label="Paid visits only"
                active={paidOnly}
                onClick={() => setPaidOnly((value) => !value)}
                onRemove={paidOnly ? () => setPaidOnly(false) : undefined}
              />
              <label className={styles.selectFilter}>
                <span>Platform</span>
                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  aria-label="Filter by platform"
                >
                  <option value="all">Any</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="meta_ads">Meta Ads</option>
                  <option value="microsoft_ads">Microsoft Ads</option>
                </select>
              </label>
              <label className={styles.selectFilter}>
                <span>Risk</span>
                <select
                  value={risk}
                  onChange={(event) => setRisk(event.target.value)}
                  aria-label="Filter by risk"
                >
                  <option value="all">Any</option>
                  <option value="high">High</option>
                  <option value="elevated">Elevated</option>
                  <option value="low">Low</option>
                </select>
              </label>
              {activeFilters > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all ({activeFilters})
                </Button>
              )}
            </section>
          )}
          <ActivityFunnel
            stages={activityFunnel}
            filtered={filtered.length}
            total={rangeVisitors.length}
            rangeLabel={rangeLabel}
          />
          {visitors.some((visitor) => visitor.status === 'failed') && (
            <div className={styles.outageBanner}>
              <AlertTriangle /> Google Ads exclusions failed for one visitor · a campaign reached its IP limit{' '}
              <button type="button" onClick={() => setStatus('failed')}>
                Review
              </button>
            </div>
          )}
          <div className={`${styles.workspace} ${selected ? styles.panelOpen : ''}`}>
            <section className={styles.results} aria-label="Results">
              {simulation === 'error' ? (
                <EmptyState
                  variant="error"
                  title="Couldn’t load visitors"
                  body="Your filters are safe. Retry the request when you’re ready."
                  action={{ label: 'Retry', onClick: () => changeSimulation('normal') }}
                />
              ) : loading ? (
                <LoadingRows />
              ) : simulation === 'empty' ? (
                <EmptyState
                  variant="no-data"
                  title="No traffic tracked yet"
                  body="Install the ClickGuard tag to start scoring visitors."
                  action={{ label: 'View setup guide', onClick: () => changeSimulation('normal') }}
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  variant="no-results"
                  title="No visitors match these filters"
                  body="Try removing a filter or searching for another IP."
                  action={{ label: 'Clear filters', onClick: clearFilters }}
                />
              ) : viewMode === 'visitors' ? (
                <VisitorTable
                  protectionPaused={protectionPaused}
                  visitors={sorted}
                  query={search}
                  selectedIp={selectedIp}
                  expandedIp={expandedIp}
                  checked={checked}
                  onOpen={openVisitor}
                  onAction={requestAction}
                  onExpand={(ip) => setExpandedIp((current) => (current === ip ? '' : ip))}
                  onCheck={toggleChecked}
                  onCheckAll={() =>
                    setChecked(
                      checked.size === sorted.length
                        ? new Set()
                        : new Set(sorted.map((visitor) => visitor.ip)),
                    )
                  }
                  sort={sort}
                  onSort={setSort}
                  cycleSort={cycleSort}
                  onOpenJourney={(ip, visitId) => {
                    setSelectedIp(ip);
                    if (visitId) setSelectedVisitId(visitId);
                    setJourneyOpen(true);
                  }}
                />
              ) : (
                <VisitsTable
                  rows={allVisits}
                  protectionPaused={protectionPaused}
                  onAction={requestAction}
                  selectedIp={selectedIp}
                  checked={checked}
                  onOpen={openVisitor}
                  onCheck={toggleChecked}
                />
              )}
              {!loading && filtered.length > 0 && (
                <footer className={styles.tableFooter}>
                  <span>
                    Showing {viewMode === 'visitors' ? sorted.length : allVisits.length} {viewMode} · filtered
                    from {rangeVisitors.length} visitors in range
                  </span>
                  <span>
                    {sort.key} · {sort.direction} · {rangeLabel}
                  </span>
                </footer>
              )}
            </section>
            {compactLayout ? (
              <Sheet
                open={Boolean(selected) && !journeyOpen}
                title={selected ? `Visitor ${selected.ip} details` : 'Visitor details'}
                closeLabel="Close visitor details"
                showCloseButton={false}
                onClose={() => setSelectedIp('')}
              >
                {visitorPanel}
              </Sheet>
            ) : (
              visitorPanel
            )}
          </div>
        </section>
      </main>
      <Sheet
        open={journeyOpen && Boolean(selected)}
        title={selected ? `Full journey for ${selected.ip}` : 'Full journey'}
        onClose={() => setJourneyOpen(false)}
      >
        {selected && (
          <FullJourney
            protectionPaused={protectionPaused}
            visitor={selected}
            selectedVisitId={selectedVisitId}
            setSelectedVisitId={setSelectedVisitId}
            tab={journeyTab}
            setTab={setJourneyTab}
            onBack={() => setJourneyOpen(false)}
            onAction={(action) => requestAction(selected.ip, action)}
          />
        )}
      </Sheet>
      {toast && (
        <Toast
          message={toast.message}
          action={toast.undo ? { label: 'Undo', onClick: toast.undo } : undefined}
        />
      )}
      <div className={styles.demoSwitcher}>
        <span>Demo data</span>
        <select value={simulation} onChange={(event) => changeSimulation(event.target.value as Simulation)}>
          <option value="normal">Normal</option>
          <option value="empty">Empty</option>
          <option value="error">Error</option>
          <option value="slow">Slow</option>
        </select>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  cycleSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  cycleSort: (key: SortKey) => void;
  align?: 'right';
}) {
  const active = sort.key === sortKey;
  return (
    <button
      className={align === 'right' ? styles.headerRight : ''}
      type="button"
      onClick={() => cycleSort(sortKey)}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      {active ? (
        sort.direction === 'desc' ? (
          <ArrowDown />
        ) : (
          <ArrowUp />
        )
      ) : (
        <span className={styles.sortIdle}>↕</span>
      )}
    </button>
  );
}

function VisitorTable({
  visitors,
  protectionPaused,
  query,
  selectedIp,
  expandedIp,
  checked,
  onOpen,
  onExpand,
  onCheck,
  onCheckAll,
  sort,
  cycleSort,
  onSort,
  onOpenJourney,
  onAction,
}: {
  visitors: VisitorVM[];
  protectionPaused: boolean;
  query: string;
  selectedIp: string;
  expandedIp: string;
  checked: Set<string>;
  onOpen: (ip: string, visitId?: string) => void;
  onExpand: (ip: string) => void;
  onCheck: (ip: string) => void;
  onCheckAll: () => void;
  sort: { key: SortKey; direction: SortDirection };
  cycleSort: (key: SortKey) => void;
  onSort: (sort: { key: SortKey; direction: SortDirection }) => void;
  onOpenJourney: (ip: string, visitId?: string) => void;
  onAction: (ip: string, action: VisitorAction) => void;
}) {
  return (
    <>
      <div className={styles.compactTableControls} aria-label="Compact visitor controls">
        <Stack direction="row" gap="1">
          <Checkbox
            label="Select all visitors"
            checked={visitors.length > 0 && checked.size === visitors.length}
            onChange={onCheckAll}
          />
          <span aria-hidden="true">Select all</span>
        </Stack>
        <label className={styles.selectFilter}>
          <span>Sort</span>
          <select
            aria-label="Sort visitors"
            value={`${sort.key}:${sort.direction}`}
            onChange={(event) => {
              const [key, direction] = event.target.value.split(':');
              onSort({ key: key as SortKey, direction: direction as SortDirection });
            }}
          >
            {(
              ['priority', 'visitor', 'status', 'risk', 'visits', 'bot', 'wasted', 'seen'] as SortKey[]
            ).flatMap((key) =>
              (['desc', 'asc'] as SortDirection[]).map((direction) => (
                <option key={`${key}:${direction}`} value={`${key}:${direction}`}>
                  {key} · {direction === 'desc' ? 'descending' : 'ascending'}
                </option>
              )),
            )}
          </select>
        </label>
      </div>
      <DataTable compactCards>
        <caption className={styles.journeyGuide}>
          <span>
            <b>Journeys</b> · risk 0–100 · first → last visit
          </span>
          <span>● Paid &nbsp; ○ Unpaid &nbsp; ◆ Block decision &nbsp; ▪ Conversion &nbsp; ┄ Threshold</span>
          <span>Selected range · current risk/status · full history in visitor details</span>
        </caption>
        <thead>
          <tr>
            <th className={styles.checkboxCell}>
              <Checkbox
                label="Select all visible visitors"
                checked={visitors.length > 0 && checked.size === visitors.length}
                onChange={onCheckAll}
              />
            </th>
            <th className={styles.expandCell}>
              <span className={styles.srOnly}>Expand</span>
            </th>
            <th>
              <SortHeader label="Visitor" sortKey="visitor" sort={sort} cycleSort={cycleSort} />
            </th>
            <th>
              <SortHeader label="Status" sortKey="status" sort={sort} cycleSort={cycleSort} />
            </th>
            <th>
              <SortHeader label="Risk" sortKey="risk" sort={sort} cycleSort={cycleSort} align="right" />
            </th>
            <th className={styles.secondaryColumn}>Top reason</th>
            <th>
              <SortHeader label="Journey" sortKey="visits" sort={sort} cycleSort={cycleSort} />
            </th>
            <th className={styles.secondaryColumn}>
              <SortHeader label="Bot prob." sortKey="bot" sort={sort} cycleSort={cycleSort} align="right" />
            </th>
            <th className={styles.secondaryColumn}>
              <SortHeader label="Wasted" sortKey="wasted" sort={sort} cycleSort={cycleSort} align="right" />
            </th>
            <th>
              <SortHeader label="Seen" sortKey="seen" sort={sort} cycleSort={cycleSort} align="right" />
            </th>
            <th>
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((visitor) => (
            <VisitorRow
              key={visitor.ip}
              protectionPaused={protectionPaused}
              visitor={visitor}
              query={query}
              selected={selectedIp === visitor.ip}
              expanded={expandedIp === visitor.ip}
              checked={checked.has(visitor.ip)}
              onOpen={onOpen}
              onExpand={onExpand}
              onCheck={onCheck}
              onOpenJourney={onOpenJourney}
              onAction={onAction}
            />
          ))}
        </tbody>
      </DataTable>
    </>
  );
}

function VisitorRow({
  visitor,
  protectionPaused,
  query,
  selected,
  expanded,
  checked,
  onOpen,
  onExpand,
  onCheck,
  onOpenJourney,
  onAction,
}: {
  visitor: VisitorVM;
  protectionPaused: boolean;
  query: string;
  selected: boolean;
  expanded: boolean;
  checked: boolean;
  onOpen: (ip: string, visitId?: string) => void;
  onExpand: (ip: string) => void;
  onCheck: (ip: string) => void;
  onOpenJourney: (ip: string, visitId?: string) => void;
  onAction: (ip: string, action: VisitorAction) => void;
}) {
  const blockedPlatforms = visitor.exclusions
    .filter((item) => item.state === 'excluded')
    .map((item) => item.platform);
  const onRow = (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('button,input,a,summary')) return;
    onOpen(visitor.ip);
  };
  const location =
    [visitor.city, visitor.country, visitor.isp].filter(Boolean).join(' · ') || 'Unknown location';
  return (
    <>
      <tr
        className={`${selected ? styles.rowSelected : ''} ${checked ? styles.rowChecked : ''}`}
        onClick={onRow}
        tabIndex={0}
        aria-selected={selected}
      >
        <td>
          <Checkbox label={`Select ${visitor.ip}`} checked={checked} onChange={() => onCheck(visitor.ip)} />
        </td>
        <td>
          <IconButton
            label={expanded ? `Collapse ${visitor.ip}` : `Expand ${visitor.ip}`}
            disabled={visitor.visits.length <= 1}
            onClick={() => onExpand(visitor.ip)}
          >
            {expanded ? <ChevronDown /> : <ChevronRight />}
          </IconButton>
        </td>
        <td className={styles.visitorCell}>
          <div>
            {visitor.needsReview && <i className={styles.unreadDot} title="Needs review" />}
            <strong className={styles.mono}>{highlight(visitor.ip, query)}</strong>
            {isRecent(visitor.firstSeen) && <span className={styles.newTag}>New</span>}
          </div>
          <small>
            {highlight(location, query)}
            {visitor.networkType !== 'residential' && (
              <em>{visitor.networkType === 'datacenter' ? 'DC' : visitor.networkType}</em>
            )}
            {visitor.deviceCount > 1 && <em>{visitor.deviceCount} devices</em>}
          </small>
        </td>
        <td>
          <StatusPill status={visitor.status} withPlatforms={protectionPaused ? [] : blockedPlatforms} />
          <small className={styles.cellSub}>
            {visitor.manualAction?.type === 'unblock'
              ? 'Manually unblocked'
              : visitor.manualAction?.type === 'block' && !protectionPaused
                ? 'Manual block'
                : protectionPaused &&
                    visitor.exclusions.some((item) => ['excluded', 'syncing', 'failed'].includes(item.state))
                  ? 'Enforcement paused'
                  : visitor.exclusions
                      .filter((item) => ['excluded', 'syncing', 'failed'].includes(item.state))
                      .map(
                        (item) =>
                          `${item.platform === 'google_ads' ? 'G' : item.platform === 'meta_ads' ? 'M' : 'MS'} ` +
                          (item.state === 'excluded'
                            ? '✓'
                            : item.state === 'failed'
                              ? '!'
                              : item.state === 'syncing'
                                ? '◌'
                                : '–'),
                      )
                      .join('  ')}
          </small>
        </td>
        <td>
          <RiskScore value={visitor.riskScore} threshold={visitor.threshold} />
        </td>
        <td className={styles.secondaryColumn}>
          <strong className={styles.cellMain}>
            {visitor.topSignals.find((signal) => signal.points > 0 && signal.id !== 'score_limit')?.label ??
              '—'}
          </strong>
          <small className={styles.cellSub}>
            {visitor.topSignals.length > 1 ? `+${visitor.topSignals.length - 1} more` : 'No other signals'}
          </small>
        </td>
        <td className={styles.journeyCell}>
          <VisitRibbon
            visits={visitor.visits}
            threshold={visitor.threshold}
            blockedAtVisitId={visitor.blockedAtVisitId}
            status={visitor.status}
            onDotClick={(visitId) => onOpen(visitor.ip, visitId)}
          />
        </td>
        <td className={`${styles.secondaryColumn} ${styles.numericCell}`}>
          <strong>{Math.round(visitor.maxBotProbability * 100)}%</strong>
          <small>{visitor.typicalInteraction} interaction</small>
        </td>
        <td className={`${styles.secondaryColumn} ${styles.numericCell}`}>
          <strong>${visitor.wastedSpend.toFixed(2)}</strong>
          <small>{visitor.paidVisitsBeforeBlock} paid clicks</small>
        </td>
        <td className={styles.numericCell}>
          <strong>{relativeTime(visitor.lastSeen)}</strong>
          <small>
            {shortTime(visitor.visits[0]?.startedAt ?? visitor.firstSeen)} → {shortTime(visitor.lastSeen)}
          </small>
        </td>
        <td>
          <Menu label="•••" ariaLabel={`Actions for ${visitor.ip}`}>
            <VisitorActions
              visitor={visitor}
              protectionPaused={protectionPaused}
              onAction={(action) => onAction(visitor.ip, action)}
            />
            <button type="button" onClick={() => onOpenJourney(visitor.ip)}>
              Open full journey
            </button>
            <button type="button" onClick={() => navigator.clipboard?.writeText(visitor.ip)}>
              Copy IP
            </button>
            <button type="button">Mark reviewed</button>
          </Menu>
        </td>
      </tr>
      {expanded && (
        <tr className={styles.expandedRow}>
          <td colSpan={11}>
            <ExpandedVisits
              visitor={visitor}
              onOpen={(visitId) => onOpen(visitor.ip, visitId)}
              onOpenJourney={(visitId) => onOpenJourney(visitor.ip, visitId)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedVisits({
  visitor,
  onOpen,
  onOpenJourney,
}: {
  visitor: VisitorVM;
  onOpen: (id: string) => void;
  onOpenJourney: (id: string) => void;
}) {
  const visits = [...visitor.visits].reverse().slice(0, 6);
  return (
    <div className={styles.expandedContent}>
      <header>
        <span>#</span>
        <span>Time</span>
        <span>Source</span>
        <span>Landing page</span>
        <span>Duration</span>
        <span>Interaction</span>
        <span>Bot</span>
        <span>Δ score</span>
      </header>
      {visits.map((visit) => (
        <button type="button" key={visit.id} onClick={() => onOpen(visit.id)} data-after={visit.afterBlock}>
          <span>
            {visitor.visits.findIndex((item) => item.id === visit.id) + 1}
            {visit.id === visitor.blockedAtVisitId ? ' ⚑' : ''}
          </span>
          <span>{shortTime(visit.startedAt)}</span>
          <SourceTag source={visit.source} platform={visit.platform} />
          <span>{visit.landingPath}</span>
          <span>{formatDuration(visit.durationMs)}</span>
          <span>{visit.interaction.level}</span>
          <span>{Math.round(visit.botProbability * 100)}%</span>
          <span>
            {visit.scoreBefore}→{visit.scoreAfter}
          </span>
        </button>
      ))}
      {visitor.blockedAt && (
        <div className={styles.systemRow}>
          ⛨ Added to exclusion lists ·{' '}
          {visitor.exclusions
            .filter((item) => item.state === 'excluded')
            .map((item) => platformName(item.platform))
            .join(', ')}{' '}
          · {shortTime(visitor.blockedAt)}
        </div>
      )}
      <footer>
        <Button
          variant="link"
          onClick={() => onOpenJourney(visitor.blockedAtVisitId ?? visitor.visits[0].id)}
        >
          Open full journey →
        </Button>
      </footer>
    </div>
  );
}

function VisitsTable({
  rows,
  selectedIp,
  checked,
  onOpen,
  onCheck,
  protectionPaused,
  onAction,
}: {
  protectionPaused: boolean;
  onAction: (ip: string, action: VisitorAction) => void;
  rows: Array<{ visitor: VisitorVM; visit: VisitVM }>;
  selectedIp: string;
  checked: Set<string>;
  onOpen: (ip: string, visitId?: string) => void;
  onCheck: (ip: string) => void;
}) {
  return (
    <DataTable label="Visits">
      <thead>
        <tr>
          <th />
          <th>Time</th>
          <th>Visitor</th>
          <th>Source</th>
          <th>Campaign › keyword</th>
          <th>Landing page</th>
          <th>Duration</th>
          <th>Interaction</th>
          <th>Bot</th>
          <th>Δ score</th>
          <th>Cost</th>
          <th>
            <span className={styles.srOnly}>Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ visitor, visit }) => (
          <tr
            key={visit.id}
            className={`${selectedIp === visitor.ip ? styles.rowSelected : ''} ${visit.afterBlock ? styles.rowAfterBlock : ''}`}
            onClick={() => onOpen(visitor.ip, visit.id)}
          >
            <td onClick={(event) => event.stopPropagation()}>
              <Checkbox
                label={`Select ${visitor.ip}`}
                checked={checked.has(visitor.ip)}
                onChange={() => onCheck(visitor.ip)}
              />
            </td>
            <td>{shortTime(visit.startedAt)}</td>
            <td>
              <strong className={styles.mono}>{visitor.ip}</strong>
              <StatusPill status={visitor.status} />
            </td>
            <td>
              <SourceTag source={visit.source} platform={visit.platform} />
            </td>
            <td>
              {visit.campaign ?? '—'}
              <small>{visit.keyword ?? ''}</small>
            </td>
            <td className={styles.mono}>{visit.landingPath}</td>
            <td>{formatDuration(visit.durationMs)}</td>
            <td>{visit.interaction.level}</td>
            <td>{Math.round(visit.botProbability * 100)}%</td>
            <td>
              {visit.scoreBefore} → {visit.scoreAfter}
            </td>
            <td>{visit.cpc ? `$${visit.cpc.toFixed(2)}` : 'No ad spend'}</td>
            <td onClick={(event) => event.stopPropagation()}>
              <Menu label="•••" ariaLabel={`Actions for ${visitor.ip} visit ${visit.id}`}>
                <VisitorActions
                  visitor={visitor}
                  protectionPaused={protectionPaused}
                  onAction={(action) => onAction(visitor.ip, action)}
                />
              </Menu>
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function VisitorPanel({
  visitor,
  protectionPaused,
  onClose,
  onPrevious,
  onNext,
  onOpenJourney,
  onAction,
  confirmAction,
  onConfirm,
  selectedVisitId,
  onSelectVisit,
}: {
  visitor: VisitorVM;
  protectionPaused: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOpenJourney: (visitId?: string) => void;
  onAction: (action: VisitorAction | null) => void;
  confirmAction: VisitorAction | null;
  onConfirm: () => void;
  selectedVisitId: string;
  onSelectVisit: (id: string) => void;
}) {
  const confirmationRef = useRef<HTMLDivElement>(null);
  const compactLayout = useCompactLayout();
  useEffect(() => {
    if (confirmAction) confirmationRef.current?.querySelector('button')?.focus();
  }, [confirmAction, visitor.ip]);
  const related = visitor.related;
  const verdict = (
    <VerdictCard
      status={visitor.status}
      sentence={visitor.verdict}
      meta={`${visitor.manualAction?.user ?? visitor.decisionBy ?? 'Auto'} · ${visitor.riskScore}`}
    />
  );
  const hasRelated =
    related &&
    [
      related.sameFingerprintIps,
      related.subnet24Ips,
      related.asnVisitorCount,
      related.networkBlockedAccounts30d,
    ].some((count) => count > 0);
  const vpnVisits = visitor.visits.filter((visit) => visit.vpnProxy).length;
  const noneVisits = visitor.visits.filter((visit) => visit.interaction.level === 'none').length;
  const interactionLabel =
    visitor.typicalInteraction === 'none'
      ? `None on ${noneVisits} of ${visitor.visits.length} visits`
      : `${visitor.typicalInteraction[0].toUpperCase() + visitor.typicalInteraction.slice(1)} on most visits`;
  return (
    <aside className={styles.visitorPanel} role="complementary" aria-label={`Visitor ${visitor.ip} details`}>
      <header className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>Visitor</span>
          <h2 className={styles.mono}>
            {visitor.ip}{' '}
            <button
              type="button"
              aria-label="Copy IP"
              onClick={() => navigator.clipboard?.writeText(visitor.ip)}
            >
              <Copy />
            </button>
          </h2>
          <p>
            {[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || 'Location unknown'}
          </p>
          <small>
            {[
              visitor.isp,
              visitor.asn,
              visitor.networkType,
              `${visitor.deviceCount} ${visitor.deviceCount === 1 ? 'device' : 'devices'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </div>
        <Stack direction="row" gap="1">
          <IconButton label="Previous visitor" onClick={onPrevious}>
            ↑
          </IconButton>
          <IconButton label="Next visitor" onClick={onNext}>
            ↓
          </IconButton>
          <IconButton label="Close details" onClick={onClose}>
            <X />
          </IconButton>
        </Stack>
        {!compactLayout && verdict}
      </header>
      <div className={styles.panelBody}>
        {compactLayout && <div className={styles.compactVerdict}>{verdict}</div>}
        <PanelSection
          label={
            visitor.manualAction
              ? 'Ad exclusions'
              : visitor.status === 'monitoring'
                ? 'Will be excluded on'
                : protectionPaused
                  ? 'Exclusions · enforcement paused'
                  : 'Excluded on'
          }
        >
          <ExclusionList rows={visitor.exclusions} protectionPaused={protectionPaused} />
        </PanelSection>
        <PanelSection label="How it unfolded">
          <DecisionRoute
            visits={visitor.visits}
            blockedAtVisitId={visitor.blockedAtVisitId}
            exclusions={visitor.exclusions}
            allowedBy={visitor.allowedBy}
            manualAction={visitor.manualAction}
            threshold={visitor.threshold}
            status={visitor.status}
          />
        </PanelSection>
        <PanelSection label="Risk journey" aside={`${visitor.riskScore} / 100`}>
          <RiskChart
            visits={visitor.visits}
            threshold={visitor.threshold}
            blockedAtVisitId={visitor.blockedAtVisitId}
            selectedVisitId={selectedVisitId}
            onSelectVisit={onSelectVisit}
          />
        </PanelSection>
        <PanelSection
          label={
            visitor.manualAction
              ? 'Recorded risk signals'
              : visitor.status === 'clean'
                ? 'Why it looks real'
                : visitor.status === 'monitoring'
                  ? 'Why it’s not blocked yet'
                  : visitor.status === 'allowed'
                    ? 'What we’d have blocked on'
                    : 'Why we blocked'
          }
        >
          {visitor.topSignals
            .filter((signal) => !['score_limit', 'decay'].includes(signal.id))
            .slice(0, 5)
            .map((signal) => (
              <SignalBar key={`${signal.id}-${signal.points}`} signal={signal} />
            ))}
        </PanelSection>
        <PanelSection label="Signals at a glance">
          <div className={styles.signalGrid}>
            <SignalMeter
              label="Location"
              value={`${visitor.city ?? 'Unknown'}, ${visitor.country ?? '—'}`}
              level={visitor.country ? 4 : 0}
            />
            <SignalMeter
              label="Interaction"
              value={interactionLabel}
              level={{ none: 0, low: 1, medium: 2, high: 4 }[visitor.typicalInteraction] ?? 0}
              tone={visitor.typicalInteraction === 'none' ? 'warning' : 'neutral'}
            />
            <SignalMeter
              label="Bot probability"
              value={`${Math.round(visitor.maxBotProbability * 100)}% max · ${Math.round(visitor.avgBotProbability * 100)}% avg`}
              level={Math.ceil(visitor.maxBotProbability * 4)}
              tone={
                visitor.maxBotProbability >= 0.7
                  ? 'danger'
                  : visitor.maxBotProbability >= 0.5
                    ? 'warning'
                    : 'neutral'
              }
            />
            <SignalMeter
              label="VPN / proxy"
              value={vpnVisits ? `Yes · ${vpnVisits} of ${visitor.visits.length} visits` : 'No'}
              level={visitor.vpnProxyAny ? 4 : 0}
              tone={visitor.vpnProxyAny ? 'warning' : 'neutral'}
            />
            <SignalMeter
              label="Form fill"
              value={
                visitor.formFills.invalid
                  ? `${visitor.formFills.invalid} invalid`
                  : visitor.formFills.valid
                    ? `${visitor.formFills.valid} valid`
                    : 'Never submitted'
              }
              level={visitor.formFills.invalid ? 4 : visitor.formFills.valid ? 2 : 0}
              tone={visitor.formFills.invalid ? 'danger' : visitor.formFills.valid ? 'success' : 'neutral'}
            />
            <SignalMeter
              label="Conversion"
              value={
                visitor.conversions
                  ? `${visitor.conversions} · $${visitor.conversionValueTotal.toFixed(0)}`
                  : 'None'
              }
              level={visitor.conversions ? 4 : 0}
              tone={visitor.conversions ? 'success' : 'neutral'}
            />
          </div>
        </PanelSection>
        <PanelSection label="Spend">
          <SpendReceipt visitor={visitor} />
        </PanelSection>
        {hasRelated && related && (
          <PanelSection label="Related">
            <dl className={styles.related}>
              {related.sameFingerprintIps > 0 && (
                <KeyValue label="Same device on other IPs" value={related.sameFingerprintIps} />
              )}
              {related.subnet24Ips > 0 && (
                <KeyValue
                  label="Same /24 subnet"
                  value={`${related.subnet24Ips} ${related.subnet24Ips === 1 ? 'visitor' : 'visitors'}`}
                />
              )}
              {related.asnVisitorCount > 0 && (
                <KeyValue
                  label="Same network"
                  value={`${related.asnVisitorCount} visitors${related.asnBlockedCount > 0 ? ` · ${related.asnBlockedCount} blocked` : ''}`}
                />
              )}
              {related.networkBlockedAccounts30d > 0 && (
                <KeyValue
                  label="Network intelligence"
                  value={`${related.networkBlockedAccounts30d} other ClickGuard accounts`}
                />
              )}
            </dl>
          </PanelSection>
        )}
        <PanelSection label="Recent visits" aside={`${visitor.visits.length} total`}>
          <div className={styles.recentVisits}>
            {[...visitor.visits]
              .reverse()
              .slice(0, 3)
              .map((visit) => (
                <button type="button" key={visit.id} onClick={() => onOpenJourney(visit.id)}>
                  <time>{shortTime(visit.startedAt)}</time>
                  <SourceTag source={visit.source} platform={visit.platform} />
                  <span>{visit.landingPath}</span>
                  <small>
                    {visit.afterBlock
                      ? 'after block'
                      : visit.id === visitor.blockedAtVisitId
                        ? '⚑ trigger'
                        : `${visit.scoreAfter - visit.scoreBefore >= 0 ? '+' : ''}${visit.scoreAfter - visit.scoreBefore}`}
                  </small>
                </button>
              ))}
          </div>
          <Button variant="link" onClick={() => onOpenJourney()}>
            See all visits →
          </Button>
        </PanelSection>
        <PanelSection label="Details">
          <dl className={styles.detailsGrid}>
            <KeyValue label="IP address" value={visitor.ip} mono />
            <KeyValue label="Network" value={`${visitor.isp ?? '—'} · ${visitor.asn ?? '—'}`} />
            <KeyValue label="First seen" value={shortTime(visitor.firstSeen)} />
            <KeyValue label="Last seen" value={shortTime(visitor.lastSeen)} />
            <KeyValue label="Devices" value={visitor.deviceCount} />
            <KeyValue label="Risk threshold" value={visitor.threshold} />
          </dl>
        </PanelSection>
      </div>
      <footer className={styles.panelFooter}>
        {confirmAction ? (
          <div className={styles.confirmCard} ref={confirmationRef}>
            <strong>
              {actionLabel[confirmAction]} {visitor.ip}?
            </strong>
            <p>{actionDescription(visitor, confirmAction)}</p>
            <p>Prototype only — no real ad accounts are changed.</p>
            <div>
              <Button size="sm" onClick={() => onAction(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={confirmAction === 'block' && protectionPaused}
                variant={confirmAction === 'block' ? 'danger' : 'primary'}
                onClick={onConfirm}
              >
                {actionLabel[confirmAction]}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button variant="primary" onClick={() => onOpenJourney()}>
              Open full journey →
            </Button>
            <VisitorActions visitor={visitor} protectionPaused={protectionPaused} onAction={onAction} />
          </>
        )}
      </footer>
    </aside>
  );
}

function PanelSection({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.panelSection}>
      <header>
        <h3>{label}</h3>
        {aside && <span>{aside}</span>}
      </header>
      {children}
    </section>
  );
}

function relativeTime(value: string) {
  const diff = new Date('2026-09-17T14:00:00Z').getTime() - new Date(value).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return `${Math.round(diff / 86400000)}d ago`;
}
function isRecent(value: string) {
  return new Date('2026-09-17T14:00:00Z').getTime() - new Date(value).getTime() < 86400000;
}
function highlight(value: string, query: string): ReactNode {
  if (!query) return value;
  const index = value.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className={styles.searchMatch}>{value.slice(index, index + query.length)}</mark>
      {value.slice(index + query.length)}
    </>
  );
}
function exportCsv(visitors: VisitorVM[]) {
  const rows = [
    ['ip', 'status', 'risk', 'visits', 'paid_visits', 'wasted_spend'],
    ...visitors.map((visitor) => [
      visitor.ip,
      visitor.status,
      visitor.riskScore,
      visitor.visits.length,
      visitor.paidVisits,
      visitor.wastedSpend.toFixed(2),
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'clickguard-threats.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}
