"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  IconEdit,
  IconTrash,
  IconAlert,
  IconArrowLeft,
  IconPlus,
  IconClose,
  IconUsers,
} from '../../../components/icons';
import { useToast } from '../../../contexts/ToastContext';
import posthog from '../../../contexts/posthog';

// ============================================================================
// ИНТЕРФЕЙСЫ И СПРАВОЧНИКИ
// ============================================================================
interface PdSubject {
  id: number;
  full_name: string;
  category: string;
  legal_basis: string;
  data_types?: string;
  created_at: string;
  tenant_id: number;
  user_id: number;
}

interface LimitsInfo {
  current: number;
  limit: number;
  tariff: string;
  is_limit_reached: boolean;
}

const CATEGORIES = [
  'Сотрудник',
  'Клиент',
  'Кандидат',
  'Посетитель сайта',
  'Контрагент',
  'Иное',
];

const LEGAL_BASES = [
  'Согласие субъекта',
  'Трудовой договор',
  'Договор оказания услуг',
  'Исполнение закона',
  'Иное',
];

export default function RegistryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const isMobile = useIsMobile();
  const toast = useToast();

  const [subjects, setSubjects] = useState<PdSubject[]>([]);
  const [limits, setLimits] = useState<LimitsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<PdSubject | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    category: '',
    legal_basis: '',
    data_types: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const [subjectsRes, limitsRes] = await Promise.all([
        fetch(`https://compliance-box-backend.onrender.com/api/v1/pd-subjects/?tenant_id=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`https://compliance-box-backend.onrender.com/api/v1/pd-subjects/limits?tenant_id=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!subjectsRes.ok || !limitsRes.ok) {
        throw new Error('Не удалось загрузить данные');
      }

      setSubjects(await subjectsRes.json());
      setLimits(await limitsRes.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    if (limits?.is_limit_reached) {
      toast.warning(`Достигнут лимит ${limits.limit} записей для тарифа ${limits.tariff}. Обновите тариф для снятия ограничений.`);
      return;
    }

    setEditingSubject(null);
    setFormData({ full_name: '', category: '', legal_basis: '', data_types: '' });
    setShowModal(true);
  };

  const openEditModal = (subject: PdSubject) => {
    setEditingSubject(subject);
    setFormData({
      full_name: subject.full_name,
      category: subject.category,
      legal_basis: subject.legal_basis,
      data_types: subject.data_types || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (limits?.is_limit_reached && !editingSubject) {
      toast.warning(`Достигнут лимит ${limits.limit} записей для тарифа ${limits.tariff}. Обновите тариф для снятия ограничений.`);
      return;
    }

    if (!formData.full_name || !formData.category || !formData.legal_basis) {
      toast.warning('Заполните обязательные поля: ФИО, категория и основание обработки');
      return;
    }

    if (!tenantId) return;

    setSaving(true);

    try {
      const token = localStorage.getItem('token');

      const url = editingSubject
        ? `https://compliance-box-backend.onrender.com/api/v1/pd-subjects/${editingSubject.id}`
        : `https://compliance-box-backend.onrender.com/api/v1/pd-subjects/?tenant_id=${tenantId}`;

      const method = editingSubject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при сохранении');
      }

      toast.success(editingSubject ? 'Изменения сохранены' : 'Запись добавлена в реестр');
      await fetchData();
      closeModal();
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

      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/pd-subjects/${deleteConfirmId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при удалении');
      }

      toast.success('Запись удалена из реестра');
      await fetchData();
      setDeleteConfirmId(null);
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
    fontFamily: 'inherit',
  };

  const tableMinWidth = '760px';

  if (!tenantId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#A0A0A0',
        fontFamily: '-apple-system, sans-serif',
        padding: '1rem',
        textAlign: 'center',
      }}>
        <p>
          Компания не выбрана.{' '}
          <a href="/dashboard" style={{ color: '#FF6B35' }}>
            Вернуться в личный кабинет
          </a>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0A0A0A',
        color: '#A0A0A0',
        fontFamily: '-apple-system, sans-serif',
        padding: '1rem',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '1.2rem' }}>Загрузка реестра...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Шапка */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: '1rem',
          marginBottom: isMobile ? '1.5rem' : '2rem',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700',
              color: '#FFFFFF',
              lineHeight: 1.2,
            }}>
              Реестр субъектов ПДн
            </h1>
            <p style={{
              color: '#A0A0A0',
              marginTop: '0.5rem',
              fontSize: '0.95rem',
              lineHeight: 1.45,
            }}>
              Управление записями о лицах, чьи персональные данные обрабатывает компания
            </p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: '#A0A0A0',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'all 0.3s',
              width: isMobile ? '100%' : 'auto',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FF6B35';
              e.currentTarget.style.color = '#FF6B35';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2A2A2A';
              e.currentTarget.style.color = '#A0A0A0';
            }}
          >
            <IconArrowLeft />
            Назад в личный кабинет
          </button>
        </div>

        {/* Индикатор лимитов */}
        {limits && (
          <div style={{
            background: '#1A1A1A',
            padding: isMobile ? '1rem' : '1.25rem',
            borderRadius: '12px',
            border: `1px solid ${limits.is_limit_reached ? '#FF4444' : '#2A2A2A'}`,
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center',
            gap: '1rem',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#A0A0A0' }}>
                Текущий тариф
              </p>
              <p style={{
                margin: '0.25rem 0 0',
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#FFFFFF',
              }}>
                {limits.tariff}
              </p>
            </div>

            <div style={{ flex: 1, minWidth: isMobile ? '0' : '200px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                marginBottom: '0.5rem',
              }}>
                <span style={{ fontSize: '0.9rem', color: '#A0A0A0' }}>
                  Записи реестра
                </span>
                <span style={{
                  fontSize: '0.9rem',
                  color: limits.is_limit_reached ? '#FF4444' : '#00C853',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                }}>
                  {limits.current} / {limits.limit}
                </span>
              </div>

              <div style={{
                height: '8px',
                background: '#2A2A2A',
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((limits.current / limits.limit) * 100, 100)}%`,
                  background: limits.is_limit_reached ? '#FF4444' : '#FF6B35',
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {limits.is_limit_reached && (
              <button style={{
                padding: '0.75rem 1.25rem',
                background: '#FF6B35',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                width: isMobile ? '100%' : 'auto',
              }}>
                Обновить тариф
              </button>
            )}
          </div>
        )}

        {/* Панель действий */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#FFFFFF',
          }}>
            Записи ({subjects.length})
          </h2>

          <button
            onClick={openAddModal}
            disabled={limits?.is_limit_reached}
            style={{
              padding: '0.75rem 1.5rem',
              background: limits?.is_limit_reached ? '#4A4A4A' : '#FF6B35',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: limits?.is_limit_reached ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'background 0.3s',
              width: isMobile ? '100%' : 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseEnter={(e) => {
              if (!limits?.is_limit_reached) {
                e.currentTarget.style.background = '#E55A2B';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = limits?.is_limit_reached ? '#4A4A4A' : '#FF6B35';
            }}
          >
            <IconPlus />
            Добавить субъекта
          </button>
        </div>

        {/* Таблица */}
        {subjects.length === 0 ? (
          <div style={{
            background: '#1A1A1A',
            padding: isMobile ? '2rem 1rem' : '3rem',
            borderRadius: '12px',
            border: '1px solid #2A2A2A',
            textAlign: 'center',
            color: '#A0A0A0',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1rem',
              color: '#3A3A3A',
            }}>
              <IconUsers size={44} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              В реестре пока нет записей
            </p>

            <button
              onClick={openAddModal}
              disabled={limits?.is_limit_reached}
              style={{
                padding: '0.75rem 1.5rem',
                background: limits?.is_limit_reached ? '#4A4A4A' : '#FF6B35',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: limits?.is_limit_reached ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <IconPlus />
              Добавить первую запись
            </button>
          </div>
        ) : (
          <div style={{
            background: '#1A1A1A',
            borderRadius: '12px',
            border: '1px solid #2A2A2A',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}>
            {/* Заголовки таблицы */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.5fr 1fr 120px',
              padding: '1rem 1.25rem',
              background: '#141414',
              borderBottom: '1px solid #2A2A2A',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#A0A0A0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              minWidth: tableMinWidth,
            }}>
              <div>ФИО субъекта</div>
              <div>Категория</div>
              <div>Основание обработки</div>
              <div>Добавлен</div>
              <div style={{ textAlign: 'right' }}>Действия</div>
            </div>

            {/* Строки */}
            {subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1.5fr 1fr 120px',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #2A2A2A',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                  minWidth: tableMinWidth,
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.currentTarget.style.background = '#1F1F1F';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: '500',
                    color: '#FFFFFF',
                    wordBreak: 'break-word',
                  }}>
                    {subject.full_name}
                  </div>

                  {subject.data_types && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginTop: '0.25rem',
                      wordBreak: 'break-word',
                    }}>
                      {subject.data_types}
                    </div>
                  )}
                </div>

                <div>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(255, 107, 53, 0.15)',
                    color: '#FF6B35',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    whiteSpace: 'nowrap',
                  }}>
                    {subject.category}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.9rem',
                  color: '#A0A0A0',
                  wordBreak: 'break-word',
                }}>
                  {subject.legal_basis}
                </div>

                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  whiteSpace: 'nowrap',
                }}>
                  {new Date(subject.created_at).toLocaleDateString('ru-RU')}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                }}>
                  <button
                    onClick={() => openEditModal(subject)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: 'transparent',
                      color: '#4A90E2',
                      border: '1px solid #4A90E2',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#4A90E2';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#4A90E2';
                    }}
                    title="Редактировать"
                    aria-label="Редактировать"
                  >
                    <IconEdit />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(subject.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      background: 'transparent',
                      color: '#FF4444',
                      border: '1px solid #FF4444',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FF4444';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#FF4444';
                    }}
                    title="Удалить"
                    aria-label="Удалить"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* МОДАЛКА ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: isMobile ? '1rem' : '2rem',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#1A1A1A',
              borderRadius: '12px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #2A2A2A',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#FFFFFF',
                lineHeight: 1.25,
              }}>
                {editingSubject ? 'Редактировать запись' : 'Новая запись в реестре'}
              </h2>

              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A0A0A0',
                  cursor: 'pointer',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#FF4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#A0A0A0'; }}
                aria-label="Закрыть"
              >
                <IconClose />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#FFFFFF',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                }}>
                  ФИО субъекта *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleFormChange}
                  style={inputStyle}
                  placeholder="Иванов Иван Иванович"
                  disabled={limits?.is_limit_reached && !editingSubject}
                  onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#FFFFFF',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                }}>
                  Категория *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  style={inputStyle}
                  disabled={limits?.is_limit_reached && !editingSubject}
                >
                  <option value="">-- Выберите категорию --</option>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#FFFFFF',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                }}>
                  Основание обработки *
                </label>
                <select
                  name="legal_basis"
                  value={formData.legal_basis}
                  onChange={handleFormChange}
                  style={inputStyle}
                  disabled={limits?.is_limit_reached && !editingSubject}
                >
                  <option value="">-- Выберите основание --</option>
                  {LEGAL_BASES.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#FFFFFF',
                  fontWeight: '500',
                  fontSize: '0.9rem',
                }}>
                  Какие данные обрабатываются
                </label>
                <textarea
                  name="data_types"
                  value={formData.data_types}
                  onChange={handleFormChange}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="ФИО, паспортные данные, телефон, email..."
                  disabled={limits?.is_limit_reached && !editingSubject}
                  onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={handleSave}
                disabled={saving || (limits?.is_limit_reached && !editingSubject)}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: saving || (limits?.is_limit_reached && !editingSubject) ? '#4A4A4A' : '#FF6B35',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: saving || (limits?.is_limit_reached && !editingSubject) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>

              <button
                onClick={closeModal}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: '#2A2A2A',
                  color: '#FFFFFF',
                  border: '1px solid #3A3A3A',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ */}
      {deleteConfirmId !== null && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: isMobile ? '1rem' : '2rem',
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            style={{
              background: '#1A1A1A',
              borderRadius: '12px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '450px',
              width: '100%',
              border: '1px solid #FF4444',
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
              <h2 style={{
                margin: '0 0 0.5rem',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#FFFFFF',
              }}>
                Удалить запись?
              </h2>
              <p style={{
                margin: 0,
                color: '#A0A0A0',
                fontSize: '0.95rem',
                lineHeight: 1.4,
              }}>
                Это действие нельзя отменить.
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '0.75rem',
            }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
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
                }}
              >
                Отмена
              </button>

              <button
                onClick={confirmDelete}
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