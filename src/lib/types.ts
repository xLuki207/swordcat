export type TokenMarketData = {
  priceUsd: number | null;
  marketCap: number | null;
  fdv: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  /** USD per SOL, implied by the pair's own priceUsd / priceNative. */
  solUsd: number | null;
  dex: string;
  pairAddress: string;
  pairUrl: string;
  updatedAt: number;
};

export type FeePayout = { signature: string; time: number; lamports: number };

export type CreatorFeeData = {
  /** Paid out of the creator vaults to the recipient since the coin launched. */
  paidLamports: number;
  payoutCount: number;
  /** Sitting in the creator vaults, not yet paid out. */
  pendingLamports: number;
  /** paid + pending: every creator fee this coin has produced. */
  totalLamports: number;
  recipient: string;
  shareBps: number;
  /** The sharing config's admin is revoked: the split is permanent. */
  locked: boolean;
  recent: FeePayout[];
  updatedAt: number;
};

export type CreatorReel = {
  url: string;
  imageUrl: string | null;
  videoUrl: string | null;
  views: number | null;
  likes: number | null;
  caption: string | null;
};

export type CreatorData = {
  handle: string;
  profileUrl: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followers: number | null;
  reel: CreatorReel | null;
  fetchedAt: number;
};

export type Loaded<T> = { data: T | null; error: string | null };
