import { useLocation } from 'react-router';

export default function Placeholder() {
  const location = useLocation();
  const pageName = location.pathname
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/-/g, ' ')
    ?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="font-display text-[64px] tracking-[0.02em] text-ink mb-4">
        {pageName}
      </h1>
      <p className="font-body text-[16px] text-[rgba(var(--fg-rgb),0.42)] mb-8">
        This page is coming soon. Check back later for updates.
      </p>
      <div className="w-16 h-1 bg-acid/30 rounded-full" />
    </div>
  );
}
