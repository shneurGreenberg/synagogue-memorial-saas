/**
 * 1.37.1 I83: fit a barcode / QR picture inside its frame (contain), keeping its aspect ratio, and
 * give it rounded corners (7% of the shorter side). Plain px so old TV browsers can use it.
 * An image without intrinsic size (some SVGs on old engines) is treated as square.
 */
export const QR_CORNER_RATIO = 0.07;

export function computeQrFit({ frameWidth, frameHeight, naturalWidth, naturalHeight } = {}) {
  const fw = Number(frameWidth) || 0;
  const fh = Number(frameHeight) || 0;
  if (fw <= 0 || fh <= 0) return null;
  let nw = Number(naturalWidth) || 0;
  let nh = Number(naturalHeight) || 0;
  if (nw <= 0 || nh <= 0) {
    nw = 1;
    nh = 1;
  }
  const k = Math.min(fw / nw, fh / nh);
  const width = Math.max(1, Math.floor(nw * k));
  const height = Math.max(1, Math.floor(nh * k));
  const radius = Math.max(2, Math.round(Math.min(width, height) * QR_CORNER_RATIO));
  return { width, height, radius };
}
