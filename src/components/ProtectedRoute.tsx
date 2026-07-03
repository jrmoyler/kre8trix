import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth-context';

/**
 * Gates its children behind authentication. Shows a centered spinner while
 * the session is being restored, and bounces unauthenticated visitors to
 * /login (remembering where they came from so login can send them back).
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center">
        <div
          role="status"
          aria-label="Loading session"
          className="w-8 h-8 rounded-full border-2 border-acid border-t-transparent animate-spin"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
