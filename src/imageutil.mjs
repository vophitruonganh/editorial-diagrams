// Optional sharp acceleration. sharp is a native dep; if it's unavailable on a
// platform, every function degrades gracefully (caller falls back to puppeteer).
// Used to: (1) lossless-optimize the on-disk PNG (smaller file, same quality),
// (2) high-quality Lanczos downscale for the inline preview WITHOUT a 2nd render.
let sharpMod; // undefined = not tried, null = unavailable

async function getSharp() {
  if (sharpMod === undefined) {
    try { sharpMod = (await import('sharp')).default; }
    catch { sharpMod = null; }
  }
  return sharpMod;
}

export async function hasSharp() { return Boolean(await getSharp()); }

// Lossless re-encode (palette-free, max compression) — same pixels, smaller bytes.
export async function optimizePng(buf) {
  const sharp = await getSharp();
  if (!sharp) return buf;
  try { return await sharp(buf).png({ compressionLevel: 9, effort: 7 }).toBuffer(); }
  catch { return buf; }
}

// Downscale a PNG buffer to targetWidth with Lanczos (sharper than browser DSF
// downscale). Returns {buffer,width,height} or null if sharp unavailable/failed.
export async function resizePng(buf, targetWidth) {
  const sharp = await getSharp();
  if (!sharp) return null;
  try {
    const out = await sharp(buf)
      .resize({ width: Math.max(1, Math.round(targetWidth)), withoutEnlargement: true, kernel: 'lanczos3' })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const meta = await sharp(out).metadata();
    return { buffer: out, width: meta.width, height: meta.height };
  } catch { return null; }
}
