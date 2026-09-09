import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { analyzeImageQuality } from './analysisEngine';
import {
  PdfDocumentAnalysisResult,
  PdfPageAnalysisResult,
} from './types';
import { formatFileSize } from './utils';

// Polyfill Promise.try for environments/browsers that don't natively provide it
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function <T>(fn: () => T | PromiseLike<T>): Promise<T> {
    return new Promise((resolve) => resolve(fn()));
  };
}

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    if (pdfWorker) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
    }
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
  }
}

export interface PdfProcessingProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
  statusText: string;
}

/**
 * Validates and analyzes all pages of a PDF sequentially using the real pixel-based image quality engine.
 */
export async function processAndAnalyzePdf(
  file: File,
  onProgress?: (progress: PdfProcessingProgress) => void,
  abortSignal?: AbortSignal
): Promise<PdfDocumentAnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Load document with custom error handling for password & invalid PDFs
  let loadingTask;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/cmaps/',
      cMapPacked: true,
    });

    loadingTask.onPassword = (callback: (password: string | Error) => void) => {
      callback(new Error('PASSWORD_PROTECTED'));
    };
  } catch (err: any) {
    throw new Error(`Failed to initialize PDF reader: ${err?.message || 'Unsupported format'}`);
  }

  let pdfDoc: pdfjsLib.PDFDocumentProxy;
  try {
    pdfDoc = await loadingTask.promise;
  } catch (err: any) {
    const msg = err?.message || '';
    if (err?.name === 'PasswordException' || msg.includes('password') || msg.includes('PASSWORD_PROTECTED')) {
      throw new Error('This PDF file is password protected. Please unlock or remove the password before uploading.');
    }
    if (err?.name === 'InvalidPDFException' || msg.includes('Invalid PDF') || msg.includes('corrupted')) {
      throw new Error('This PDF file appears to be corrupted or is not a valid PDF document.');
    }
    throw new Error(`Could not load PDF document: ${msg || 'Unknown error'}`);
  }

  const totalPages = pdfDoc.numPages;
  if (!totalPages || totalPages < 1) {
    throw new Error('The PDF document contains no readable pages.');
  }

  const pageResults: PdfPageAnalysisResult[] = [];
  let totalScoreSum = 0;

  try {
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      if (abortSignal?.aborted) {
        throw new Error('PDF analysis was cancelled by the user.');
      }

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        percent: Math.round(((pageNum - 0.5) / totalPages) * 100),
        statusText: `Rendering & analyzing page ${pageNum} of ${totalPages}...`,
      });

      // Sequential page rendering with memory protection
      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      // Determine optimal render scale (up to 1600px max dimension for high quality analysis without memory bloat)
      const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height);
      const targetScale = Math.min(2.0, Math.max(1.0, 1500 / Math.max(1, maxDim)));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error(`Failed to initialize canvas for page ${pageNum}.`);
      }

      // Render PDF page into canvas
      await (page.render as any)({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      // Generate optimized page thumbnail for preview (max 240px wide)
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = Math.min(1, 240 / canvas.width);
      thumbCanvas.width = Math.round(canvas.width * thumbScale);
      thumbCanvas.height = Math.round(canvas.height * thumbScale);
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

      // Run existing real pixel-based quality engine
      const qualityResult = await analyzeImageQuality(
        canvas.toDataURL('image/jpeg', 0.85),
        Math.round(viewport.width),
        Math.round(viewport.height)
      );

      const resolutionStr = `${Math.round(viewport.width)} × ${Math.round(viewport.height)}`;

      pageResults.push({
        pageNumber: pageNum,
        thumbnailUrl,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        resolutionStr,
        result: qualityResult,
      });

      totalScoreSum += qualityResult.overallScore;

      // Immediate memory cleanup
      try {
        page.cleanup();
      } catch {
        // ignore
      }
      canvas.width = 1;
      canvas.height = 1;
      thumbCanvas.width = 1;
      thumbCanvas.height = 1;

      onProgress?.({
        currentPage: pageNum,
        totalPages,
        percent: Math.round((pageNum / totalPages) * 100),
        statusText: `Completed analysis for page ${pageNum} of ${totalPages}`,
      });

      // Brief tick to allow UI update & garbage collection
      await new Promise((r) => setTimeout(r, 20));
    }
  } finally {
    try {
      (pdfDoc as any)?.destroy?.();
      (pdfDoc as any)?.cleanup?.();
    } catch {
      // ignore
    }
  }

  // Calculate overall metrics
  const overallScore = Math.round(totalScoreSum / totalPages);
  const passedPages = pageResults.filter((p) => p.result.decision === 'PASS');
  const retakePages = pageResults.filter((p) => p.result.decision === 'RETAKE');

  const pagesRequiringAttention = retakePages.map((p) => p.pageNumber);

  // Overall Decision: PASS only if all pages pass or score is solid
  const overallDecision: 'PASS' | 'RETAKE' =
    retakePages.length === 0 && overallScore >= 70 ? 'PASS' : 'RETAKE';

  // Find worst-quality page
  let lowestPage = pageResults[0];
  for (const page of pageResults) {
    if (page.result.overallScore < lowestPage.result.overallScore) {
      lowestPage = page;
    }
  }

  // Determine reason for lowest page
  let lowestReason = 'General quality deficiencies';
  if (lowestPage.result.sharpness.classification === 'Blurry' || lowestPage.result.sharpness.score < 60) {
    lowestReason = 'Blurry / insufficient optical sharpness';
  } else if (lowestPage.result.brightness.classification === 'Too Dark') {
    lowestReason = 'Severely underexposed / dark lighting';
  } else if (lowestPage.result.brightness.classification === 'Too Bright') {
    lowestReason = 'Overexposed / blown highlights';
  } else if (!lowestPage.result.resolution.isSufficient) {
    lowestReason = 'Low resolution scan';
  }

  // Summary recommendation
  let summaryRecommendation = '';
  if (retakePages.length === 0) {
    summaryRecommendation = `All ${totalPages} pages satisfy clarity, contrast, and resolution criteria for submission.`;
  } else if (retakePages.length === 1) {
    summaryRecommendation = `Most pages meet quality standards. However, Page ${retakePages[0].pageNumber} has ${lowestReason.toLowerCase()} and should be rescanned.`;
  } else {
    summaryRecommendation = `Pages ${pagesRequiringAttention.join(', ')} require attention before submission. Re-scan or re-export these pages with improved lighting and focus.`;
  }

  return {
    fileName: file.name,
    fileSizeBytes: file.size,
    formattedSize: formatFileSize(file.size),
    totalPages,
    overallScore,
    decision: overallDecision,
    passedPagesCount: passedPages.length,
    retakePagesCount: retakePages.length,
    pagesRequiringAttention,
    lowestQualityPage: {
      pageNumber: lowestPage.pageNumber,
      score: lowestPage.result.overallScore,
      decision: lowestPage.result.decision,
      reason: lowestReason,
    },
    summaryRecommendation,
    pageResults,
    analyzedAt: Date.now(),
  };
}

