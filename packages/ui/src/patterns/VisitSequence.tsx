import {
  ArrowRight,
  LogIn,
  MousePointer2,
  ShieldX,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { VisitVM, VisitorVM } from '../model';
import { describeJourneyVisit, visitSource } from '../domain/journeyNarrative';
import styles from '../styles/ClickGuard.module.css';

function FlowConnector() {
  return (
    <svg className={styles.sequenceConnector} viewBox="0 0 40 24" aria-hidden="true" focusable="false">
      <path d="M 0 12 H 34 M 27 5 L 34 12 L 27 19" />
    </svg>
  );
}

export function VisitSequence({ visit, visitor }: { visit: VisitVM; visitor: VisitorVM }) {
  const episode = describeJourneyVisit(visit, visitor);
  const ResultIcon = episode.decision
    ? ShieldX
    : visit.conversion
      ? ShoppingBag
      : episode.delta < 0
        ? TrendingDown
        : TrendingUp;
  const resultDetail = episode.decision
    ? `Threshold ${visitor.threshold} · decision recorded`
    : visit.conversion?.value !== undefined
      ? `$${visit.conversion.value.toFixed(2)} conversion value`
      : `${episode.delta > 0 ? '+' : ''}${episode.delta} points this visit`;

  return (
    <ol className={styles.visitSequence} aria-label="Visit story">
      <li>
        <header className={styles.sequenceStage}>
          <i>
            <LogIn aria-hidden="true" />
          </i>
          <span>
            <small>01</small>
            <span>Arrival</span>
          </span>
        </header>
        <div className={styles.sequenceBody}>
          <strong>{visitSource(visit)}</strong>
          <p title={visit.landingUrl}>{visit.landingPath}</p>
        </div>
        <div className={styles.sequenceMetric}>
          <span>{visit.source === 'paid' ? 'Click cost' : 'Traffic'}</span>
          <b>
            {visit.source === 'paid'
              ? visit.cpc !== undefined
                ? `$${visit.cpc.toFixed(2)}`
                : 'Not recorded'
              : 'Unpaid'}
          </b>
        </div>
        <FlowConnector />
      </li>
      <li>
        <header className={styles.sequenceStage}>
          <i>
            <MousePointer2 aria-hidden="true" />
          </i>
          <span>
            <small>02</small>
            <span>On the site</span>
          </span>
        </header>
        <div className={styles.sequenceBody}>
          <strong>{episode.behavior}</strong>
          <p>
            {visit.jsExecuted
              ? `${visit.interaction.clicks} clicks · ${visit.interaction.pointerMoves} pointer moves`
              : 'The tracking tag did not run.'}
          </p>
        </div>
        <div className={styles.sequenceMetric}>
          <span>{visit.jsExecuted ? 'Bot probability' : 'Tracking'}</span>
          <b>{visit.jsExecuted ? `${Math.round(visit.botProbability * 100)}%` : 'Unavailable'}</b>
        </div>
        <FlowConnector />
      </li>
      <li data-tone={episode.tone}>
        <header className={styles.sequenceStage}>
          <i>
            <ResultIcon aria-hidden="true" />
          </i>
          <span>
            <small>03</small>
            <span>Result</span>
          </span>
        </header>
        <div className={styles.sequenceBody}>
          <strong>{episode.result}</strong>
          <p>{resultDetail}</p>
        </div>
        <div className={styles.sequenceMetric}>
          <span>Risk score</span>
          <span className={styles.episodeScore}>
            <span>{visit.scoreBefore}</span>
            <ArrowRight aria-hidden="true" />
            <span className={styles.srOnly}> to </span>
            <b>{visit.scoreAfter}</b>
          </span>
        </div>
      </li>
    </ol>
  );
}
