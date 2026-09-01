"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = searchParams.get('tenantId') || '1';
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/documents/list', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Не удалось загрузить список документов');
        const data = await res.json();
        setDocuments(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, []);

  const handleDownload = async (docId: string, format: 'pdf' | 'word') => {
    setGenerating(`${docId}-${format}`);
    setError(null);
    setProgress(`⏳ Генерация ${format === 'pdf' ? 'PDF' : 'Word'}... это может занять до 30 секунд.`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const token = localStorage.getItem('token');
      const endpoint = format === 'pdf' ? docId : `${docId}/word`;
      
      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/documents/${endpoint}?tenant_id=${tenantId}`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ошибка генерации: ${res.status} - ${errText}`);
      }
      
      setProgress(`✅ Документ готов! Скачивание...`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const extension = format === 'pdf' ? 'pdf' : 'docx';
      a.download = `${docId}_${tenantId}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setTimeout(() => setProgress(''), 3000); // Очистить сообщение через 3 сек
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('⏱ Превышено время ожидания (60 сек). Попробуйте ещё раз.');
      } else {
        setError(`❌ Ошибка: ${err.message}`);
      }
      setProgress('');
    } finally {
      setGenerating(null);
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
        color: '#A0A0A0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '1.2rem',
      }}>
        Загрузка документов...
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
        
        {/* Шапка с навигацией */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#FFFFFF' }}>
            Документы для компании <span style={{ color: '#FF6B35' }}>(ID: {tenantId})</span>
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

        {/* Сообщения о прогрессе или ошибках */}
        {progress && (
          <div style={{
            padding: '1rem',
            background: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid #FFC107',
            borderRadius: '8px',
            color: '#FFC107',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
          }}>
            {progress}
          </div>
        )}
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

        {/* Список документов */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {documents.map((doc) => {
            const isGeneratingPdf = generating === `${doc.id}-pdf`;
            const isGeneratingWord = generating === `${doc.id}-word`;
            const isGenerating = isGeneratingPdf || isGeneratingWord;
            
            return (
              <div 
                key={doc.id} 
                style={{
                  border: '1px solid #2A2A2A',
                  background: '#1A1A1A',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) {
                    e.currentTarget.style.borderColor = '#FF6B35';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2A2A2A';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '500',
                  flex: 1, 
                  minWidth: '200px',
                  color: '#FFFFFF'
                }}>
                  {doc.name}
                </span>
                
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => handleDownload(doc.id, 'pdf')} 
                    disabled={isGenerating}
                    style={{
                      padding: '0.6rem 1.25rem', 
                      background: isGeneratingPdf ? '#4A4A4A' : '#FF6B35', 
                      color: '#FFFFFF', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                    }}
                    onMouseDown={(e) => { if (!isGeneratingPdf) e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isGeneratingPdf ? '⏳ ...' : '📄 PDF'}
                  </button>
                  
                  <button 
                    onClick={() => handleDownload(doc.id, 'word')} 
                    disabled={isGenerating}
                    style={{
                      padding: '0.6rem 1.25rem', 
                      background: isGeneratingWord ? '#4A4A4A' : '#0078D4', 
                      color: '#FFFFFF', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                    }}
                    onMouseDown={(e) => { if (!isGeneratingWord) e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isGeneratingWord ? '⏳ ...' : '📝 Word'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}