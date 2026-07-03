import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Search, Bell } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/wallet': 'Wallet',
  '/credit-score': 'Credit Score',
  '/cash-flow': 'Cash Flow',
  '/advances': 'Advances',
  '/cards': 'Cards',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';
  const pageTitle = pageTitles[location.pathname] || 'Kre8trix';

  /* Onboarding is a full-screen flow — no chrome */
  if (isOnboarding) {
    return (
      <div className="min-h-[100dvh] bg-void">
        <div className="noise-overlay" />
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-void">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Sidebar */}
      <Navbar />

      {/* Main content area */}
      <div className="md:ml-[72px] lg:ml-[260px]">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-16 bg-void/80 backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-[28px] tracking-[0.02em] text-white">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200">
              <Search size={20} />
            </button>
            <button className="relative w-10 h-10 rounded-xl flex items-center justify-center text-[rgba(255,255,255,0.42)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-negative rounded-full" />
            </button>
            <img
              src="/avatar-creator-1.png"
              alt="User"
              className="w-9 h-9 rounded-full object-cover border border-[rgba(255,255,255,0.1)] cursor-pointer"
            />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-[1400px] mx-auto p-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
