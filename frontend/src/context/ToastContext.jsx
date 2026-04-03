import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {{ label: string, onClick: () => void }} [action] - optional undo action
   * @param {number} duration - milliseconds before auto-dismiss (0 = manual only)
   * @returns {string} toast id
   */
  const toast = useCallback(
    (message, type = 'info', action = null, duration = 3500) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      setToasts((prev) => [...prev, { id, message, type, action }]);

      if (duration > 0) {
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback((msg, action, duration) => toast(msg, 'success', action, duration), [toast]);
  const error = useCallback((msg, duration) => toast(msg, 'error', null, duration || 5000), [toast]);
  const info = useCallback((msg, action, duration) => toast(msg, 'info', action, duration), [toast]);
  const warning = useCallback((msg, duration) => toast(msg, 'warning', null, duration), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}

const TYPE_STYLES = {
  success: 'border-primary-700 bg-primary-950 text-primary-300',
  error: 'border-red-800 bg-red-950/80 text-red-300',
  warning: 'border-yellow-800 bg-yellow-950/80 text-yellow-300',
  info: 'border-dark-50 bg-dark-200 text-gray-200',
};

const TYPE_ICON = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastItem({ toast, onRemove }) {
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border
                  shadow-lg animate-slide-up ${TYPE_STYLES[toast.type]}`}
    >
      <span className="text-sm font-bold mt-0.5">{TYPE_ICON[toast.type]}</span>
      <span className="flex-1 text-sm">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action.onClick();
            onRemove(toast.id);
          }}
          className="text-xs font-semibold underline opacity-90 hover:opacity-100 whitespace-nowrap"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 opacity-60 hover:opacity-100 text-xs leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
