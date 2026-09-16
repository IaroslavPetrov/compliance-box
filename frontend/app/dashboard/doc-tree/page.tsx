"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useToast } from '../../../contexts/ToastContext';
import { IconTree, IconUsers, IconMap, IconFileText, IconClipboard, IconAlert } from '../../../components/icons';

const API = 'https://compliance-box-backend.onrender.com/api/v1';

interface PdSubject {
  id: number;
  full_name: string;
  category: string;
  legal_basis: string;
  data_system_ids: number[];
}

interface DataSystem {
  id: number;
  name: string;
  system_type: string;
  categories: string[];
  is_active: boolean;
}

interface DocumentHistory {
  id: number;
  template_id: string;
  created_at: string;
}

type CoverageStatus = 'covered' | 'partial' | 'missing';

interface ProcessNode {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  categories: string[];
  documents: string[];
  description: string;
}

const PROCESSES: ProcessNode[] = [
  {
    id: 'hr',
    label: 'HR-процесс (сотрудники)',
    icon: IconUsers,
    categories: ['Сотрудник'],
    documents: ['policy', 'consent', 'nda', 'order_responsible'],
    description: 'Оформление, учёт и увольнение работников',
  },
  {
    id: 'sales',
    label: 'Продажи и услуги (клиенты)',
    icon: IconUsers,
    categories: ['Клиент'],
    documents: ['policy', 'consent', 'nda'],
    description: 'Клиенты, покупатели, заказчики',
  },
  {
    id: 'candidates',
    label: 'Подбор персонала (кандидаты)',
    icon: IconUsers,
    categories: ['Кандидат'],
    documents: ['policy', 'consent'],
    description: 'Резюме и анкеты соискателей',
  },
  {
    id: 'website',
    label: 'Сайт и маркетинг (посетители)',
    icon: IconFileText,
    categories: ['Посетитель сайта'],
    documents: ['policy'],
    description: 'Сайт, метрики, формы обратной связи',
  },
  {
    id: 'contractors',
    label: 'Контрагенты',
    icon: IconFileText,
    categories: ['Контрагент'],
    documents: ['nda'],
    description: 'Партнёры, поставщики, юрлица',
  },
  {
    id: 'regulator',
    label: 'РКН и регулятор',
    icon: IconClipboard,
    categories: [],
    documents: [],
    description: 'Уведомление оператора, карта обработки',
  },
];

const DOCUMENT_LABELS: Record<string, string> = {
  policy: 'Политика обработки ПДн',
  consent: 'Согласие на обработку',
  nda: 'Соглашение о неразглашении',
  order_responsible: 'Приказ об ответственном',
  threat_model: 'Модель угроз ФСТЭК',
};

