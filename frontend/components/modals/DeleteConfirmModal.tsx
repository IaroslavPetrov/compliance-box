"use client";

import { useIsMobile } from '../../hooks/useIsMobile';
import { IconAlert } from '../icons';

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  title,
  message,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: isMobile ? '1rem' : '2rem',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#1A1A1A',
          borderRadius: '12px',
          padding: isMobile ? '1.5rem' : '2rem',
          maxWidth: '450px',
          width: '100%',
          border: '1px solid #FF4444',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            color: '#FF4444',
          }}>
            <IconAlert size={44} strokeWidth={1.5} />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>
            {title}
          </h2>
          <p style={{ margin: 0, color: '#A0A0A0', fontSize: '0.95rem' }}>
            {message}
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '0.75rem',
        }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: '#2A2A2A',
              color: '#FFFFFF',
              border: '1px solid #3A3A3A',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              if (!deleting) {
                e.currentTarget.style.background = '#3A3A3A';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2A2A2A';
            }}
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: deleting ? '#4A4A4A' : '#FF4444',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s',
            }}
          >
            {deleting ? 'Удаление...' : 'Да, удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}