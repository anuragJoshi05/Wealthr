// ============================================================================
// Client-side receipt compression — the single biggest lever on Supabase
// storage usage in this app. A raw phone-camera photo is routinely
// 3-8 MB; a handful of those uploaded uncompressed is exactly how a
// 22-transaction account ends up consuming tens of megabytes.
//
// This resizes the image to a sane maximum dimension and re-encodes it as
// a compressed JPEG using the browser's own Canvas API — zero new
// dependencies, works fully offline, and (as a side benefit) strips EXIF
// metadata since a fresh canvas render never carries it over.
// ============================================================================

const MAX_DIMENSION = 1600; // px — plenty to keep every line on a receipt legible
const JPEG_QUALITY = 0.72; // sweet spot: visually near-lossless for text/receipts
const MIN_USEFUL_COMPRESSION_BYTES = 40 * 1024; // don't bother re-encoding tiny files

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Compresses an image File down to a capped resolution + JPEG quality.
 * Falls back to the original file if compression fails or would make the
 * file bigger (e.g. an already-tiny icon), so this is always safe to call.
 */
export async function compressImageFile(file) {
  if (!file.type.startsWith('image/')) return file; // PDFs etc. pass through untouched
  if (file.type === 'image/svg+xml') return file; // vector, nothing to raster-compress
  if (file.size < MIN_USEFUL_COMPRESSION_BYTES) return file;

  try {
    const img = await loadImage(file);
    let { width, height } = img;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file; // compression didn't help — keep original

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // Any failure (corrupt image, unsupported format, canvas blocked) — the
    // upload should still proceed with the original file rather than block
    // the user's transaction entirely.
    return file;
  }
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
