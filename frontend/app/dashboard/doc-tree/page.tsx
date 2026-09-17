"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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

interface DocRecord {
  id: number;
  template_id: string;
  status: string;
  scan_name: string | null;
  has_scan: boolean;
  site_check_ok: boolean;
  site_checked_at: string | null;
}

interface ConsentRecord {
  id: number;
  subject_id: number;
  status: string;
  scan_name: string | null;
  has_scan: boolean;
  signed_at: string | null;
}

interface IndexCheck {
  id: string;
  label: string;
  weight: number;
  done: boolean;
  earned: number;
  action: string;
  hint: string;
}

interface ProcessNode {
  id: string;
  label: string;
  emoji: string;
  categories: string[];
  documents: string[];
  description: string;
}

const PROCESSES: ProcessNode[] = [
  { id: 'hr', label: 'HR-процесс', emoji: '👔', categories: ['Сотрудник'], documents: ['policy', 'consent', 'nda', 'order_responsible'], description: 'Оформление, учёт и увольнение работников' },
  { id: 'sales', label: 'Продажи и услуги', emoji: '🛒', categories: ['Клиент'], documents: ['policy', 'consent', 'nda'], description: 'Клиенты, покупатели, заказчики' },
  { id: 'candidates', label: 'Подбор персонала', emoji: '🧑‍', categories: ['Кандидат'], documents: ['policy', 'consent'], description: 'Резюме и анкеты соискателей' },
  { id: 'website', label: 'Сайт и маркетинг', emoji: '🌐', categories: ['Посетитель сайта'], documents: ['policy'], description: 'Сайт, метрики, формы обратной связи' },
  { id: 'contractors', label: 'Контрагенты', emoji: '🤝', categories: ['Контрагент'], documents: ['policy', 'nda'], description: 'Партнёры, поставщики, юрлица' },
  { id: 'regulator', label: 'РКН и регулятор', emoji: '🏛', categories: [], documents: [], description: 'Уведомление оператора, карта обработки' },
];

