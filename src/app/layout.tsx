import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LOOM.AI — Your emails, written the way you would write them',
  description:
    'An AI email-writing assistant that learns from your writing style and crafts natural, personalized emails.',
  icons: {
    icon: '/loom-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-[#f8fafc] min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
