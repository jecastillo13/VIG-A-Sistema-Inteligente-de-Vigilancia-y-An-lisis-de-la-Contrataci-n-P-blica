'use client';

import * as Sentry from '@sentry/react';
import type { ReactNode } from 'react';
import { sanitizeSentryEvent } from '../scripts/observability/sanitize.mjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (typeof window !== 'undefined' && dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'development',
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
        response: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      },
      httpBodies: [],
      urlQueryParams: { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      graphQL: { document: false, variables: false },
    },
    tracesSampleRate: 0,
    beforeSend: (event) => sanitizeSentryEvent(event) as typeof event,
    beforeBreadcrumb: () => null,
  });
}

export function captureTechnicalError(error: unknown) {
  if (dsn) Sentry.captureException(error);
}

export function TelemetryProvider({ children }: { children: ReactNode }) {
  return children;
}
