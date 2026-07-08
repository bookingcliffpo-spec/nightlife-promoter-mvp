import { NextResponse } from 'next/server';

type SignupLogPayload = {
  event?: unknown;
  requestId?: unknown;
  attemptNumber?: unknown;
  emailDomain?: unknown;
  elapsedMs?: unknown;
  errorCode?: unknown;
  errorMessage?: unknown;
  errorName?: unknown;
  errorStatus?: unknown;
  hasSession?: unknown;
  hasUser?: unknown;
  identitiesCount?: unknown;
  timestamp?: unknown;
};

function stringOrNull(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 300) : null;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function sanitizeSignupLog(body: SignupLogPayload) {
  return {
    event: stringOrNull(body.event),
    requestId: stringOrNull(body.requestId),
    attemptNumber: numberOrNull(body.attemptNumber),
    emailDomain: stringOrNull(body.emailDomain),
    elapsedMs: numberOrNull(body.elapsedMs),
    errorCode: stringOrNull(body.errorCode),
    errorMessage: stringOrNull(body.errorMessage),
    errorName: stringOrNull(body.errorName),
    errorStatus: numberOrNull(body.errorStatus),
    hasSession: booleanOrNull(body.hasSession),
    hasUser: booleanOrNull(body.hasUser),
    identitiesCount: numberOrNull(body.identitiesCount),
    timestamp: stringOrNull(body.timestamp) ?? new Date().toISOString()
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupLogPayload;
    const logPayload = sanitizeSignupLog(body);

    console.info('[auth:signup]', logPayload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn('[auth:signup] invalid log payload', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