export default function DocTreePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const isMobile = useIsMobile();
  const toast = useToast();

  const [subjects, setSubjects] = useState<PdSubject[]>([]);
  const [systems, setSystems] = useState<DataSystem[]>([]);
  const [docs, setDocs] = useState<DocumentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ hr: true });

  // Стабильная ссылка на toast, чтобы не зацикливать useEffect
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    Promise.all([
      fetch(`${API}/pd-subjects/?tenant_id=${tenantId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/data-systems/?tenant_id=${tenantId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => (r.ok ? r.json() : [])),
      fetch(`${API}/documents/history?tenant_id=${tenantId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => (r.ok ? r.json() : [])),
    ])
      .then(([s, sys, d]) => {
        if (cancelled) return;
        setSubjects(Array.isArray(s) ? s : []);
        setSystems(Array.isArray(sys) ? sys : []);
        setDocs(Array.isArray(d) ? d : []);
      })
      .catch(err => {
        if (!cancelled) toastRef.current.error('Не удалось загрузить данные: ' + err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const getProcessData = (proc: ProcessNode) => {
    const procSubjects = subjects.filter(s => proc.categories.includes(s.category));
    const procSystems = systems.filter(s => s.is_active && proc.categories.some(c => (s.categories || []).includes(c)));
    const procDocs = docs.filter(d => proc.documents.includes(d.template_id));
    const uniqueDocTemplates = new Set(procDocs.map(d => d.template_id));
    return { procSubjects, procSystems, procDocs, uniqueDocTemplates };
  };

  const computeStatus = (proc: ProcessNode): CoverageStatus => {
    if (proc.id === 'regulator') {
      const hasMap = systems.length > 0;
      const hasSubjects = subjects.length > 0;
      if (hasMap && hasSubjects) return 'covered';
      if (hasMap || hasSubjects) return 'partial';
      return 'missing';
    }
    if (proc.categories.length === 0) return 'missing';
    const { procSubjects, procSystems, uniqueDocTemplates } = getProcessData(proc);
    const hasSubjects = procSubjects.length > 0;
    const hasSystems = procSystems.length > 0;
    const hasDocs = uniqueDocTemplates.size > 0;
    if (hasSubjects && hasSystems && hasDocs) return 'covered';
    if (hasSubjects || hasSystems || hasDocs) return 'partial';
    return 'missing';
  };

  const StatusBadge = ({ status }: { status: CoverageStatus }) => {
    const map = {
      covered: { bg: 'rgba(0, 200, 83, 0.15)', color: '#00C853', label: 'Покрыто' },
      partial: { bg: 'rgba(255, 193, 7, 0.15)', color: '#FFC107', label: 'Частично' },
      missing: { bg: 'rgba(255, 68, 68, 0.15)', color: '#FF4444', label: 'Не начато' },
    }[status];
    return (
      <span style={{
        padding: '0.2rem 0.55rem',
        background: map.bg,
        color: map.color,
        borderRadius: '10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}>
        {map.label}
      </span>
    );
  };

  const totalSystems = systems.filter(s => s.is_active).length;
  const totalSubjects = subjects.length;
  const totalDocs = new Set(docs.map(d => d.template_id)).size;

  if (!tenantId) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#A0A0A0',
        fontFamily: '-apple-system, sans-serif',
        padding: '1rem',
        textAlign: 'center',
      }}>
        <p>
          Компания не выбрана.{' '}
          <a href="/dashboard" style={{ color: '#FF6B35' }}>Вернуться в личный кабинет</a>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0A0A0A',
        color: '#A0A0A0',
        padding: '1rem',
      }}>
        <p style={{ fontSize: '1.2rem' }}>Загрузка дерева процессов...</p>
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
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ color: '#FF6B35', display: 'inline-flex' }}>
              <IconTree size={28} strokeWidth={1.8} />
            </span>
            <h1 style={{
              margin: 0,
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700',
              lineHeight: 1.2,
            }}>
              Дерево процессов
            </h1>
          </div>
          <p style={{ color: '#A0A0A0', fontSize: '0.95rem', lineHeight: 1.45, margin: 0 }}>
            Полный комплаенс-ландшафт компании: процессы → документы, системы, люди
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          {[
            { label: 'Инфосистем', value: totalSystems, icon: IconMap, color: '#4A90E2' },
            { label: 'Субъектов ПДн', value: totalSubjects, icon: IconUsers, color: '#FF6B35' },
            { label: 'Типов документов', value: totalDocs, icon: IconFileText, color: '#00C853' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: stat.color,
              }}>
                <stat.icon size={20} strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stat.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#A0A0A0' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {PROCESSES.map((proc) => {
            const isOpen = !!expanded[proc.id];
            const status = computeStatus(proc);
            const { procSubjects, procSystems, uniqueDocTemplates } = getProcessData(proc);

            return (
              <div
                key={proc.id}
                style={{
                  background: '#1A1A1A',
                  border: `1px solid ${isOpen ? '#FF6B35' : '#2A2A2A'}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  onClick={() => toggle(proc.id)}
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    textAlign: 'left',
                    color: '#FFFFFF',
                  }}
                >
                  <span style={{
                    display: 'inline-flex',
                    color: '#FF6B35',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                  <span style={{ display: 'inline-flex', color: '#A0A0A0', flexShrink: 0 }}>
                    <proc.icon size={18} strokeWidth={1.8} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.98rem' }}>{proc.label}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.15rem' }}>{proc.description}</div>
                  </div>
                  <StatusBadge status={status} />
                </button>

                {isOpen && (
                  <div style={{
                    padding: '0 1.25rem 1.25rem',
                    display: 'grid',
                    gap: '0.85rem',
                    borderTop: '1px solid #2A2A2A',
                    paddingTop: '1rem',
                  }}>

                    {proc.documents.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                          📄 Документы
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {proc.documents.map(docId => {
                            const exists = uniqueDocTemplates.has(docId);
                            return (
                              <button
                                key={docId}
                                onClick={() => router.push(`/dashboard/documents?tenantId=${tenantId}`)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  background: exists ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 68, 68, 0.08)',
                                  border: `1px solid ${exists ? '#00C853' : '#FF4444'}`,
                                  borderRadius: '6px',
                                  color: exists ? '#00C853' : '#FF4444',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                {exists ? '✓' : '＋'} {DOCUMENT_LABELS[docId] || docId}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {proc.categories.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                          🖥 Информационные системы ({procSystems.length})
                        </div>
                        {procSystems.length === 0 ? (
                          <button
                            onClick={() => router.push('/dashboard/data-map')}
                            style={{
                              padding: '0.5rem 0.85rem',
                              background: 'transparent',
                              border: '1px dashed #FF4444',
                              borderRadius: '6px',
                              color: '#FF4444',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ＋ Добавить ИС для категорий: {proc.categories.join(', ')}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {procSystems.map(s => (
                              <span
                                key={s.id}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  background: 'rgba(74, 144, 226, 0.1)',
                                  border: '1px solid #4A90E2',
                                  borderRadius: '6px',
                                  color: '#4A90E2',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                }}
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {proc.categories.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                          👥 Субъекты ПДн ({procSubjects.length})
                        </div>
                        {procSubjects.length === 0 ? (
                          <button
                            onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}
                            style={{
                              padding: '0.5rem 0.85rem',
                              background: 'transparent',
                              border: '1px dashed #FF4444',
                              borderRadius: '6px',
                              color: '#FF4444',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ＋ Добавить записи категории: {proc.categories.join(', ')}
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {procSubjects.slice(0, 8).map(s => (
                              <span
                                key={s.id}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  background: 'rgba(255, 107, 53, 0.1)',
                                  border: '1px solid #FF6B35',
                                  borderRadius: '6px',
                                  color: '#FF6B35',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                }}
                              >
                                {s.full_name}
                              </span>
                            ))}
                            {procSubjects.length > 8 && (
                              <span style={{ padding: '0.4rem 0.75rem', color: '#666', fontSize: '0.85rem' }}>
                                +{procSubjects.length - 8} ещё
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {proc.id === 'regulator' && (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                          🏛 Регуляторные артефакты
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => router.push('/dashboard/data-map')}
                            style={{
                              padding: '0.5rem 0.85rem',
                              background: systems.length > 0 ? 'rgba(0, 200, 83, 0.1)' : 'rgba(255, 68, 68, 0.08)',
                              border: `1px solid ${systems.length > 0 ? '#00C853' : '#FF4444'}`,
                              borderRadius: '6px',
                              color: systems.length > 0 ? '#00C853' : '#FF4444',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {systems.length > 0 ? '✓' : '＋'} Карта обработки ПДн
                          </button>
                          <span
                            style={{
                              padding: '0.5rem 0.85rem',
                              background: 'rgba(255, 193, 7, 0.1)',
                              border: '1px solid #FFC107',
                              borderRadius: '6px',
                              color: '#FFC107',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <IconAlert size={13} /> Уведомление в РКН (в разработке)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}