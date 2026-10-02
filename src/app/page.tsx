import { Creator } from '@/components/Creator';
import { Fees } from '@/components/Fees';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { LiveProvider } from '@/components/live';
import { getCreator } from '@/lib/server/creator';
import { getFees } from '@/lib/server/fees';
import { getMarket } from '@/lib/server/market';
import { settle } from '@/lib/server/respond';

/** Re-rendered at most every 30 s; the client keeps the numbers live in between. */
export const revalidate = 30;

export default async function Home() {
  const [market, fees, creator] = await Promise.all([settle(getMarket()), settle(getFees()), getCreator()]);
  // Render time is part of the payload so "updated Xs ago" starts from the truth.
  const renderedAt = Math.max(market.data?.updatedAt ?? 0, fees.data?.updatedAt ?? 0) || Date.now();

  return (
    <LiveProvider market={market} fees={fees} renderedAt={renderedAt}>
      <Header />
      <main>
        <Hero />
        <Fees />
        <Creator data={creator} />
      </main>
      <Footer />
    </LiveProvider>
  );
}
