import { createContext, useContext, useState, useCallback, useRef } from 'react';
import './ConfirmDialog.scss';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  // confirm('메시지') 또는 confirm({ title, message, confirmText, danger })
  const confirm = useCallback((opts = {}) => {
    const o = typeof opts === 'string' ? { message: opts } : opts;
    setState({
      title: o.title || '확인',
      message: o.message || '',
      confirmText: o.confirmText || '확인',
      cancelText: o.cancelText || '취소',
      danger: o.danger ?? false,
    });
    return new Promise((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (result) => {
    setState(null);
    if (resolver.current) { resolver.current(result); resolver.current = null; }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-backdrop" onClick={() => close(false)}>
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="confirm-title">{state.title}</h3>
            {state.message && <p className="confirm-message">{state.message}</p>}
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => close(false)}>
                {state.cancelText}
              </button>
              <button
                className={`confirm-btn ok ${state.danger ? 'danger' : ''}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
};
