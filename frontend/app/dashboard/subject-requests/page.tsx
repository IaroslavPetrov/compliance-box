"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  IconClipboard,
  IconPlus,
  IconTrash,
  IconAlert,
  IconClose,
  IconClock,
} from '../../../components/icons';
import { useToast } from '../../../contexts/ToastContext';
import posthog from '../../../contexts/posthog';

const API = 'https://compliance-box-backend.onrender.com/api/v1';

interface SubjectRequest {
  id: number;
  subject_name: string;
  request_type: string;
  received_at: string;
  deadline: string;
  status: string;
  response_generated_at: string | null;
  linked_subject_id: number | null;
  linked_subject_name: string | null;
  linked_data_systems: string[];
  tenant_id: number;
  user_id: number;
  created_at: string;
}

interface Limits {
  current: number;
  limit: number;
  tariff: string;
  is_limit_reached: boolean;
}

interface PdSubject {
  id: number;
  full_name: string;
}

const REQUEST_TYPES = [
  { value: 'information', label: 'Запрос информации (ст. 14)' },
  { value: 'clarification', label: 'Уточнение данных (ст. 20)' },
  { value: 'destruction', label: 'Уничтожение данных (ст. 21)' },
  { value: 'withdrawal', label: 'Отзыв согласия' },
];

const emptyForm = {
  subject_name: '',
  request_type: 'information',
  received_at: new Date().toISOString().slice(0, 10),
  linked_subject_id: '',
};

