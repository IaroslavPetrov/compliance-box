'use client'

import { useState } from 'react'

export default function Home() {
  const [formData, setFormData] = useState({ name: '', inn: '', email: '' })
  const [message, setMessage] = useState('')
  const [tenantId, setTenantId] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('Отправка данных на сервер...')
    
    try {
      const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (res.ok) {
        const data = await res.json()
        setTenantId(data.id)
        setMessage(`✅ Успех! Компания "${data.name}" зарегистрирована. ID: ${data.id}`)
      } else {
        const error = await res.json()
        setMessage(`❌ Ошибка: ${error.detail || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      setMessage('❌ Ошибка соединения. Убедись, что бэкенд запущен на порту 8000!')
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '60px auto', padding: '32px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '24px' }}>🛡️ ComplianceBox</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Регистрация компании (Тест связи с API)</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input 
          type="text" placeholder="Название (ООО Ромашка)" value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})} required
          style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
        />
        <input 
          type="text" placeholder="ИНН (7712345678)" value={formData.inn}
          onChange={(e) => setFormData({...formData, inn: e.target.value})} required
          style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
        />
        <input 
          type="email" placeholder="Email (info@romashka.ru)" value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})} required
          style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
        />
        
        <button type="submit" style={{ padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: '600' }}>
          Зарегистрировать компанию
        </button>
      </form>

      {tenantId && (
        <button 
          onClick={() => window.location.href = '/documents'} 
          style={{ 
            marginTop: '16px', 
            padding: '12px 24px', 
            background: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '14px', 
            fontWeight: '600', 
            cursor: 'pointer',
            width: '100%'
          }}
        >
          📄 Перейти к генерации документов
        </button>
      )}

      {message && (
        <div style={{ marginTop: '20px', padding: '16px', background: message.includes('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', color: message.includes('✅') ? '#166534' : '#991b1b', fontSize: '14px' }}>
          {message}
        </div>
      )}
    </div>
  )
}