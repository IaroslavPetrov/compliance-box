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
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setCustomUrl(urlParam);
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
    if (percentage >= 80) return '#00C853'; // Зелёный (успех)
    if (percentage >= 60) return '#FFC107'; // Жёлтый (предупреждение)
    return '#FF4444'; // Красный (ошибка)
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
        <div style={{ marginBottom: '2rem' }}>
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
              marginBottom: '1.5rem',
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
            ← Назад в личный кабинет
          </button>
          
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#FFFFFF' }}>
            Проверка на соответствие 152-ФЗ
          </h1>
          <p style={{ color: '#A0A0A0', marginTop: '0.5rem', fontSize: '1rem' }}>
            Автоматическая проверка сайта на наличие обязательных элементов
          </p>
        </div>

        {/* Форма выбора */}
        <div style={{
          background: '#1A1A1A',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
          marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '600', color: '#FFFFFF' }}>
            Выберите сайт для проверки
          </h2>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
              Выберите компанию из списка:
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
              style={inputStyle}
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
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
              Или введите URL вручную:
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.ru"
              style={inputStyle}
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

          {error && (
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #FF4444',
              borderRadius: '8px',
              color: '#FF4444',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
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
              background: loading ? '#4A4A4A' : '#FF6B35',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s, transform 0.1s',
              letterSpacing: '0.02em',
            }}
            onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? '🔍 Проверка...' : '🚀 Начать проверку'}
          </button>
        </div>

        {/* Результаты */}
        {result && (
          <div style={{
            background: '#1A1A1A',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #2A2A2A',
          }}>
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', fontWeight: '600', color: '#FFFFFF' }}>
              📊 Результаты проверки
            </h2>

            <div style={{
              padding: '1.5rem',
              background: '#141414',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #2A2A2A',
            }}>
              <p style={{ margin: '0 0 0.5rem', color: '#A0A0A0' }}>
                <strong style={{ color: '#FFFFFF' }}>Проверяемый сайт:</strong> {result.url}
              </p>
              <p style={{ margin: '0 0 0.5rem', color: '#A0A0A0' }}>
                <strong style={{ color: '#FFFFFF' }}>Дата проверки:</strong> {new Date(result.checked_at).toLocaleString('ru-RU')}
              </p>
              <div style={{
                marginTop: '1rem',
                padding: '1.5rem',
                background: '#0A0A0A',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #2A2A2A',
              }}>
                <div style={{
                  fontSize: '3.5rem',
                  fontWeight: '700',
                  color: getScoreColor(result.compliance_percentage),
                  lineHeight: 1,
                }}>
                  {result.compliance_percentage}%
                </div>
                <p style={{ margin: '0.75rem 0 0', color: '#FFFFFF', fontSize: '1.1rem', fontWeight: '500' }}>
                  Соответствие обязательным требованиям
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#A0A0A0' }}>
                  {result.passed_required} из {result.total_required} обязательных пунктов
                </p>
              </div>
            </div>

            <h3 style={{ margin: '1.5rem 0 1rem', fontSize: '1.1rem', fontWeight: '600', color: '#FFFFFF' }}>
              Детальная проверка:
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {Object.entries(result.checks).map(([key, check]) => {
                const borderColor = check.found ? '#00C853' : (check.required ? '#FF4444' : '#FFC107');
                const bgColor = check.found ? 'rgba(0, 200, 83, 0.1)' : (check.required ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 193, 7, 0.1)');
                const badgeColor = check.required ? (check.found ? '#00C853' : '#FF4444') : '#FFC107';

                return (
                  <div
                    key={key}
                    style={{
                      padding: '1.25rem',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      background: bgColor,
                      transition: 'transform 0.2s',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#FFFFFF' }}>
                        {check.found ? '✅' : (check.required ? '❌' : '⚠️')} {check.name}
                      </h4>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        background: badgeColor,
                        color: '#0A0A0A',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {check.required ? 'Обязательно' : 'Рекомендуется'}
                      </span>
                    </div>
                    {check.details.length > 0 && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '1rem',
                        background: '#0A0A0A',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        color: '#A0A0A0',
                        border: '1px solid #2A2A2A',
                      }}>
                        <strong style={{ color: '#FFFFFF' }}>Найдено:</strong>
                        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.5rem', lineHeight: 1.6 }}>
                          {check.details.slice(0, 5).map((detail, idx) => (
                            <li key={idx}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}