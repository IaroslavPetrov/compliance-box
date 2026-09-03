"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTenant } from '../../contexts/TenantContext';
import {
  IconHome,
  IconMap,
  IconUsers,
  IconFileText,
  IconSearch,
  IconLogout,
  IconPlus,
  IconShield,
  IconClipboard,
} from '../icons';

type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number }>;

interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  exact?: boolean;
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose = () => {} }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { tenants, currentTenant, selectTenant } = useTenant();

  const tenantId = currentTenant?.id;

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Личный кабинет', icon: IconHome, exact: true },
    { href: '/dashboard/data-map', label: 'Карта обработки ПДн', icon: IconMap },
    { href: tenantId ? `/dashboard/registry?tenantId=${tenantId}` : '/dashboard/registry', label: 'Реестр ПДн', icon: IconUsers },
    { href: tenantId ? `/dashboard/subject-requests?tenantId=${tenantId}` : '/dashboard/subject-requests', label: 'Запросы субъектов', icon: IconClipboard },
    { href: tenantId ? `/dashboard/documents?tenantId=${tenantId}` : '/dashboard/documents', label: 'Документы', icon: IconFileText },
    { href: '/dashboard/compliance-check', label: 'Проверка сайта', icon: IconSearch },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Смена компании в селекторе
  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const t = tenants.find((x) => x.id === id);
    if (!t) return;

    selectTenant(t);

    // Если открыта страница, привязанная к компании — синхронизируем URL
    if (
      pathname.startsWith('/dashboard/registry') ||
      pathname.startsWith('/dashboard/documents') ||
      pathname.startsWith('/dashboard/subject-requests')
    ) {
      router.replace(`${pathname}?tenantId=${t.id}`);
    }

    onClose();
  };

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '1.25rem',
      gap: '1.5rem',
      boxSizing: 'border-box',
    }}>
      {/* Логотип */}
      <div
        onClick={() => { router.push('/dashboard'); onClose(); }}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
      >
        <span style={{ color: '#FF6B35', display: 'inline-flex' }}>
          <IconShield size={22} strokeWidth={1.8} />
        </span>
        <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          Compliance<span style={{ color: '#FF6B35' }}>Box</span>
        </span>
      </div>

      {/* Селектор компании */}
      <div style={{ flexShrink: 0 }}>
        <label style={{
          display: 'block',
          marginBottom: '0.4rem',
          color: '#666666',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Компания
        </label>
        <select
          value={currentTenant?.id ?? ''}
          onChange={handleTenantChange}
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem',
            background: '#0A0A0A',
            border: '1px solid #2A2A2A',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        >
          <option value="">-- Не выбрана --</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={() => { router.push('/dashboard/tenants/new'); onClose(); }}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.5rem',
            background: 'transparent',
            border: '1px dashed #3A3A3A',
            borderRadius: '8px',
            color: '#A0A0A0',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF6B35'; e.currentTarget.style.color = '#FF6B35'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = '#A0A0A0'; }}
        >
          <IconPlus size={13} />
          Добавить компанию
        </button>
      </div>

      {/* Навигация */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.label}
              onClick={() => { router.push(item.href); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 0.9rem',
                background: active ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active ? '#FF6B35' : '#A0A0A0',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!active) { e.currentTarget.style.background = '#1F1F1F'; e.currentTarget.style.color = '#FFFFFF'; }
              }}
              onMouseLeave={(e) => {
                if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#A0A0A0'; }
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Выход */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.7rem 0.9rem',
          background: 'transparent',
          border: '1px solid #2A2A2A',
          borderRadius: '8px',
          color: '#FF4444',
          fontSize: '0.92rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#FF4444'; e.currentTarget.style.color = '#FFFFFF'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF4444'; }}
      >
        <IconLogout size={16} />
        Выйти
      </button>
    </div>
  );

  // Десктоп: фиксированная колонка слева
  if (!isMobile) {
    return (
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '260px',
        background: '#141414',
        borderRight: '1px solid #2A2A2A',
        zIndex: 100,
        overflowY: 'auto',
      }}>
        {content}
      </aside>
    );
  }

  // Мобильный: выдвижная панель (drawer)
  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000 }}
        />
      )}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        maxWidth: '85%',
        background: '#141414',
        borderRight: '1px solid #2A2A2A',
        zIndex: 1001,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
      }}>
        {content}
      </aside>
    </>
  );
}