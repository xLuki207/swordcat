# CATANA — catana.fun

The site for **CATANA**, the Sword Cat coin on Solana
(`Gd28K8mXV6AsDyjpHnREdC6zetL3XVrLY2yk1urZpump`).

One page: the cat, the live market, the creator fees, and the creator (@numanuk).
Every number on it is read from a live source. Nothing is estimated or filled in.

## Run it

```bash
npm install
cp .env.example .env.local   # add HELIUS_API_KEY (or SOLANA_RPC_URL)
npm run dev                  # http://localhost:3330
```

`npm run build && npm start` for a production build. Node 20.9+.

## Environment

| Variable         | Where        | What for                                                     |
| ---------------- | ------------ | ------------------------------------------------------------ |
| `HELIUS_API_KEY` | server only  | Solana RPC for the creator-fee numbers                       |
| `SOLANA_RPC_URL` | server only  | Any RPC URL instead of Helius (wins if both are set)         |

Without either, the public mainnet RPC is used; it works but is heavily rate-limited.
There are no `NEXT_PUBLIC_*` variables: no key ever reaches the browser.

## Where the numbers come from

| On the page            | Source                                                                            | Refresh               |
| ---------------------- | --------------------------------------------------------------------------------- | --------------------- |
| Price, market cap, 24h volume, 24h change, liquidity | DexScreener, deepest SOL-quoted CATANA pair (`src/lib/server/market.ts`) | 20 s client, 15 s CDN |
| SOL/USD (for ≈ $)      | the same pair's `priceUsd / priceNative`                                          | with market           |
| Creator fees           | Solana mainnet (`src/lib/server/fees.ts`)                                          | 60 s                  |
| Creator profile, reel  | Instagram's public profile preview and the reel's official embed (`src/lib/server/creator.ts`) | 6 h       |

### Creator fees, precisely

CATANA's PumpSwap pool names a Pump.fun **fee-sharing config** as its coin creator.
That config has one shareholder at 100% and its admin is revoked, so the split is permanent.
Every creator fee lands in the config's vaults and is paid out from there to that wallet.

- **Paid out** — sum of every SOL transfer creator vault → recipient since the config was created.
- **In the creator vault** — earned but not paid out yet (PumpSwap WSOL vault + bonding-curve vault above rent).
- **Creator fees redirected** (the big number) — paid out + in the vault: every creator fee the coin has produced.

The wallet's balance is never used: it is not the same thing.

Summing history on every request would be wasteful, so `src/data/fee-checkpoint.json`
holds the sum up to one signature and each request adds only newer payouts.
Regenerate and verify it from scratch any time:

```bash
npm run fees:checkpoint
```

It re-reads the pool, checks that its `coin_creator` is the sharing config for this mint,
checks the shareholder list, and re-sums every payout.

### Instagram

Only two public documents Instagram serves to link previews and embeds are read,
server-side and cached. If Instagram refuses, the section falls back to the handle
and a link. No placeholder posts, no invented counts.

## Share card

`/api/card?format=wide|square` draws a 1200×630 or 1080×1080 PNG from the live numbers
(`src/lib/server/card.tsx`, `next/og`). The same composition is the site's Open Graph image.

## Art

`public/art/catana.*` is the token's own image (from its on-chain metadata, `ref/token-ipfs.jpg`)
with the background removed. `npm run art` rebuilds the web assets from `ref/`.
`ref/REF.png` is the original mood reference.

## Deploy

Vercel, production domain `catana.fun` (www redirects to the apex).
Set `HELIUS_API_KEY` in the Vercel project for Production and Preview.
