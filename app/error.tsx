'use client';

import { useEffect } from 'react';
import { captureTechnicalError } from './telemetry-provider';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => captureTechnicalError(error), [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
      <section className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold">No fue posible mostrar esta sección</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Se registró únicamente información técnica del error. Los datos
          contractuales y documentales no se envían al monitoreo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-[#155b9b] px-4 py-2.5 text-sm font-bold text-white"
        >
          Intentar nuevamente
        </button>
      </section>
    </main>
  );
}
