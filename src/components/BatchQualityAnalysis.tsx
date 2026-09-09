import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  Images,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  Download,
  Filter,
  ArrowUpDown,
  Loader2,
  Trash2,
  Maximize2,
  Eye,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  X,
  Gauge,
  Focus,
  Sun,
  Camera,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { BatchImageItem, BatchAnalysisSummary, QualityAnalysisResult } from '../types';
import {
  isSupportedBatchImageFile,
  executeBatchImageAnalysis,
  exportBatchReportCsv,
} from '../batchAnalysisEngine';
import { formatFileSize } from '../utils';
import { generateSampleBatchFiles } from '../sampleImages';

interface BatchQualityAnalysisProps {
  onBackToSingle: () => void;
  onBatchSavedToHistory?: (summary: BatchAnalysisSummary) => void;
  initialSummary?: BatchAnalysisSummary | null;
  initialFiles?: File[] | null;
}

type FilterType = 'all' | 'passed' | 'retake';
type SortType = 'score-desc' | 'score-asc' | 'name-asc';

export const BatchQualityAnalysis: React.FC<BatchQualityAnalysisProps> = ({
  onBackToSingle,
  onBatchSavedToHistory,
  initialSummary = null,
  initialFiles = null,
}) => {
  const [items, setItems] = useState<BatchImageItem[]>(() => initialSummary?.items || []);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeProgress, setActiveProgress] = useState<{
    currentIndex: number;
    total: number;
    percent: number;
    currentItemName: string;
    currentThumbnailUrl?: string;
  } | null>(null);

  const [batchSummary, setBatchSummary] = useState<BatchAnalysisSummary | null>(initialSummary);
  const [selectedDetailItem, setSelectedDetailItem] = useState<BatchImageItem | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('score-desc');
  const [isLoadingSamples, setIsLoadingSamples] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  // Sync if initialSummary changes (e.g., loaded from history)
  useEffect(() => {
    if (initialSummary) {
      setBatchSummary(initialSummary);
      setItems(initialSummary.items);
    }
  }, [initialSummary]);

  // Handle initialFiles passed from drop or navigation
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleAddFiles(initialFiles);
    }
  }, [initialFiles]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [items]);

  const handleAddFiles = (incomingFiles: FileList | File[]) => {
    setWarningMessage(null);
    const fileArray = Array.from(incomingFiles);

    // Filter to supported image types
    const validImages = fileArray.filter(isSupportedBatchImageFile);
    const rejectedCount = fileArray.length - validImages.length;

    if (validImages.length === 0) {
      setWarningMessage(
        rejectedCount > 0
          ? 'Unsupported file formats detected. Please select JPG, JPEG, PNG, or WEBP images.'
          : 'No valid image files found.'
      );
      return;
    }

    const currentTotal = items.length;
    const maxAllowed = 20;
    const availableSlots = maxAllowed - currentTotal;

    if (availableSlots <= 0) {
      setWarningMessage(
        `Batch limit reached (20 images maximum). Please analyze or remove existing images before adding more.`
      );
      return;
    }

    let filesToAdd = validImages;
    let overLimitCount = 0;

    if (validImages.length > availableSlots) {
      overLimitCount = validImages.length - availableSlots;
      filesToAdd = validImages.slice(0, availableSlots);
      setWarningMessage(
        `Batch limit is 20 images. ${overLimitCount} extra ${
          overLimitCount === 1 ? 'file was' : 'files were'
        } not added. Only the first ${availableSlots} were included.`
      );
    } else if (rejectedCount > 0) {
      setWarningMessage(
        `${rejectedCount} non-image or unsupported ${
          rejectedCount === 1 ? 'file was' : 'files were'
        } skipped. Supported formats: JPG, PNG, WEBP.`
      );
    }

    const newItems: BatchImageItem[] = filesToAdd.map((file) => ({
      id: `batch-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      sizeBytes: file.size,
      formattedSize: formatFileSize(file.size),
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));

    setItems((prev) => [...prev, ...newItems]);
    // If we were viewing old summary results, reset to allow new analysis
    if (batchSummary) {
      setBatchSummary(null);
    }
  };

  const handleRemoveItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
    if (selectedDetailItem?.id === id) {
      setSelectedDetailItem(null);
    }
  };

  const handleClearAll = () => {
    items.forEach((it) => {
      if (it.previewUrl && it.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(it.previewUrl);
      }
    });
    setItems([]);
    setBatchSummary(null);
    setSelectedDetailItem(null);
    setWarningMessage(null);
  };

  const handleLoadSampleBatch = async () => {
    setIsLoadingSamples(true);
    setWarningMessage(null);
    try {
      const sampleFiles = await generateSampleBatchFiles();
      handleAddFiles(sampleFiles);
    } catch (err) {
      console.error('Failed to generate sample batch:', err);
      setWarningMessage('Could not load sample images.');
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const handleStartBatchAnalysis = async () => {
    if (items.length === 0 || isAnalyzing) return;

    setIsAnalyzing(true);
    setWarningMessage(null);
    setActiveProgress({
      currentIndex: 1,
      total: items.length,
      percent: 0,
      currentItemName: items[0].name,
      currentThumbnailUrl: items[0].previewUrl,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const summary = await executeBatchImageAnalysis(
        items,
        (prog) => {
          setActiveProgress({
            currentIndex: prog.currentIndex,
            total: prog.total,
            percent: prog.percent,
            currentItemName: prog.currentItemName,
            currentThumbnailUrl: prog.currentThumbnailUrl,
          });
          // Update item statuses live in state
          setItems((prev) =>
            prev.map((it) => {
              if (it.id === prog.currentItemId) {
                return { ...it, status: 'analyzing' };
              }
              return it;
            })
          );
        },
        abortController.signal
      );

      if (!abortController.signal.aborted) {
        setBatchSummary(summary);
        setItems(summary.items);
        if (onBatchSavedToHistory) {
          onBatchSavedToHistory(summary);
        }

        setTimeout(() => {
          resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } catch (err: any) {
      console.error('Batch analysis error:', err);
      setWarningMessage(err?.message || 'Encountered an unexpected error during batch processing.');
    } finally {
      setIsAnalyzing(false);
      setActiveProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelBatch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setActiveProgress(null);
  };

  const handleDownloadCsv = () => {
    if (!batchSummary) return;
    exportBatchReportCsv(batchSummary);
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter
    if (filter === 'passed') {
      result = result.filter(
        (it) => it.status === 'completed' && it.analysisResult?.decision === 'PASS'
      );
    } else if (filter === 'retake') {
      result = result.filter(
        (it) =>
          it.status === 'failed' ||
          (it.status === 'completed' && it.analysisResult?.decision === 'RETAKE')
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'score-desc') {
        const scoreA = a.analysisResult ? a.analysisResult.overallScore : -1;
        const scoreB = b.analysisResult ? b.analysisResult.overallScore : -1;
        return scoreB - scoreA;
      }
      if (sortBy === 'score-asc') {
        const scoreA = a.analysisResult ? a.analysisResult.overallScore : 999;
        const scoreB = b.analysisResult ? b.analysisResult.overallScore : 999;
        return scoreA - scoreB;
      }
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      }
      return 0;
    });

    return result;
  }, [items, filter, sortBy]);

  const passedCount = items.filter(
    (it) => it.status === 'completed' && it.analysisResult?.decision === 'PASS'
  ).length;
  const retakeCount = items.filter(
    (it) =>
      it.status === 'failed' ||
      (it.status === 'completed' && it.analysisResult?.decision === 'RETAKE')
  ).length;

  return (
    <div id="batch-quality-analysis-module" className="space-y-8 animate-in fade-in duration-300 text-slate-800">
      {/* Top Breadcrumb / Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            id="back-to-single-image-btn"
            onClick={onBackToSingle}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-600 transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Single Image Mode</span>
          </button>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Batch Analysis Engine
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Max 20 Images • Real-Time Parallel / Sequential Canvas Diagnostics
            </span>
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-600">
              {items.length} / 20 Images
            </span>
            {!isAnalyzing && (
              <button
                type="button"
                id="batch-clear-all-btn"
                onClick={handleClearAll}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Warning / Error Alert */}
      {warningMessage && (
        <div
          id="batch-warning-alert"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 text-sm animate-in fade-in shadow-2xs"
        >
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-900">Batch Warning</strong>
              <p className="text-xs text-amber-800 mt-0.5">{warningMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 px-2 py-1 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Case 1: Active Progress Tracking View */}
      {isAnalyzing && activeProgress && (
        <div
          id="batch-progress-card"
          className="p-8 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-sm text-center"
        >
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-5 relative shadow-2xs">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <Images className="w-4 h-4 absolute text-blue-700" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 mb-2">
              Batch Pixel Analysis in Progress
            </span>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Analyzing Image {activeProgress.currentIndex} of {activeProgress.total}...
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 mb-5 truncate max-w-xs">
              {activeProgress.currentItemName}
            </p>

            {/* Current thumbnail if available */}
            {activeProgress.currentThumbnailUrl && (
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 mb-5 bg-slate-50 shadow-2xs">
                <img
                  src={activeProgress.currentThumbnailUrl}
                  alt="Analyzing item"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2 border border-slate-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                style={{ width: `${Math.max(5, activeProgress.percent)}%` }}
              />
            </div>

            <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-6">
              <span>
                {activeProgress.currentIndex} / {activeProgress.total} Images Processed
              </span>
              <span className="font-bold text-blue-600">
                {activeProgress.percent}% Complete
              </span>
            </div>

            <button
              type="button"
              id="cancel-batch-analysis-btn"
              onClick={handleCancelBatch}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
              Cancel Batch Analysis
            </button>
          </div>
        </div>
      )}

      {/* Case 2: DropZone & Batch Selection (When no batch results yet and not analyzing) */}
      {!batchSummary && !isAnalyzing && (
        <div className="space-y-6">
          {/* Multi-Image Drag & Drop Area */}
          <div
            id="batch-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleAddFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`relative w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 select-none group focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white shadow-sm overflow-hidden ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[0.995]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="batch-file-upload-input"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }
              }}
              className="sr-only"
              aria-label="Upload multiple images for batch analysis"
            />

            <div className="max-w-md mx-auto flex flex-col items-center">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 border ${
                  isDragOver
                    ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-md'
                    : 'bg-blue-50 border-blue-200 text-blue-600 group-hover:scale-105 shadow-2xs'
                }`}
              >
                <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:scale-105" />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                {isDragOver ? 'Drop multiple images here' : 'Select or drop multiple images at once'}
              </h3>

              <p className="text-xs sm:text-sm text-slate-500 mb-5 max-w-sm">
                Upload up to <strong className="text-slate-800">20 images</strong> (JPG, JPEG, PNG, WEBP) to automatically inspect blur, brightness, exposure, and clarity in batch.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  id="batch-browse-files-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
                >
                  <Images className="w-4 h-4 mr-2" />
                  Select Multiple Images
                </button>

                <button
                  type="button"
                  id="batch-load-sample-btn"
                  disabled={isLoadingSamples}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadSampleBatch();
                  }}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  {isLoadingSamples ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                  )}
                  Load 5 Diverse Samples
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 w-full flex items-center justify-center gap-3 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                  JPG, JPEG, PNG, WEBP
                </span>
                <span className="text-slate-300">•</span>
                <span>Up to 20 images per batch</span>
                <span className="text-slate-300">•</span>
                <span>Client-Side Canvas Engine</span>
              </div>
            </div>
          </div>

          {/* Selected Images Grid Preview */}
          {items.length > 0 && (
            <div
              id="selected-batch-grid-section"
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h3
                    id="selected-images-count-heading"
                    className="text-base sm:text-lg font-bold text-slate-900"
                  >
                    {items.length} {items.length === 1 ? 'Image' : 'Images'} Selected
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review thumbnails below, remove unwanted files, or add more images (max 20).
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {items.length < 20 && (
                    <button
                      type="button"
                      id="add-more-images-btn"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                    >
                      + Add More Images
                    </button>
                  )}

                  <button
                    type="button"
                    id="analyze-all-images-btn"
                    onClick={handleStartBatchAnalysis}
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer active:scale-[0.99]"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span>Analyze All {items.length} Images</span>
                  </button>
                </div>
              </div>

              {/* Thumbnails Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-slate-200 bg-slate-50/80 p-2 overflow-hidden shadow-2xs hover:border-blue-400 transition"
                  >
                    <div className="aspect-4/3 w-full rounded-lg overflow-hidden bg-slate-100 relative mb-2 border border-slate-200/80">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 text-slate-700 shadow-2xs">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveItem(item.id, e)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-white/90 hover:bg-rose-600 text-slate-600 hover:text-white border border-slate-200 transition cursor-pointer shadow-2xs"
                        title="Remove image"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="px-1">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {item.formattedSize}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case 3: Completed Batch Results View */}
      {batchSummary && !isAnalyzing && (
        <div ref={resultsTopRef} id="batch-results-section" className="space-y-8">
          {/* Top Summary Banner */}
          <div
            id="batch-summary-card"
            className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 text-slate-800"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Batch Complete
                  </span>
                  <span className="text-xs text-slate-500">
                    {batchSummary.formattedDate}
                  </span>
                </div>
                <h2
                  id="batch-results-heading"
                  className="text-2xl font-extrabold tracking-tight text-slate-900"
                >
                  Batch Image Quality Results
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Inspection metrics calculated using real pixel variance, luminance, and dynamic range.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  id="download-batch-report-btn"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Download Batch Report (CSV)</span>
                </button>

                <button
                  type="button"
                  id="analyze-new-batch-btn"
                  onClick={handleClearAll}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  <span>Analyze New Batch</span>
                </button>
              </div>
            </div>

            {/* Key Metrics Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div
                id="summary-total-images"
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs"
              >
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Images
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {batchSummary.totalImages}
                </span>
              </div>

              <div
                id="summary-passed-images"
                className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Passed
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">
                  {batchSummary.passedCount}
                </span>
              </div>

              <div
                id="summary-retake-images"
                className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-semibold text-rose-700 uppercase tracking-wider">
                    Retake Required
                  </span>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <span className="text-2xl font-black text-rose-700 mt-1 block">
                  {batchSummary.retakeCount}
                </span>
              </div>

              <div
                id="summary-avg-score"
                className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                    Avg Quality Score
                  </span>
                  <Gauge className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-700 mt-1 flex items-baseline">
                  {batchSummary.avgQualityScore}
                  <span className="text-xs font-semibold text-slate-500 ml-1">/100</span>
                </div>
              </div>
            </div>

            {/* Best & Worst Highlight Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {batchSummary.bestImage && (
                <div
                  id="best-quality-image-card"
                  className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-emerald-200 flex-shrink-0 bg-white">
                      {batchSummary.bestImage.thumbnailUrl ? (
                        <img
                          src={batchSummary.bestImage.thumbnailUrl}
                          alt="Best quality"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-emerald-600 m-auto mt-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        ★ Best Quality Image
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={batchSummary.bestImage.name}>
                        {batchSummary.bestImage.name}
                      </h4>
                    </div>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700 flex-shrink-0">
                    {batchSummary.bestImage.score}/100
                  </span>
                </div>
              )}

              {batchSummary.worstImage && (
                <div
                  id="worst-quality-image-card"
                  className="p-4 rounded-xl bg-rose-50/40 border border-rose-200 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-rose-200 flex-shrink-0 bg-white">
                      {batchSummary.worstImage.thumbnailUrl ? (
                        <img
                          src={batchSummary.worstImage.thumbnailUrl}
                          alt="Lowest quality"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-rose-600 m-auto mt-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        ⚠ Lowest Quality Image
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={batchSummary.worstImage.name}>
                        {batchSummary.worstImage.name}
                      </h4>
                    </div>
                  </div>
                  <span className="text-base font-extrabold text-rose-700 flex-shrink-0">
                    {batchSummary.worstImage.score}/100
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Individual Results Section with Filters and Sorting */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div id="batch-filters" className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  id="filter-all-btn"
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Images ({items.length})
                </button>
                <button
                  type="button"
                  id="filter-passed-btn"
                  onClick={() => setFilter('passed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                    filter === 'passed'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Passed ({passedCount})</span>
                </button>
                <button
                  type="button"
                  id="filter-retake-btn"
                  onClick={() => setFilter('retake')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                    filter === 'retake'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-rose-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  <span>Retake Required ({retakeCount})</span>
                </button>
              </div>

              {/* Sorting Selector */}
              <div className="flex items-center space-x-2 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-500 font-medium">Sort by:</span>
                <select
                  id="batch-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden cursor-pointer shadow-2xs"
                >
                  <option value="score-desc">Highest Quality Score</option>
                  <option value="score-asc">Lowest Quality Score</option>
                  <option value="name-asc">File Name</option>
                </select>
              </div>
            </div>

            {/* Individual Results Grid */}
            <div id="batch-results-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedItems.map((item) => {
                const isFailed = item.status === 'failed';
                const res = item.analysisResult;
                const isPass = res?.decision === 'PASS';
                const isRetake = !isPass;

                return (
                  <div
                    key={item.id}
                    id={`batch-result-card-${item.id}`}
                    onClick={() => {
                      if (res) {
                        setSelectedDetailItem(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (res) setSelectedDetailItem(item);
                      }
                    }}
                    className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer text-left relative flex flex-col justify-between ${
                      isRetake || isFailed
                        ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300 hover:shadow-md'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Top Row: Thumbnail + Name + Status Badge */}
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            {isFailed ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Analysis Failed
                              </span>
                            ) : isPass ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                RETAKE
                              </span>
                            )}

                            {res && (
                              <span className="text-base font-black text-slate-900">
                                {res.overallScore}
                                <span className="text-[10px] font-semibold text-slate-500">/100</span>
                              </span>
                            )}
                          </div>

                          <h3
                            className="text-xs font-bold text-slate-900 truncate"
                            title={item.name}
                          >
                            {item.name}
                          </h3>

                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.formattedSize}
                            {res?.resolution && (
                              <span> • {res.resolution.width} × {res.resolution.height} px</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Analysis Details Badges */}
                      {res ? (
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-slate-100">
                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Sharpness</span>
                            <span className="font-bold text-slate-800 truncate block">
                              {res.sharpness.classification} ({res.sharpness.score})
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Lighting</span>
                            <span className="font-bold text-slate-800 truncate block">
                              {res.brightness.classification}
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Exposure</span>
                            <span className="font-bold text-slate-800 truncate block">
                              {res.exposure.classification}
                            </span>
                          </div>

                          <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-slate-500 block text-[9px] uppercase font-semibold">Resolution</span>
                            <span className="font-bold text-slate-800 truncate block">
                              {res.resolution.megapixels} MP
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          {item.errorMessage || 'Could not decode or analyze image pixels.'}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action */}
                    {res && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold group-hover:text-blue-700">
                        <span>View Full Diagnostics</span>
                        <Eye className="w-3.5 h-3.5 ml-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredAndSortedItems.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                <Filter className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm font-semibold text-slate-800">No images match this filter</p>
                <p className="text-xs text-slate-500 mt-0.5">Try selecting "All Images" to view the full batch.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Diagnostics Inspection Modal */}
      {selectedDetailItem && selectedDetailItem.analysisResult && (
        <div
          id="batch-detail-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            id="batch-detail-modal"
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      selectedDetailItem.analysisResult.decision === 'PASS'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedDetailItem.analysisResult.decision === 'PASS' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    )}
                    {selectedDetailItem.analysisResult.decision}
                  </span>
                  <span className="text-xs text-slate-500">
                    Batch Inspection Detail
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate max-w-md">
                  {selectedDetailItem.name}
                </h3>
              </div>

              <button
                type="button"
                id="close-batch-modal-btn"
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-slate-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Image Preview + Score Gauge */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-6 aspect-4/3 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative">
                <img
                  src={selectedDetailItem.previewUrl}
                  alt={selectedDetailItem.name}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="sm:col-span-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Overall Quality Score
                </span>
                <div className="text-4xl sm:text-5xl font-black text-blue-600">
                  {selectedDetailItem.analysisResult.overallScore}
                  <span className="text-base font-semibold text-slate-500">/100</span>
                </div>
                <p className="text-xs text-slate-600">
                  {selectedDetailItem.analysisResult.decision === 'PASS'
                    ? 'Meets standard thresholds for sharpness, brightness, and resolution.'
                    : 'Requires retake. Edge blur, incorrect exposure, or insufficient lighting was detected.'}
                </p>
              </div>
            </div>

            {/* The 4 Core Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Sharpness */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 flex items-center">
                    <Focus className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Sharpness / Blur Detection
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedDetailItem.analysisResult.sharpness.score}/100
                  </span>
                </div>
                <p className="text-slate-700">
                  Classification: <strong className="text-blue-600">{selectedDetailItem.analysisResult.sharpness.classification}</strong>
                </p>
                <span className="text-[10px] text-slate-500">
                  Laplacian Edge Variance: {selectedDetailItem.analysisResult.sharpness.variance}
                </span>
              </div>

              {/* Brightness */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 flex items-center">
                    <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    Brightness / Luminance
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedDetailItem.analysisResult.brightness.score}/100
                  </span>
                </div>
                <p className="text-slate-700">
                  Classification: <strong className="text-amber-700">{selectedDetailItem.analysisResult.brightness.classification}</strong>
                </p>
                <span className="text-[10px] text-slate-500">
                  Mean Luminance: {selectedDetailItem.analysisResult.brightness.avgLuminance} / 255
                </span>
              </div>

              {/* Exposure */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 flex items-center">
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Exposure Balance
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedDetailItem.analysisResult.exposure.score}/100
                  </span>
                </div>
                <p className="text-slate-700">
                  Classification: <strong className="text-blue-600">{selectedDetailItem.analysisResult.exposure.classification}</strong>
                </p>
                <span className="text-[10px] text-slate-500">
                  Dark Clipped: {selectedDetailItem.analysisResult.exposure.darkClippedPct}% • Bright Clipped: {selectedDetailItem.analysisResult.exposure.brightClippedPct}%
                </span>
              </div>

              {/* Resolution */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 flex items-center">
                    <Maximize2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Resolution Sufficiency
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedDetailItem.analysisResult.resolution.score}/100
                  </span>
                </div>
                <p className="text-slate-700">
                  {selectedDetailItem.analysisResult.resolution.width} × {selectedDetailItem.analysisResult.resolution.height} px ({selectedDetailItem.analysisResult.resolution.megapixels} MP)
                </p>
                <span className="text-[10px] text-slate-500">
                  Rating: {selectedDetailItem.analysisResult.resolution.classification}
                </span>
              </div>
            </div>

            {/* Dynamic Recommendations */}
            {selectedDetailItem.analysisResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Engine Recommendations
                </h4>
                <div className="space-y-2">
                  {selectedDetailItem.analysisResult.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                        rec.severity === 'critical'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : rec.severity === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {rec.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      ) : rec.severity === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <strong className="block font-semibold text-slate-900">{rec.title}</strong>
                        <p className="mt-0.5 leading-relaxed">{rec.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-xs"
              >
                Close Diagnostic View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
