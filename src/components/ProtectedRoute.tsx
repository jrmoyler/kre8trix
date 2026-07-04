import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-[100dvh] bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="font-display text-[28px] tracking-[0.02em] text-acid animate-pulse">
            KRE8TRIX
          </span>
          <span className="font-mono text-[12px] tracking-[0.04em] text-[rgba(var(--fg-rgb),0.42)]">
            Loading your workspace…
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
