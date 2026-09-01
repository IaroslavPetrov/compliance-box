"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ComplianceCheck {
  name: string;
  required: boolean;
  found: boolean;
  details: string[];
}

interface ComplianceResult {
  url: string;
  checked_at: string;
  compliance_percentage: number;
  total_required: number;
  passed_required: number;
  checks: Record<string, ComplianceCheck>;
}

interface Tenant {
  id: number;
  name: string;
  inn: string;
  website?: string;
}

export default function ComplianceCheckPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Проверяем, есть ли параметр url в адресе
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setCustomUrl(urlParam);
      // Автоматически запускаем проверку через 500мс
      setTimeout(() => {
        checkWebsite(urlParam);
      }, 500);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/');
          return;
        }

        const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Не удалось загрузить список компаний');

        const data = await res.json();
        setTenants(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchTenants();
  }, [router]);

  const checkWebsite = async (urlToCheck: string) => {
    if (!urlToCheck) {
      setError('Введите URL сайта или выберите компанию');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/compliance/check?website_url=${encodeURIComponent(urlToCheck)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при проверке');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    let urlToCheck = customUrl;

    // Если выбрана компания, берём её сайт
    if (selectedTenant) {
      const tenant = tenants.find(t => t.id === selectedTenant);
      if (tenant?.website) {
        urlToCheck = tenant.website;
      }
    }

    if (!urlToCheck) {
      setError('Введите URL сайта или выберите компанию');
      return;
    }

    await checkWebsite(urlToCheck);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Шапка */}
        <div style={{
          marginBottom: '2rem',
        }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '0.5rem 1rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '1rem',
            }}
          >
            ← Назад в личный кабинет
          </button>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            color: '#333',
          }}>
             Проверка на соответствие 152-ФЗ
          </h1>
          <p style={{
            color: '#666',
            marginTop: '0.5rem',
          }}>
            Автоматическая проверка сайта на наличие обязательных элементов
          </p>
        </div>

        {/* Форма выбора */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            margin: '0 0 1.5rem',
            fontSize: '1.25rem',
            color: '#333',
          }}>
            Выберите сайт для проверки
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '500',
            }}>
              Или выберите компанию из списка:
            </label>
            <select
              value={selectedTenant || ''}
              onChange={(e) => {
                const tenantId = Number(e.target.value);
                setSelectedTenant(tenantId);
                const tenant = tenants.find(t => t.id === tenantId);
                if (tenant?.website) {
                  setCustomUrl(tenant.website);
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            >
              <option value="">-- Выберите компанию --</option>
              {tenants.filter(t => t.website).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.website})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#333',
              fontWeight: '500',
            }}>
              Или введите URL вручную:
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.ru"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            />
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

          <button
            onClick={handleCheck}
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '🔍 Проверка...' : '🚀 Начать проверку'}
          </button>
        </div>

        {/* Результаты */}
        {result && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <h2 style={{
              margin: '0 0 1.5rem',
              fontSize: '1.25rem',
              color: '#333',
            }}>
              📊 Результаты проверки
            </h2>

            <div style={{
              padding: '1.5rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}>
              <p style={{ margin: '0 0 0.5rem', color: '#666' }}>
                <strong>Проверяемый сайт:</strong> {result.url}
              </p>
              <p style={{ margin: '0 0 0.5rem', color: '#666' }}>
                <strong>Дата проверки:</strong> {new Date(result.checked_at).toLocaleString('ru-RU')}
              </p>
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'white',
                borderRadius: '6px',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: 'bold',
                  color: getScoreColor(result.compliance_percentage),
                }}>
                  {result.compliance_percentage}%
                </div>
                <p style={{ margin: '0.5rem 0 0', color: '#666' }}>
                  Соответствие обязательным требованиям
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#999' }}>
                  {result.passed_required} из {result.total_required} обязательных пунктов
                </p>
              </div>
            </div>

            <h3 style={{
              margin: '1.5rem 0 1rem',
              fontSize: '1.1rem',
              color: '#333',
            }}>
              Детальная проверка:
            </h3>

            <div style={{
              display: 'grid',
              gap: '1rem',
            }}>
              {Object.entries(result.checks).map(([key, check]) => (
                <div
                  key={key}
                  style={{
                    padding: '1rem',
                    border: `2px solid ${check.found ? '#28a745' : (check.required ? '#dc3545' : '#ffc107')}`,
                    borderRadius: '8px',
                    background: check.found ? '#f0fff0' : (check.required ? '#fff5f5' : '#fffef0'),
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1rem',
                      color: '#333',
                    }}>
                      {check.found ? '✅' : (check.required ? '❌' : '️')} {check.name}
                    </h4>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: check.required ? (check.found ? '#28a745' : '#dc3545') : '#ffc107',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}>
                      {check.required ? 'Обязательно' : 'Рекомендуется'}
                    </span>
                  </div>
                  {check.details.length > 0 && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      color: '#666',
                    }}>
                      <strong>Найдено:</strong>
                      <ul style={{
                        margin: '0.5rem 0 0',
                        paddingLeft: '1.5rem',
                      }}>
                        {check.details.slice(0, 5).map((detail, idx) => (
                          <li key={idx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}