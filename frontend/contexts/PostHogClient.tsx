"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import posthog from './posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      const url = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function usePostHog() {
  return posthog;
}