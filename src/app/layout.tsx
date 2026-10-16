import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: 'LOOM — Your emails, written the way you would write them',
  description:
    'An AI email-writing assistant that learns from your writing style and crafts natural, personalized emails.',
  icons: {
    icon: '/loom-logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1117',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${geistMono.variable} ${newsreader.variable}`}>
      <body className="bg-bg text-fg font-sans antialiased min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
