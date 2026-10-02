import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Shippori_Mincho_B1 } from 'next/font/google';
import { MINT, SITE } from '@/lib/config';
import './globals.css';

const display = Shippori_Mincho_B1({ weight: ['800'], subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const description = 'CATANA is the Sword Cat coin on Solana. 100% of its Pump.fun creator fees are redirected to one wallet, locked on-chain. Live price, volume and fees.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.name,
  description,
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  keywords: ['CATANA', 'Sword Cat', '$CATANA', 'Solana', 'pump.fun', MINT],
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.meme}`,
    description,
  },
  twitter: { card: 'summary_large_image', title: `${SITE.name} — ${SITE.meme}`, description },
};

export const viewport: Viewport = {
  themeColor: '#0b0806',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
