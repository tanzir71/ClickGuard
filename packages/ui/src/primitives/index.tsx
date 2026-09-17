import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { LoaderCircle, X } from 'lucide-react';
import styles from '../styles/ClickGuard.module.css';

export function Stack({
  direction = 'column',
  gap = '3',
  align,
  justify,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  direction?: 'row' | 'column';
  gap?: '1' | '2' | '3' | '4' | '6';
  align?: string;
  justify?: string;
}) {
  return (
    <div
      className={`${styles.stack} ${styles[`direction-${direction}`]} ${styles[`gap-${gap}`]} ${className}`}
      data-align={align}
      data-justify={justify}
      {...props}
    />
  );
}

export function Grid({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.grid} ${className}`} {...props} />;
}

export function Text({
  as: Tag = 'span',
  tone = 'primary',
  mono = false,
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'span' | 'p' | 'strong' | 'div';
  tone?: 'primary' | 'secondary' | 'danger' | 'success';
  mono?: boolean;
}) {
  return (
    <Tag
      className={`${styles.text} ${styles[`tone-${tone}`]} ${mono ? styles.mono : ''} ${className}`}
      {...props}
    />
  );
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  iconStart,
  iconEnd,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md';
  loading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}) {
  return (
    <button
      className={`${styles.button} ${styles[`button-${variant}`]} ${styles[`button-${size}`]} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className={styles.spin} aria-hidden="true" /> : iconStart}
      {children}
      {iconEnd}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`${styles.iconButton} ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span className={styles.tooltipWrap} tabIndex={0}>
      {children}
      <span role="tooltip" className={styles.tooltip}>
        {content}
      </span>
    </span>
  );
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.checkbox}>
      <input type="checkbox" {...props} />
      <span className={styles.srOnly}>{label}</span>
    </label>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }
>(function TextInput({ icon, className = '', ...props }, ref) {
  return (
    <label className={`${styles.inputWrap} ${className}`}>
      {icon}
      <input ref={ref} className={styles.textInput} {...props} />
    </label>
  );
});

export function Menu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className={styles.menu}>
      <summary className={styles.menuTrigger}>{label}</summary>
      <div className={styles.menuContent}>{children}</div>
    </details>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? styles.segmentActive : ''}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.tabs} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? styles.tabActive : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className={styles.sheetLayer} role="presentation">
      <button className={styles.scrim} aria-label="Close full journey" onClick={onClose} />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        {children}
        <IconButton label="Close full journey" className={styles.sheetClose} onClick={onClose}>
          <X />
        </IconButton>
      </section>
    </div>
  );
}

export function Toast({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className={styles.toast} role="status">
      <span>{message}</span>
      {action && (
        <button type="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
