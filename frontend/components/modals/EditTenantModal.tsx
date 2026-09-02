"use client";

import { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../contexts/ToastContext';
import { IconClose } from '../icons';

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

interface EditTenantModalProps {
  tenant: Tenant;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTenantModal({ tenant, onClose, onSaved }: EditTenantModalProps) {
  const isMobile = useIsMobile();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: tenant.name,
    email: tenant.email || '',
    kpp: tenant.kpp || '',
    address: tenant.address || '',
    phone: tenant.phone || '',
    director_name: tenant.director_name || '',
    website: tenant.website || '',
  });

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/tenants/${tenant.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Ошибка при сохранении');
      }

      toast.success('Изменения сохранены');
      onSaved();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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
        padding: isMobile ? '1rem' : '2rem',
      }}
      onClick={onClose}
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
          <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: '700', color: '#FFFFFF' }}>
            Редактировать компанию
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A0A0A0',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#FF4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}
            aria-label="Закрыть"
          >
            <IconClose />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#A0A0A0', fontWeight: '500', fontSize: '0.9rem' }}>
              ИНН (нельзя изменить)
            </label>
            <input
              type="text"
              value={tenant.inn}
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
              value={formData.name || ''}
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
              value={formData.email || ''}
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
              value={formData.kpp || ''}
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
              value={formData.address || ''}
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
              value={formData.phone || ''}
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
              value={formData.director_name || ''}
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
              value={formData.website || ''}
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
          flexDirection: isMobile ? 'column' : 'row',
          gap: '0.75rem',
          marginTop: '1.5rem',
        }}>
          <button
            onClick={handleSave}
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
            onClick={onClose}
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
  );
}