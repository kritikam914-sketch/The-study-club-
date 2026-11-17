import { useState } from 'react';
import { getAvatarOption } from '../constants';
import type { AvatarId } from '../types';

interface AvatarImgProps {
  avatarId: AvatarId;
  alt: string;
  className?: string;
}

export function AvatarImg({ avatarId, alt, className = 'w-10 h-10' }: AvatarImgProps) {
  const [failed, setFailed] = useState(false);
  const option = getAvatarOption(avatarId);

  if (failed) {
    return (
      <div
        className={`${className} flex items-center justify-center rounded-xl border border-[var(--border)] font-display font-bold text-sm text-[var(--ink)] select-none`}
        style={{ backgroundColor: option.tint }}
        aria-label={alt}
      >
        {option.label.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={option.image}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} rounded-xl object-cover border border-[var(--border)] shrink-0`}
      style={{ backgroundColor: option.tint }}
    />
  );
}
