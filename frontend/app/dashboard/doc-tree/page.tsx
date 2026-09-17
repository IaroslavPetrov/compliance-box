"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useToast } from '../../../contexts/ToastContext';
import { useTenant } from '../../../contexts/TenantContext';
import { IconTree, IconAlert } from '../../../components/icons';

const API = '/api/v1';

interface PdSubject {
  id: number;
  full_name: string;
  category: string;
  legal_basis: string;
  data_types: string;
}

interface DataSystem {
  id: number;
  name: string;
  system_type: string;
  categories: string[];
  data_location: string;
  is_active: boolean;
}

interface DocumentHistory {
  id: number;
  template_id?: string;
  document_type?: string;
  template?: string;
  created_at: string;
}

interface ProcessNode {
  id: string;
  label: string;
  emoji: string;
  categories: string[];
  documents: string[];
  description: string;
}

type Selection =
  | { kind: 'doc'; docId: string }
  | { kind: 'process'; procId: string }
  | { kind: 'sysgroup'; procId: string }
  | { kind: 'peoplegroup'; procId: string }
  | { kind: 'regulator' };

const PROCESSES: ProcessNode[] = [
  {
    id: 'hr',
    label: 'HR-процесс',
    emoji: '👔',
    categories: ['Сотрудник'],
    documents: ['policy', 'consent', 'nda', 'order_responsible'],
    description: 'Оформление, учёт и увольнение работников',
  },
  {
    id: 'sales',
    label: 'Продажи и услуги',
    emoji: '🛒',
    categories: ['Клиент'],
    documents: ['policy', 'consent', 'nda'],
    description: 'Клиенты, покупатели, заказчики',
  },
  {
    id: 'candidates',
    label: 'Подбор персонала',
    emoji: '🧑‍💼',
    categories: ['Кандидат'],
    documents: ['policy', 'consent'],
    description: 'Резюме и анкеты соискателей',
  },
  {
    id: 'website',
    label: 'Сайт и маркетинг',
    emoji: '🌐',
    categories: ['Посетитель сайта'],
    documents: ['policy'],
    description: 'Сайт, метрики, формы обратной связи',
  },
  {
    id: 'contractors',
    label: 'Контрагенты',
    emoji: '🤝',
    categories: ['Контрагент'],
    documents: ['policy', 'nda'],
    description: 'Партнёры, поставщики, юрлица',
  },
];

const DOCUMENT_LABELS: Record<string, string> = {
  policy: 'Политика обработки ПДн',
  consent: 'Согласие на обработку',
  nda: 'Соглашение о неразглашении',
  order_responsible: 'Приказ об ответственном',
  threat_model: 'Модель угроз ФСТЭК',
};

const DOCUMENT_HINTS: Record<string, string> = {
  policy: 'Главный публичный документ компании: описывает, какие данные и зачем обрабатываются. Обязательно публикуется на сайте. От неё «растут» все остальные документы и процессы.',
  consent: 'Письменное или электронное разрешение субъекта на обработку его персональных данных.',
  nda: 'Защищает персональные данные и коммерческую тайну при работе с сотрудниками и партнёрами.',
  order_responsible: 'Назначает в компании ответственного за организацию обработки ПДн (требование 152-ФЗ).',
  threat_model: 'Документ ФСТЭК: описывает угрозы и меры защиты информационной системы.',
};

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  local: 'Локальный сервер / компьютер',
  cloud_saas: 'Облачный сервис (SaaS)',
  file: 'Файловое хранилище',
  physical: 'Бумажные носители',
};

