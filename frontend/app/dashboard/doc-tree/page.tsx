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

  // ---------------- действия ----------------
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
    setBusy