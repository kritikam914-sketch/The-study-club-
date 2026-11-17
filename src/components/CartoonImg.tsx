import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface CartoonImgProps {
  src: string;
  alt: string;
  className?: string;
}

export function CartoonImg({ src, alt, className = 'w-20 h-20' }: CartoonImgProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className} flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent)]`}
        aria-label={alt}
      >
        <Sparkles className="w-6 h-6" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} rounded-2xl object-cover border border-[var(--border)] shrink-0`}
    />
  );
}
