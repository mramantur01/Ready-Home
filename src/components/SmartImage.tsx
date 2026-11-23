import { useState } from 'react';
import { Home } from 'lucide-react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SmartImage({ src, alt, className = '', fallbackLabel }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-[#131d33] to-slate-900 text-slate-300 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Home className="h-8 w-8 text-amber-500/70 mb-2" />
        <span className="text-xs font-medium tracking-wide px-3 text-center text-slate-400">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
