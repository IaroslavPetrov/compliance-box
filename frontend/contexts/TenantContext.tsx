"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Tenant {
  id: number;
  name: string;
  inn: string;
  email?: string;
  kpp?: string;
  address?: string;
  phone?: string;
  director_name?: string;
  website?: string;
  created_at: string;
}

interface TenantContextType {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  loadingTenants: boolean;
  selectTenant: (tenant: Tenant) => void;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(true);

  const refreshTenants = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoadingTenants(false);
      return;
    }

    try {
      const res = await fetch('https://compliance-box-backend.onrender.com/api/v1/tenants/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Не удалось загрузить список компаний');

      const data = await res.json();
      setTenants(data);

      // Восстанавливаем последнюю выбранную компанию
      const savedId = localStorage.getItem('current_tenant_id');
      const saved = data.find((t: Tenant) => String(t.id) === savedId);
      setCurrentTenant(saved || data[0] || null);
    } catch {
      // Не блокируем интерфейс — страницы сами покажут ошибки
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  const selectTenant = useCallback((tenant: Tenant) => {
    setCurrentTenant(tenant);
    localStorage.setItem('current_tenant_id', String(tenant.id));
  }, []);

  return (
    <TenantContext.Provider value={{ tenants, currentTenant, loadingTenants, selectTenant, refreshTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}