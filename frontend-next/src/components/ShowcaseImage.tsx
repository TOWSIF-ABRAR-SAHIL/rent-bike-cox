"use client";
import { useState } from 'react';
import Image from 'next/image';
import { Bike } from 'lucide-react';

/** Showcase main image with clickable thumbnails (resets per bike via key). */
const ShowcaseImage = ({ images, model }: { images?: string[]; model?: string }) => {
  const list = images && images.length > 0 ? images.slice(0, 4) : [];
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const current = list[Math.min(selected, list.length - 1)];

  if (list.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100">
        <Bike size={56} className="text-slate-300" />
        <span className="text-xs font-semibold text-slate-400">Photo coming soon</span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative flex-1 min-h-0">
        {failed[selected] ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <Bike size={56} className="text-slate-300" />
          </div>
        ) : (
          <Image key={current} src={current} alt={model ?? ''}
            fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover animate-fade-in"
            onError={() => setFailed(f => ({ ...f, [selected]: true }))} />
        )}
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 p-3 bg-white">
          {list.map((src, i) => (
            failed[i] ? null : (
              <button key={i} onClick={() => setSelected(i)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === selected ? 'border-orange-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                aria-label={`View photo ${i + 1}`}>
                <Image src={src} alt="" fill sizes="64px" className="object-cover"
                  onError={() => setFailed(f => ({ ...f, [i]: true }))} />
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default ShowcaseImage;
