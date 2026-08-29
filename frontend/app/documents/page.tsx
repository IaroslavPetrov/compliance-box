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

  const handleGenerate = async (docId: string) => {
    setGenerating(docId);
    setError(null);
    try {
      const res = await fetch(`https://compliance-box-backend.onrender.com/api/v1/documents/${docId}?tenant_id=${tenantId}`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Ошибка генерации: ${res.status} - ${errText}`);
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docId}_${tenantId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) return <div style={{padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif'}}>Загрузка документов...</div>;
  if (error) return <div style={{padding: '2rem', color: 'red', textAlign: 'center', fontFamily: 'sans-serif'}}>Ошибка: {error}</div>;

  return (
    <div style={{maxWidth: '800px', margin: '2rem auto', padding: '2rem', fontFamily: 'sans-serif'}}>
      <h1>Документы для компании (ID: {tenantId})</h1>
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        {documents.map((doc) => (
          <div key={doc.id} style={{border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontSize: '1.1rem'}}>{doc.name}</span>
            <button 
              onClick={() => handleGenerate(doc.id)} 
              disabled={generating === doc.id}
              style={{
                padding: '0.5rem 1rem', 
                background: generating === doc.id ? '#ccc' : '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              {generating === doc.id ? '⏳ Генерация...' : '📥 Сгенерировать PDF'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}