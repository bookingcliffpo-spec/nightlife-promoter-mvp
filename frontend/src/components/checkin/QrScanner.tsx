'use client';

import { useEffect, useRef, useState } from 'react';

export function QrScanner({ onScan, active }: { onScan: (code: string) => void; active: boolean }) {
  const containerId = 'qr-scanner-region';
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const now = Date.now();
            if (decodedText === lastScanRef.current.code && now - lastScanRef.current.at < 3000) return;
            lastScanRef.current = { code: decodedText, at: now };
            onScan(decodedText);
          },
          () => {
            // ignore per-frame decode failures
          }
        )
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not access camera'));
    });

    return () => {
      cancelled = true;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div id={containerId} className="mx-auto max-w-sm overflow-hidden rounded-xl" />
      {error && <p className="text-center text-sm text-destructive">{error}. You can still use manual code entry below.</p>}
    </div>
  );
}