export default function SubjectRequestsPage() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');

  const [requests, setRequests] = useState<SubjectRequest[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [subjects, setSubjects] = useState<PdSubject[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const [reqRes, limRes, subjRes] = await Promise.all([
        fetch(`${API}/subject-requests/?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/subject-requests/limits?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/pd-subjects/?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (reqRes.ok) setRequests(await reqRes.json());
      if (limRes.ok) setLimits(await limRes.json());
      if (subjRes.ok) setSubjects(await subjRes.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    if (limits?.is_limit_reached) {
      posthog.capture('paywall_hit', {
        feature: 'subject_requests',
        current: limits.current,
        limit: limits.limit,
        tariff: limits.tariff,
      });
      toast.warning(`Достигнут лимит запросов для тарифа ${limits.tariff} (${limits.limit}). Обновите тариф на Pro.`);
      return;
    }
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    if (!form.subject_name.trim()) {
      toast.warning('Укажите ФИО субъекта');
      return;
    }
    if (!form.received_at) {
      toast.warning('Укажите дату получения запроса');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/subject-requests/?tenant_id=${tenantId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_name: form.subject_name.trim(),
          request_type: form.request_type,
          received_at: `${form.received_at}T10:00:00`,
          linked_subject_id: form.linked_subject_id ? Number(form.linked_subject_id) : null,
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Ошибка создания запроса');
      }

      posthog.capture('subject_request_created', { request_type: form.request_type });
      toast.success('Запрос зарегистрирован. Дедлайн: 10 рабочих дней.');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (sr: SubjectRequest) => {
    setDownloadingId(sr.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/subject-requests/${sr.id}/generate-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.detail || 'Ошибка генерации ответа');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subject_response_${sr.request_type}_${sr.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      posthog.capture('subject_response_downloaded', {
        request_id: sr.id,
        request_type: sr.request_type,
      });
      toast.success('Ответ скачан и запрос помечен как обработанный');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/subject-requests/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || 'Ошибка удаления');
      }
      posthog.capture('subject_request_deleted', { request_id: deleteConfirmId });
      toast.success('Запрос удалён');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
  };

  const getDeadlineInfo = (sr: SubjectRequest) => {
    if (sr.status === 'responded') {
      return { label: 'Обработан', color: '#4A90E2' };
    }
    const days = Math.ceil((new Date(sr.deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: `Просрочено на ${Math.abs(days)} дн.`, color: '#FF4444' };
    if (days <= 3) return { label: `Осталось ${days} дн.`, color: '#FFC107' };
    return { label: `В срок (${days} дн.)`, color: '#00C853' };
  };

  const getTypeLabel = (value: string) =>
    REQUEST_TYPES.find((t) => t.value === value)?.label || value;

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

  if (!tenantId) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: isMobile ? '1rem' : '2rem', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', padding: '4rem 1rem', background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
          <div style={{ color: '#FF6B35', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <IconClipboard size={44} strokeWidth={1.5} />
          </div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>Запросы субъектов ПДн</h1>
          <p style={{ color: '#A0A0A0', margin: 0 }}>Выберите компанию в сайдбаре</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', padding: isMobile ? '1rem' : '2rem', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* Шапка */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#FF6B35', display: 'inline-flex' }}><IconClipboard size={28} /></span>
              Запросы субъектов ПДн
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
              Регистрация запросов и генерация ответов за 30 секунд (ст. 14, 20, 21 152-ФЗ)
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
                Запросы: {limits.current} / {limits.limit} · {limits.tariff}
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
              Новый запрос
            </button>
          </div>
        </div>

        {/* Контент */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#A0A0A0' }}>Загрузка...</div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: isMobile ? '2rem 1rem' : '3rem', background: '#1A1A1A', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
            <div style={{ color: '#FF6B35', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <IconClipboard size={44} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#FFFFFF' }}>Запросов субъектов пока нет</p>
            <p style={{ color: '#A0A0A0', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Зарегистрируйте запрос — и получите готовый юридический ответ со ссылками на ваши ИС
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
              Зарегистрировать первый запрос
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {requests.map((sr) => {
              const dl = getDeadlineInfo(sr);
              return (
                <div
                  key={sr.id}
                  style={{
                    padding: isMobile ? '1rem' : '1.25rem',
                    background: '#1A1A1A',
                    border: '1px solid #2A2A2A',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) e.currentTarget.style.borderColor = '#FF6B35';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2A2A2A';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, wordBreak: 'break-word' }}>{sr.subject_name}</h3>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          background: 'rgba(255, 107, 53, 0.15)',
                          border: '1px solid #FF6B35',
                          color: '#FF6B35',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>
                          {getTypeLabel(sr.request_type)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#A0A0A0' }}>
                        <span>Получен: {new Date(sr.received_at).toLocaleDateString('ru-RU')}</span>
                        <span>Ответить до: {new Date(sr.deadline).toLocaleDateString('ru-RU')}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: dl.color, fontWeight: 600 }}>
                          <IconClock size={14} />
                          {dl.label}
                        </span>
                      </div>

                      {sr.linked_subject_name && (
                        <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.85rem' }}>
                          <strong style={{ color: '#FFFFFF' }}>Из реестра:</strong> {sr.linked_subject_name}
                          {sr.linked_data_systems.length > 0 && (
                            <> · ИС: {sr.linked_data_systems.join(', ')}</>
                          )}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleDownload(sr)}
                        disabled={downloadingId === sr.id}
                        style={{
                          padding: '0.5rem 1rem',
                          background: downloadingId === sr.id ? '#4A4A4A' : 'transparent',
                          color: '#00C853',
                          border: '1px solid #00C853',
                          borderRadius: '6px',
                          cursor: downloadingId === sr.id ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap',
                          flex: isMobile ? 1 : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                        }}
                        onMouseEnter={(e) => {
                          if (downloadingId !== sr.id) {
                            e.currentTarget.style.background = '#00C853';
                            e.currentTarget.style.color = '#FFFFFF';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (downloadingId !== sr.id) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#00C853';
                          }
                        }}
                      >
                        {downloadingId === sr.id ? 'Генерация...' : sr.status === 'responded' ? 'Скачать ответ снова' : '📄 Сгенерировать ответ'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(sr.id)}
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
                          whiteSpace: 'nowrap',
                          flex: isMobile ? 1 : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
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

      {/* ===== МОДАЛКА СОЗДАНИЯ ЗАПРОСА ===== */}
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
                Новый запрос субъекта
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

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  ФИО субъекта *
                </label>
                <input
                  type="text"
                  value={form.subject_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, subject_name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Иванов Иван Иванович"
                  onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Тип запроса *
                </label>
                <select
                  value={form.request_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, request_type: e.target.value }))}
                  style={inputStyle}
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Дата получения запроса *
                </label>
                <input
                  type="date"
                  value={form.received_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, received_at: e.target.value }))}
                  style={inputStyle}
                />
                <small style={{ color: '#666666', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                  Дедлайн ответа рассчитается автоматически: +10 рабочих дней
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
                  Связать с записью из Реестра (необязательно)
                </label>
                <select
                  value={form.linked_subject_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, linked_subject_id: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— Не связывать —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
                <small style={{ color: '#666666', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>
                  Если связать — в ответ автоматически подтянутся ИС и данные из реестра
                </small>
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
                {saving ? 'Сохранение...' : 'Зарегистрировать запрос'}
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

      {/* ===== МОДАЛКА УДАЛЕНИЯ ===== */}
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
              <h2 style={{ margin: '0 0 0.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700 }}>Удалить запрос?</h2>
              <p style={{ margin: 0, color: '#A0A0A0', fontSize: '0.95rem' }}>
                Это действие нельзя отменить.
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