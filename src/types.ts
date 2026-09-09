export interface ImageFileDetails {
  file: File;
  previewUrl: string;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  mimeType: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  uploadTimestamp: number;
}

export type SupportedFormat = 'image/jpeg' | 'image/png' | 'image/jpg';

export interface QualityRecommendation {
  id: string;
  title: string;
  message: string;
  category: 'sharpness' | 'exposure' | 'brightness' | 'resolution' | 'pass';
  severity: 'critical' | 'warning' | 'positive';
  priority: number;
}

export interface QualityAnalysisResult {
  overallScore: number;
  decision: 'PASS' | 'RETAKE';
  sharpness: {
    score: number;
    variance: number;
    classification: 'Sharp' | 'Acceptable' | 'Slightly Blurry' | 'Blurry';
  };
  brightness: {
    score: number;
    avgLuminance: number; // 0 - 255
    classification: 'Too Dark' | 'Good Lighting' | 'Too Bright';
  };
  exposure: {
    score: number;
    darkClippedPct: number;
    brightClippedPct: number;
    classification: 'Balanced Exposure' | 'Overexposed' | 'Underexposed' | 'High Contrast / Clipped';
  };
  resolution: {
    score: number;
    width: number;
    height: number;
    megapixels: number;
    isSufficient: boolean;
    classification: 'Optimal (Full HD+)' | 'Adequate' | 'Low Resolution';
  };
  recommendations: QualityRecommendation[];
  analyzedAt: number;
}

export type ImageToolFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PdfPageAnalysisResult {
  pageNumber: number;
  thumbnailUrl: string;
  width: number;
  height: number;
  resolutionStr: string;
  result: QualityAnalysisResult;
}

export interface PdfDocumentAnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  formattedSize: string;
  totalPages: number;
  overallScore: number;
  decision: 'PASS' | 'RETAKE';
  passedPagesCount: number;
  retakePagesCount: number;
  pagesRequiringAttention: number[];
  lowestQualityPage: {
    pageNumber: number;
    score: number;
    decision: 'PASS' | 'RETAKE';
    reason: string;
  };
  summaryRecommendation: string;
  pageResults: PdfPageAnalysisResult[];
  analyzedAt: number;
}

export interface PdfProcessingProgress {
  currentPage: number;
  totalPages: number;
  percent: number;
  statusText: string;
}

export interface AnalysisHistoryItem {
  id: string;
  imageName: string;
  timestamp: number;
  formattedDate: string;
  overallScore: number;
  decision: 'PASS' | 'RETAKE';
  sharpnessScore: number;
  brightnessScore: number;
  exposureScore: number;
  resolution: string;
  thumbnailUrl?: string;
  analysisResult: QualityAnalysisResult;
  imageDetails: {
    name: string;
    formattedSize: string;
    width: number;
    height: number;
    aspectRatio?: string;
    mimeType?: string;
  };
  pdfDocumentResult?: PdfDocumentAnalysisResult;
  batchSummaryResult?: BatchAnalysisSummary;
}

export interface BatchImageItem {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  previewUrl: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  errorMessage?: string;
  analysisResult?: QualityAnalysisResult;
  imgWidth?: number;
  imgHeight?: number;
}

export interface BatchAnalysisSummary {
  id: string;
  timestamp: number;
  formattedDate: string;
  totalImages: number;
  passedCount: number;
  retakeCount: number;
  avgQualityScore: number;
  bestImage: {
    name: string;
    score: number;
    thumbnailUrl?: string;
  } | null;
  worstImage: {
    name: string;
    score: number;
    thumbnailUrl?: string;
  } | null;
  items: BatchImageItem[];
}
