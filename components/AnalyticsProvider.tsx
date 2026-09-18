"use client";
import { useAnalytics } from '@/lib/analytics/useAnalytics';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Inicializar tracking de analytics
  useAnalytics();
  
  return <>{children}</>;
}
