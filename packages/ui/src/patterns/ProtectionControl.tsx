import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Pause, ShieldCheck, ShieldOff } from 'lucide-react';
import type { ProtectionMode } from '../data/protectionSimulation';
import { Button } from '../primitives';
import styles from '../styles/Protection.module.css';

export function ProtectionControl({ mode, onChange }: {
  mode: ProtectionMode; onChange: (mode: ProtectionMode) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const paused = mode === 'paused';
  const dismiss = () => {
    setConfirming(false);
    controlRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  };
  return <>
    <div className={styles.control} ref={controlRef}>
      <span className={styles.status} data-paused={paused}>
        {paused ? <ShieldOff aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
        {paused ? 'Protection paused' : 'Protection active'}
      </span>
      <Button size="sm" variant={paused ? 'primary' : 'secondary'}
        iconStart={paused ? <ShieldCheck aria-hidden="true" /> : <Pause aria-hidden="true" />}
        onClick={() => paused ? onChange('active') : setConfirming(true)}>
        {paused ? 'Resume protection' : 'Pause all protection'}
      </Button>
    </div>
    {confirming && <PauseProtectionDialog onCancel={dismiss} onConfirm={() => { onChange('paused'); dismiss(); }} />}
  </>;
}

export function PauseProtectionDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const safeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.showModal();
    safeButtonRef.current?.focus();
    return () => { dialog.close(); previousFocus?.focus(); };
  }, []);
  const closeThen = (callback: () => void) => { dialogRef.current?.close(); callback(); };
  return <dialog ref={dialogRef} className={styles.dialog} role="alertdialog" aria-modal="true"
    aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); closeThen(onCancel); }}
    onClick={(event) => { if (event.target === event.currentTarget) closeThen(onCancel); }}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape') { event.preventDefault(); closeThen(onCancel); }
      if (event.key === 'Tab') {
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <div className={styles.dialogBody}>
      <span className={styles.warningIcon}><AlertTriangle aria-hidden="true" /></span>
      <span className={styles.eyebrow}>Account-wide action</span>
      <h2 id={titleId}>Pause all protection?</h2>
      <div id={descriptionId}>
        <p>Blocking will be suspended across all connected ad platforms, including existing exclusions.</p>
        <div className={styles.consequences}>
          <ShieldOff aria-hidden="true" />
          <p><strong>Risky clicks will no longer be blocked.</strong><br />Monitoring continues, but wasted spend can keep growing while protection is paused.</p>
        </div>
        <p className={styles.disclosure}>Prototype simulation — no ad accounts are changed. Resume protection at any time.</p>
      </div>
      <div className={styles.dialogActions}>
        <button ref={safeButtonRef} type="button" className={styles.keepButton} onClick={() => closeThen(onCancel)}>Keep protection on</button>
        <Button variant="danger" onClick={() => closeThen(onConfirm)}>Pause all protection</Button>
      </div>
    </div>
  </dialog>;
}

export function ProtectionPausedBanner({ onResume }: { onResume: () => void }) {
  return <section className={styles.banner} aria-label="Protection warning">
    <ShieldOff aria-hidden="true" />
    <div role="status"><strong>All protection paused</strong><p>Monitoring continues. New and existing blocks are suspended in this demo.</p></div>
    <Button size="sm" variant="primary" iconStart={<ShieldCheck aria-hidden="true" />} onClick={onResume}>Resume protection</Button>
  </section>;
}
