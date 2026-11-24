import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Haarls / Workspace — Hybrid Auth & RBAC',
  description:
    'Operational workspace with hybrid Email/Password + Station PIN authentication and strict RBAC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-zinc-100 selection:bg-zinc-200 selection:text-zinc-950">
        {children}
      </body>
    </html>
  );
}