const DOCUMENT_LABELS: Record<string, string> = {
  policy: 'Политика обработки ПДн',
  consent: 'Согласие на обработку',
  nda: 'Соглашение о неразглашении',
  order_responsible: 'Приказ об ответственном',
  threat_model: 'Модель угроз ФСТЭК',
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
  const [docRecords, setDocRecords] = useState<DocRecord[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [indexData, setIndexData] = useState<{ score: number; checks: IndexCheck[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` });

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const H = authHeaders();
    const [s, sys, dr, cr, ix] = await Promise.all([
      fetch(`${API}/pd-subjects/?tenant_id=${tenantId}`, { headers: H }).then(r => r.json()),
      fetch(`${API}/data-systems/?tenant_id=${tenantId}`, { headers: H }).then(r => (r.ok ? r.json() : [])),
      fetch(`${API}/document-records/?tenant_id=${tenantId}`, { headers: H }).then(r => (r.ok ? r.json() : [])),
      fetch(`${API}/consent-records/?tenant_id=${tenantId}`, { headers: H }).then(r => (r.ok ? r.json() : [])),
      fetch(`${API}/compliance-index/?tenant_id=${tenantId}`, { headers: H }).then(r => (r.ok ? r.json() : null)),
    ]);
    setSubjects(Array.isArray(s) ? s : []);
    setSystems(Array.isArray(sys) ? sys : []);
    setDocRecords(Array.isArray(dr) ? dr : []);
    setConsents(Array.isArray(cr) ? cr : []);
    setIndexData(ix && typeof ix.score === 'number' ? ix : null);
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId && currentTenant) {
      router.replace(`/dashboard/doc-tree?tenantId=${currentTenant.id}`);
    }
  }, [tenantId, currentTenant, router]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const attempt = (left: number) => {
      refresh()
        .then(() => {
          if (cancelled) return;
          setLoadError(false);
          setLoading(false);
        })
        .catch(err => {
          if (cancelled) return;
          if (left > 0) {
            window.setTimeout(() => { if (!cancelled) attempt(left - 1); }, 1500);
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
    return () => { cancelled = true; };
  }, [tenantId, retry, refresh]);

  const ensureDocRecord = async (templateId: string): Promise<DocRecord | null> => {
    const found = docRecords.find(r => r.template_id === templateId);
    if (found) return found;
    const r = await fetch(`${API}/document-records/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: Number(tenantId), template_id: templateId, status: 'generated' }),
    }).then(x => x.json());
    return r && r.id ? { id: r.id, template_id: templateId, status: r.status, scan_name: null, has_scan: false, site_check_ok: false, site_checked_at: null } : null;
  };

  const attachDocScan = async (templateId: string, file: File) => {
    setBusy(true);
    try {
      const rec = await ensureDocRecord(templateId);
      if (!rec) throw new Error('no record');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/document-records/${rec.id}/scan`, { method: 'POST', headers: authHeaders(), body: fd });
      if (!res.ok) throw new Error('upload failed');
      toastRef.current.success(`Скан приложен: ${DOCUMENT_LABELS[templateId] || templateId}`);
      await refresh();
    } catch (e) {
      toastRef.current.error('Не удалось приложить скан');
    } finally {
      setBusy(false);
    }
  };

  const checkPolicyOnSite = async () => {
    setBusy(true);
    try {
      const rec = await ensureDocRecord('policy');
      if (!rec) throw new Error('no record');
      const j = await fetch(`${API}/document-records/${rec.id}/check-site`, { method: 'POST', headers: authHeaders() }).then(r => r.json());
      if (j && j.ok) toastRef.current.success('Политика найдена на сайте — статус «Опубликована»');
      else toastRef.current.error('Политика не найдена на сайте компании');
      await refresh();
    } catch (e) {
      toastRef.current.error('Не удалось проверить сайт');
    } finally {
      setBusy(false);
    }
  };

  const setConsentStatus = async (subjectId: number, status: string) => {
    setBusy(true);
    try {
      await fetch(`${API}/consent-records/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: Number(tenantId), subject_id: subjectId, status }),
      });
      await refresh();
    } catch (e) {
      toastRef.current.error('Не удалось обновить согласие');
    } finally {
      setBusy(false);
    }
  };

  const attachConsentScan = async (subjectId: number, file: File) => {
    setBusy(true);
    try {
      let rec = consents.find(c => c.subject_id === subjectId);
      if (!rec) {
        const r = await fetch(`${API}/consent-records/`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant_id: Number(tenantId), subject_id: subjectId, status: 'missing' }),
        }).then(x => x.json());
        rec = r && r.id ? r : null;
      }
      if (!rec) throw new Error('no record');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API}/consent-records/${rec.id}/scan`, { method: 'POST', headers: authHeaders(), body: fd });
      if (!res.ok) throw new Error('upload failed');
      toastRef.current.success('Скан согласия приложен — согласие учтено');
      await refresh();
    } catch (e) {
      toastRef.current.error('Не удалось приложить скан согласия');
    } finally {
      setBusy(false);
    }
  };

  // ---------------- вспомогательные ----------------
  const procSubjects = (proc: ProcessNode) => subjects.filter(s => proc.categories.includes(s.category));
  const procSystems = (proc: ProcessNode) => systems.filter(s => s.is_active && proc.categories.some(c => (s.categories || []).includes(c)));
  const consentBySubject = new Map(consents.map(c => [c.subject_id, c]));
  const recByTemplate = new Map(docRecords.map(r => [r.template_id, r]));

  const docReady = (templateId: string) => {
    const r = recByTemplate.get(templateId);
    if (r && (r.status !== 'generated' || r.has_scan || r.site_check_ok)) return true;
    return false;
  };

  const procDocsReady = (proc: ProcessNode) => proc.documents.filter(d => docReady(d));

  const score = indexData ? indexData.score : 0;
  const ringColor = score >= 70 ? '#00C853' : score >= 40 ? '#FFC107' : '#FF4444';
  const R = 34;
  const CIRC = 2 * Math.PI * R;

  const topHints = indexData
    ? indexData.checks.filter(c => !c.done).sort((a, b) => b.weight - a.weight).slice(0, 3)
    : [];

  const hintActionLabel = (action: string) =>
    action === 'registry' ? 'В реестр' : action === 'data-map' ? 'В карту' : 'В документы';
  const hintActionHref = (action: string) =>
    action === 'registry' ? `/dashboard/registry?tenantId=${tenantId}`
      : action === 'data-map' ? '/dashboard/data-map'
      : `/dashboard/documents?tenantId=${tenantId}`;

  const ScanButton = ({ onFile, label }: { onFile: (f: File) => void; label: string }) => {
    const ref = useRef<HTMLInputElement>(null);
    return (
      <>
        <input
          ref={ref}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <button
          disabled={busy}
          onClick={() => ref.current && ref.current.click()}
          style={{
            padding: '0.35rem 0.7rem',
            background: 'transparent',
            border: '1px solid #4A90E2',
            borderRadius: '6px',
            color: '#4A90E2',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          📎 {label}
        </button>
      </>
    );
  };

  const Stepper = ({ rec, isPolicy }: { rec: DocRecord | undefined; isPolicy: boolean }) => {
    const created = !!rec;
    const signed = !!rec && (rec.status === 'signed' || rec.status === 'approved' || rec.has_scan);
    const published = !!rec && (rec.status === 'published' || (isPolicy && rec.site_check_ok));
    const steps = [
      { label: 'Создан', on: created },
      { label: 'Подписан', on: signed },
      { label: isPolicy ? 'Опубликован' : 'Утверждён', on: published },
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {steps.map((st, i) => (
          <div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              fontWeight: 700,
              background: st.on ? '#00C853' : '#2A2A2A',
              color: st.on ? '#0A0A0A' : '#666',
            }}>
              {st.on ? '✓' : i + 1}
            </span>
            <span style={{ fontSize: '0.7rem', color: st.on ? '#00C853' : '#666', fontWeight: 600 }}>{st.label}</span>
            {i < steps.length - 1 && <span style={{ width: '10px', height: '2px', background: '#2A2A2A' }} />}
          </div>
        ))}
      </div>
    );
  };

  const DocCard = ({ templateId }: { templateId: string }) => {
    const rec = recByTemplate.get(templateId);
    const isPolicy = templateId === 'policy';
    return (
      <div style={{
        border: '1px solid #2A2A2A',
        borderRadius: '10px',
        padding: '0.7rem 0.85rem',
        background: '#161616',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minWidth: '220px',
        flex: '1 1 240px',
        maxWidth: '340px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#D0D0D0' }}>
            {docReady(templateId) ? '✅' : '❌'} {DOCUMENT_LABELS[templateId] || templateId}
          </span>
          {rec && rec.has_scan && <span title={rec.scan_name || 'скан'} style={{ fontSize: '0.75rem' }}>📎</span>}
        </div>
        <Stepper rec={rec} isPolicy={isPolicy} />
        {isPolicy && rec && (
          <div style={{ fontSize: '0.72rem', color: rec.site_check_ok ? '#00C853' : '#888' }}>
            {rec.site_check_ok ? '✅ найдена на сайте компании' : rec.site_checked_at ? '❌ на сайте не найдена' : 'сайт не проверялся'}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <ScanButton label="Скан" onFile={(f) => attachDocScan(templateId, f)} />
          {isPolicy && (
            <button
              disabled={busy}
              onClick={checkPolicyOnSite}
              style={{
                padding: '0.35rem 0.7rem',
                background: 'transparent',
                border: '1px solid #00C853',
                borderRadius: '6px',
                color: '#00C853',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              🌐 Проверить на сайте
            </button>
          )}
        </div>
      </div>
    );
  };

  const TierTitle = ({ emoji, title, count }: { emoji: string; title: string; count?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: '0.95rem' }}>{emoji}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title} {count ? `(${count})` : ''}
      </span>
      <span style={{ flex: 1, height: '1px', background: '#2A2A2A' }} />
    </div>
  );

  const renderBranchInterior = (proc: ProcessNode) => {
    const pSubj = procSubjects(proc);
    const pSys = procSystems(proc);

    if (proc.id === 'regulator') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <TierTitle emoji="🗺" title="Карта обработки ПДн" />
            <div style={{ fontSize: '0.88rem', color: systems.length > 0 ? '#00C853' : '#FF4444', fontWeight: 600 }}>
              {systems.length > 0 ? 'Данные есть — можно выгрузить PDF в Карте обработки' : 'Нет информационных систем — карта не формируется'}
            </div>
            <button
              onClick={() => router.push('/dashboard/data-map')}
              style={{ marginTop: '0.6rem', padding: '0.5rem 1rem', background: '#FF6B35', border: 'none', borderRadius: '8px', color: '#FFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Открыть Карту обработки
            </button>
          </div>
          <div>
            <TierTitle emoji="📨" title="Уведомление в РКН" />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: '#FFC107', fontWeight: 600 }}>
              <IconAlert size={13} /> Раздел в разработке
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <TierTitle emoji="📄" title="Документы" count={`${procDocsReady(proc).length}/${proc.documents.length}`} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {proc.documents.map(d => <DocCard key={d} templateId={d} />)}
          </div>
        </div>

        <div>
          <TierTitle emoji="🖥" title="Информационные системы" count={String(pSys.length)} />
          {pSys.length === 0 ? (
            <button
              onClick={() => router.push('/dashboard/data-map')}
              style={{ padding: '0.5rem 0.9rem', background: 'transparent', border: '1px dashed #FF4444', borderRadius: '8px', color: '#FF4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ＋ Добавить систему для категорий: {proc.categories.join(', ')}
            </button>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {pSys.map(s => (
                <span key={s.id} style={{ padding: '0.4rem 0.75rem', background: 'rgba(74,144,226,0.1)', border: '1px solid #4A90E2', borderRadius: '6px', color: '#4A90E2', fontSize: '0.82rem', fontWeight: 600 }}>
                  🖥 {s.name} · {SYSTEM_TYPE_LABELS[s.system_type] || s.system_type}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <TierTitle emoji="👥" title="Люди и их согласия" count={String(pSubj.length)} />
          {pSubj.length === 0 ? (
            <button
              onClick={() => router.push(`/dashboard/registry?tenantId=${tenantId}`)}
              style={{ padding: '0.5rem 0.9rem', background: 'transparent', border: '1px dashed #FF4444', borderRadius: '8px', color: '#FF4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              ＋ Добавить людей категории: {proc.categories.join(', ')}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {pSubj.map(s => {
                const c = consentBySubject.get(s.id);
                const signed = !!c && c.status === 'signed';
                return (
                  <div key={s.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    flexWrap: 'wrap',
                    border: '1px solid #2A2A2A',
                    borderRadius: '8px',
                    padding: '0.5rem 0.7rem',
                    background: '#161616',
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#D0D0D0', flex: '1 1 160px' }}>👥 {s.full_name}</span>
                    <span style={{ fontSize: '0.72rem', color: '#FF6B35', fontWeight: 600 }}>{s.category}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: signed ? '#00C853' : '#FF4444' }}>
                      {signed ? '✅ согласие подписано' : '❌ согласия нет'}
                    </span>
                    {c && c.has_scan && <span title={c.scan_name || 'скан'}>📎</span>}
                    <button
                      disabled={busy}
                      onClick={() => setConsentStatus(s.id, signed ? 'missing' : 'signed')}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: signed ? 'transparent' : '#00C853',
                        border: signed ? '1px solid #666' : 'none',
                        borderRadius: '6px',
                        color: signed ? '#A0A0A0' : '#0A0A0A',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: busy ? 'wait' : 'pointer',
                      }}
                    >
                      {signed ? 'Снять отметку' : 'Согласие подписано'}
                    </button>
                    <ScanButton label="Скан согласия" onFile={(f) => attachConsentScan(s.id, f)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0A',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#FFFFFF',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{
          background: '#141414',
          border: '1px solid #2A2A2A',
          borderRadius: '14px',
          padding: '1.1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r={R} fill="none" stroke="#2A2A2A" strokeWidth="8" />
                <circle
                  cx="42" cy="42" r={R} fill="none"
                  stroke={ringColor} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - score / 100)}
                  transform="rotate(-90 42 42)"
                  style={{ transition: 'stroke-dashoffset 0.6s' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: ringColor }}>
                {score}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                Индекс соответствия 152-ФЗ
              </div>
              <div style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: 800, lineHeight: 1.25 }}>
                🏢 {currentTenant?.name || 'Компания'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#A0A0A0', marginTop: '0.2rem' }}>
                {score >= 70 ? 'Хорошая защита: поддерживайте уровень' : score >= 40 ? 'Есть пробелы: закройте подсказки ниже' : 'Высокий риск: начните с подсказок ниже'}
              </div>
            </div>
          </div>

          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Как поднять индекс
            </div>
            {topHints.length === 0 && (
              <div style={{ fontSize: '0.88rem', color: '#00C853', fontWeight: 600 }}>Все проверки закрыты — отличная работа!</div>
            )}
            {topHints.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.15rem 0.5rem', background: 'rgba(0,200,83,0.12)', color: '#00C853', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
                  +{h.weight - Math.round(h.earned)}%
                </span>
                <span style={{ fontSize: '0.84rem', color: '#D0D0D0', flex: '1 1 200px' }}>{h.hint || h.label}</span>
                <button
                  onClick={() => router.push(hintActionHref(h.action))}
                  style={{ padding: '0.3rem 0.7rem', background: 'transparent', border: '1px solid #FF6B35', borderRadius: '6px', color: '#FF6B35', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                >
                  {hintActionLabel(h.action)}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: '0.7rem 1.2rem',
            background: docReady('policy') ? 'rgba(0,200,83,0.08)' : 'rgba(255,107,53,0.1)',
            border: `1px solid ${docReady('policy') ? '#00C853' : '#FF6B35'}`,
            borderRadius: '12px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Политика обработки ПДн</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: docReady('policy') ? '#00C853' : '#FF6B35' }}>
              {docReady('policy') ? '✅ корень дерева жив' : '❌ создайте и утвердите — от неё растёт крона'}
            </span>
          </div>
        </div>
        <div style={{ width: '2px', height: '18px', background: '#3A3A3A', margin: '0 auto' }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.7rem', marginBottom: '1rem' }}>
          {PROCESSES.map(proc => {
            const open = openBranch === proc.id;
            const ready = procDocsReady(proc);
            const pSubj = procSubjects(proc);
            return (
              <button
                key={proc.id}
                onClick={() => setOpenBranch(open ? null : proc.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  width: '150px',
                  padding: '0.65rem 0.6rem',
                  background: open ? 'rgba(255,107,53,0.12)' : '#1A1A1A',
                  border: `1px solid ${open ? '#FF6B35' : '#2A2A2A'}`,
                  borderRadius: '12px',
                  color: open ? '#FF6B35' : '#D0D0D0',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1.15rem' }}>{proc.emoji}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.2 }}>{proc.label}</span>
                <span style={{ fontSize: '0.68rem', color: '#888', fontWeight: 600 }}>
                  {proc.id === 'regulator' ? (systems.length > 0 ? '✅ данные есть' : '❌ нет ИС') : `${ready.length}/${proc.documents.length} док · ${pSubj.length} чел`}
                </span>
                <span style={{ fontSize: '0.65rem', color: open ? '#FF6B35' : '#555', fontWeight: 700 }}>
                  {open ? '▲ свернуть' : '▼ раскрыть'}
                </span>
              </button>
            );
          })}
        </div>

        {openBranch && (
          <div style={{
            background: '#141414',
            border: '1px solid #FF6B35',
            borderRadius: '14px',
            padding: '1.1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.2rem' }}>{PROCESSES.find(p => p.id === openBranch)?.emoji}</span>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{PROCESSES.find(p => p.id === openBranch)?.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#A0A0A0' }}>{PROCESSES.find(p => p.id === openBranch)?.description}</div>
              </div>
            </div>
            {renderBranchInterior(PROCESSES.find(p => p.id === openBranch)!)}
          </div>
        )}
      </div>
    </div>
  );
}