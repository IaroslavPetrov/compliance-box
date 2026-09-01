"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: number;
  name: string;
  inn: string;
  email?: string;
  kpp?: string;
  address?: string;
  phone?: string;
  director_name?: string;
  website?: string;
  created_at: string;
}

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Состояния для редактирования
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Состояния для удаления
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const userRes = await fetch('https://compliance-box-backend.onrender.com/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!userRes.ok) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }

      const userData = await userRes.json();
      setUser(userData);

      const tenantsRes = await fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!tenantsRes.ok) {
        throw new Error('Не удалось загрузить список компаний');
      }

      const tenantsData = await tenantsRes.json();
      setTenants(tenantsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleAddCompany = () => {
    router.push('/dashboard/tenants/new');
  };

  const handleCheckWebsite = (websiteUrl?: string) => {
    if (websiteUrl) {
      router.push(`/dashboard/compliance-check?url=${encodeURIComponent(websiteUrl)}`);
    } else {
      router.push('/dashboard/compliance-check');
    }
  };

  // ===== РЕДАКТИРОВАНИЕ =====
  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditFormData({
      name: tenant.name,
      email: tenant.email || '',
      kpp: tenant.kpp || '',
      address: tenant.address || '',
      phone: tenant.phone || '',
      director_name: tenant.director_name || '',
      website: tenant.website || '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTenant(null);
    setEditFormData({});
    setEditError('');
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingTenant) return;

    setSaving(true);
    setEditError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/tenants/${editingTenant.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editFormData),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при сохранении');
      }

      await fetchDashboardData();
      closeEditModal();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ===== УДАЛЕНИЕ =====
  const handleDeleteClick = (tenantId: number) => {
    setDeleteConfirmId(tenantId);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    setDeleting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/tenants/${deleteConfirmId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при удалении');
      }

      await fetchDashboardData();
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message);
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0A0A0A',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <p style={{ fontSize: '1.2rem', color: '#A0A0A0' }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Шапка */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          background: '#1A1A1A',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#FFFFFF' }}>
              Личный кабинет
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
              {user?.email}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => handleCheckWebsite()}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#FF6B35',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                transition: 'background 0.3s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#E55A2B'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}
            >
              🔍 Проверка сайта
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#FF4444',
                border: '1px solid #FF4444',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#FF4444';
              }}
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Список компаний */}
        <div style={{
          background: '#1A1A1A',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#FFFFFF' }}>
              Мои компании
            </h2>
            <button
              onClick={handleAddCompany}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2A2A2A',
                color: '#FFFFFF',
                border: '1px solid #3A3A3A',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#3A3A3A';
                e.currentTarget.style.borderColor = '#FF6B35';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2A2A2A';
                e.currentTarget.style.borderColor = '#3A3A3A';
              }}
            >
              + Добавить компанию
            </button>
          </div>

          {error && (
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #FF4444',
              borderRadius: '8px',
              color: '#FF4444',
              marginBottom: '1rem',
              fontSize: '0.95rem',
            }}>
              {error}
            </div>
          )}

          {tenants.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#A0A0A0',
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                У вас пока нет компаний
              </p>
              <button
                onClick={handleAddCompany}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#FF6B35',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'background 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E55A2B'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}
              >
                Добавить первую компанию
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  style={{
                    padding: '1.25rem',
                    border: '1px solid #2A2A2A',
                    borderRadius: '10px',
                    background: '#141414',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => router.push(`/dashboard/documents?tenantId=${tenant.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF6B35';
                    e.currentTarget.style.background = '#1A1A1A';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2A2A2A';
                    e.currentTarget.style.background = '#141414';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '600', color: '#FFFFFF', wordBreak: 'break-word' }}>
                        {tenant.name}
                      </h3>
                      <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
                        <strong style={{ color: '#FFFFFF' }}>ИНН:</strong> {tenant.inn}
                      </p>
                      {tenant.email && (
                        <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
                          <strong style={{ color: '#FFFFFF' }}>Email:</strong> {tenant.email}
                        </p>
                      )}
                      {tenant.website && (
                        <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
                          <strong style={{ color: '#FFFFFF' }}>Сайт:</strong>{' '}
                          <a
                            href={tenant.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#FF6B35', textDecoration: 'none', transition: 'color 0.2s' }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {tenant.website}
                          </a>
                        </p>
                      )}
                      <p style={{
                        margin: '0.75rem 0 0',
                        fontSize: '0.85rem',
                        color: '#666666',
                      }}>
                        Добавлена: {new Date(tenant.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>

                    {/* Кнопки действий */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      flexShrink: 0,
                    }}>
                      {/* НОВАЯ КНОПКА: Реестр ПДн */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/registry?tenantId=${tenant.id}`);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: '#00C853',
                          border: '1px solid #00C853',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#00C853';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#00C853';
                        }}
                      >
                        📋 Реестр ПДн
                      </button>

                      {tenant.website && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckWebsite(tenant.website);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            color: '#FF6B35',
                            border: '1px solid #FF6B35',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            transition: 'all 0.3s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FF6B35';
                            e.currentTarget.style.color = '#FFFFFF';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#FF6B35';
                          }}
                        >
                          🔍 Проверить
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(tenant);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: '#4A90E2',
                          border: '1px solid #4A90E2',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#4A90E2';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#4A90E2';
                        }}
                      >
                        ✏️ Изменить
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(tenant.id);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: '#FF4444',
                          border: '1px solid #FF4444',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#FF4444';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#FF4444';
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ===== */}
      {showEditModal && editingTenant && (
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
            padding: '2rem',
          }}
          onClick={closeEditModal}
        >
          <div
            style={{
              background: '#1A1A1A',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #2A2A2A',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>
                Редактировать компанию
              </h2>
              <button
                onClick={closeEditModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A0A0A0',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#FF4444'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(255, 68, 68, 0.1)',
                border: '1px solid #FF4444',
                borderRadius: '8px',
                color: '#FF4444',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#A0A0A0', fontWeight: '500', fontSize: '0.9rem' }}>
                  ИНН (нельзя изменить)
                </label>
                <input
                  type="text"
                  value={editingTenant.inn}
                  disabled
                  style={{
                    ...inputStyle,
                    background: '#0A0A0A',
                    color: '#666666',
                    cursor: 'not-allowed',
                    borderColor: '#2A2A2A',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  Название компании *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editFormData.name || ''}
                  onChange={handleEditChange}
                  required
                  style={inputStyle}
                  placeholder="ООО Ромашка"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={editFormData.email || ''}
                  onChange={handleEditChange}
                  style={inputStyle}
                  placeholder="info@romashka.ru"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  КПП
                </label>
                <input
                  type="text"
                  name="kpp"
                  value={editFormData.kpp || ''}
                  onChange={handleEditChange}
                  style={inputStyle}
                  placeholder="771201001"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  Адрес
                </label>
                <input
                  type="text"
                  name="address"
                  value={editFormData.address || ''}
                  onChange={handleEditChange}
                  style={inputStyle}
                  placeholder="г. Москва, ул. Примерная, д. 1"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={editFormData.phone || ''}
                  onChange={handleEditChange}
                  style={inputStyle}
                  placeholder="+7 (495) 123-45-67"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  ФИО директора
                </label>
                <input
                  type="text"
                  name="director_name"
                  value={editFormData.director_name || ''}
                  onChange={handleEditChange}
                  style={inputStyle}
                  placeholder="Иванов Иван Иванович"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                  Сайт компании
                </label>
                <input
                  type="url"
                  name="website"
                  value={editFormData.website || ''}
                  onChange={handleEditChange}
                  style={inputStyle}
                  placeholder="https://romashka.ru"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FF6B35';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#2A2A2A';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '1.5rem',
            }}>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: saving ? '#4A4A4A' : '#FF6B35',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.3s',
                }}
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={closeEditModal}
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
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.background = '#3A3A3A';
                    e.currentTarget.style.borderColor = '#FF6B35';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2A2A2A';
                  e.currentTarget.style.borderColor = '#3A3A3A';
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ ===== */}
      {deleteConfirmId !== null && (
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
            padding: '2rem',
          }}
          onClick={cancelDelete}
        >
          <div
            style={{
              background: '#1A1A1A',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '450px',
              width: '100%',
              border: '1px solid #FF4444',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>
                Удалить компанию?
              </h2>
              <p style={{ margin: 0, color: '#A0A0A0', fontSize: '0.95rem' }}>
                Это действие нельзя отменить. Компания и связанные с ней данные будут удалены.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={cancelDelete}
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
                  transition: 'background 0.3s',
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