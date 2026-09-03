"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useIsMobile } from '../../hooks/useIsMobile';
import {
  IconSearch,
  IconClipboard,
  IconEdit,
  IconTrash,
  IconPlus,
} from '../../components/icons';
import { useToast } from '../../contexts/ToastContext';
import posthog from '../../contexts/posthog';

// Lazy loading модалок — загрузятся только при первом открытии
const EditTenantModal = dynamic(() => import('../../components/modals/EditTenantModal'), {
  ssr: false,
});

const DeleteConfirmModal = dynamic(() => import('../../components/modals/DeleteConfirmModal'), {
  ssr: false,
});

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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const isMobile = useIsMobile();
  const toast = useToast();

  // Состояния для редактирования
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

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
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAddCompany = () => {
    posthog.capture('add_company_clicked');
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
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTenant(null);
  };

  const handleEditSaved = () => {
    fetchDashboardData();
    closeEditModal();
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

      toast.success('Компания удалена');
      posthog.capture('tenant_deleted');
      await fetchDashboardData();
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.message);
      setDeleteConfirmId(null);
    } finally {
      setDeleting(false);
    }
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
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Шапка */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '1rem' : '0',
          marginBottom: '2rem',
          background: '#1A1A1A',
          padding: isMobile ? '1.25rem' : '1.5rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: '700', color: '#FFFFFF' }}>
              Личный кабинет
            </h1>
            <p style={{ margin: '0.5rem 0 0', color: '#A0A0A0', fontSize: '0.95rem' }}>
              {user?.email}
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem',
            flexDirection: isMobile ? 'column' : 'row',
          }}>
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
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#E55A2B'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}
            >
              <IconSearch />
              Проверка сайта
            </button>
          </div>
        </div>

        {/* Список компаний */}
        <div style={{
          background: '#1A1A1A',
          padding: isMobile ? '1.25rem' : '1.5rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
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
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
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
              <IconPlus />
              Добавить компанию
            </button>
          </div>

          {tenants.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: isMobile ? '2rem 1rem' : '3rem',
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
                  width: isMobile ? '100%' : 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E55A2B'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#FF6B35'}
              >
                <IconPlus />
                Добавить первую компанию
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  style={{
                    padding: isMobile ? '1rem' : '1.25rem',
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
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 107, 53, 0.1)';
                    }
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
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'flex-start',
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
                        <p style={{ margin: '0.25rem 0', color: '#A0A0A0', fontSize: '0.95rem', wordBreak: 'break-all' }}>
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
                            style={{ color: '#FF6B35', textDecoration: 'none', transition: 'color 0.2s', wordBreak: 'break-all' }}
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
                      flexDirection: isMobile ? 'row' : 'column',
                      gap: '0.5rem',
                      flexShrink: 0,
                      flexWrap: 'wrap',
                    }}>
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
                          flex: isMobile ? 1 : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
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
                        <IconClipboard size={13} />
                        Реестр ПДн
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
                            flex: isMobile ? 1 : 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
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
                          <IconSearch size={13} />
                          Проверить
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
                          flex: isMobile ? 1 : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
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
                        <IconEdit size={13} />
                        Изменить
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
                          flex: isMobile ? 1 : 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
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
                        <IconTrash size={13} />
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== ДИНАМИЧЕСКИЕ МОДАЛКИ (lazy loading) ===== */}
      {showEditModal && editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          onClose={closeEditModal}
          onSaved={handleEditSaved}
        />
      )}

      {deleteConfirmId !== null && (
        <DeleteConfirmModal
          title="Удалить компанию?"
          message="Это действие нельзя отменить. Компания и связанные с ней данные будут удалены."
          deleting={deleting}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}