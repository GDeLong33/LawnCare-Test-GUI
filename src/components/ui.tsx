import { useCallback, useEffect, useState, type ReactNode } from 'react';

const ICONS: Record<string, ReactNode> = {
  dashboard: <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z" />,
  customers: (
    <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4zm-8-.5C5.3 13.5 1 14.8 1 17.5V20h5v-2c0-1.6.8-3 2.3-4.1-.1-.3-.2-.4-.3-.4z" />
  ),
  workorder: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1 7V3.5L18.5 9zM8 13h8v2H8zm0 4h8v2H8zm0-8h3v2H8z" />,
  routes: <path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6zm0 8.5A2.5 2.5 0 1 1 14.5 8 2.5 2.5 0 0 1 12 10.5zM5 20h14v2H5z" />,
  pricing: <path d="M4 2h16v20H4zm2 2v4h12V4zm1 7v2h2v-2zm4 0v2h2v-2zm4 0v6h2v-6zm-8 4v2h2v-2zm4 0v2h2v-2zm-4 4v1h2v-1zm4 0v1h2v-1z" />,
  reports: <path d="M3 3h2v16h16v2H3zm4 10h3v5H7zm5-6h3v11h-3zm5 3h3v8h-3z" />,
  print: <path d="M7 3h10v4H7zm-3 6h16a2 2 0 0 1 2 2v6h-4v4H6v-4H2v-6a2 2 0 0 1 2-2zm4 7v3h8v-3zm10-4.5a1 1 0 1 0 1-1 1 1 0 0 0-1 1z" />,
  plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />,
  calendar: <path d="M7 2h2v2h6V2h2v2h3v18H4V4h3zm-1 8v10h12V10z" />,
  invoice: <path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zm3 5v2h8V7zm0 4v2h8v-2zm0 4v2h5v-2z" />,
  leaf: <path d="M20 3S9 2 5 9c-2.5 4.5 0 9 0 9s1.5-3.5 5-6c-2 2.5-3 5-3.5 8h2c.8-4.8 3.6-8.4 7.5-10.5C20 6.5 20 3 20 3z" />,
  truck: <path d="M2 5h12v10h1V8h4l3 4v5h-2a3 3 0 0 1-6 0H9a3 3 0 0 1-6 0H2zm15 5v2h3l-1.5-2zM6 16a1 1 0 1 0 1 1 1 1 0 0 0-1-1zm11 0a1 1 0 1 0 1 1 1 1 0 0 0-1-1z" />,
  grip: <path d="M8 4h3v3H8zm5 0h3v3h-3zM8 10.5h3v3H8zm5 0h3v3h-3zM8 17h3v3H8zm5 0h3v3h-3z" />,
  search: <path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />,
};

export function Icon({ name }: { name: keyof typeof ICONS | string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls = 'pill pill-' + status.toLowerCase().replace(/\s+/g, '-');
  return <span className={cls}>{status}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Tiny transient confirmation message. */
export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  return [msg ? <div className="toast">{msg}</div> : null, show];
}
