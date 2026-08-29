"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

interface Tenant {
  id: number;
  name: string;
  inn: string;
  email: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchUserData(token);
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const [userRes, tenantsRes] = await Promise.all([
        fetch('https://compliance-box-backend.onrender.com/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!userRes.ok || !tenantsRes.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const userData = await userRes.json();
      const tenantsData = await tenantsRes.json();

      setUser(userData);
      setTenants(tenantsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleAddCompany = () => {
    router.push('/dashboard/tenants/new');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Шапка */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.75rem',
              color: '#333',
            }}>
              Личный кабинет
            </h1>
            <p style={{
              margin: '0.5rem 0 0',
              color: '#666',
            }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Выйти
          </button>
        </div>

        {/* Список компаний */}
        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              color: '#333',
            }}>
              Мои компании
            </h2>
            <button
              onClick={handleAddCompany}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              + Добавить компанию
            </button>
          </div>

          {error && (
            <div style={{
              padding: '1rem',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          {tenants.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#666',
            }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                У вас пока нет компаний
              </p>
              <button
                onClick={handleAddCompany}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Добавить первую компанию
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '1rem',
            }}>
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  style={{
                    padding: '1.25rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.3s',
                  }}
                  onClick={() => router.push(`/documents?tenantId=${tenant.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3 style={{
                    margin: '0 0 0.5rem',
                    fontSize: '1.25rem',
                    color: '#333',
                  }}>
                    {tenant.name}
                  </h3>
                  <p style={{
                    margin: '0.25rem 0',
                    color: '#666',
                  }}>
                    <strong>ИНН:</strong> {tenant.inn}
                  </p>
                  {tenant.email && (
                    <p style={{
                      margin: '0.25rem 0',
                      color: '#666',
                    }}>
                      <strong>Email:</strong> {tenant.email}
                    </p>
                  )}
                  <p style={{
                    margin: '0.5rem 0 0',
                    fontSize: '0.875rem',
                    color: '#999',
                  }}>
                    Добавлена: {new Date(tenant.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}