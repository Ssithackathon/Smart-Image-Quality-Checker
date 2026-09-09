import {
  AnalysisHistoryItem,
  ImageFileDetails,
  QualityAnalysisResult,
  PdfDocumentAnalysisResult,
  BatchAnalysisSummary,
} from './types';

const STORAGE_KEY = 'smart_image_quality_history_v1';
export const MAX_HISTORY_ITEMS = 5;

/**
 * Formats an epoch timestamp into a human-friendly date and time.
 */
export function formatAnalysisTimestamp(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date().toLocaleDateString();
  }
}

/**
 * Creates an optimized/compressed small thumbnail (max 140x105 JPEG @ 0.6)
 * to ensure browser localStorage never experiences storage quota issues.
 */
export async function createOptimizedThumbnail(
  imageUrl: string,
  maxWidth = 140,
  maxHeight = 105
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width || 140;
          let height = img.naturalHeight || img.height || 105;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        } catch {
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = imageUrl;
    } catch {
      resolve('');
    }
  });
}

/**
 * Safely reads the analysis history from browser localStorage.
 */
export function getStoredHistory(): AnalysisHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_HISTORY_ITEMS);
  } catch (err) {
    console.warn('Could not read analysis history from localStorage:', err);
    return [];
  }
}

/**
 * Saves an analysis history item to localStorage, keeping strictly the latest 5.
 */
