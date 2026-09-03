"use client";

import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useTenant } from '../../../contexts/TenantContext';
import { useToast } from '../../../contexts/ToastContext';
import posthog from '../../../contexts/posthog';
import {
  IconMap,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlert,
  IconClose,
  IconUsers,
} from '../../../components/icons';

const API = 'https://compliance-box-backend.onrender.com/api/v1';

interface DataSystem {
  id: number;
  name: string;
  system_type: string;
  categories: string[];
  data_location?: string;
  responsible_name?: string;
  responsible_position?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  tenant_id: number;
  pd_subjects_count: number;
}

interface Limits {
  current: number;
  limit: number;
  tariff: string;
  is_limit_reached: boolean;
}

const SYSTEM_TYPES: Record<string, { label: string; color: string }> = {
  local: { label: 'Локальная система', color: '#4A90E2' },
  cloud_saas: { label: 'Облачный SaaS', color: '#00C853' },
  file: { label: 'Файл / таблица', color: '#FFC107' },
  physical: { label: 'Физический носитель', color: '#9C27B0' },
};

const CATEGORY_OPTIONS = [
  { value: 'employees', label: 'Сотрудники' },
  { value: 'clients', label: 'Клиенты' },
  { value: 'candidates', label: 'Кандидаты' },
  { value: 'visitors', label: 'Посетители сайта' },
  { value: 'contractors', label: 'Подрядчики' },
];

const TEMPLATES = [
  { label: '1С:ЗУП', data: { name: '1С:Зарплата и управление персоналом', system_type: 'local', categories: ['employees'] } },
  { label: 'DIKIDI', data: { name: 'DIKIDI', system_type: 'cloud_saas', categories: ['clients'] } },
  { label: 'YClients', data: { name: 'YClients', system_type: 'cloud_saas', categories: ['clients'] } },
  { label: 'Google Analytics', data: { name: 'Google Analytics', system_type: 'cloud_saas', categories: ['visitors'] } },
  { label: 'Excel-реестр', data: { name: 'Excel-таблица клиентов', system_type: 'file', categories: ['clients'] } },
  { label: 'Бумажные носители', data: { name: 'Бумажные трудовые книжки', system_type: 'physical', categories: ['employees'] } },
];

const emptyForm = {
  name: '',
  system_type: 'local',
  categories: [] as string[],
  data_location: '',
  responsible_name: '',
  responsible_position: '',
  description: '',
};