export default function DocTreePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const isMobile = useIsMobile();
  const toast = useToast();
  const { currentTenant } = useTenant();

  const [subjects, setSubjects] = useState<PdSubject[]>([]);
  const [systems, setSystems] = useState<DataSystem[]>([]);
  const [docs, setDocs] = useState<DocumentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selection, setSelection] = useState<Selection>({ kind: 'doc', docId: 'policy' });

  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!tenantId && currentTenant) {
      router.replace(`/dashboard/doc-tree?tenantId=${currentTenant.id}`);
    }
  }, [tenantId, currentTenant, router]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const loadOnce = () =>
      Promise.all([
        fetch(`${API}/pd-subjects/?tenant_id=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${API}/data-systems/?tenant_id=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => (r.ok ? r.json() : [])),
        fetch(`${API}/documents/history?tenant_id=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }).then(r => (r.ok ? r.json() : [])),
      ]);

    const attempt = (left: number) => {
      loadOnce()
        .then(([s, sys, d]) => {
          if (cancelled) return;
          setSubjects(Array.isArray(s) ? s : []);
          setSystems(Array.isArray(sys) ? sys : []);
          setDocs(Array.isArray(d) ? d : []);
          setLoadError(false);
          setLoading(false);
        })
        .catch(err => {
          if (cancelled) return;
          if (left > 0) {
            window.setTimeout(() => {
              if (!cancelled) attempt(left - 1);
            }, 1500);
          } else {
            console.error('doc-tree load error:', err);
            setLoading(false);
            setLoadError(true);
          }
        });
    };

    setLoading(true);
    setLoadError(false);
    attempt(2);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, retry]);

  const docKey = (d: DocumentHistory) => d.template_id || d.document_type || d.template || '';
  const generatedTemplates = new Set(docs.map(docKey));

  const procSubjects = (proc: ProcessNode) =>
    subjects.filter(s => proc.categories.includes(s.category));
  const procSystems = (proc: ProcessNode) =>
    systems.filter(s => s.is_active && proc.categories.some(c => (s.categories || []).includes(c)));
  const procDocsReady = (proc: ProcessNode) =>
    proc.documents.filter(docId => generatedTemplates.has(docId));

  const isSelected = (sel: Selection) => JSON.stringify(sel) === JSON.stringify(selection);

  // Узел диаграммы
  const Node = ({ sel, onClick, emoji, label, sub, subColor, dashed }: {
    sel: Selection;
    onClick: () => void;
    emoji: string;
    label: string;
    sub?: string;
    subColor?: string;
    dashed?: boolean;
  }) => {
    const active = isSelected(sel);
    return (
      <button
        onClick={onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          minWidth: '128px',
          maxWidth: '170px',
          padding: '0.55rem 0.7rem',
          background: active ? 'rgba(255, 107, 53, 0.12)' : '#1A1A1A',
          border: dashed ? '1px dashed #FF4444' : `1px solid ${active ? '#FF6B35' : '#2A2A2A'}`,
          borderRadius: '10px',
          color: active ? '#FF6B35' : '#D0D0D0',
          fontSize: '0.78rem',
          fontWeight: active ? 700 : 500,
          lineHeight: 1.25,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <span style={{ fontSize: '1.05rem' }}>{emoji}</span>
        <span>{label}</span>
        {sub && (
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: subColor || '#666' }}>{sub}</span>
        )}
      </button>
    );
  };

  // ------------------------------------------------------------------
  // ПРАВАЯ ПАНЕЛЬ
  // ------------------------------------------------------------------
  const renderDetail = () => {
    const card: React.CSSProperties = {
      background: '#1A1A1A',
      border: '1px solid #2A2A2A',
      borderRadius: '12px',
      padding: '1.25rem',
    };
    const btnPrimary: React.CSSProperties = {
      padding: '0.6rem 1.1rem',
      background: '#FF6B35',
      border: 'none',
      borderRadius: '8px',
      color: '#FFFFFF',
      fontSize: '0.9rem',
      fontWeight: 700,
      cursor: 'pointer',
    };
    const Label = ({ children }: { children: React.ReactNode }) => (
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.9rem', marginBottom: '0.25rem' }}>
        {children}
      </div>
    );

    if (selection.kind === 'doc') {
      const ready = generatedTemplates.has(selection.docId);
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
            {ready ? '✅' : '❌'} {DOCUMENT_LABELS[selection.docId] || selection.docId}
          </div>
          <p style={{ fontSize: '0.9rem', color: '#A0A0A0', lineHeight: 1.55, marginTop: '0.5rem' }}>
            {DOCUMENT_HINTS[selection.docId] || ''}
          </p>
          <Label>Статус</Label>
          <div style={{ fontSize: '0.92rem', color: ready ? '#00C853' : '#FF4444', fontWeight: 600 }}>
            {ready ? 'Документ сгенерирован — можно скачать в разделе «Документы»' : 'Документ ещё не создан'}
          </div>
          <div style={{ marginTop: '1.1rem' }}>
            <button style={btnPrimary} onClick={() => router.push(`/dashboard/documents?tenantId=${tenantId}`)}>
              {ready ? 'Скачать документ' : 'Сгенерировать документ'}
            </button>
          </div>
        </div>
      );
    }

    if (selection.kind === 'process') {
      const proc = PROCESSES.find(p => p.id === selection.procId);
      if (!proc) return null;
      const ready = procDocsReady(proc);
      const pSys = procSystems(proc);
      const pSubj = procSubjects(proc);
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{proc.emoji} {proc.label}</div>
          <p style={{ fontSize: '0.9rem', color: '#A0A0A0', lineHeight: 1.5 }}>{proc.description}</p>
          <Label>Готовность документов</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0', fontWeight: 600 }}>
            {ready.length} из {proc.documents.length}
          </div>
          <Label>Связанные данные</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span>🖥 Систем: <b>{pSys.length}</b></span>
            <span>👥 Людей: <b>{pSubj.length}</b></span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={() => router.push(`/dashboard/documents?tenantId=${tenantId}`)}>
              К документам
            </button>
            <button
              style={{ ...btnPrimary, background: 'transparent', border: '1px solid #3A3A3A', color: '#A0A0A0' }}
              onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}
            >
              К реестру
            </button>
          </div>
        </div>
      );
    }

    if (selection.kind === 'sysgroup') {
      const proc = PROCESSES.find(p => p.id === selection.procId);
      const pSys = proc ? procSystems(proc) : [];
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>🖥 Информационные системы</div>
          <p style={{ fontSize: '0.88rem', color: '#A0A0A0' }}>
            Системы процесса «{proc?.label}», в которых обрабатываются данные категорий: {proc?.categories.join(', ')}
          </p>
          {pSys.length === 0 ? (
            <>
              <Label>Статус</Label>
              <div style={{ fontSize: '0.92rem', color: '#FF4444', fontWeight: 600 }}>
                Системы не заведены — данные обрабатываются «неучтённо», это риск при проверке
              </div>
              <div style={{ marginTop: '1.1rem' }}>
                <button style={btnPrimary} onClick={() => router.push('/dashboard/data-map')}>
                  Добавить систему
                </button>
              </div>
            </>
          ) : (
            <>
              <Label>Список систем</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pSys.map(s => (
                  <div key={s.id} style={{ border: '1px solid #2A2A2A', borderRadius: '8px', padding: '0.6rem 0.8rem' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#D0D0D0' }}>{s.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '2px' }}>
                      {SYSTEM_TYPE_LABELS[s.system_type] || s.system_type}
                      {s.data_location ? ` · ${s.data_location}` : ''}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.1rem' }}>
                <button style={btnPrimary} onClick={() => router.push('/dashboard/data-map')}>
                  Открыть в Карте обработки
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    if (selection.kind === 'peoplegroup') {
      const proc = PROCESSES.find(p => p.id === selection.procId);
      const pSubj = proc ? procSubjects(proc) : [];
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>👥 Люди процесса</div>
          <p style={{ fontSize: '0.88rem', color: '#A0A0A0' }}>
            Субъекты ПДн процесса «{proc?.label}» ({pSubj.length})
          </p>
          {pSubj.length === 0 ? (
            <>
              <Label>Статус</Label>
              <div style={{ fontSize: '0.92rem', color: '#FF4444', fontWeight: 600 }}>
                Записей нет — реестр по этому процессу не ведётся
              </div>
              <div style={{ marginTop: '1.1rem' }}>
                <button style={btnPrimary} onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}>
                  Добавить людей
                </button>
              </div>
            </>
          ) : (
            <>
              <Label>Список</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
                {pSubj.map(s => (
                  <div key={s.id} style={{ border: '1px solid #2A2A2A', borderRadius: '8px', padding: '0.5rem 0.8rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.88rem', color: '#D0D0D0' }}>{s.full_name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#FF6B35', fontWeight: 600, whiteSpace: 'nowrap' }}>{s.category}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1.1rem' }}>
                <button style={btnPrimary} onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}>
                  Открыть в Реестре
                </button>
              </div>
            </>
          )}
        </div>
      );
    }

    // regulator
    const hasMap = systems.length > 0;
    return (
      <div style={card}>
        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>🏛 РКН и регулятор</div>
        <Label>Карта обработки ПДн</Label>
        <div style={{ fontSize: '0.92rem', color: hasMap ? '#00C853' : '#FF4444', fontWeight: 600 }}>
          {hasMap ? 'Есть данные для карты — можно выгрузить PDF' : 'Сначала добавьте информационные системы'}
        </div>
        <Label>Уведомление в РКН</Label>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.92rem', color: '#FFC107', fontWeight: 600 }}>
          <IconAlert size={13} /> Раздел в разработке
        </div>
        <div style={{ marginTop: '1.1rem' }}>
          <button style={btnPrimary} onClick={() => router.push('/dashboard/data-map')}>
            {hasMap ? 'Выгрузить карту PDF' : 'К Карте обработки'}
          </button>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // ЭКРАНЫ-ЗАГЛУШКИ
  // ------------------------------------------------------------------
  if (!tenantId && !currentTenant) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#A0A0A0', padding: '1rem', textAlign: 'center' }}>
        <p>
          Компания не выбрана.{' '}
          <a href="/dashboard" style={{ color: '#FF6B35' }}>Вернуться в личный кабинет</a>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0A0A0A', color: '#A0A0A0', padding: '1rem' }}>
        <p style={{ fontSize: '1.2rem' }}>Загрузка дерева процессов...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', background: '#0A0A0A', color: '#A0A0A0', padding: '1rem', textAlign: 'center' }}>
        <span style={{ color: '#FF4444', display: 'inline-flex' }}>
          <IconAlert size={36} strokeWidth={1.5} />
        </span>
        <p style={{ fontSize: '1.05rem', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>
          Не удалось загрузить данные компании. Пожалуйста, повторите попытку.
        </p>
        <button
          onClick={() => setRetry(r => r + 1)}
          style={{ padding: '0.7rem 1.5rem', background: '#FF6B35', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}
        >
          Повторить загрузку
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // ДИАГРАММА
  // ------------------------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ color: '#FF6B35', display: 'inline-flex' }}>
              <IconTree size={26} strokeWidth={1.8} />
            </span>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 700 }}>
              Дерево процессов
            </h1>
          </div>
          <p style={{ color: '#A0A0A0', fontSize: '0.92rem', margin: 0 }}>
            Уровень 1 — Политика, ниже — процессы, ещё ниже — документы, системы и люди.
            Кликните по узлу, чтобы увидеть подробности. Диаграмму можно листать вбок →
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
          gap: '1rem',
          alignItems: 'start',
        }}>
          {/* ДИАГРАММА */}
          <div className="cb-tree">
            <ul>
              <li>
                <Node
                  sel={{ kind: 'doc', docId: 'policy' }}
                  onClick={() => setSelection({ kind: 'doc', docId: 'policy' })}
                  emoji="📄"
                  label={DOCUMENT_LABELS.policy}
                  sub={generatedTemplates.has('policy') ? '✅ готово' : '❌ не создано'}
                  subColor={generatedTemplates.has('policy') ? '#00C853' : '#FF4444'}
                />
                <ul>
                  {PROCESSES.map(proc => {
                    const ready = procDocsReady(proc);
                    const pSys = procSystems(proc);
                    const pSubj = procSubjects(proc);
                    return (
                      <li key={proc.id}>
                        <Node
                          sel={{ kind: 'process', procId: proc.id }}
                          onClick={() => setSelection({ kind: 'process', procId: proc.id })}
                          emoji={proc.emoji}
                          label={proc.label}
                          sub={`${ready.length}/${proc.documents.length} док.`}
                          subColor={ready.length === proc.documents.length ? '#00C853' : '#FFC107'}
                        />
                        <ul>
                          {proc.documents.filter(d => d !== 'policy').map(docId => (
                            <li key={docId}>
                              <Node
                                sel={{ kind: 'doc', docId }}
                                onClick={() => setSelection({ kind: 'doc', docId })}
                                emoji={generatedTemplates.has(docId) ? '✅' : '❌'}
                                label={DOCUMENT_LABELS[docId] || docId}
                              />
                            </li>
                          ))}
                          <li>
                            <Node
                              sel={{ kind: 'sysgroup', procId: proc.id }}
                              onClick={() => setSelection({ kind: 'sysgroup', procId: proc.id })}
                              emoji="🖥"
                              label="Системы"
                              sub={pSys.length > 0 ? `${pSys.length} шт.` : 'нет'}
                              subColor={pSys.length > 0 ? '#4A90E2' : '#FF4444'}
                              dashed={pSys.length === 0}
                            />
                          </li>
                          <li>
                            <Node
                              sel={{ kind: 'peoplegroup', procId: proc.id }}
                              onClick={() => setSelection({ kind: 'peoplegroup', procId: proc.id })}
                              emoji="👥"
                              label="Люди"
                              sub={pSubj.length > 0 ? `${pSubj.length} чел.` : 'нет'}
                              subColor={pSubj.length > 0 ? '#FF6B35' : '#FF4444'}
                              dashed={pSubj.length === 0}
                            />
                          </li>
                        </ul>
                      </li>
                    );
                  })}
                  <li>
                    <Node
                      sel={{ kind: 'regulator' }}
                      onClick={() => setSelection({ kind: 'regulator' })}
                      emoji="🏛"
                      label="РКН и регулятор"
                    />
                    <ul>
                      <li>
                        <Node
                          sel={{ kind: 'regulator' }}
                          onClick={() => setSelection({ kind: 'regulator' })}
                          emoji="🗺"
                          label="Карта обработки ПДн"
                          sub={systems.length > 0 ? '✅ данные есть' : '❌ нет ИС'}
                          subColor={systems.length > 0 ? '#00C853' : '#FF4444'}
                        />
                      </li>
                      <li>
                        <Node
                          sel={{ kind: 'regulator' }}
                          onClick={() => setSelection({ kind: 'regulator' })}
                          emoji="📨"
                          label="Уведомление в РКН"
                          sub="в разработке"
                          subColor="#FFC107"
                        />
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          {/* ПАНЕЛЬ ДЕТАЛЕЙ */}
          <div>{renderDetail()}</div>
        </div>
      </div>
    </div>
  );
}