'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/documents/list')
      const data = await res.json()
      setDocuments(data.documents)
    } catch (error) {
      setMessage('❌ Ошибка загрузки списка документов')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (documentId: string) => {
    setMessage('⏳ Генерация документа...')
    
    try {
      // Для демо используем tenant_id = 1 (первая зарегистрированная компания)
      const res = await fetch(`https://compliance-box-backend.onrender.com/api/v1/documents/${documentId}?tenant_id=1`, {
        method: 'POST',
      })
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${documentId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage('✅ Документ успешно сгенерирован и скачан!')
      } else {
        const error = await res.json()
        setMessage(`❌ Ошибка: ${error.detail || 'Неизвестная ошибка'}`)
      }
    } catch (error) {
      setMessage(' Ошибка генерации документа')
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '60px auto', padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <button 
          onClick={() => router.push('/')}
          style={{ 
            padding: '8px 16px', 
            background: 'transparent', 
            border: '1px solid #cbd5e1', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Назад
        </button>
      </div>

      <h1 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '28px' }}>
        📄 Генерация документов
      </h1>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>
        Выберите документ для генерации по 152-ФЗ и ФСТЭК
      </p>

      {loading ? (
        <p>Загрузка списка документов...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {documents.map((doc) => (
            <div 
              key={doc.id}
              style={{ 
                padding: '24px', 
                background: 'white', 
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>
                    {doc.name}
                  </h3>
                  <span 
                    style={{ 
                      display: 'inline-block',
                      padding: '4px 12px', 
                      background: '#dbeafe', 
                      color: '#1e40af',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {doc.regulation}
                  </span>
                </div>
              </div>
              
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                {doc.description}
              </p>
              
              <button
                onClick={() => handleGenerate(doc.id)}
                style={{
                  padding: '12px 24px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📥 Сгенерировать PDF
              </button>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div 
          style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: message.includes('✅') ? '#f0fdf4' : '#fef2f2',
            borderRadius: '8px',
            color: message.includes('✅') ? '#166534' : '#991b1b',
            fontSize: '14px'
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}