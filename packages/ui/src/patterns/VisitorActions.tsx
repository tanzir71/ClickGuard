import type { VisitorAction, VisitorVM } from '../model';
import { Button } from '../primitives';
import { hasBlock } from './visitorEnforcement';

export function VisitorActions({
  visitor,
  protectionPaused,
  onAction,
}: {
  visitor: Pick<VisitorVM, 'status'>;
  protectionPaused: boolean;
  onAction: (action: VisitorAction) => void;
}) {
  const blocked = hasBlock(visitor);
  return (
    <>
      <Button
        size="sm"
        variant={blocked ? 'secondary' : 'danger'}
        disabled={!blocked && protectionPaused}
        title={!blocked && protectionPaused ? 'Resume protection to block visitors' : undefined}
        onClick={() => onAction(blocked ? 'unblock' : 'block')}
      >
        {blocked ? 'Unblock' : 'Block now'}
      </Button>
      <Button size="sm" onClick={() => onAction(visitor.status === 'allowed' ? 'remove_allowance' : 'allow')}>
        {visitor.status === 'allowed' ? 'Remove allowance' : 'Always allow this IP'}
      </Button>
    </>
  );
}
