'use client';

import { useState } from 'react';
import { FEES, shortAddress, solscanAccount, solscanTx } from '@/lib/config';
import { sol, stamp, toSol, usd } from '@/lib/format';
import { AnimatedValue } from './AnimatedValue';
import { ArrowUpRight, ShareIcon } from './icons';
import { useLive } from './live';
import { Reveal } from './Reveal';
import { ShareModal } from './ShareModal';
import s from './Fees.module.css';

const solFmt = (v: number | null) => sol(v);

export function Fees() {
  const { fees, market } = useLive();
  const [sharing, setSharing] = useState(false);
  const f = fees.data;
  const solUsd = market.data?.solUsd ?? null;
  const totalUsd = f && solUsd ? toSol(f.totalLamports) * solUsd : null;

  return (
    <section id="fees" className={s.section} aria-labelledby="fees-title">
      <div className={`wrap ${s.grid}`}>
        <Reveal className={s.main}>
          <h2 id="fees-title" className={s.kicker}>
            Creator fees redirected
          </h2>

          {f ? (
            <>
              <p className={s.figure}>
                <AnimatedValue value={f.totalLamports} format={solFmt} className={`display ${s.amount}`} />
                <span className={`display ${s.unit}`}>SOL</span>
              </p>
              <p className={s.usd}>
                {totalUsd != null ? (
                  <>
                    <span className="num">≈ {usd(totalUsd)}</span> at today&rsquo;s SOL price
                  </>
                ) : (
                  'USD value unavailable right now'
                )}
              </p>

              <dl className={s.ledger}>
                <Row term="Paid out to the recipient" detail={`${f.payoutCount} payouts since launch`} value={`${sol(f.paidLamports)} SOL`} />
                <Row term="In the creator vault" detail="Earned, not paid out yet" value={`${sol(f.pendingLamports)} SOL`} />
                <Row
                  term="Recipient"
                  detail={`${f.shareBps / 100}% of creator fees`}
                  value={
                    <a className="link num" href={solscanAccount(f.recipient)} target="_blank" rel="noopener noreferrer">
                      {shortAddress(f.recipient)}
                      <ArrowUpRight size={13} />
                    </a>
                  }
                />
                <Row
                  term="Split"
                  detail={f.locked ? 'Admin revoked: it can no longer be changed' : 'Admin can still change it'}
                  value={
                    <a className="link" href={solscanAccount(FEES.sharingConfig)} target="_blank" rel="noopener noreferrer">
                      {f.locked ? 'Locked' : 'Editable'}
                      <ArrowUpRight size={13} />
                    </a>
                  }
                />
              </dl>

              <div className={s.actions}>
                <button type="button" className="btn btn-primary" onClick={() => setSharing(true)}>
                  <ShareIcon size={17} />
                  Share
                </button>
                <p className={s.note}>
                  Pump.fun takes a creator fee on every trade. On CATANA a fee-sharing config sends all of it to one wallet. Read from
                  Solana, refreshed every minute.
                </p>
              </div>
            </>
          ) : (
            <div className={s.empty}>
              <p className={s.emptyTitle}>{fees.error === 'unavailable' ? 'Reading the chain…' : 'Fee data is unavailable right now.'}</p>
              <p className={s.note}>
                The numbers come straight from Solana. If the RPC is slow they appear here on the next refresh, never estimated.
              </p>
              <a className="link" href={solscanAccount(FEES.sharingConfig)} target="_blank" rel="noopener noreferrer">
                See the fee-sharing config on Solscan <ArrowUpRight size={13} />
              </a>
            </div>
          )}
        </Reveal>

        <Reveal className={s.side} delay={0.08}>
          <h3 className={s.sideTitle}>
            Payouts <span>vault → recipient</span>
          </h3>
          {f?.recent.length ? (
            <ol className={s.timeline}>
              {f.recent.map((p) => {
                const t = stamp(p.time);
                return (
                  <li key={p.signature}>
                    <a href={solscanTx(p.signature)} target="_blank" rel="noopener noreferrer" className={s.event}>
                      <span className={`num ${s.when}`}>
                        {t.date} · {t.time}
                      </span>
                      <span className={`num ${s.amt}`}>+{sol(p.lamports)} SOL</span>
                      <span className={s.what}>
                        Creator fee payout <ArrowUpRight size={12} />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={s.note}>{f ? 'No payouts yet.' : 'Waiting for chain data.'}</p>
          )}
        </Reveal>
      </div>

      <ShareModal open={sharing} onClose={() => setSharing(false)} />
    </section>
  );
}

function Row({ term, detail, value }: { term: string; detail: string; value: React.ReactNode }) {
  return (
    <div className={s.row}>
      <dt>
        {term}
        <span>{detail}</span>
      </dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
