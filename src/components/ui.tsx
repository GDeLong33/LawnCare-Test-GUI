import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const ICONS: Record<string, ReactNode> = {
  home: <path d="M12 3 2 11h3v10h6v-6h2v6h6V11h3z" />,
  customers: (
    <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4zm-8-.5C5.3 13.5 1 14.8 1 17.5V20h5v-2c0-1.6.8-3 2.3-4.1-.1-.3-.2-.4-.3-.4z" />
  ),
  routes: <path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6zm0 8.5A2.5 2.5 0 1 1 14.5 8 2.5 2.5 0 0 1 12 10.5zM5 20h14v2H5z" />,
  workorder: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9zM8 13h8v2H8zm0 4h8v2H8zm0-8h3v2H8z" />,
  pricing: <path d="M4 2h16v20H4zm2 2v4h12V4zm1 7v2h2v-2zm4 0v2h2v-2zm4 0v6h2v-6zm-8 4v2h2v-2zm4 0v2h2v-2zm-4 4v1h2v-1zm4 0v1h2v-1z" />,
  payments: <path d="M2 5h20v14H2zm2 2v2h16V7zm0 5v5h16v-5zm2 2h5v1.5H6z" />,
  reports: <path d="M3 3h2v16h16v2H3zm4 10h3v5H7zm5-6h3v11h-3zm5 3h3v8h-3z" />,
  data: <path d="M12 2C7 2 4 3.6 4 5.5v13C4 20.4 7 22 12 22s8-1.6 8-3.5v-13C20 3.6 17 2 12 2zm0 2c3.9 0 6 1.1 6 1.5S15.9 7 12 7 6 5.9 6 5.5 8.1 4 12 4zm6 14.5c0 .4-2.1 1.5-6 1.5s-6-1.1-6-1.5v-2.7c1.5.8 3.6 1.2 6 1.2s4.5-.4 6-1.2zm0-5c0 .4-2.1 1.5-6 1.5s-6-1.1-6-1.5v-2.7c1.5.8 3.6 1.2 6 1.2s4.5-.4 6-1.2zM6 8.3c1.5.8 3.6 1.2 6 1.2s4.5-.4 6-1.2v2.2c0 .4-2.1 1.5-6 1.5s-6-1.1-6-1.5z" />,
  print: <path d="M7 3h10v4H7zm-3 6h16a2 2 0 0 1 2 2v6h-4v4H6v-4H2v-6a2 2 0 0 1 2-2zm4 7v3h8v-3zm10-4.5a1 1 0 1 0 1-1 1 1 0 0 0-1 1z" />,
  plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />,
  search: <path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />,
  mail: <path d="M2 4h20v16H2zm2 2v.5l8 5 8-5V6zm0 2.8V18h16V8.8l-8 5z" />,
  chevron: <path d="m9 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6z" />,
  leaf: <path d="M20 3S9 2 5 9c-2.5 4.5 0 9 0 9s1.5-3.5 5-6c-2 2.5-3 5-3.5 8h2c.8-4.8 3.6-8.4 7.5-10.5C20 6.5 20 3 20 3z" />,
  warn: <path d="M12 2 1 21h22zm-1 7h2v6h-2zm0 8h2v2h-2z" />,
  grip: <path d="M8 4h3v3H8zm5 0h3v3h-3zM8 10.5h3v3H8zm5 0h3v3h-3zM8 17h3v3H8zm5 0h3v3h-3z" />,
  download: <path d="M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16l-5.7-5.7 1.4-1.4 3.3 3.3zM4 18h16v2H4z" />,
  upload: <path d="M11 16h2V6.8l3.3 3.3 1.4-1.4L12 3 6.3 8.7l1.4 1.4L11 6.8zM4 18h16v2H4z" />,
  close: <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z" />,
};

export function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={'pill pill-' + status.toLowerCase().replace(/\s+/g, '-')}>{status}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
      {label}
    </label>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    // Focus the first form control, or the dialog itself.
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button');
    (first ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        className={'card modal' + (wide ? ' wide' : '')}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Content rendered here is invisible on screen and is the only thing that prints. */
export function PrintArea({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-root">{children}</div>, document.body);
}

/** Transient confirmation message. Render the returned node once per page. */
export function useToast(): [ReactNode, (msg: ReactNode) => void] {
  const [msg, setMsg] = useState<ReactNode>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3800);
    return () => clearTimeout(t);
  }, [msg, key]);
  const show = useCallback((m: ReactNode) => {
    setMsg(m);
    setKey((k) => k + 1);
  }, []);
  return [
    msg ? (
      <div className="toast" role="status" aria-live="polite">
        {msg}
      </div>
    ) : null,
    show,
  ];
}
