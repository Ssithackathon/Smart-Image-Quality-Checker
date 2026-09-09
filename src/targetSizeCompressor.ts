/**
 * Real client-side target file size compressor using the Canvas API.
 * Uses iterative binary search on compression quality and progressive downscaling.
 * Calculates real file sizes using Blob.size.
 */

import { formatFileSize } from './utils';

export type CompressibleFormat = 'image/jpeg' | 'image/webp';

export interface TargetCompressionParams {
  img: HTMLImageElement;
  originalSizeBytes: number;
  targetBytes: number;
  format: CompressibleFormat;
  onProgress?: (status: string, currentStep: number, totalSteps: number) => void;
}

export interface TargetCompressionResult {
  blob: Blob;
  downloadUrl: string;
  actualSizeBytes: number;
  actualSizeFormatted: string;
  targetSizeBytes: number;
  targetSizeFormatted: string;
  originalSizeBytes: number;
  originalSizeFormatted: string;
  spaceSavedBytes: number;
  spaceSavedFormatted: string;
  spaceSavedPercent: number;
  finalWidth: number;
  finalHeight: number;
  finalFormat: CompressibleFormat;
  finalFormatLabel: string;
  qualityUsed: number;
  scaleUsed: number;
  iterationsCount: number;
  isUnrealisticallySmall: boolean;
}

/**
 * Render image to canvas and export to Blob using browser Canvas API.
 */
export function renderCanvasToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: CompressibleFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return reject(new Error('Canvas 2D context unavailable'));
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // For JPEG, fill transparent areas with clean white background
    if (format === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const clampedQuality = Math.min(1, Math.max(0.01, quality));
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode image to Blob'));
        }
      },
      format,
      clampedQuality
    );
  });
}

/**
 * Binary search + progressive downscaling engine to match target file size as closely as possible.
 */
