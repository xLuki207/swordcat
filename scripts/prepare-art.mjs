// Builds the web art from the master cutout in ref/.
//
// ref/token-ipfs.jpg is the token's own image (from its on-chain metadata).
// ref/catana-cutout-master.png is that image with the background removed
// (imgly medium model) plus a hand-traced mask for the blade, which the model
// lost against the grey pavement. Nothing about the cat itself is redrawn.
//
//   node scripts/prepare-art.mjs
import sharp from 'sharp';

const MASTER = 'ref/catana-cutout-master.png';
// The cutout's region of the token image at 2x: Real-ESRGAN x4 (downscaled)
// blended 70/30 with a Lanczos upscale of the original, so the eyes and the
// tsuba get crisp without the fur turning painterly. Same pixels, same cat.
const DETAIL = 'ref/catana-detail-2x.jpg';

const { width: W, height: H } = await sharp(DETAIL).metadata();
const alpha = await sharp(MASTER).ensureAlpha().extractChannel(3).resize(W, H, { kernel: 'lanczos3' }).raw().toBuffer();
const rgb = await sharp(DETAIL).removeAlpha().raw().toBuffer();
const data = Buffer.alloc(W * H * 4);
for (let p = 0; p < W * H; p++) {
  data[p * 4] = rgb[p * 3];
  data[p * 4 + 1] = rgb[p * 3 + 1];
  data[p * 4 + 2] = rgb[p * 3 + 2];
  data[p * 4 + 3] = alpha[p];
}
const info = { width: W, height: H };

// Tighten the alpha edge a little: the model leaves a soft pavement-grey halo.
for (let i = 3; i < data.length; i += 4) {
  const a = data[i];
  const na = Math.max(0, Math.min(255, Math.round(((a - 28) * 255) / 215)));
  data[i] = na;
  // Defringe: half-transparent edge pixels still carry pavement grey, which
  // reads as a light halo on a dark page. Pull them toward black.
  if (na < 250) {
    const k = Math.pow(na / 255, 0.35);
    data[i - 3] *= k;
    data[i - 2] *= k;
    data[i - 1] *= k;
  }
}
const cut = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
const png = await cut.png().toBuffer();

// 2x master for the page (next/image derives smaller widths from it)
await sharp(png).webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile('public/art/catana.webp');
// 1x PNG for the server-drawn share card
await sharp(png).resize(704, 1209, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile('public/art/catana.png');

// Backdrop: the right third of the token's own DexScreener banner (mountain,
// torii, blossoms), without the illustrated cat. Used dark and soft behind the hero.
await sharp('ref/dexscreener-banner.jpg')
  .extract({ left: 880, top: 120, width: 620, height: 380 })
  .modulate({ brightness: 0.9, saturation: 0.85 })
  .webp({ quality: 78 })
  .toFile('public/art/backdrop.webp');

// Face crop for the header mark and the favicons.
const face = { left: 250, top: 410, width: 860, height: 860 };
const round = (s) =>
  Buffer.from(`<svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="#fff"/></svg>`);
async function mark(size, out, bg = '#15100b') {
  const head = await sharp(png).extract(face).resize(size, size).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: head }, { input: round(size), blend: 'dest-in' }])
    .png()
    .toFile(out);
}
await mark(96, 'public/art/mark.png');
await mark(64, 'src/app/icon.png');
await mark(180, 'src/app/apple-icon.png');
console.log('art ready', info.width, info.height);