export default function DataMapPage() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const { currentTenant } = useTenant();

  const [systems, setSystems] = useState<DataSystem[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<DataSystem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentTenant) {
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const [sysRes, limRes] = await Promise.all([
        fetch(`${API}/data-systems/?tenant_id=${currentTenant.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/data-systems/limits?tenant_id=${currentTenant.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (sysRes.ok) setSystems(await sysRes.json());
      if (limRes.ok) setLimits(await limRes.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, toast]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    if (limits?.is_limit_reached) {
      posthog.capture('paywall_hit', {
        feature: 'data_systems',
        current: limits.current,
        limit: limits.limit,
        tariff: limits.tariff,
      });
      toast.warning(`Достигнут лимит ИС для тарифа ${limits.tariff} (${limits.limit}). Обновите тариф для добавления новых ИС.`);
      return;
    }
    setEditingSystem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (ds: DataSystem) => {
    setEditingSystem(ds);
    setForm({
      name: ds.name,
      system_type: ds.system_type,
      categories: ds.categories || [],
      data_location: ds.data_location || '',
      responsible_name: ds.responsible_name || '',
      responsible_position: ds.responsible_position || '',
      description: ds.description || '',
    });
    setShowModal(true);
  };

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setForm((prev) => ({ ...prev, ...t.data }));
    toast.success(`Шаблон «${t.label}» применён`);
  };

  const toggleCategory = (value: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter((c) => c !== value)
        : [...prev.categories, value],
    }));
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    if (!form.name.trim()) {
      toast.warning('Укажите название информационной системы');
      return;
    }
    if (form.categories.length === 0) {
      toast.warning('Отметьте хотя бы одну категорию субъектов');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editingSystem
        ? `${API}/data-systems/${editingSystem.id}`
        : `${API}/data-systems/?tenant_id=${currentTenant.id}`;

      const res = await fetch(url, {
        method: editingSystem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Ошибка сохранения');
      }

      posthog.capture(editingSystem ? 'data_system_updated' : 'data_system_created', {
        system_type: form.system_type,
        categories_count: form.categories.length,
      });
      toast.success(editingSystem ? 'Изменения сохранены' : 'Информационная система добавлена');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/data-systems/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Ошибка удаления');
      }
      posthog.capture('data_system_deleted', { system_id: deleteConfirmId });
      toast.success('Информационная система удалена');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.875rem',
    border: '1px solid #2A2A2A',
    borderRadius: '8px',
    fontSize: '1rem',
    background: '#0A0A0A',
    color: '#FFFFFF',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.3s, box-shadow 0.3s',
    outline: 'none',
  };

  if (!currentTenant) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: isMobile ? '1rem' : '2rem', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '4rem 1rem', background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
          <div style={{ color: '#FF6B35', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <IconMap size={44} strokeWidth={1.5} />
          </div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Карта обработки ПДн</h1>
          <p style={{ color: '#A0A0A0', margin: 0 }}>Выберите компанию в сайдбаре или добавьте первую компанию в личном кабинете</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: isMobile ? '1rem' : '2rem', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Шапка */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#FF6B35', display: 'inline-flex' }}><IconMap size={28} /></span>
              Карта обработки ПДн
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
              {currentTenant.name} · Реестр информационных систем
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexDirection: isMobile ? 'column' : 'row' }}>
            {limits && (
              <span style={{
                padding: '0.5rem 0.9rem',
                background: limits.is_limit_reached ? 'rgba(255, 68, 68, 0.15)' : 'rgba(0, 200, 83, 0.1)',
                border: `1px solid ${limits.is_limit_reached ? '#FF4444' : '#00C853'}`,
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: limits.is_limit_reached ? '#FF4444' : '#00C853',
                whiteSpace: 'nowrap',
              }}>
                ИС: {limits.current} / {limits.limit} · {limits.tariff}
              </span>
            )}
            <button
              onClick={openAdd}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#FF6B35',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'background 0.3s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: isMobile ? '100%' : 'auto',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#E55A2B')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
            >
              <IconPlus />
              Добавить ИС
            </button>
          </div>
        </div>

        {/* Контент */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#A0A0A0' }}>Загрузка...</div>
        ) : systems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: isMobile ? '2rem 1rem' : '3rem', background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
            <div style={{ color: '#FF6B35', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <IconMap size={44} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>У вас пока нет информационных систем</p>
            <p style={{ color: '#A0A0A0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Добавьте системы, в которых вы обрабатываете персональные данные (1С, CRM, Excel-реестры)
            </p>
            <button
              onClick={openAdd}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#FF6B35',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#E55A2B')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6B35')}
            >
              <IconPlus />
              Добавить первую ИС
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {systems.map((ds) => {
              const typeInfo = SYSTEM_TYPES[ds.system_type] || { label: ds.system_type, color: '#A0A0A0' };
              return (
                <div
                  key={ds.id}
                  style={{
                    padding: isMobile ? '1rem' : '1.25rem',
                    background: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.borderColor = '#FF6B35';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2A2A2A';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, wordBreak: 'break-word' }}>{ds.name}</h3>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          background: `${typeInfo.color}22`,
                          border: `1px solid ${typeInfo.color}`,
                          color: typeInfo.color,
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}>
                          {typeInfo.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {(ds.categories || []).map((c) => (
                          <span key={c} style={{
                            padding: '0.2rem 0.6rem',
                            background: '#2A2A2A',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            color: '#A0A0A0',
                          }}>
                            {CATEGORY_OPTIONS.find((o) => o.value === c)?.label || c}
                          </span>
                        ))}
                      </div>

                      {ds.data_location && (
                        <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#FFFFFF' }}>Локация:</strong> {ds.data_location}
                        </p>
                      )}
                      {ds.responsible_name && (
                        <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#FFFFFF' }}>Ответственный:</strong> {ds.responsible_name}
                          {ds.responsible_position ? ` (${ds.responsible_position})` : ''}
                        </p>
                      )}
                      <p style={{ margin: '0.5rem 0 0', color: '#00C853', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <IconUsers size={14} />
                        Субъектов в системе: {ds.pd_subjects_count}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => openEdit(ds)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: '#4A90E2',
                          border: '1px solid #4A90E2',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          flex: isMobile ? 1 : 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#4A90E2'; e.currentTarget.style.color = '#FFFFFF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4A90E2'; }}
                      >
                        <IconEdit size={13} />
                        Изменить
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(ds.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: '#FF4444',
                          border: '1px solid #FF4444',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          flex: isMobile ? 1 : 'none',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#FF4444'; e.currentTarget.style.color = '#FFFFFF'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF4444'; }}
                      >
                        <IconTrash size={13} />
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== МОДАЛКА ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ ИС ===== */}
      {showModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, padding: isMobile ? '1rem' : '2rem',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#1A1A1A', borderRadius: '12px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '600px', width: '100%',
              maxHeight: '90vh', overflowY: 'auto',
              border: '1px solid #2A2A2A',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700 }}>
                {editingSystem ? 'Редактировать ИС' : 'Добавить ИС'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer', padding: '0.25rem', display: 'inline-flex' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FF4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#A0A0A0')}
                aria-label="Закрыть"
              >
                <IconClose />
              </button>
            </div>

            {/* Шаблоны */}
            {!editingSystem && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#A0A0A0', fontWeight: 500, fontSize: '0.9rem' }}>
                  Быстрый старт — шаблоны:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => applyTemplate(t)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#2A2A2A',
                        border: '1px solid #3A3A3A',
                        borderRadius: '16px',
                        color: '#FFFFFF',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#FF6B35'; e.currentTarget.style.color = '#FF6B35'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3A3A3A'; e.currentTarget.style.color = '#FFFFFF'; }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Название ИС *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="1С:Зарплата и управление персоналом"
                  onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Тип системы
                </label>
                <select
                  value={form.system_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, system_type: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="local">Локальная система (1С на сервере офиса)</option>
                  <option value="cloud_saas">Облачный SaaS (DIKIDI, YClients, GA)</option>
                  <option value="file">Файл / таблица (Excel, Google Sheets)</option>
                  <option value="physical">Физический носитель (бумага, сейф)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Категории субъектов *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {CATEGORY_OPTIONS.map((opt) => {
                    const active = form.categories.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleCategory(opt.value)}
                        style={{
                          padding: '0.45rem 0.9rem',
                          background: active ? 'rgba(255, 107, 53, 0.15)' : '#2A2A2A',
                          border: `1px solid ${active ? '#FF6B35' : '#3A3A3A'}`,
                          borderRadius: '16px',
                          color: active ? '#FF6B35' : '#A0A0A0',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {active ? '✓ ' : ''}{opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Локация данных
                </label>
                <input
                  type="text"
                  value={form.data_location}
                  onChange={(e) => setForm((prev) => ({ ...prev, data_location: e.target.value }))}
                  style={inputStyle}
                  placeholder="Офисный сервер / Google Drive / Сейф в офисе"
                  onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                    Ответственный (ФИО)
                  </label>
                  <input
                    type="text"
                    value={form.responsible_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, responsible_name: e.target.value }))}
                    style={inputStyle}
                    placeholder="Иванова Мария"
                    onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                    Должность
                  </label>
                  <input
                    type="text"
                    value={form.responsible_position}
                    onChange={(e) => setForm((prev) => ({ ...prev, responsible_position: e.target.value }))}
                    style={inputStyle}
                    placeholder="Главный бухгалтер"
                    onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: saving ? '#4A4A4A' : '#FF6B35',
                  color: '#FFFFFF', border: 'none', borderRadius: '8px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.3s',
                }}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: '#2A2A2A', color: '#FFFFFF',
                  border: '1px solid #3A3A3A', borderRadius: '8px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#3A3A3A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2A2A2A'; }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛКА ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ ===== */}
      {deleteConfirmId !== null && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, padding: isMobile ? '1rem' : '2rem',
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            style={{
              background: '#1A1A1A', borderRadius: '12px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '450px', width: '100%',
              border: '1px solid #FF4444',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#FF4444' }}>
                <IconAlert size={44} strokeWidth={1.5} />
              </div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700 }}>Удалить ИС?</h2>
              <p style={{ margin: 0, color: '#A0A0A0', fontSize: '0.95rem' }}>
                Система будет удалена из Карты обработки ПДн. Привязки к субъектам будут сняты.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: '#2A2A2A', color: '#FFFFFF',
                  border: '1px solid #3A3A3A', borderRadius: '8px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: deleting ? '#4A4A4A' : '#FF4444',
                  color: '#FFFFFF', border: 'none', borderRadius: '8px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                }}
              >
                {deleting ? 'Удаление...' : 'Да, удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}