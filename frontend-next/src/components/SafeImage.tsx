"use client";
import { useState } from 'react';
import Image from 'next/image';
import { Bike } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  eager?: boolean;
}

/**
 * next/image with a graceful local fallback. Remote SVG placeholders
 * (placehold.co) are rejected by the image optimizer with a 400, and an
 * unguarded onError that swaps src retries forever — so a missing photo
 * degrades to an icon tile here instead of a request storm.
 */
const SafeImage = ({ src, alt, fill, width, height, sizes, className, eager }: SafeImageProps) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-slate-100 ${className ?? ''}`}>
        <Bike size={40} className="text-slate-300" />
        <span className="text-xs font-semibold text-slate-400">Photo coming soon</span>
      </div>
    );
  }
  const img = (
    <Image
      src={src}
      alt={alt}
      {...(fill ? { fill: true as const } : { width: width ?? 400, height: height ?? 300 })}
      sizes={sizes}
      {...(eager ? { priority: true as const } : {})}
      className={className}
      onError={() => setFailed(true)}
    />
  );
  return img;
};

export default SafeImage;
