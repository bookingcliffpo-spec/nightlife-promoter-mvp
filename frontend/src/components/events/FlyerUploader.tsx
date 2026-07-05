'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiSend, apiUpload } from '@/lib/api';

interface Flyer {
  id: string;
  url: string;
}

export function FlyerUploader({ eventId, flyers, onChange }: { eventId: string; flyers: Flyer[]; onChange: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiUpload(`/api/flyers/event/${eventId}`, formData);
      toast.success('Flyer uploaded');
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiSend(`/api/flyers/${id}`, 'DELETE');
      toast.success('Flyer removed');
      onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {flyers.map((flyer) => (
          <div key={flyer.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60">
            <Image src={flyer.url} alt="Flyer" fill className="object-cover" unoptimized />
            <button
              onClick={() => handleDelete(flyer.id)}
              className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove flyer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
          {uploading ? 'Uploading…' : 'Upload flyer'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleFile} />
    </div>
  );
}
