// ============================================================
// KalaSetu — Toast Provider
// Custom toast notification system
// ============================================================
'use client';

import { useUIStore } from '@/lib/stores/ui-store';

export default function ToastProvider() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="material-symbols-outlined toast-icon">
              {toast.type === 'success'
                ? 'check_circle'
                : toast.type === 'error'
                  ? 'error'
                  : toast.type === 'warning'
                    ? 'warning'
                    : 'info'}
            </span>
            <div>
              <strong className="toast-title">{toast.title}</strong>
              {toast.message && (
                <p className="toast-message">{toast.message}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="toast-close"
            aria-label="Close notification"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
