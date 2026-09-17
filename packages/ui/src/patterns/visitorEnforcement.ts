import type { ExclusionVM, Platform, VisitorAction, VisitorVM } from '../model';

export const hasBlock = (visitor: Pick<VisitorVM, 'status'>) =>
  ['blocked', 'pending', 'failed'].includes(visitor.status);

export const actionLabel: Record<VisitorAction, string> = {
  block: 'Block now',
  unblock: 'Unblock',
  allow: 'Always allow',
  remove_allowance: 'Remove allowance',
};

export function actionDescription(visitor: VisitorVM, action: VisitorAction) {
  switch (action) {
    case 'block':
      return (
        'Exclude this IP on connected ad platforms now, regardless of its risk score. ' +
        (visitor.status === 'allowed' ? 'Its always-allow override will be removed. ' : '') +
        'Recorded risk and visit history will not change.'
      );
    case 'unblock':
      return (
        'Remove current exclusions and cancel pending blocks. Monitoring continues, ' +
        'and future activity can trigger another block. This does not always-allow the IP.'
      );
    case 'allow':
      return 'Remove current exclusions and never automatically block this IP while its always-allow override is active.';
    case 'remove_allowance':
      return 'Remove the always-allow override and return to automatic monitoring. This does not manually block the IP now.';
  }
}

// The prototype account has Google and Meta connected. Preserve explicit disconnected records.
const demoPlatforms: Platform[] = ['google_ads', 'meta_ads'];
export function applyVisitorAction(visitor: VisitorVM, action: VisitorAction, at: string): VisitorVM {
  const excluded: ExclusionVM[] = [
    ...new Set([...demoPlatforms, ...visitor.exclusions.map((row) => row.platform)]),
  ].map((platform) => {
    const previous = visitor.exclusions.find((row) => row.platform === platform);
    return previous?.state === 'not_connected' ? previous : { platform, state: 'excluded', at };
  });
  const removed = visitor.exclusions.map((row): ExclusionVM =>
    row.state === 'not_connected' || (row.state === 'if_blocked' && action !== 'allow')
      ? row
      : { platform: row.platform, state: 'removed', at },
  );
  const messages: Record<VisitorAction, string> = {
    block: 'Manually blocked by Tanzir. Connected ad exclusions are active; recorded risk is unchanged.',
    unblock:
      'Manually unblocked by Tanzir. Current exclusions were removed; future activity can trigger another block.',
    allow:
      'Always allowed by Tanzir. Automatic blocking is disabled for this IP until the allowance is removed.',
    remove_allowance:
      'Allowance removed by Tanzir. Automatic monitoring has resumed; this IP has not been manually blocked.',
  };
  return {
    ...visitor,
    status: action === 'block' ? 'blocked' : action === 'allow' ? 'allowed' : 'monitoring',
    manualAction: { type: action, user: 'Tanzir', at },
    allowedBy: action === 'allow' ? { user: 'Tanzir', at, note: 'Reviewed in Threat Monitoring' } : undefined,
    exclusions: action === 'block' ? excluded : removed,
    verdict: messages[action],
    // Manual enforcement is independent of scoring. Do not invent a visit/threshold decision.
  };
}