export function saveHistoryItem(item: AnalysisHistoryItem): AnalysisHistoryItem[] {
  try {
    const current = getStoredHistory();
    // Filter out if duplicate ID exists, prepend new item, slice to 5
    const updated = [item, ...current.filter((i) => i.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (quotaError) {
      console.warn('LocalStorage quota exceeded, attempting to save without thumbnails:', quotaError);
      // Strip thumbnails to save space if storage quota is constrained
      const stripped = updated.map((it) => ({ ...it, thumbnailUrl: undefined }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    }
    return updated;
  } catch (err) {
    console.error('Failed to save history item to localStorage:', err);
    return getStoredHistory();
  }
}

/**
 * Clears all saved analysis history from browser localStorage.
 */
export function clearStoredHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear analysis history from localStorage:', err);
  }
}

/**
 * Helper to construct an AnalysisHistoryItem from completed analysis and image details.
 */
export async function createHistoryEntry(
  imageDetails: ImageFileDetails,
  analysisResult: QualityAnalysisResult
): Promise<AnalysisHistoryItem> {
  let thumbnailUrl: string | undefined = undefined;
  if (imageDetails.previewUrl) {
    thumbnailUrl = await createOptimizedThumbnail(imageDetails.previewUrl, 140, 105);
  }

  const timestamp = analysisResult.analyzedAt || Date.now();
  const width = imageDetails.width || analysisResult.resolution.width || 0;
  const height = imageDetails.height || analysisResult.resolution.height || 0;
  const resolutionStr = width && height ? `${width} × ${height}` : `${analysisResult.resolution.megapixels} MP`;

  return {
    id: `history-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    imageName: imageDetails.name || 'Captured Image',
    timestamp,
    formattedDate: formatAnalysisTimestamp(timestamp),
    overallScore: analysisResult.overallScore,
    decision: analysisResult.decision,
    sharpnessScore: analysisResult.sharpness.score,
    brightnessScore: analysisResult.brightness.score,
    exposureScore: analysisResult.exposure.score,
    resolution: resolutionStr,
    thumbnailUrl: thumbnailUrl || undefined,
    analysisResult,
    imageDetails: {
      name: imageDetails.name || 'Captured Image',
      formattedSize: imageDetails.formattedSize || 'N/A',
      width,
      height,
      aspectRatio: imageDetails.aspectRatio,
      mimeType: imageDetails.mimeType || 'image/jpeg',
    },
  };
}

/**
 * Helper to construct an AnalysisHistoryItem from completed multi-page PDF analysis.
 */
export async function createPdfHistoryEntry(
  pdfResult: PdfDocumentAnalysisResult
): Promise<AnalysisHistoryItem> {
  const timestamp = pdfResult.analyzedAt || Date.now();
  const page1 = pdfResult.pageResults[0];
  let thumbnailUrl: string | undefined = undefined;
  if (page1?.thumbnailUrl) {
    thumbnailUrl = await createOptimizedThumbnail(page1.thumbnailUrl, 140, 105);
  }

  const totalP = Math.max(1, pdfResult.totalPages);
  const sharpnessAvg = Math.round(
    pdfResult.pageResults.reduce((sum, p) => sum + p.result.sharpness.score, 0) / totalP
  );
  const brightnessAvg = Math.round(
    pdfResult.pageResults.reduce((sum, p) => sum + p.result.brightness.score, 0) / totalP
  );
  const exposureAvg = Math.round(
    pdfResult.pageResults.reduce((sum, p) => sum + p.result.exposure.score, 0) / totalP
  );

  return {
    id: `pdf-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    imageName: `${pdfResult.fileName} (${pdfResult.totalPages} Pages)`,
    timestamp,
    formattedDate: formatAnalysisTimestamp(timestamp),
    overallScore: pdfResult.overallScore,
    decision: pdfResult.decision,
    sharpnessScore: sharpnessAvg,
    brightnessScore: brightnessAvg,
    exposureScore: exposureAvg,
    resolution: `${pdfResult.totalPages} Pages (Lowest: P.${pdfResult.lowestQualityPage.pageNumber})`,
    thumbnailUrl: thumbnailUrl || page1?.thumbnailUrl || undefined,
    analysisResult: page1?.result || ({} as any),
    imageDetails: {
      name: pdfResult.fileName,
      formattedSize: pdfResult.formattedSize,
      width: page1?.width || 1200,
      height: page1?.height || 1600,
      mimeType: 'application/pdf',
    },
    pdfDocumentResult: pdfResult,
  };
}

/**
 * Helper to construct an AnalysisHistoryItem from completed batch image analysis.
 * Summarizes the entire batch into a single clean entry so it does not flood history.
 */
export async function createBatchHistoryEntry(
  batchSummary: BatchAnalysisSummary
): Promise<AnalysisHistoryItem> {
  const timestamp = batchSummary.timestamp || Date.now();
  let thumbnailUrl: string | undefined = undefined;

  if (batchSummary.bestImage?.thumbnailUrl) {
    thumbnailUrl = await createOptimizedThumbnail(batchSummary.bestImage.thumbnailUrl, 140, 105);
  } else if (batchSummary.items[0]?.previewUrl) {
    thumbnailUrl = await createOptimizedThumbnail(batchSummary.items[0].previewUrl, 140, 105);
  }

  const decision = batchSummary.retakeCount > 0 ? 'RETAKE' : 'PASS';
  const completed = batchSummary.items.filter((i) => i.analysisResult);
  const sharpnessAvg =
    completed.length > 0
      ? Math.round(completed.reduce((acc, i) => acc + (i.analysisResult?.sharpness.score || 0), 0) / completed.length)
      : 0;
  const brightnessAvg =
    completed.length > 0
      ? Math.round(completed.reduce((acc, i) => acc + (i.analysisResult?.brightness.score || 0), 0) / completed.length)
      : 0;
  const exposureAvg =
    completed.length > 0
      ? Math.round(completed.reduce((acc, i) => acc + (i.analysisResult?.exposure.score || 0), 0) / completed.length)
      : 0;

  return {
    id: batchSummary.id,
    imageName: `Batch: ${batchSummary.totalImages} Images (${batchSummary.passedCount} Pass, ${batchSummary.retakeCount} Retake)`,
    timestamp,
    formattedDate: formatAnalysisTimestamp(timestamp),
    overallScore: batchSummary.avgQualityScore,
    decision,
    sharpnessScore: sharpnessAvg,
    brightnessScore: brightnessAvg,
    exposureScore: exposureAvg,
    resolution: `${batchSummary.totalImages} Images • Avg ${batchSummary.avgQualityScore}/100`,
    thumbnailUrl: thumbnailUrl || undefined,
    analysisResult: completed[0]?.analysisResult || ({} as any),
    imageDetails: {
      name: `Batch (${batchSummary.totalImages} images)`,
      formattedSize: `${batchSummary.totalImages} images`,
      width: 0,
      height: 0,
      mimeType: 'image/jpeg',
    },
    batchSummaryResult: batchSummary,
  };
}
