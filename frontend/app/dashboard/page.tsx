"use client";

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/');
          return;
        }

        const userRes = await fetch('https://compliance-box-backend.onrender.com/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!userRes.ok) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }

        const userData = await userRes.json();
        setUser(userData);

        const tenantsRes = await fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
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
    };

    fetchData();
  }, [router]);

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
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '600', color: '#FFFFFF' }}>
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
                    {tenant.website && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckWebsite(tenant.website);
                        }}
                        style={{
                          padding: '0.6rem 1.25rem',
                          background: 'transparent',
                          color: '#FF6B35',
                          border: '1px solid #FF6B35',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          marginLeft: '1rem',
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}