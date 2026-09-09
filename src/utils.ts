import { ImageFileDetails } from './types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const lowerName = file.name.toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png'];

  const matchesType = validTypes.includes(file.type.toLowerCase());
  const matchesExt = validExtensions.some((ext) => lowerName.endsWith(ext));

  return matchesType || matchesExt;
}

export function isPdfFile(file: File): boolean {
  const isTypePdf = file.type === 'application/pdf';
  const isExtPdf = file.name.toLowerCase().endsWith('.pdf');
  return isTypePdf || isExtPdf;
}

export function isValidSupportedFile(file: File): boolean {
  return isValidImageFile(file) || isPdfFile(file);
}

export function getGreatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : getGreatestCommonDivisor(b, a % b);
}

export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return '';
  const gcd = getGreatestCommonDivisor(width, height);
  const ratioW = width / gcd;
  const ratioH = height / gcd;
  
  // If common standard aspect ratios:
  if (ratioW <= 32 && ratioH <= 32) {
    return `${ratioW}:${ratioH}`;
  }
  return `${(width / height).toFixed(2)}:1`;
}

export async function processUploadedFile(file: File): Promise<ImageFileDetails> {
  const previewUrl = URL.createObjectURL(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = calculateAspectRatio(width, height);

      resolve({
        file,
        previewUrl,
        name: file.name,
        sizeBytes: file.size,
        formattedSize: formatFileSize(file.size),
        mimeType: file.type || 'image/jpeg',
        width,
        height,
        aspectRatio,
        uploadTimestamp: Date.now(),
      });
    };

    img.onerror = () => {
      // Fallback if dimensions cannot be decoded
      resolve({
        file,
        previewUrl,
        name: file.name,
        sizeBytes: file.size,
        formattedSize: formatFileSize(file.size),
        mimeType: file.type || 'image/jpeg',
        uploadTimestamp: Date.now(),
      });
    };

    img.src = previewUrl;
  });
}
