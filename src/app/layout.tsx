import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LOOM AI - Your emails, written the way you would write them',
  description: 'An AI assistant that learns from your writing style and helps you write natural, personalized emails.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
