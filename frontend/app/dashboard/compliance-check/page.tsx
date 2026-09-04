"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  IconSearch,
  IconShield,
  IconClipboard,
  IconCheckCircle,
  IconXCircle,
  IconAlert,
  IconClose,
} from '../../../components/icons';
import { useToast } from '../../../contexts/ToastContext';
import posthog from '../../../contexts/posthog';

const API = 'https://compliance-box-backend.onrender.com/api/v1';

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
  const [reportLoading, setReportLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const toast = useToast();

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
          router.push('/login');
          return;
        }

        const res = await fetch(`${API}/tenants/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Не удалось загрузить список компаний');

        const data = await res.json();
        setTenants(data);
      } catch (err: any) {
        toast.error(err.message);
      }
    };

    fetchTenants();
  }, [router, toast]);

  const checkWebsite = async (urlToCheck: string) => {
    if (!urlToCheck) {
      toast.warning('Введите URL сайта или выберите компанию');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API}/compliance/check?website_url=${encodeURIComponent(urlToCheck)}`,
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
      posthog.capture('compliance_check_completed', {
        url: urlToCheck,
        score: data.compliance_percentage,
        passed: data.passed_required,
        total: data.total_required,
      });
    } catch (err: any) {
      toast.error(err.message);
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
      toast.warning('Введите URL сайта или выберите компанию');
      return;
    }

    await checkWebsite(urlToCheck);
  };

  const handleDownloadReport = async () => {
    if (!result) return;
    setReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/compliance/report-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenant_id: selectedTenant, check: result }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.detail || 'Ошибка генерации отчёта');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_report_${selectedTenant || 'site'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      posthog.capture('compliance_report_downloaded', {
        url: result.url,
        score: result.compliance_percentage,
      });
      toast.success('Отчёт о проверке скачан');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!result) return;
    if (!emailTo.trim() || !emailTo.includes('@')) {
      toast.warning('Введите корректный email');
      return;
    }
    setEmailSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/compliance/report-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email_to: emailTo.trim(),
          tenant_id: selectedTenant,
          check: result,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.detail || 'Ошибка отправки');
      }
      posthog.capture('compliance_report_emailed', {
        url: result.url,
        score: result.compliance_percentage,
      });
      toast.success(`Отчёт отправлен на ${emailTo.trim()}`);
      setEmailModalOpen(false);
      setEmailTo('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailSending(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#00C853';
    if (percentage >= 60) return '#FFC107';
    return '#FF4444';
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
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Шапка */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '1.5rem' : '2rem',
            fontWeight: '700',
            color: '#FFFFFF',
            lineHeight: 1.2,
          }}>
            Проверка на соответствие 152-ФЗ
          </h1>
          <p style={{
            color: '#A0A0A0',
            marginTop: '0.5rem',
            fontSize: '1rem',
            lineHeight: 1.45,
          }}>
            Автоматическая проверка сайта на наличие обязательных элементов
          </p>
        </div>

        {/* Форма выбора */}
        <div style={{
          background: '#1A1A1A',
          padding: isMobile ? '1.25rem' : '2rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
          marginBottom: '2rem',
        }}>
          <h2 style={{
            margin: '0 0 1.5rem',
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#FFFFFF',
          }}>
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
            onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? <IconSearch /> : <IconShield />}
            {loading ? 'Проверка...' : 'Начать проверку'}
          </button>
        </div>

        {/* Результаты */}
        {result && (
          <div style={{
            background: '#1A1A1A',
            padding: isMobile ? '1.25rem' : '2rem',
            borderRadius: '12px',
            border: '1px solid #2A2A2A',
          }}>
            <h2 style={{
              margin: '0 0 1.5rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <IconClipboard />
              Результаты проверки
            </h2>

            <div style={{
              padding: isMobile ? '1rem' : '1.5rem',
              background: '#141414',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #2A2A2A',
            }}>
              <p style={{
                margin: '0 0 0.5rem',
                color: '#A0A0A0',
                wordBreak: 'break-all',
              }}>
                <strong style={{ color: '#FFFFFF' }}>Проверяемый сайт:</strong> {result.url}
              </p>
              <p style={{ margin: '0 0 0.5rem', color: '#A0A0A0' }}>
                <strong style={{ color: '#FFFFFF' }}>Дата проверки:</strong> {new Date(result.checked_at).toLocaleString('ru-RU')}
              </p>
              <div style={{
                marginTop: '1rem',
                padding: isMobile ? '1rem' : '1.5rem',
                background: '#0A0A0A',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #2A2A2A',
              }}>
                <div style={{
                  fontSize: isMobile ? '2.75rem' : '3.5rem',
                  fontWeight: '700',
                  color: getScoreColor(result.compliance_percentage),
                  lineHeight: 1,
                }}>
                  {result.compliance_percentage}%
                </div>
                <p style={{
                  margin: '0.75rem 0 0',
                  color: '#FFFFFF',
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: '500',
                  lineHeight: 1.3,
                }}>
                  Соответствие обязательным требованиям
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#A0A0A0' }}>
                  {result.passed_required} из {result.total_required} обязательных пунктов
                </p>
              </div>
            </div>

            {/* Кнопки экспорта отчёта */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}>
              <button
                onClick={handleDownloadReport}
                disabled={reportLoading}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: reportLoading ? '#4A4A4A' : 'transparent',
                  color: '#00C853',
                  border: '1px solid #00C853',
                  borderRadius: '8px',
                  cursor: reportLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.3s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  if (!reportLoading) {
                    e.currentTarget.style.background = '#00C853';
                    e.currentTarget.style.color = '#FFFFFF';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!reportLoading) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#00C853';
                  }
                }}
              >
                {reportLoading ? 'Генерация...' : '📥 Скачать отчёт (PDF)'}
              </button>
              <button
                onClick={() => setEmailModalOpen(true)}
                style={{
                  flex: 1,
                  padding: '0.875rem',
                  background: 'transparent',
                  color: '#4A90E2',
                  border: '1px solid #4A90E2',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  transition: 'all 0.3s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
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
                📧 Отправить на email
              </button>
            </div>

            <h3 style={{
              margin: '1.5rem 0 1rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#FFFFFF',
            }}>
              Детальная проверка:
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {Object.entries(result.checks).map(([key, check]) => {
                const borderColor = check.found ? '#00C853' : (check.required ? '#FF4444' : '#FFC107');
                const bgColor = check.found ? 'rgba(0, 200, 83, 0.1)' : (check.required ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 193, 7, 0.1)');
                const badgeColor = check.required ? (check.found ? '#00C853' : '#FF4444') : '#FFC107';
                const iconColor = check.found ? '#00C853' : (check.required ? '#FF4444' : '#FFC107');

                return (
                  <div
                    key={key}
                    style={{
                      padding: isMobile ? '1rem' : '1.25rem',
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
                      <h4 style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        <span style={{ color: iconColor, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {check.found ? <IconCheckCircle size={18} /> : (check.required ? <IconXCircle size={18} /> : <IconAlert size={18} />)}
                        </span>
                        <span style={{ wordBreak: 'break-word' }}>{check.name}</span>
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
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
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

            {/* Юридический дисклеймер */}
            <div style={{
              marginTop: '2rem',
              padding: isMobile ? '1rem' : '1rem 1.25rem',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid #FFC107',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <span style={{ color: '#FFC107', display: 'inline-flex', alignItems: 'center', flexShrink: 0, paddingTop: '0.15rem' }}>
                <IconAlert size={20} />
              </span>
              <div>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#E0E0E0',
                  lineHeight: 1.5,
                }}>
                  <strong style={{ color: '#FFC107' }}>Юридический дисклеймер:</strong> Результаты автоматической проверки носят исключительно информационный характер и не являются официальным юридическим заключением. Для получения юридически значимого аудита соответствия 152-ФЗ и минимизации рисков рекомендуем обратиться к профильным специалистам.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ===== МОДАЛКА ОТПРАВКИ НА EMAIL ===== */}
      {emailModalOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, padding: isMobile ? '1rem' : '2rem',
          }}
          onClick={() => setEmailModalOpen(false)}
        >
          <div
            style={{
              background: '#1A1A1A', borderRadius: '12px',
              padding: isMobile ? '1.5rem' : '2rem',
              maxWidth: '450px', width: '100%',
              border: '1px solid #2A2A2A',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700 }}>
                Отправить отчёт на email
              </h2>
              <button
                onClick={() => setEmailModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#A0A0A0', cursor: 'pointer', padding: '0.25rem', display: 'inline-flex' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FF4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#A0A0A0')}
                aria-label="Закрыть"
              >
                <IconClose />
              </button>
            </div>

            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.9rem' }}>
              Email получателя
            </label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#FF6B35'; }}
              onBlur={(e) => { e.target.style.borderColor = '#2A2A2A'; }}
            />
            <p style={{ margin: '0.75rem 0 0', color: '#666', fontSize: '0.8rem', lineHeight: 1.4 }}>
              Получатель получит PDF-отчёт о проверке сайта с баллом соответствия и списком пробелов.
            </p>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={handleSendEmail}
                disabled={emailSending}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: emailSending ? '#4A4A4A' : '#4A90E2',
                  color: '#FFFFFF', border: 'none', borderRadius: '8px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: emailSending ? 'not-allowed' : 'pointer',
                }}
              >
                {emailSending ? 'Отправка...' : 'Отправить'}
              </button>
              <button
                onClick={() => setEmailModalOpen(false)}
                disabled={emailSending}
                style={{
                  flex: 1, padding: '0.875rem',
                  background: '#2A2A2A', color: '#FFFFFF',
                  border: '1px solid #3A3A3A', borderRadius: '8px',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: emailSending ? 'not-allowed' : 'pointer',
                }}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}