import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'School Management System',
  description: 'Complete school management system with fee tracking and online payments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
