import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ops Workspace — Hybrid Auth & RBAC',
  description: 'Operational shift management with Email/Password + PIN authentication and strict RBAC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-canvas">
        {children}
      </body>
    </html>
  );
}
