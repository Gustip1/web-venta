// Auto-crop of near-white borders for product photos.
// Runs fully client-side via canvas so uploads never include Canva-style margins.

const WHITE_THRESHOLD = 240; // R,G,B all >= this counts as "white"
const ROW_WHITE_RATIO = 0.985; // a row/col must be >=98.5% white to be trimmed
const MIN_ALPHA = 10; // below this we treat the pixel as transparent margin
const SAFETY_PADDING = 4; // leave a tiny breathing room around the product

function isWhitePixel(r: number, g: number, b: number, a: number) {
  if (a < MIN_ALPHA) return true;
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

function findBounds(data: Uint8ClampedArray, width: number, height: number) {
  const rowWhite = new Array<number>(height).fill(0);
  const colWhite = new Array<number>(width).fill(0);

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = rowStart + x * 4;
      if (isWhitePixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        rowWhite[y]++;
        colWhite[x]++;
      }
    }
  }

  const rowLimit = width * ROW_WHITE_RATIO;
  const colLimit = height * ROW_WHITE_RATIO;

  let top = 0;
  while (top < height && rowWhite[top] >= rowLimit) top++;
  let bottom = height - 1;
  while (bottom > top && rowWhite[bottom] >= rowLimit) bottom--;
  let left = 0;
  while (left < width && colWhite[left] >= colLimit) left++;
  let right = width - 1;
  while (right > left && colWhite[right] >= colLimit) right--;

  return { top, bottom, left, right };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to HTMLImageElement path
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}

function mimeFor(file: File): { type: string; ext: string; quality: number } {
  const t = (file.type || '').toLowerCase();
  if (t.includes('png')) return { type: 'image/png', ext: 'png', quality: 1 };
  if (t.includes('webp')) return { type: 'image/webp', ext: 'webp', quality: 0.92 };
  return { type: 'image/jpeg', ext: 'jpg', quality: 0.92 };
}

export async function trimWhiteBorders(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Skip formats the browser can't reliably decode onto a canvas
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    return file;
  }

  const width = 'width' in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const height = 'height' in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;
  if (!width || !height) return file;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return file;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return file;
  }

  const { top, bottom, left, right } = findBounds(imageData.data, width, height);

  // Nothing to trim (or the detector ate the whole image — bail out safely)
  if (bottom <= top || right <= left) return file;
  const trimmedTop = top;
  const trimmedLeft = left;
  const trimmedBottom = bottom;
  const trimmedRight = right;
  const marginTop = trimmedTop;
  const marginBottom = height - 1 - trimmedBottom;
  const marginLeft = trimmedLeft;
  const marginRight = width - 1 - trimmedRight;

  // If the margin is negligible, don't re-encode
  const minSignificant = Math.max(4, Math.round(Math.min(width, height) * 0.01));
  if (
    marginTop < minSignificant &&
    marginBottom < minSignificant &&
    marginLeft < minSignificant &&
    marginRight < minSignificant
  ) {
    return file;
  }

  const padLeft = Math.min(marginLeft, SAFETY_PADDING);
  const padRight = Math.min(marginRight, SAFETY_PADDING);
  const padTop = Math.min(marginTop, SAFETY_PADDING);
  const padBottom = Math.min(marginBottom, SAFETY_PADDING);
  const sx = Math.max(0, trimmedLeft - padLeft);
  const sy = Math.max(0, trimmedTop - padTop);
  const sw = Math.min(width - sx, trimmedRight - trimmedLeft + 1 + padLeft + padRight);
  const sh = Math.min(height - sy, trimmedBottom - trimmedTop + 1 + padTop + padBottom);

  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  const outCtx = out.getContext('2d');
  if (!outCtx) return file;
  outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  const { type, ext, quality } = mimeFor(file);
  const blob: Blob | null = await new Promise((resolve) => out.toBlob(resolve, type, quality));
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-trim.${ext}`, { type, lastModified: Date.now() });
}