/**
 * Synthesizes a real client-side multi-page PDF (3 pages) for immediate testing:
 * Page 1: Sharp text document (PASS)
 * Page 2: Dark / underexposed document (RETAKE)
 * Page 3: Blurry / low contrast document (RETAKE)
 */
export async function generateSampleMultiPagePdfFile(): Promise<File> {
  // We can construct a valid PDF 1.4 document with 3 distinct pages using raw PDF objects
  // Each page renders text, tables, and graphic elements with varying contrast/sharpness simulation
  const pdfString = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3>> endobj

% Page 1: Sharp Official Document
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj

% Page 2: Dark Underexposed Document
4 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 7 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj

% Page 3: Low Contrast / Blurry Document
5 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R /Resources << /Font << /F1 9 0 R /F2 10 0 R >> >> >> endobj

% Page 1 Contents (Sharp high contrast black on white with clear header and borders)
6 0 obj <</Length 360>> stream
0.98 0.98 0.98 rg 0 0 612 792 re f
0.1 0.2 0.4 rg 50 720 512 40 re f
1 1 1 rg BT /F1 16 Tf 70 735 Td (DOCUMENT QUALITY INSPECTION - PAGE 1 (PASS)) Tj ET
0 0 0 rg BT /F2 11 Tf 50 680 Td (INVOICE NO: INV-2026-0982    DATE: 2026-09-08) Tj ET
0 0 0 rg 50 660 512 1 re f
0 0 0 rg BT /F2 10 Tf 50 630 Td (Recipient: Global Logistics Corp) Tj 50 610 Td (Status: Certified Original Record) Tj 50 580 Td (This page contains crisp, high-frequency high-contrast text typography.) Tj ET
0.2 0.6 0.2 rg 50 530 512 30 re f
1 1 1 rg BT /F1 12 Tf 70 540 Td (Status: All verification seals validated.) Tj ET
endstream
endobj

% Page 2 Contents (Dark / Underexposed simulated with heavy dark wash overlay)
7 0 obj <</Length 340>> stream
0.12 0.12 0.14 rg 0 0 612 792 re f
0.05 0.05 0.06 rg 50 720 512 40 re f
0.35 0.35 0.35 rg BT /F1 14 Tf 70 735 Td (SCANNED ATTACHMENT - PAGE 2 (UNDEREXPOSED)) Tj ET
0.25 0.25 0.28 rg BT /F2 10 Tf 50 680 Td (DARK LIGHTING ARTIFACT DETECTED IN CAMERA SHADOW) Tj 50 650 Td (Mean pixel luminance is severely depressed under threshold.) Tj 50 620 Td (Histogram demonstrates extreme dark-end clipping.) Tj ET
0.08 0.08 0.09 rg 50 540 512 50 re f
endstream
endobj

% Page 3 Contents (Low contrast / degraded simulation with washed out gray on slightly off gray)
8 0 obj <</Length 330>> stream
0.82 0.82 0.80 rg 0 0 612 792 re f
0.75 0.75 0.73 rg 50 720 512 40 re f
0.68 0.68 0.66 rg BT /F1 14 Tf 70 735 Td (DOCUMENT SCAN - PAGE 3 (BLURRY / FAINT)) Tj ET
0.72 0.72 0.70 rg BT /F2 10 Tf 50 680 Td (FAINT TEXT WITH SEVERE EDGE ATTENUATION) Tj 50 650 Td (Laplacian gradient variance falls below sharp threshold.) Tj 50 620 Td (Scanned with optical defocus or motion artifact.) Tj ET
endstream
endobj

9 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>> endobj
10 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj

xref
0 11
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000124 00000 n 
0000000257 00000 n 
0000000392 00000 n 
0000000527 00000 n 
0000000940 00000 n 
0000001333 00000 n 
0000001716 00000 n 
0000001799 00000 n 
trailer <</Size 11 /Root 1 0 R>>
startxref
1875
%%EOF`;

  const bytes = new TextEncoder().encode(pdfString);
  return new File([bytes], 'sample-multi-page-inspection.pdf', {
    type: 'application/pdf',
  });
}
