/**
 * Every address on this page, and where it comes from.
 *
 * The fee addresses are not guesses: they are read from the PumpSwap pool
 * and derived from the pump programs' own PDA seeds. `npm run fees:checkpoint`
 * re-derives them from scratch and fails loudly if any of them disagrees.
 */
export const SITE = {
  name: 'CATANA',
  meme: 'Sword Cat',
  ticker: '$CATANA',
  domain: 'catana.fun',
  url: 'https://catana.fun',
} as const;

export const MINT = 'Gd28K8mXV6AsDyjpHnREdC6zetL3XVrLY2yk1urZpump';

export const LINKS = {
  pump: `https://pump.fun/coin/${MINT}`,
  dexscreener: `https://dexscreener.com/solana/${MINT}`,
  solscanToken: `https://solscan.io/token/${MINT}`,
  instagram: 'https://www.instagram.com/numanuk',
  xCommunity: 'https://x.com/i/communities/2017373181716128168',
} as const;

export const solscanAccount = (a: string) => `https://solscan.io/account/${a}`;
export const solscanTx = (s: string) => `https://solscan.io/tx/${s}`;

/**
 * Pump.fun creator-fee sharing for this coin.
 *
 * The PumpSwap pool's `coin_creator` is the fee program's sharing config for
 * this mint, so every creator fee lands in vaults owned by that config and is
 * paid out to its shareholders. Read on chain 2026-10-02: one shareholder at
 * 10000 bps, admin revoked (the split can no longer be changed).
 */
export const FEES = {
  feeProgram: 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ',
  /** PDA ["sharing-config", mint] of the fee program. */
  sharingConfig: 'GieQcg8YmhtcwdZVt7egcowDnFSq52c76Tgc7ofbEaFw',
  /** PDA ["creator-vault", sharingConfig] of the pump bonding-curve program. Holds SOL. */
  pumpCreatorVault: 'GZTkcw594HwhRnbDNrGBtkCKji2H9tFQ4bAyvsqHUUo3',
  /** WSOL ATA of PDA ["creator_vault", sharingConfig] of the PumpSwap program. */
  ammCreatorVaultAta: '6yxJmTCVZJk2C6KKuT5dfUW6trdb1iDJoqQ5Vcxye7Bi',
  pumpSwapPool: '9xVi3514hnzQa8VCq3VfLeRqsyqd3havAu1efdnLxNoB',
} as const;

/** Instagram reel linked from the token's own DexScreener profile. */
export const CREATOR = {
  handle: 'numanuk',
  reelShortcode: 'DbzU9RWIG6t',
} as const;

export const shortAddress = (a: string, head = 4, tail = 4) => `${a.slice(0, head)}…${a.slice(-tail)}`;
