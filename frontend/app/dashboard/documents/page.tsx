"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  IconArrowLeft,
  IconFileText,
  IconClock,
} from '../../../components/icons';
import { useToast } from '../../../contexts/ToastContext';
import posthog from '../../../contexts/posthog';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tenantId = searchParams.get('tenantId') || '1';
  const isMobile = useIsMobile();
  const toast = useToast();
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

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
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [toast]);

  const handleDownload = async (docId: string, format: 'pdf' | 'word') => {
    setGenerating(`${docId}-${format}`);
    
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
      
      toast.success(`Документ готов! Скачивание ${format.toUpperCase()}...`);
      posthog.capture('document_downloaded', { doc_id: docId, format, tenant_id: tenantId });
      
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
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.warning('Превышено время ожидания (60 сек). Попробуйте ещё раз.');
      } else {
        toast.error(err.message);
      }
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
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Шапка с навигацией */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            fontWeight: '700',
            color: '#FFFFFF',
            lineHeight: 1.3,
          }}>
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
              width: isMobile ? '100%' : 'auto',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
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
            <IconArrowLeft />
            Назад в личный кабинет
          </button>
        </div>

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
                  padding: isMobile ? '1rem' : '1.25rem',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: '1rem',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isMobile && !isGenerating) {
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
                  color: '#FFFFFF',
                  lineHeight: 1.4,
                }}>
                  {doc.name}
                </span>
                
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexDirection: isMobile ? 'row' : 'row',
                }}>
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
                      flex: isMobile ? 1 : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseDown={(e) => { if (!isGeneratingPdf) e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isGeneratingPdf ? <IconClock size={14} /> : <IconFileText size={14} />}
                    {isGeneratingPdf ? '...' : 'PDF'}
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
                      flex: isMobile ? 1 : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseDown={(e) => { if (!isGeneratingWord) e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isGeneratingWord ? <IconClock size={14} /> : <IconFileText size={14} />}
                    {isGeneratingWord ? '...' : 'Word'}
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