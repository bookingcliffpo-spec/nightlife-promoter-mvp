'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  organization: {
    id: string;
    name: string;
    planTier: 'FREE' | 'PRO' | 'ELITE';
    subscriptionStatus: string;
  };
}

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiGet('/api/me')
      .then((data) => {
        if (active) setMe(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { me, loading, error };
}
