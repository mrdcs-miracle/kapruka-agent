import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kapi — Kapruka AI Shopping Assistant',
  description: 'Your AI-powered shopping assistant for Kapruka.com',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}