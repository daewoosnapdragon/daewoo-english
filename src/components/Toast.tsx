'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast { id: string; message: string; type?: 'info' | 'success' | 'error'; exiting?: boolean; }

interface ToastContextType {
  toast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3000);
  }, []);

  const icons = { info: '✦', success: '✓', error: '✕' };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: '#0a0a0a', border: '1px solid #2a2a2a',
            padding: '8px 14px', fontSize: 11, color: '#e0a0b0',
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', gap: 8,
            animation: t.exiting ? 'toastOut 0.3s ease forwards' : 'toastIn 0.3s ease',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <span style={{ color: t.type === 'error' ? '#e06070' : t.type === 'success' ? '#80c0a0' : '#e0a0b0' }}>
              {icons[t.type || 'info']}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
