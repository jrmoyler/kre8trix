export default function InitialsAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
  return (
    <span
      className="rounded-full flex items-center justify-center font-body font-semibold text-void border border-[rgba(var(--fg-rgb),0.15)] flex-shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: 'linear-gradient(135deg, rgb(var(--color-acid)), rgb(var(--color-electric)))',
      }}
    >
      {initials || 'K'}
    </span>
  );
}
