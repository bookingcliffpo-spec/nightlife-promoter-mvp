'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiUpload } from '@/lib/api';

export function CsvImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiUpload('/api/contacts/import', formData);
      setResult(res);
      toast.success(`Imported ${res.created} contacts`);
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import contacts from CSV</DialogTitle>
          <DialogDescription>
            Columns: firstName, lastName, email, phone, birthday, vipLevel, notes, optedInEmail, optedInSms. Each row needs at least an
            email or phone.
          </DialogDescription>
        </DialogHeader>
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFile} disabled={importing} className="text-sm" />
        {importing && <p className="text-sm text-muted-foreground">Importing…</p>}
        {result && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>
              Created <strong>{result.created}</strong>, skipped <strong>{result.skipped}</strong>.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-y-auto pl-4 text-xs text-muted-foreground">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
