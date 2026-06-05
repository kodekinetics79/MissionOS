import { useEffect, useState } from 'react';

type ToastItem = { id: string; title: string; message: string; tone: 'success' | 'warning' | 'error' | 'info' };

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; message: string; tone?: ToastItem['tone'] }>).detail;
      if (!detail?.title) return;
      const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const toast: ToastItem = { id, title: detail.title, message: detail.message, tone: detail.tone ?? 'success' };
      setToasts((current) => [toast, ...current].slice(0, 4));
      window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3200);
    };
    window.addEventListener('missionos:toast', handler as EventListener);
    return () => window.removeEventListener('missionos:toast', handler as EventListener);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.tone}`}>
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

