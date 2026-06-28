export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0..1
  format?: "image/webp" | "image/jpeg";
}

export interface CompressionResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
}

const loadImageBitmap = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
  try {
    if ("createImageBitmap" in window && typeof createImageBitmap === "function") {
      return await createImageBitmap(file);
    }
  } catch {}

  // Fallback via HTMLImageElement
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
};

export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.75,
    format = "image/webp",
  } = options as any;

  // If it is a GIF, skip compression to preserve animation
  const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
  if (isGif || file.size < 150 * 1024) {
    return {
      blob: file,
      mimeType: file.type || (isGif ? "image/gif" : "application/octet-stream"),
      extension: (file.name.split(".").pop() || "").toLowerCase() || (isGif ? "gif" : "jpg"),
      width: 0,
      height: 0,
    };
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadImageBitmap(file);
  } catch {
    // If decode fails (e.g., HEIC in unsupported browsers), upload original
    return {
      blob: file,
      mimeType: file.type || "application/octet-stream",
      extension: (file.name.split(".").pop() || "").toLowerCase() || "jpg",
      width: 0,
      height: 0,
    };
  }

  const srcWidth = (source as any).width;
  const srcHeight = (source as any).height;
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
  const targetWidth = Math.max(1, Math.round(srcWidth * ratio));
  const targetHeight = Math.max(1, Math.round(srcHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      blob: file,
      mimeType: file.type || "application/octet-stream",
      extension: (file.name.split(".").pop() || "").toLowerCase() || "jpg",
      width: srcWidth,
      height: srcHeight,
    };
  }

  // Draw with high quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if ("close" in (source as any)) {
    // ImageBitmap path
    // @ts-ignore
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    try { (source as any).close?.(); } catch {}
  } else {
    ctx.drawImage(source as HTMLImageElement, 0, 0, targetWidth, targetHeight);
  }

  const mimeType = format;
  const extension = format === "image/webp" ? "webp" : "jpg";

  // Best-effort size limiting: try decreasing quality if result is larger than target
  const maxFileSize = 500 * 1024; // 500KB
  let q = Math.min(Math.max(quality, 0.1), 0.95);
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), mimeType, q));
    if (!blob) break;
    if (blob.size <= maxFileSize) break;
    q = Math.max(0.2, q * 0.7);
  }

  if (!blob) {
    return { blob: file, mimeType: file.type || mimeType, extension: (file.name.split('.').pop() || '').toLowerCase() || extension, width: srcWidth, height: srcHeight };
  }

  return { blob, mimeType: blob.type || mimeType, extension, width: targetWidth, height: targetHeight };
};