export async function compressToTargetSize({
  img,
  originalSizeBytes,
  targetBytes,
  format,
  onProgress,
}: TargetCompressionParams): Promise<TargetCompressionResult> {
  const origW = img.naturalWidth || 800;
  const origH = img.naturalHeight || 600;

  if (targetBytes <= 0) {
    throw new Error('Target file size must be greater than 0 KB.');
  }

  const isUnrealisticallySmall = targetBytes < 15 * 1024 || targetBytes < originalSizeBytes * 0.02;

  let totalSteps = 12;
  let currentStep = 0;

  const notify = (msg: string) => {
    currentStep++;
    if (onProgress) {
      onProgress(msg, currentStep, totalSteps);
    }
  };

  notify('Analyzing original dimensions and baseline compression...');
  await new Promise((resolve) => setTimeout(resolve, 10));

  let currentScale = 1.0;
  let bestBlob: Blob | null = null;
  let bestDiff = Infinity;
  let bestQuality = 0.8;
  let bestWidth = origW;
  let bestHeight = origH;
  let bestScale = 1.0;
  let iterationsCount = 0;

  // Step 1: Check baseline at scale 1.0 and minimum quality (0.05)
  let curW = Math.max(1, Math.round(origW * currentScale));
  let curH = Math.max(1, Math.round(origH * currentScale));
  let testMinBlob = await renderCanvasToBlob(img, curW, curH, format, 0.05);
  iterationsCount++;

  // Step 2: Progressive downscaling if even minimum quality at 100% scale exceeds target size
  let downscaleTries = 0;
  while (testMinBlob.size > targetBytes * 1.05 && downscaleTries < 6 && (curW > 40 && curH > 40)) {
    downscaleTries++;
    notify(`Progressively adjusting resolution to fit target (${curW} × ${curH} px)...`);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Approximate scale based on area ratio with safety margin
    const areaRatio = targetBytes / testMinBlob.size;
    const estimatedScale = Math.sqrt(areaRatio) * 0.95;
    currentScale = Math.max(0.05, Math.min(currentScale * 0.8, currentScale * estimatedScale));

    curW = Math.max(1, Math.round(origW * currentScale));
    curH = Math.max(1, Math.round(origH * currentScale));

    testMinBlob = await renderCanvasToBlob(img, curW, curH, format, 0.05);
    iterationsCount++;

    const diff = Math.abs(testMinBlob.size - targetBytes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = testMinBlob;
      bestQuality = 0.05;
      bestWidth = curW;
      bestHeight = curH;
      bestScale = currentScale;
    }
  }

  // Step 3: Binary Search on compression quality at currentScale
  notify('Refining compression quality using binary search...');
  await new Promise((resolve) => setTimeout(resolve, 10));

  let lowQ = 0.02;
  let highQ = 0.98;

  for (let i = 0; i < 8; i++) {
    const midQ = (lowQ + highQ) / 2;
    curW = Math.max(1, Math.round(origW * currentScale));
    curH = Math.max(1, Math.round(origH * currentScale));

    const candidateBlob = await renderCanvasToBlob(img, curW, curH, format, midQ);
    iterationsCount++;

    const diff = Math.abs(candidateBlob.size - targetBytes);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = candidateBlob;
      bestQuality = midQ;
      bestWidth = curW;
      bestHeight = curH;
      bestScale = currentScale;
    }

    // If within 1.5% or 400 bytes tolerance of target, stop early
    if (diff / targetBytes < 0.015 || diff < 400) {
      break;
    }

    if (candidateBlob.size < targetBytes) {
      lowQ = midQ;
    } else {
      highQ = midQ;
    }

    notify(`Testing quality ${Math.round(midQ * 100)}% (current: ${formatFileSize(candidateBlob.size)})...`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Step 4: If still larger than target * 1.10, do one more quick downscale round
  if (bestBlob && bestBlob.size > targetBytes * 1.10 && curW > 60 && curH > 60) {
    notify('Fine-tuning dimensions to reach strict target...');
    await new Promise((resolve) => setTimeout(resolve, 10));

    currentScale = Math.max(0.04, currentScale * Math.sqrt(targetBytes / bestBlob.size) * 0.95);
    curW = Math.max(1, Math.round(origW * currentScale));
    curH = Math.max(1, Math.round(origH * currentScale));

    for (const q of [0.5, 0.75, 0.3]) {
      const b = await renderCanvasToBlob(img, curW, curH, format, q);
      iterationsCount++;
      const diff = Math.abs(b.size - targetBytes);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestBlob = b;
        bestQuality = q;
        bestWidth = curW;
        bestHeight = curH;
        bestScale = currentScale;
      }
    }
  }

  if (!bestBlob) {
    // Fallback: guaranteed blob
    bestBlob = await renderCanvasToBlob(img, origW, origH, format, 0.75);
    bestWidth = origW;
    bestHeight = origH;
    bestQuality = 0.75;
    bestScale = 1.0;
  }

  const actualSizeBytes = bestBlob.size;
  const downloadUrl = URL.createObjectURL(bestBlob);
  const spaceSavedBytes = Math.max(0, originalSizeBytes - actualSizeBytes);
  const spaceSavedPercent = originalSizeBytes > 0
    ? Math.max(0, parseFloat(((spaceSavedBytes / originalSizeBytes) * 100).toFixed(1)))
    : 0;

  return {
    blob: bestBlob,
    downloadUrl,
    actualSizeBytes,
    actualSizeFormatted: formatFileSize(actualSizeBytes),
    targetSizeBytes: targetBytes,
    targetSizeFormatted: formatFileSize(targetBytes),
    originalSizeBytes,
    originalSizeFormatted: formatFileSize(originalSizeBytes),
    spaceSavedBytes,
    spaceSavedFormatted: formatFileSize(spaceSavedBytes),
    spaceSavedPercent,
    finalWidth: bestWidth,
    finalHeight: bestHeight,
    finalFormat: format,
    finalFormatLabel: format === 'image/jpeg' ? 'JPG' : 'WEBP',
    qualityUsed: Math.round(bestQuality * 100),
    scaleUsed: Math.round(bestScale * 100),
    iterationsCount,
    isUnrealisticallySmall,
  };
}
