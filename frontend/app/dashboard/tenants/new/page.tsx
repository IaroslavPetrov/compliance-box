"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// DaData API ключ
const DADATA_API_KEY = '48be40bb2c09d5cad447aab5b508873f5e7d612b';

export default function NewTenantPage() {
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    email: '',
    kpp: '',
    address: '',
    phone: '',
    director_name: '',
    website: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dadataLoading, setDadataLoading] = useState(false);
  const [dadataInfo, setDadataInfo] = useState('');
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'inn') {
      const cleanInn = value.replace(/\D/g, '');
      if (cleanInn.length === 10 || cleanInn.length === 12) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          fetchFromDadata(cleanInn);
        }, 500);
      } else {
        setDadataInfo('');
      }
    }
  };

  const fetchFromDadata = async (inn: string) => {
    setDadataLoading(true);
    setDadataInfo('🔍 Ищем компанию по ИНН...');
    setError('');

    try {
      const response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Token ${DADATA_API_KEY}`,
        },
        body: JSON.stringify({ query: inn }),
      });

      if (!response.ok) {
        throw new Error('Ошибка запроса к DaData');
      }

      const data = await response.json();
      
      if (data.suggestions && data.suggestions.length > 0) {
        const company = data.suggestions[0];
        const d = company.data;

        setFormData(prev => ({
          ...prev,
          name: d.name?.full_with_opf || company.value || '',
          kpp: d.kpp || '',
          address: d.address?.value || '',
          director_name: d.management?.name || '',
          phone: d.phones?.[0]?.value || prev.phone,
        }));

        setDadataInfo(`✅ Найдено: ${company.value}`);
      } else {
        setDadataInfo('⚠️ Компания с таким ИНН не найдена. Заполните поля вручную.');
      }
    } catch (err: any) {
      setDadataInfo('❌ Ошибка получения данных от DaData. Заполните поля вручную.');
      console.error('DaData error:', err);
    } finally {
      setDadataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanInn = formData.inn.replace(/\D/g, '');
    if (cleanInn.length !== 10 && cleanInn.length !== 12) {
      setError('ИНН должен содержать 10 цифр (для юрлиц) или 12 цифр (для ИП)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Не авторизован');
      }

      const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при добавлении компании');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Шапка с навигацией */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#FFFFFF' }}>
            Добавить компанию
          </h1>
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
        </div>

        <div style={{
          background: '#1A1A1A',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #2A2A2A',
        }}>
          <form onSubmit={handleSubmit}>
            {/* ИНН */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                ИНН *
              </label>
              <input
                type="text"
                name="inn"
                value={formData.inn}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="Введите 10 или 12 цифр"
                onFocus={(e) => {
                  e.target.style.borderColor = '#FF6B35';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#2A2A2A';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <small style={{ color: '#666666', fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>
                10 цифр для юрлиц, 12 для ИП
              </small>
              {dadataInfo && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  border: dadataLoading ? '1px solid #FFC107' : (dadataInfo.includes('✅') ? '1px solid #00C853' : '1px solid #FF4444'),
                  background: dadataLoading ? 'rgba(255, 193, 7, 0.1)' : (dadataInfo.includes('✅') ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 68, 68, 0.1)'),
                  color: dadataLoading ? '#FFC107' : (dadataInfo.includes('✅') ? '#00C853' : '#FF4444'),
                }}>
                  {dadataInfo}
                </div>
              )}
            </div>

            {/* Название */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                Название компании *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
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

            {/* Email */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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

            {/* КПП */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                КПП
              </label>
              <input
                type="text"
                name="kpp"
                value={formData.kpp}
                onChange={handleChange}
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

            {/* Адрес */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                Адрес
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
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

            {/* Телефон */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
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

            {/* ФИО директора */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                ФИО директора
              </label>
              <input
                type="text"
                name="director_name"
                value={formData.director_name}
                onChange={handleChange}
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

            {/* Сайт */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#FFFFFF', fontWeight: '500', fontSize: '0.9rem' }}>
                Сайт компании
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
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
              <small style={{ color: '#666666', fontSize: '0.85rem', marginTop: '6px', display: 'block' }}>
                Необязательно. Будет использоваться для проверки на соответствие 152-ФЗ
              </small>
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
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#4A4A4A' : '#00C853',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s, transform 0.1s',
                letterSpacing: '0.02em',
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {loading ? 'Добавление...' : 'Добавить компанию'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}