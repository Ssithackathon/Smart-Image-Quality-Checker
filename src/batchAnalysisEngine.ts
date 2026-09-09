import { BatchImageItem, BatchAnalysisSummary, QualityAnalysisResult } from './types';
import { analyzeImageQuality } from './analysisEngine';
import { formatFileSize } from './utils';

export interface BatchProgressCallback {
  (progress: {
    currentIndex: number;
    total: number;
    percent: number;
    currentItemName: string;
    currentItemId: string;
    currentThumbnailUrl?: string;
  }): void;
}

/**
 * Validates whether a file is a supported image for batch processing (JPG, JPEG, PNG, WEBP).
 */
export function isSupportedBatchImageFile(file: File): boolean {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const nameLower = file.name.toLowerCase();
  const hasValidExt = validExtensions.some((ext) => nameLower.endsWith(ext));
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const hasValidMime = validMimes.includes(file.type.toLowerCase());
  return hasValidExt || hasValidMime;
}

/**
 * Loads a File into an HTMLImageElement to obtain dimensions and prepare for analysis.
 */
function loadImageFromFile(file: File): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      resolve({ img, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image "${file.name}". File may be corrupted or unsupported.`));
    };

    img.src = objectUrl;
  });
}

/**
 * Executes batch image quality analysis on an array of BatchImageItems.
 * Runs sequentially with brief non-blocking yields to avoid freezing the UI.
 * Reuses the real pixel analysis engine for every image.
 * If one image fails, it is marked as failed without interrupting the batch.
 */
export async function executeBatchImageAnalysis(
  items: BatchImageItem[],
  onProgress?: BatchProgressCallback,
  signal?: AbortSignal
): Promise<BatchAnalysisSummary> {
  const total = items.length;
  const processedItems: BatchImageItem[] = [...items];

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      break;
    }

    const item = processedItems[i];
    item.status = 'analyzing';

    const percent = Math.round((i / total) * 100);
    if (onProgress) {
      onProgress({
        currentIndex: i + 1,
        total,
        percent,
        currentItemName: item.name,
        currentItemId: item.id,
        currentThumbnailUrl: item.previewUrl,
      });
    }

    // Brief async yield so UI renders progress bar update
    await new Promise((resolve) => setTimeout(resolve, 35));

    if (signal?.aborted) {
      item.status = 'pending';
      break;
    }

    try {
      // 1. Load image and determine dimensions
      const { img, width, height } = await loadImageFromFile(item.file);
      item.imgWidth = width;
      item.imgHeight = height;

      // 2. Run the REAL pixel-based image analysis engine
      const analysisResult: QualityAnalysisResult = await analyzeImageQuality(img, width, height);

      item.status = 'completed';
      item.analysisResult = analysisResult;
    } catch (err: any) {
      console.warn(`Error analyzing batch image "${item.name}":`, err);
      item.status = 'failed';
      item.errorMessage = err?.message || 'Image analysis failed';
    }

    // Final percent for this item
    const completedPercent = Math.round(((i + 1) / total) * 100);
    if (onProgress) {
      onProgress({
        currentIndex: i + 1,
        total,
        percent: completedPercent,
        currentItemName: item.name,
        currentItemId: item.id,
        currentThumbnailUrl: item.previewUrl,
      });
    }

    // Give browser a micro-tick to perform garbage collection and event loops
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  // Calculate summary metrics
  const completedItems = processedItems.filter((it) => it.status === 'completed' && it.analysisResult);
  const passedItems = completedItems.filter((it) => it.analysisResult?.decision === 'PASS');
  const retakeItems = completedItems.filter((it) => it.analysisResult?.decision === 'RETAKE');

  const totalScore = completedItems.reduce((acc, it) => acc + (it.analysisResult?.overallScore || 0), 0);
  const avgQualityScore = completedItems.length > 0 ? Math.round(totalScore / completedItems.length) : 0;

  // Find best and worst images among completed
  let bestImage: BatchAnalysisSummary['bestImage'] = null;
  let worstImage: BatchAnalysisSummary['worstImage'] = null;

  if (completedItems.length > 0) {
    const sorted = [...completedItems].sort(
      (a, b) => (b.analysisResult?.overallScore || 0) - (a.analysisResult?.overallScore || 0)
    );

    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    bestImage = {
      name: best.name,
      score: best.analysisResult!.overallScore,
      thumbnailUrl: best.previewUrl,
    };

    worstImage = {
      name: worst.name,
      score: worst.analysisResult!.overallScore,
      thumbnailUrl: worst.previewUrl,
    };
  }

  const now = Date.now();
  const summary: BatchAnalysisSummary = {
    id: `batch-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    formattedDate: new Date(now).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    totalImages: items.length,
    passedCount: passedItems.length,
    retakeCount: retakeItems.length + (items.length - completedItems.length), // failed images count as retake required
    avgQualityScore,
    bestImage,
    worstImage,
    items: processedItems,
  };

  return summary;
}

/**
 * Escapes a field for CSV export.
 */
function escapeCsv(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and triggers download of a CSV report containing actual calculated analysis results.
 */
export function exportBatchReportCsv(summary: BatchAnalysisSummary): void {
  const headers = [
    'File Name',
    'Quality Score',
    'Decision',
    'Sharpness Score',
    'Sharpness Classification',
    'Brightness Score',
    'Brightness Classification',
    'Exposure Score',
    'Exposure Classification',
    'Resolution',
    'Resolution Classification',
  ];

  const rows = summary.items.map((item) => {
    if (item.status === 'completed' && item.analysisResult) {
      const res = item.analysisResult;
      const resStr = `${res.resolution.width}x${res.resolution.height}`;
      return [
        escapeCsv(item.name),
        escapeCsv(res.overallScore),
        escapeCsv(res.decision),
        escapeCsv(res.sharpness.score),
        escapeCsv(res.sharpness.classification),
        escapeCsv(res.brightness.score),
        escapeCsv(res.brightness.classification),
        escapeCsv(res.exposure.score),
        escapeCsv(res.exposure.classification),
        escapeCsv(resStr),
        escapeCsv(res.resolution.classification),
      ].join(',');
    } else {
      return [
        escapeCsv(item.name),
        escapeCsv('N/A'),
        escapeCsv(item.status === 'failed' ? 'FAILED' : 'PENDING'),
        escapeCsv('N/A'),
        escapeCsv('Analysis Failed / Unreadable'),
        escapeCsv('N/A'),
        escapeCsv('N/A'),
        escapeCsv('N/A'),
        escapeCsv('N/A'),
        escapeCsv(item.imgWidth && item.imgHeight ? `${item.imgWidth}x${item.imgHeight}` : 'Unknown'),
        escapeCsv('N/A'),
      ].join(',');
    }
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'batch-image-quality-report.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
