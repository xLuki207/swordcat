// Recomputes src/data/fee-checkpoint.json from the chain, from scratch.
//
//   HELIUS_API_KEY=... node scripts/fee-checkpoint.mjs     (or put it in .env.local)
//
// What it proves, in order:
//   1. the PumpSwap pool's coin_creator is the fee-sharing config for this mint
//   2. that config has exactly one shareholder (the recipient)
//   3. every SOL transfer bonding-curve creator vault → recipient since the
//      config was created, summed. That is "paid out" up to the newest signature.
// The site then only adds payouts after that signature (src/lib/server/fees.ts).
import fs from 'node:fs';

const MINT = 'Gd28K8mXV6AsDyjpHnREdC6zetL3XVrLY2yk1urZpump';
const POOL = '9xVi3514hnzQa8VCq3VfLeRqsyqd3havAu1efdnLxNoB';
const SHARING_CONFIG = 'GieQcg8YmhtcwdZVt7egcowDnFSq52c76Tgc7ofbEaFw';
const PUMP_CREATOR_VAULT = 'GZTkcw594HwhRnbDNrGBtkCKji2H9tFQ4bAyvsqHUUo3';

function env(name) {
  if (process.env[name]) return process.env[name];
  for (const f of ['.env.local', '.env']) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (m) return m[1].replace(/["'\r]/g, '').trim();
  }
  return undefined;
}
const RPC =
  env('SOLANA_RPC_URL') ??
  (env('HELIUS_API_KEY') ? `https://mainnet.helius-rpc.com/?api-key=${env('HELIUS_API_KEY')}` : 'https://api.mainnet-beta.solana.com');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function rpc(method, params) {
  for (let i = 0; i < 8; i++) {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    if (res.status === 429 || !body) {
      await sleep(600 * (i + 1));
      continue;
    }
    if (body.error) throw new Error(`${method}: ${body.error.message}`);
    await sleep(120);
    return body.result;
  }
  throw new Error(`${method}: rate limited`);
}

const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  let s = '';
  while (n > 0n) {
    s = A[Number(n % 58n)] + s;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b) break;
    s = '1' + s;
  }
  return s;
}
const account = async (a) => Buffer.from((await rpc('getAccountInfo', [a, { encoding: 'base64' }])).value.data[0], 'base64');

// 1. pool → coin_creator (offset: disc 8, bump 1, index 2, 6 pubkeys, lp_supply 8)
const pool = await account(POOL);
const coinCreator = b58(pool.subarray(8 + 1 + 2 + 32 * 6 + 8, 8 + 1 + 2 + 32 * 6 + 8 + 32));
if (b58(pool.subarray(8 + 1 + 2 + 32, 8 + 1 + 2 + 64)) !== MINT) throw new Error('pool base mint mismatch');
if (coinCreator !== SHARING_CONFIG) throw new Error(`pool coin_creator is ${coinCreator}, not the sharing config`);

// 2. sharing config
const sc = await account(SHARING_CONFIG);
if (b58(sc.subarray(11, 43)) !== MINT) throw new Error('sharing config mint mismatch');
const locked = sc[75] === 1;
const n = sc.readUInt32LE(76);
const holders = Array.from({ length: n }, (_, i) => ({ address: b58(sc.subarray(80 + i * 34, 112 + i * 34)), bps: sc.readUInt16LE(112 + i * 34) }));
if (holders.length !== 1) throw new Error(`expected one shareholder, found ${holders.length}`);
const recipient = holders[0].address;
console.log('recipient', recipient, holders[0].bps, 'bps', locked ? '(admin revoked)' : '(admin active)');

// When did the config start? Payouts cannot predate it.
let before;
let oldest;
for (;;) {
  const page = await rpc('getSignaturesForAddress', [SHARING_CONFIG, { limit: 1000, before }]);
  if (!page.length) break;
  oldest = page[page.length - 1];
  before = oldest.signature;
  if (page.length < 1000) break;
}
console.log('config since', new Date(oldest.blockTime * 1000).toISOString());

// 3. recipient history since then
const sigs = [];
before = undefined;
for (;;) {
  const page = await rpc('getSignaturesForAddress', [recipient, { limit: 1000, before }]);
  sigs.push(...page);
  if (page.length < 1000 || page[page.length - 1].blockTime < oldest.blockTime) break;
  before = page[page.length - 1].signature;
}
const relevant = sigs.filter((s) => s.blockTime >= oldest.blockTime);
const payouts = [];
for (const s of relevant) {
  if (s.err) continue;
  const tx = await rpc('getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 1 }]);
  const ixs = [...tx.transaction.message.instructions, ...(tx.meta.innerInstructions ?? []).flatMap((i) => i.instructions)];
  let lamports = 0;
  for (const ix of ixs)
    if (ix.program === 'system' && ix.parsed?.type === 'transfer' && ix.parsed.info.source === PUMP_CREATOR_VAULT && ix.parsed.info.destination === recipient)
      lamports += ix.parsed.info.lamports;
  if (lamports) payouts.push({ signature: s.signature, time: tx.blockTime * 1000, lamports });
}
payouts.sort((a, b) => b.time - a.time);
const out = {
  recipient,
  lastSignature: relevant[0]?.signature ?? null,
  paidLamports: payouts.reduce((s, p) => s + p.lamports, 0),
  payoutCount: payouts.length,
  recent: payouts.slice(0, 6),
  configCreatedAt: oldest.blockTime * 1000,
  computedAt: Date.now(),
};
fs.writeFileSync('src/data/fee-checkpoint.json', JSON.stringify(out, null, 2) + '\n');
console.log(`paid ${out.paidLamports / 1e9} SOL in ${out.payoutCount} payouts, through ${out.lastSignature}`);
