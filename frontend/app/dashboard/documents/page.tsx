"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId') || '1';
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/documents/list');
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
    setProgress(` Генерация ${format === 'pdf' ? 'PDF' : 'Word'}... это может занять до 30 секунд.`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const token = localStorage.getItem('token');
      
      const endpoint = format === 'pdf' 
        ? docId 
        : `${docId}/word`;
      
      const res = await fetch(
        `https://compliance-box-backend.onrender.com/api/v1/documents/${endpoint}?tenant_id=${tenantId}`, 
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,  // ← ДОБАВЛЕНО
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
      setProgress('');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError(' Превышено время ожидания (60 сек). Попробуйте ещё раз.');
      } else {
        setError(`❌ Ошибка: ${err.message}`);
      }
      setProgress('');
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div style={{padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif'}}>Загрузка документов...</div>;
  if (error) return <div style={{padding: '2rem', color: 'red', textAlign: 'center', fontFamily: 'sans-serif'}}>Ошибка: {error}</div>;

  return (
    <div style={{maxWidth: '900px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif'}}>
      <h1>Документы для компании (ID: {tenantId})</h1>
      {progress && <div style={{padding: '1rem', background: '#fff3cd', borderRadius: '8px', marginBottom: '1rem'}}>{progress}</div>}
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        {documents.map((doc) => {
          const isGeneratingPdf = generating === `${doc.id}-pdf`;
          const isGeneratingWord = generating === `${doc.id}-word`;
          const isGenerating = isGeneratingPdf || isGeneratingWord;
          
          return (
            <div key={doc.id} style={{border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'}}>
              <span style={{fontSize: '1.1rem', flex: 1, minWidth: '200px'}}>{doc.name}</span>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button 
                  onClick={() => handleDownload(doc.id, 'pdf')} 
                  disabled={isGenerating}
                  style={{
                    padding: '0.5rem 1rem', 
                    background: isGeneratingPdf ? '#ccc' : '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {isGeneratingPdf ? '⏳ ...' : '📄 PDF'}
                </button>
                <button 
                  onClick={() => handleDownload(doc.id, 'word')} 
                  disabled={isGenerating}
                  style={{
                    padding: '0.5rem 1rem', 
                    background: isGeneratingWord ? '#ccc' : '#0070f3', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  {isGeneratingWord ? ' ...' : '📝 Word'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}