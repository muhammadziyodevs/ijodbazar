import { useState } from 'react';

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ src, name, size = 'sm' }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClass =
    size === 'lg'
      ? 'w-12 h-12 text-base'
      : size === 'md'
        ? 'w-9 h-9 text-sm'
        : 'w-7 h-7 text-xs';

  const initials = (name || 'F')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'F';

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} rounded-full bg-slate-200 text-slate-700 font-semibold flex items-center justify-center shrink-0 border border-slate-300`}
    >
      {initials}
    </div>
  );
}
