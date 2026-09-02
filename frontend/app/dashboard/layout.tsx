"use client";

import { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { TenantProvider, useTenant } from '../../contexts/TenantContext';
import { IconMenu, IconShield } from '../../components/icons';
import Sidebar from '../../components/layout/Sidebar';

function MobileHeader({ onMenu }: { onMenu: () => void }) {
  const { currentTenant } = useTenant();
  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: '#141414',
      borderBottom: '1px solid #2A2A2A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1rem',
      zIndex: 99,
      boxSizing: 'border-box',
    }}>
      <button
        onClick={onMenu}
        aria-label="Открыть меню"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#A0A0A0',
          cursor: 'pointer',
          display: 'inline-flex',
          padding: '0.25rem',
        }}
      >
        <IconMenu size={22} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        <span style={{ color: '#FF6B35', display: 'inline-flex' }}>
          <IconShield size={18} />
        </span>
        <span style={{
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '0.95rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '60vw',
        }}>
          {currentTenant?.name ?? 'ComplianceBox'}
        </span>
      </div>
    </header>
  );
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      color: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {isMobile ? (
        <>
          <MobileHeader onMenu={() => setSidebarOpen(true)} />
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main style={{ paddingTop: '56px' }}>{children}</main>
        </>
      ) : (
        <>
          <Sidebar />
          <main style={{ marginLeft: '260px' }}>{children}</main>
        </>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <LayoutShell>{children}</LayoutShell>
    </TenantProvider>
  );
}