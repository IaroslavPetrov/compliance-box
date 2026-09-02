"use client";

import { createContext, useContext, useState, useCallback } from 'react';
import { IconCheckCircle, IconXCircle, IconAlert, IconClose } from '../components/icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message };
    setToasts(prev => [...prev, newToast]);
    setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);

  const value: ToastContextType = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
    warning: (msg) => addToast('warning', msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '420px',
        width: 'calc(100% - 3rem)',
        pointerEvents: 'none',
      }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      icon: <IconCheckCircle size={18} />,
      color: '#00C853',
      bg: 'rgba(0, 200, 83, 0.12)',
      border: '#00C853',
    },
    error: {
      icon: <IconXCircle size={18} />,
      color: '#FF4444',
      bg: 'rgba(255, 68, 68, 0.12)',
      border: '#FF4444',
    },
    info: {
      icon: <IconAlert size={18} />,
      color: '#4A90E2',
      bg: 'rgba(74, 144, 226, 0.12)',
      border: '#4A90E2',
    },
    warning: {
      icon: <IconAlert size={18} />,
      color: '#FFC107',
      bg: 'rgba(255, 193, 7, 0.12)',
      border: '#FFC107',
    },
  }[toast.type];

  return (
    <div
      className="toast-slide-in"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '10px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
        pointerEvents: 'auto',
      }}
    >
      <span style={{ flexShrink: 0, paddingTop: '0.1rem', color: config.color }}>
        {config.icon}
      </span>
      <span style={{
        flex: 1,
        color: '#FFFFFF',
        fontSize: '0.95rem',
        lineHeight: 1.45,
        wordBreak: 'break-word',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#666666',
          cursor: 'pointer',
          padding: '0',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#FF4444'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#666666'; }}
        aria-label="Закрыть"
      >
        <IconClose size={16} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}