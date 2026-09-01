import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { TelemetryProvider } from './telemetry-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VIGÍA — Radar SECOP',
  description: 'Plataforma de análisis y alertas de riesgo en contratación pública colombiana.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'VIGÍA — Radar SECOP',
    description: 'Análisis explicable de riesgo contractual.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIGÍA — Radar SECOP',
    description: 'Análisis explicable de riesgo contractual.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TelemetryProvider>{children}</TelemetryProvider>
      </body>
    </html>
  );
}
