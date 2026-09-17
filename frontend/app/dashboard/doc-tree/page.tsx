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
  | { kind: 'company' }
  | { kind: 'process'; procId: string }
  | { kind: 'doc'; procId: string; docId: string }
  | { kind: 'system'; procId: string; systemId: number }
  | { kind: 'subject'; procId: string; subjectId: number }
  | { kind: 'regulator' };

const PROCESSES: ProcessNode[] = [
  {
    id: 'hr',
    label: 'HR-процесс (сотрудники)',
    emoji: '👔',
    categories: ['Сотрудник'],
    documents: ['policy', 'consent', 'nda', 'order_responsible'],
    description: 'Оформление, учёт и увольнение работников',
  },
  {
    id: 'sales',
    label: 'Продажи и услуги (клиенты)',
    emoji: '🛒',
    categories: ['Клиент'],
    documents: ['policy', 'consent', 'nda'],
    description: 'Клиенты, покупатели, заказчики',
  },
  {
    id: 'candidates',
    label: 'Подбор персонала (кандидаты)',
    emoji: '🧑‍💼',
    categories: ['Кандидат'],
    documents: ['policy', 'consent'],
    description: 'Резюме и анкеты соискателей',
  },
  {
    id: 'website',
    label: 'Сайт и маркетинг (посетители)',
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
    documents: ['nda'],
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
  policy: 'Главный публичный документ: описывает, какие данные и зачем обрабатывает компания. Обязательно публикуется на сайте.',
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ hr: true, 'hr:docs': true });
  const [selection, setSelection] = useState<Selection>({ kind: 'company' });

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

  const progressColor = (pct: number) => (pct >= 70 ? '#00C853' : pct >= 40 ? '#FFC107' : '#FF4444');

  const ProgressBar = ({ ready, total }: { ready: number; total: number }) => {
    const pct = total === 0 ? 0 : Math.round((ready / total) * 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '110px' }}>
        <div style={{ flex: 1, height: '6px', background: '#2A2A2A', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: progressColor(pct), transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: '0.72rem', color: '#A0A0A0', whiteSpace: 'nowrap' }}>
          {ready} из {total}
        </span>
      </div>
    );
  };

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const isSelected = (sel: Selection) => JSON.stringify(sel) === JSON.stringify(selection);

  const rowStyle = (depth: number, sel: Selection) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.42rem 0.6rem',
    paddingLeft: `${0.6 + depth * 0.9}rem`,
    background: isSelected(sel) ? 'rgba(255, 107, 53, 0.15)' : 'transparent',
    color: isSelected(sel) ? '#FF6B35' : '#D0D0D0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontWeight: isSelected(sel) ? 600 : 400,
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background 0.15s',
  });

  const Chevron = ({ open }: { open: boolean }) => (
    <span style={{
      display: 'inline-flex',
      color: '#666',
      transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 0.15s',
      flexShrink: 0,
    }}>
      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </span>
  );

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
    const btnGhost: React.CSSProperties = {
      padding: '0.6rem 1.1rem',
      background: 'transparent',
      border: '1px solid #3A3A3A',
      borderRadius: '8px',
      color: '#A0A0A0',
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
    };
    const Label = ({ children }: { children: React.ReactNode }) => (
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.9rem', marginBottom: '0.25rem' }}>
        {children}
      </div>
    );

    if (selection.kind === 'company') {
      const totalDocs = PROCESSES.reduce((acc, p) => acc + p.documents.length, 0);
      const readyDocs = PROCESSES.reduce((acc, p) => acc + procDocsReady(p).length, 0);
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>🏢 {currentTenant?.name || 'Компания'}</div>
          <Label>Общая готовность документов</Label>
          <ProgressBar ready={readyDocs} total={totalDocs} />
          <Label>В цифрах</Label>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.92rem', color: '#D0D0D0' }}>
            <span>🖥 Систем: <b>{systems.filter(s => s.is_active).length}</b></span>
            <span>👥 Субъектов: <b>{subjects.length}</b></span>
            <span>📄 Документов сгенерировано: <b>{generatedTemplates.size}</b></span>
          </div>
          <Label>Как читать дерево</Label>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.55, color: '#A0A0A0', margin: 0 }}>
            Слева — папки процессов компании. Раскрывайте их: внутри документы, информационные системы и люди,
            чьи данные обрабатываются. Зелёная галочка — документ готов, красный крестик — ещё нет.
            Кликните по любому пункту, чтобы увидеть подробности и кнопку действия.
          </p>
        </div>
      );
    }

    if (selection.kind === 'process') {
      const proc = PROCESSES.find(p => p.id === selection.procId);
      if (!proc) return null;
      const ready = procDocsReady(proc);
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{proc.emoji} {proc.label}</div>
          <p style={{ fontSize: '0.9rem', color: '#A0A0A0', lineHeight: 1.5 }}>{proc.description}</p>
          <Label>Готовность документов</Label>
          <ProgressBar ready={ready.length} total={proc.documents.length} />
          <Label>Связанные данные</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <span>🖥 Систем: <b>{procSystems(proc).length}</b></span>
            <span>👥 Людей: <b>{procSubjects(proc).length}</b></span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={() => router.push(`/dashboard/documents?tenantId=${tenantId}`)}>
              К документам
            </button>
            <button style={btnGhost} onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}>
              К реестру
            </button>
          </div>
        </div>
      );
    }

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

    if (selection.kind === 'system') {
      const sys = systems.find(s => s.id === selection.systemId);
      if (!sys) return null;
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>🖥 {sys.name}</div>
          <Label>Тип системы</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0' }}>{SYSTEM_TYPE_LABELS[sys.system_type] || sys.system_type}</div>
          <Label>Категории субъектов</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0' }}>{(sys.categories || []).join(', ') || '—'}</div>
          {sys.data_location && (
            <>
              <Label>Где хранятся данные</Label>
              <div style={{ fontSize: '0.92rem', color: '#D0D0D0' }}>{sys.data_location}</div>
            </>
          )}
          <div style={{ marginTop: '1.1rem' }}>
            <button style={btnPrimary} onClick={() => router.push('/dashboard/data-map')}>
              Открыть в Карте обработки
            </button>
          </div>
        </div>
      );
    }

    if (selection.kind === 'subject') {
      const subj = subjects.find(s => s.id === selection.subjectId);
      if (!subj) return null;
      return (
        <div style={card}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>👥 {subj.full_name}</div>
          <Label>Категория</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0' }}>{subj.category}</div>
          <Label>Основание обработки</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0' }}>{subj.legal_basis}</div>
          <Label>Состав данных</Label>
          <div style={{ fontSize: '0.92rem', color: '#D0D0D0' }}>{subj.data_types || '—'}</div>
          <div style={{ marginTop: '1.1rem' }}>
            <button style={btnPrimary} onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}>
              Открыть в Реестре
            </button>
          </div>
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
  // ДЕРЕВО
  // ------------------------------------------------------------------
  const renderTree = () => (
    <div style={{
      background: '#141414',
      border: '1px solid #2A2A2A',
      borderRadius: '12px',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    }}>
      {/* Корень: компания */}
      <button
        style={rowStyle(0, { kind: 'company' })}
        onClick={() => setSelection({ kind: 'company' })}
        onMouseEnter={(e) => { if (!isSelected({ kind: 'company' })) e.currentTarget.style.background = '#1F1F1F'; }}
        onMouseLeave={(e) => { if (!isSelected({ kind: 'company' })) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ flexShrink: 0 }}>🏢</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentTenant?.name || 'Компания'}
        </span>
      </button>

      {PROCESSES.map(proc => {
        const procOpen = !!expanded[proc.id];
        const ready = procDocsReady(proc);
        const pSubj = procSubjects(proc);
        const pSys = procSystems(proc);
        return (
          <div key={proc.id}>
            <button
              style={rowStyle(1, { kind: 'process', procId: proc.id })}
              onClick={() => { toggle(proc.id); setSelection({ kind: 'process', procId: proc.id }); }}
              onMouseEnter={(e) => { if (!isSelected({ kind: 'process', procId: proc.id })) e.currentTarget.style.background = '#1F1F1F'; }}
              onMouseLeave={(e) => { if (!isSelected({ kind: 'process', procId: proc.id })) e.currentTarget.style.background = 'transparent'; }}
            >
              <Chevron open={procOpen} />
              <span style={{ flexShrink: 0 }}>{proc.emoji}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proc.label}</span>
              <ProgressBar ready={ready.length} total={proc.documents.length} />
            </button>

            {procOpen && (
              <>
                {/* Документы */}
                <button
                  style={rowStyle(2, { kind: 'process', procId: proc.id })}
                  onClick={() => toggle(`${proc.id}:docs`)}
                >
                  <Chevron open={!!expanded[`${proc.id}:docs`]} />
                  <span>📁</span>
                  <span>Документы ({ready.length}/{proc.documents.length})</span>
                </button>
                {expanded[`${proc.id}:docs`] && proc.documents.map(docId => (
                  <button
                    key={docId}
                    style={rowStyle(3, { kind: 'doc', procId: proc.id, docId })}
                    onClick={() => setSelection({ kind: 'doc', procId: proc.id, docId })}
                    onMouseEnter={(e) => { if (!isSelected({ kind: 'doc', procId: proc.id, docId })) e.currentTarget.style.background = '#1F1F1F'; }}
                    onMouseLeave={(e) => { if (!isSelected({ kind: 'doc', procId: proc.id, docId })) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{generatedTemplates.has(docId) ? '✅' : '❌'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {DOCUMENT_LABELS[docId] || docId}
                    </span>
                  </button>
                ))}

                {/* Системы */}
                <button
                  style={rowStyle(2, { kind: 'process', procId: proc.id })}
                  onClick={() => toggle(`${proc.id}:sys`)}
                >
                  <Chevron open={!!expanded[`${proc.id}:sys`]} />
                  <span>📁</span>
                  <span>Информационные системы ({pSys.length})</span>
                </button>
                {expanded[`${proc.id}:sys`] && (
                  pSys.length === 0 ? (
                    <button
                      style={rowStyle(3, { kind: 'process', procId: proc.id })}
                      onClick={() => router.push('/dashboard/data-map')}
                    >
                      <span style={{ color: '#FF4444' }}>＋</span>
                      <span style={{ color: '#FF4444' }}>Добавить систему</span>
                    </button>
                  ) : (
                    pSys.map(s => (
                      <button
                        key={s.id}
                        style={rowStyle(3, { kind: 'system', procId: proc.id, systemId: s.id })}
                        onClick={() => setSelection({ kind: 'system', procId: proc.id, systemId: s.id })}
                        onMouseEnter={(e) => { if (!isSelected({ kind: 'system', procId: proc.id, systemId: s.id })) e.currentTarget.style.background = '#1F1F1F'; }}
                        onMouseLeave={(e) => { if (!isSelected({ kind: 'system', procId: proc.id, systemId: s.id })) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>🖥</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      </button>
                    ))
                  )
                )}

                {/* Люди */}
                <button
                  style={rowStyle(2, { kind: 'process', procId: proc.id })}
                  onClick={() => toggle(`${proc.id}:people`)}
                >
                  <Chevron open={!!expanded[`${proc.id}:people`]} />
                  <span>📁</span>
                  <span>Люди ({pSubj.length})</span>
                </button>
                {expanded[`${proc.id}:people`] && (
                  pSubj.length === 0 ? (
                    <button
                      style={rowStyle(3, { kind: 'process', procId: proc.id })}
                      onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}
                    >
                      <span style={{ color: '#FF4444' }}>＋</span>
                      <span style={{ color: '#FF4444' }}>Добавить людей</span>
                    </button>
                  ) : (
                    pSubj.map(sub => (
                      <button
                        key={sub.id}
                        style={rowStyle(3, { kind: 'subject', procId: proc.id, subjectId: sub.id })}
                        onClick={() => setSelection({ kind: 'subject', procId: proc.id, subjectId: sub.id })}
                        onMouseEnter={(e) => { if (!isSelected({ kind: 'subject', procId: proc.id, subjectId: sub.id })) e.currentTarget.style.background = '#1F1F1F'; }}
                        onMouseLeave={(e) => { if (!isSelected({ kind: 'subject', procId: proc.id, subjectId: sub.id })) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>👥</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.full_name}</span>
                      </button>
                    ))
                  )
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Регулятор */}
      <button
        style={rowStyle(1, { kind: 'regulator' })}
        onClick={() => setSelection({ kind: 'regulator' })}
        onMouseEnter={(e) => { if (!isSelected({ kind: 'regulator' })) e.currentTarget.style.background = '#1F1F1F'; }}
        onMouseLeave={(e) => { if (!isSelected({ kind: 'regulator' })) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{ flexShrink: 0 }}>🏛</span>
        <span>РКН и регулятор</span>
      </button>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{ marginBottom: isMobile ? '1rem' : '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ color: '#FF6B35', display: 'inline-flex' }}>
              <IconTree size={26} strokeWidth={1.8} />
            </span>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 700 }}>
              Дерево процессов
            </h1>
          </div>
          <p style={{ color: '#A0A0A0', fontSize: '0.92rem', margin: 0 }}>
            Все документы, системы и люди компании — в одном понятном дереве
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '400px 1fr',
          gap: '1rem',
          alignItems: 'start',
        }}>
          <div>{renderTree()}</div>
          <div>{renderDetail()}</div>
        </div>
      </div>
    </div>
  );
}