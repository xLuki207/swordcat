import 'server-only';
import checkpoint from '@/data/fee-checkpoint.json';
import { FEES, MINT } from '../config';
import type { CreatorFeeData, FeePayout } from '../types';
import { memo } from './cache';
import { base58, isAddress, rpc } from './rpc';

/**
 * CREATOR FEES, FROM THE CHAIN ONLY.
 *
 * Every creator fee this coin produces lands in one of two vaults owned by the
 * coin's fee-sharing config (bonding-curve vault: SOL; PumpSwap vault: WSOL).
 * A payout moves it from the bonding-curve vault to the shareholder. So:
 *
 *   paid     = Σ system transfers  pumpCreatorVault → recipient
 *   pending  = what sits in the two vaults right now
 *   total    = paid + pending       (every creator fee produced so far)
 *
 * `paid` is a sum over history. Re-reading all of it on every request would
 * be wasteful, so a checkpoint (scripts/fee-checkpoint.mjs, reproducible by
 * anyone) holds the sum up to one signature, and each request only reads the
 * recipient's transactions after it.
 */

type Checkpoint = {
  recipient: string;
  lastSignature: string;
  paidLamports: number;
  payoutCount: number;
  recent: FeePayout[];
};
const CP = checkpoint as Checkpoint;

/** Rent-exempt minimum of a 0-byte account; the bonding-curve vault keeps it. */
const RENT_EXEMPT_EMPTY = 890_880;

type SharingConfig = { mint: string; locked: boolean; shareholders: { address: string; bps: number }[] };

async function readSharingConfig(): Promise<SharingConfig> {
  const info = await rpc<{ value: { data: [string, string]; owner: string } | null }>('getAccountInfo', [
    FEES.sharingConfig,
    { encoding: 'base64', commitment: 'confirmed' },
  ]);
  if (!info.value || info.value.owner !== FEES.feeProgram) throw new Error('sharing config missing');
  const d = Buffer.from(info.value.data[0], 'base64');
  // discriminator 8 | bump 1 | version 1 | status 1 | mint 32 | admin 32 | admin_revoked 1 | vec<Shareholder>
  let o = 11;
  const mint = base58(d.subarray(o, o + 32));
  o += 64;
  const locked = d[o] === 1;
  o += 1;
  const n = d.readUInt32LE(o);
  o += 4;
  if (n > 16) throw new Error('sharing config: unexpected shareholder count');
  const shareholders = Array.from({ length: n }, (_, i) => {
    const at = o + i * 34;
    return { address: base58(d.subarray(at, at + 32)), bps: d.readUInt16LE(at + 32) };
  });
  return { mint, locked, shareholders };
}

async function readPending(): Promise<number> {
  const [ata, vault] = await Promise.all([
    rpc<{ value: { amount: string } }>('getTokenAccountBalance', [FEES.ammCreatorVaultAta, { commitment: 'confirmed' }]),
    rpc<{ value: number }>('getBalance', [FEES.pumpCreatorVault, { commitment: 'confirmed' }]),
  ]);
  return Number(ata.value.amount) + Math.max(0, vault.value - RENT_EXEMPT_EMPTY);
}

type ParsedIx = { program?: string; parsed?: { type?: string; info?: { source?: string; destination?: string; lamports?: number } } };
type ParsedTx = {
  blockTime: number | null;
  meta: { err: unknown; innerInstructions?: { instructions: ParsedIx[] }[] } | null;
  transaction: { message: { instructions: ParsedIx[] } };
};

/** A confirmed transaction never changes, so its payout amount is memoised forever. */
const g = globalThis as unknown as { __catanaPayouts?: Map<string, FeePayout | null> };
const payoutBySig = (g.__catanaPayouts ??= new Map());

async function payoutIn(signature: string, recipient: string): Promise<FeePayout | null> {
  if (payoutBySig.has(signature)) return payoutBySig.get(signature)!;
  const tx = await rpc<ParsedTx | null>('getTransaction', [
    signature,
    { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1, commitment: 'confirmed' },
  ]);
  if (!tx) return null; // not visible yet; do not memoise
  let lamports = 0;
  if (!tx.meta?.err) {
    const ixs = [...tx.transaction.message.instructions, ...(tx.meta?.innerInstructions ?? []).flatMap((i) => i.instructions)];
    for (const ix of ixs) {
      const info = ix.parsed?.info;
      if (ix.program === 'system' && ix.parsed?.type === 'transfer' && info?.source === FEES.pumpCreatorVault && info.destination === recipient)
        lamports += info.lamports ?? 0;
    }
  }
  const out = lamports > 0 ? { signature, time: (tx.blockTime ?? 0) * 1000, lamports } : null;
  payoutBySig.set(signature, out);
  return out;
}

async function newPayouts(recipient: string): Promise<FeePayout[]> {
  const sigs: { signature: string; err: unknown }[] = [];
  let before: string | undefined;
  for (let page = 0; page < 5; page++) {
    const batch = await rpc<{ signature: string; err: unknown }[]>('getSignaturesForAddress', [
      recipient,
      { limit: 1000, until: CP.lastSignature, before, commitment: 'confirmed' },
    ]);
    sigs.push(...batch);
    if (batch.length < 1000) break;
    before = batch[batch.length - 1].signature;
  }
  const todo = sigs.filter((s) => !s.err).map((s) => s.signature);
  const found: FeePayout[] = [];
  // Small concurrency: free RPC tiers rate-limit hard, and the list is short.
  for (let i = 0; i < todo.length; i += 3) {
    const chunk = await Promise.all(todo.slice(i, i + 3).map((s) => payoutIn(s, recipient)));
    for (const p of chunk) if (p) found.push(p);
  }
  return found;
}

async function load(): Promise<CreatorFeeData> {
  const config = await readSharingConfig();
  if (config.mint !== MINT) throw new Error('sharing config belongs to another mint');
  const [holder] = config.shareholders;
  // The checkpoint is a sum for one recipient. If the config ever named
  // someone else, that sum would be wrong, so refuse instead of mislabelling.
  if (config.shareholders.length !== 1 || !holder || holder.address !== CP.recipient || !isAddress(holder.address))
    throw new Error('fee recipients changed since checkpoint');

  const [pendingLamports, fresh] = await Promise.all([readPending(), newPayouts(holder.address)]);
  const freshPaid = fresh.reduce((s, p) => s + p.lamports, 0);
  const paidLamports = CP.paidLamports + freshPaid;
  const recent = [...fresh, ...CP.recent].sort((a, b) => b.time - a.time).slice(0, 6);
  return {
    paidLamports,
    payoutCount: CP.payoutCount + fresh.length,
    pendingLamports,
    totalLamports: paidLamports + pendingLamports,
    recipient: holder.address,
    shareBps: holder.bps,
    locked: config.locked,
    recent,
    updatedAt: Date.now(),
  };
}

export const getFees = () => memo('fees', 45_000, load);
