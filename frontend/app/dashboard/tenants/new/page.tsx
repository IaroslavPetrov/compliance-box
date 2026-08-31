"use client";

import { useState, useEffect, useRef } from 'react';
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

    // Если меняется ИНН - запускаем автозаполнение
    if (name === 'inn') {
      const cleanInn = value.replace(/\D/g, '');
      if (cleanInn.length === 10 || cleanInn.length === 12) {
        // Debounce: ждём 500мс после последнего изменения
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
        setDadataInfo('️ Компания с таким ИНН не найдена. Заполните поля вручную.');
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
    
    // Валидация ИНН
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.75rem',
            color: '#333',
          }}>
            Добавить компанию
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Отмена
          </button>
        </div>

        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <form onSubmit={handleSubmit}>
            {/* ИНН - с автозаполнением */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                ИНН *
              </label>
              <input
                type="text"
                name="inn"
                value={formData.inn}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="Введите 10 или 12 цифр"
              />
              <small style={{ color: '#666', fontSize: '0.875rem' }}>
                10 цифр для юрлиц, 12 для ИП
              </small>
              {dadataInfo && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  background: dadataLoading ? '#fff3cd' : (dadataInfo.includes('✅') ? '#d4edda' : (dadataInfo.includes('❌') ? '#f8d7da' : '#fff3cd')),
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#333',
                }}>
                  {dadataInfo}
                </div>
              )}
            </div>

            {/* Название */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                Название компании *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="ООО Ромашка"
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="info@romashka.ru"
              />
            </div>

            {/* КПП */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                КПП
              </label>
              <input
                type="text"
                name="kpp"
                value={formData.kpp}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="771201001"
              />
            </div>

            {/* Адрес */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                Адрес
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>

            {/* Телефон */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="+7 (495) 123-45-67"
              />
            </div>

            {/* ФИО директора */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                ФИО директора
              </label>
              <input
                type="text"
                name="director_name"
                value={formData.director_name}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="Иванов Иван Иванович"
              />
            </div>

            {/* Сайт */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#333',
                fontWeight: '500',
              }}>
                Сайт компании
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                placeholder="https://romashka.ru"
              />
              <small style={{ color: '#666', fontSize: '0.875rem' }}>
                Необязательно. Будет использоваться для проверки на соответствие 152-ФЗ
              </small>
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '8px',
                color: '#c00',
                marginBottom: '1.5rem',
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
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
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