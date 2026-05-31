import { createContext, useContext, useState, useCallback } from 'react';
import './Toast.scss';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', duration = 2800) => {
    const id = ++idCounter;
    setToasts((list) => [...list, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  // 편의 메서드: toast.success / toast.error / toast.info
  const toast = {
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    info: (m, d) => show(m, 'info', d),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role="status"
            onClick={() => remove(t.id)}
          >
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}
            </span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
