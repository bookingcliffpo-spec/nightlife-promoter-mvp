'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const RATE_LIMIT_MESSAGE = 'Too many signup attempts. Please wait a few minutes before requesting another verification email.';
const GENERIC_AUTH_MESSAGE = 'Unable to reach the authentication service. Please try again.';

type AuthErrorDetails = {
  code: string | null;
  message: string;
  name: string | null;
  status: number | null;
};

type AuthErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

type SignupLogEvent = {
  event: string;
  requestId: string;
  attemptNumber: number;
  emailDomain: string;
  elapsedMs?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  errorName?: string | null;
  errorStatus?: number | null;
  hasSession?: boolean;
  hasUser?: boolean;
  identitiesCount?: number | null;
  timestamp?: string;
};

function getAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getEmailDomain(value: string) {
  return value.split('@')[1]?.toLowerCase() || 'unknown';
}

function getErrorDetails(error: unknown): AuthErrorDetails {
  const authError = error as AuthErrorLike | null;

  return {
    code: authError?.code ?? null,
    message: authError?.message ?? GENERIC_AUTH_MESSAGE,
    name: authError?.name ?? null,
    status: typeof authError?.status === 'number' ? authError.status : null
  };
}

function isRateLimitError(details: AuthErrorDetails) {
  const haystack = `${details.code ?? ''} ${details.message}`.toLowerCase();

  return details.status === 429 || haystack.includes('rate limit') || haystack.includes('over_email_send_rate_limit');
}

function isExistingAccountError(details: AuthErrorDetails) {
  const haystack = `${details.code ?? ''} ${details.message}`.toLowerCase();

  return (
    haystack.includes('already registered') ||
    haystack.includes('already exists') ||
    haystack.includes('already been registered') ||
    haystack.includes('user_already_exists')
  );
}

function logSignupEvent(event: SignupLogEvent) {
  const payload = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString()
  };

  console.info('[auth:signup]', payload);

  fetch('/api/auth/signup-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch((error) => {
    console.warn('[auth:signup] unable to send server log', error);
  });
}

export default function SignupPage() {
  const router = useRouter();
  const signupInFlightRef = useRef(false);
  const resendInFlightRef = useRef(false);
  const signupAttemptCountRef = useRef(0);
  const resendAttemptCountRef = useRef(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState(
    'Check your inbox to confirm your email and finish creating your account.'
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const emailDomain = getEmailDomain(normalizedEmail);

    if (signupInFlightRef.current) {
      logSignupEvent({
        event: 'signup_duplicate_blocked',
        requestId: `signup-blocked-${Date.now()}`,
        attemptNumber: signupAttemptCountRef.current,
        emailDomain
      });
      return;
    }

    signupInFlightRef.current = true;
    signupAttemptCountRef.current += 1;
    setLoading(true);

    const attemptNumber = signupAttemptCountRef.current;
    const requestId = `signup-${Date.now()}-${attemptNumber}`;
    const startedAt = performance.now();

    logSignupEvent({ event: 'signup_started', requestId, attemptNumber, emailDomain });

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: getAuthRedirectUrl()
        }
      });

      const elapsedMs = Math.round(performance.now() - startedAt);
      const identitiesCount = data.user?.identities?.length ?? null;

      if (error) {
        const details = getErrorDetails(error);

        logSignupEvent({
          event: 'signup_failed',
          requestId,
          attemptNumber,
          emailDomain,
          elapsedMs,
          errorCode: details.code,
          errorMessage: details.message,
          errorName: details.name,
          errorStatus: details.status,
          hasSession: Boolean(data.session),
          hasUser: Boolean(data.user),
          identitiesCount
        });

        if (isRateLimitError(details)) {
          toast.error(RATE_LIMIT_MESSAGE);
          return;
        }

        if (isExistingAccountError(details)) {
          setConfirmationEmail(normalizedEmail);
          setConfirmationMessage('This email may already have an account waiting for verification. You can request a new verification email below.');
          setSent(true);
          return;
        }

        toast.error(details.message);
        return;
      }

      logSignupEvent({
        event: 'signup_succeeded',
        requestId,
        attemptNumber,
        emailDomain,
        elapsedMs,
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
        identitiesCount
      });

      if (data.session) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      setConfirmationEmail(normalizedEmail);
      setConfirmationMessage(
        identitiesCount === 0
          ? 'This email may already have an account waiting for verification. You can request a new verification email below.'
          : 'Check your inbox to confirm your email and finish creating your account.'
      );
      setSent(true);
      toast.success('Verification email sent.');
    } catch (err) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      const details = getErrorDetails(err);

      logSignupEvent({
        event: 'signup_exception',
        requestId,
        attemptNumber,
        emailDomain,
        elapsedMs,
        errorCode: details.code,
        errorMessage: details.message,
        errorName: details.name,
        errorStatus: details.status
      });

      toast.error(isRateLimitError(details) ? RATE_LIMIT_MESSAGE : details.message);
    } finally {
      signupInFlightRef.current = false;
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = confirmationEmail ?? normalizeEmail(email);
    const emailDomain = getEmailDomain(normalizedEmail);

    if (!normalizedEmail) {
      toast.error('Enter your email address first.');
      return;
    }

    if (resendInFlightRef.current) {
      logSignupEvent({
        event: 'signup_resend_duplicate_blocked',
        requestId: `signup-resend-blocked-${Date.now()}`,
        attemptNumber: resendAttemptCountRef.current,
        emailDomain
      });
      return;
    }

    resendInFlightRef.current = true;
    resendAttemptCountRef.current += 1;
    setResending(true);

    const attemptNumber = resendAttemptCountRef.current;
    const requestId = `signup-resend-${Date.now()}-${attemptNumber}`;
    const startedAt = performance.now();

    logSignupEvent({ event: 'signup_resend_started', requestId, attemptNumber, emailDomain });

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: getAuthRedirectUrl()
        }
      });

      const elapsedMs = Math.round(performance.now() - startedAt);

      if (error) {
        const details = getErrorDetails(error);

        logSignupEvent({
          event: 'signup_resend_failed',
          requestId,
          attemptNumber,
          emailDomain,
          elapsedMs,
          errorCode: details.code,
          errorMessage: details.message,
          errorName: details.name,
          errorStatus: details.status
        });

        toast.error(isRateLimitError(details) ? RATE_LIMIT_MESSAGE : details.message);
        return;
      }

      logSignupEvent({ event: 'signup_resend_succeeded', requestId, attemptNumber, emailDomain, elapsedMs });
      toast.success('Verification email resent.');
      setConfirmationMessage('We sent another verification email. Check your inbox to finish creating your account.');
    } catch (err) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      const details = getErrorDetails(err);

      logSignupEvent({
        event: 'signup_resend_exception',
        requestId,
        attemptNumber,
        emailDomain,
        elapsedMs,
        errorCode: details.code,
        errorMessage: details.message,
        errorName: details.name,
        errorStatus: details.status
      });

      toast.error(isRateLimitError(details) ? RATE_LIMIT_MESSAGE : details.message);
    } finally {
      resendInFlightRef.current = false;
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <Card>
          <CardHeader className="items-center text-center">
            <Link href="/" className="mb-2 flex items-center gap-2 text-xl font-black">
              <PartyPopper className="h-6 w-6 text-primary" /> NIGHT<span className="gradient-text">LIFE AI</span>
            </Link>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Start your 14-day free trial. No credit card required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sent ? (
              <div className="space-y-3 rounded-lg bg-emerald-500/10 p-4 text-center text-sm text-emerald-600 dark:text-emerald-400">
                <p>{confirmationMessage}</p>
                <Button type="button" variant="outline" className="w-full" onClick={handleResendVerification} disabled={resending || loading}>
                  {resending ? 'Sending verification...' : 'Resend verification email'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Blake"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@venue.com"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            )}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
