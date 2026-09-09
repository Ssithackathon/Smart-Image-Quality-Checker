/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  FileCheck,
  Image as ImageIcon,
  Sun,
  Moon,
  EyeOff,
  Sparkles,
  History,
  FileText,
  AlertCircle,
  XCircle,
  Loader2,
  SlidersHorizontal,
  Images,
} from 'lucide-react';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { ImagePreview } from './components/ImagePreview';
import { ResultsPlaceholderSection } from './components/ResultsPlaceholderSection';
import { CameraCapture } from './components/CameraCapture';
import { AnalysisHistorySection } from './components/AnalysisHistorySection';
import { PdfResultsSection } from './components/PdfResultsSection';
import { ImageToolsPage } from './components/ImageToolsPage';
import { BatchQualityAnalysis } from './components/BatchQualityAnalysis';
import {
  ImageFileDetails,
  QualityAnalysisResult,
  AnalysisHistoryItem,
  PdfDocumentAnalysisResult,
  PdfProcessingProgress,
  BatchAnalysisSummary,
} from './types';
import { processUploadedFile, isPdfFile } from './utils';
import { generateSampleImageFile, SampleImageType } from './sampleImages';
import { analyzeImageQuality } from './analysisEngine';
import {
  processAndAnalyzePdf,
  generateSampleMultiPagePdfFile,
} from './pdfService';
import {
  getStoredHistory,
  saveHistoryItem,
  clearStoredHistory,
  createHistoryEntry,
  createPdfHistoryEntry,
  createBatchHistoryEntry,
} from './historyStorage';

export default function App() {
  const [currentImage, setCurrentImage] = useState<ImageFileDetails | null>(null);
  const [analysisResult, setAnalysisResult] = useState<QualityAnalysisResult | null>(null);
  const [pdfDocumentResult, setPdfDocumentResult] = useState<PdfDocumentAnalysisResult | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<PdfProcessingProgress | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<'checker' | 'tools'>('checker');
  const [checkerMode, setCheckerMode] = useState<'single' | 'batch'>('single');
  const [batchSummary, setBatchSummary] = useState<BatchAnalysisSummary | null>(null);
  const [droppedBatchFiles, setDroppedBatchFiles] = useState<File[] | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(() => getStoredHistory());
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pdfAbortControllerRef = useRef<AbortController | null>(null);

  const handlePdfSelect = async (file: File) => {
    if (currentImage?.previewUrl && currentImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImage.previewUrl);
    }
    setCurrentImage(null);
    setAnalysisResult(null);
    setPdfDocumentResult(null);
    setPdfError(null);
    setIsAnalyzingPdf(true);
    setPdfProgress({
      currentPage: 0,
      totalPages: 1,
      percent: 0,
      statusText: 'Reading and inspecting PDF structure...',
    });

    const abortController = new AbortController();
    pdfAbortControllerRef.current = abortController;

    try {
      const result = await processAndAnalyzePdf(
        file,
        (progress) => {
          setPdfProgress(progress);
        },
        abortController.signal
      );

      setPdfDocumentResult(result);
      setShowResults(true);

      // Automatically save completed PDF analysis to history
      try {
        const historyEntry = await createPdfHistoryEntry(result);
        const updatedHistory = saveHistoryItem(historyEntry);
        setHistory(updatedHistory);
      } catch (histError) {
        console.error('Error saving PDF analysis to history:', histError);
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      console.error('Error analyzing PDF document:', err);
      if (!abortController.signal.aborted) {
        setPdfError(
          err?.message ||
            'Failed to read or analyze the PDF file. Please verify the document is not corrupted or password-protected.'
        );
      }
    } finally {
      setIsAnalyzingPdf(false);
      pdfAbortControllerRef.current = null;
    }
  };

  const handleCancelPdf = () => {
    if (pdfAbortControllerRef.current) {
      pdfAbortControllerRef.current.abort();
      pdfAbortControllerRef.current = null;
    }
    setIsAnalyzingPdf(false);
    setPdfProgress(null);
  };

  const handleFileSelect = async (file: File) => {
    setActiveHistoryId(null);
    setPdfError(null);

    // Check if uploaded file is a PDF
    if (isPdfFile(file)) {
      await handlePdfSelect(file);
      return;
    }

    // Normal image upload flow
    setPdfDocumentResult(null);
    setIsProcessingUpload(true);
    try {
      if (currentImage?.previewUrl && currentImage.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentImage.previewUrl);
      }

      const processed = await processUploadedFile(file);
      setCurrentImage(processed);
      setAnalysisResult(null);
      setShowResults(false);
    } catch (error) {
      console.error('Error processing uploaded file:', error);
      setPdfError('Could not decode the uploaded image file.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleCameraCapture = async (file: File) => {
    setActiveHistoryId(null);
    setPdfDocumentResult(null);
    setPdfError(null);
    setIsCameraOpen(false);
    setIsProcessingUpload(true);
    try {
      if (currentImage?.previewUrl && currentImage.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentImage.previewUrl);
      }

      const processed = await processUploadedFile(file);
      setCurrentImage(processed);

      setShowResults(true);
      setIsAnalyzing(true);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      const result = await analyzeImageQuality(
        processed.previewUrl,
        processed.width,
        processed.height
      );
      setAnalysisResult(result);

      try {
        const historyEntry = await createHistoryEntry(processed, result);
        const updatedHistory = saveHistoryItem(historyEntry);
        setHistory(updatedHistory);
      } catch (histError) {
        console.error('Error saving camera capture to history:', histError);
      }
    } catch (error) {
      console.error('Error during camera capture processing & analysis:', error);
    } finally {
      setIsProcessingUpload(false);
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentImage) return;

    setShowResults(true);
    setIsAnalyzing(true);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const result = await analyzeImageQuality(
        currentImage.previewUrl,
        currentImage.width,
        currentImage.height
      );
      setAnalysisResult(result);

      try {
        const historyEntry = await createHistoryEntry(currentImage, result);
        const updatedHistory = saveHistoryItem(historyEntry);
        setHistory(updatedHistory);
      } catch (histError) {
        console.error('Error saving image analysis to history:', histError);
      }
    } catch (error) {
      console.error('Error during client-side image quality analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    if (currentImage?.previewUrl && currentImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImage.previewUrl);
    }
    handleCancelPdf();
    setActiveHistoryId(null);
    setCurrentImage(null);
    setAnalysisResult(null);
    setPdfDocumentResult(null);
    setPdfError(null);
    setShowResults(false);
  };

  const handleSampleImage = async (type: SampleImageType) => {
    setActiveHistoryId(null);
    setIsProcessingUpload(true);
    try {
      const file = await generateSampleImageFile(type);
      await handleFileSelect(file);
    } catch (err) {
      console.error('Failed to generate sample image:', err);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleSamplePdf = async () => {
    setActiveHistoryId(null);
    setIsProcessingUpload(true);
    try {
      const samplePdf = await generateSampleMultiPagePdfFile();
      await handlePdfSelect(samplePdf);
    } catch (err: any) {
      console.error('Failed to generate sample PDF:', err);
      setPdfError(err?.message || 'Failed to generate sample PDF document');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleBatchSavedToHistory = async (summary: BatchAnalysisSummary) => {
    setBatchSummary(summary);
    try {
      const historyEntry = await createBatchHistoryEntry(summary);
      const updatedHistory = saveHistoryItem(historyEntry);
      setHistory(updatedHistory);
    } catch (histError) {
      console.error('Error saving batch analysis to history:', histError);
    }
  };

  const handleMultipleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setDroppedBatchFiles(fileArray);
    setCheckerMode('batch');
    setCurrentImage(null);
    setPdfDocumentResult(null);
  };

  const handleSelectHistoryItem = (item: AnalysisHistoryItem) => {
    setActiveHistoryId(item.id);
    setPdfError(null);

    if (currentImage?.previewUrl && currentImage.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImage.previewUrl);
    }

    if (item.batchSummaryResult) {
      setCurrentImage(null);
      setPdfDocumentResult(null);
      setAnalysisResult(null);
      setBatchSummary(item.batchSummaryResult);
      setCheckerMode('batch');
      setShowResults(true);
      return;
    }

    setCheckerMode('single');

    if (item.pdfDocumentResult) {
      setCurrentImage(null);
      setAnalysisResult(null);
      setPdfDocumentResult(item.pdfDocumentResult);
      setShowResults(true);
    } else {
      setPdfDocumentResult(null);
      const mockFile = new File([], item.imageName, {
        type: item.imageDetails.mimeType || 'image/jpeg',
      });

      const restoredDetails: ImageFileDetails = {
        file: mockFile,
        previewUrl: item.thumbnailUrl || '',
        name: item.imageName,
        sizeBytes: 0,
        formattedSize: item.imageDetails.formattedSize || 'Archived',
        mimeType: item.imageDetails.mimeType || 'image/jpeg',
        width: item.imageDetails.width,
        height: item.imageDetails.height,
        aspectRatio: item.imageDetails.aspectRatio,
        uploadTimestamp: item.timestamp,
      };

      setCurrentImage(restoredDetails);
      setAnalysisResult(item.analysisResult);
      setShowResults(true);
    }

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleClearHistory = () => {
    clearStoredHistory();
    setHistory([]);
    if (activeHistoryId) {
      setActiveHistoryId(null);
    }
  };

  const hasActiveItem = currentImage !== null || pdfDocumentResult !== null || isAnalyzingPdf || checkerMode === 'batch';

  if (currentPage === 'tools') {
    return (
      <div className="min-h-screen flex flex-col bg-[#050811] text-slate-100 font-sans selection:bg-cyan-900 selection:text-cyan-200 hud-grid">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />
        <ImageToolsPage onBack={() => setCurrentPage('checker')} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50/70 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Subtle professional background gradients and ambient blurred shapes */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[380px] bg-gradient-to-b from-blue-100/35 via-blue-50/20 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/4 -left-24 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-2/3 -right-24 w-96 h-96 bg-indigo-50/40 rounded-full blur-3xl opacity-50" />
      </div>

      <Header currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Dashboard Introduction & Feature Highlights */}
        {!hasActiveItem && (
          <section id="dashboard-intro-banner" className="mb-10 text-center max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs backdrop-blur-xs">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Automated Visual Verification &amp; PDF Engine</span>
              </div>
              <button
                type="button"
                id="main-image-tools-nav-btn"
                onClick={() => setCurrentPage('tools')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 text-xs font-semibold text-blue-700 transition-all duration-200 cursor-pointer shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Image Tools</span>
              </button>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-3.5">
              Ensure flawless submissions before review
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto font-sans">
              Drop single images, IDs, documents, or multi-page PDFs to verify sharpness, illumination, dynamic range, and resolution against strict quality standards.
            </p>

            {/* Workflow Step Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 text-left">
              <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs card-hover-elevation">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center font-bold text-xs mb-2.5">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Upload Asset or PDF</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                  Drag and drop JPG, PNG images or multi-page PDFs up to 25MB.
                </p>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs card-hover-elevation">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center font-bold text-xs mb-2.5">
                  2
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Sequential Page Scan</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                  Evaluates blur, edge sharpness, luminance, and exposure page-by-page.
                </p>
              </div>

              <div className="p-4.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs card-hover-elevation">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-700 flex items-center justify-center font-bold text-xs mb-2.5">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">PASS or RETAKE</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed font-sans">
                  Page-by-page breakdowns with clear retake warnings for problem pages.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Global Error Banner */}
        {pdfError && (
          <div
            id="global-error-alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3 text-sm animate-in fade-in shadow-2xs"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-900">File Analysis Error</strong>
                <p className="text-xs text-rose-700 mt-0.5">{pdfError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-2 py-1 rounded transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mode Selector: Single Image / PDF vs Analyze Multiple Images */}
        <div className="flex items-center justify-center mb-8 font-sans">
          <div
            id="checker-mode-selector"
            className="inline-flex rounded-2xl bg-slate-200/70 p-1 border border-slate-200/80 shadow-2xs"
          >
            <button
              type="button"
              id="mode-single-image-tab"
              onClick={() => {
                setCheckerMode('single');
                setActiveHistoryId(null);
              }}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                checkerMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-inherit" />
              <span>Single Image / PDF</span>
            </button>
            <button
              type="button"
              id="mode-batch-images-tab"
              onClick={() => {
                setCheckerMode('batch');
                setActiveHistoryId(null);
              }}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                checkerMode === 'batch'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Images className="w-4 h-4 text-inherit" />
              <span>Analyze Multiple Images</span>
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                checkerMode === 'batch' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' : 'bg-slate-300/80 text-slate-600'
              }`}>
                Batch
              </span>
            </button>
          </div>
        </div>

        {checkerMode === 'batch' ? (
          <div className="space-y-8">
            <BatchQualityAnalysis
              onBackToSingle={() => setCheckerMode('single')}
              onBatchSavedToHistory={handleBatchSavedToHistory}
              initialSummary={batchSummary}
              initialFiles={droppedBatchFiles}
            />

            {/* Analysis History Section */}
            <AnalysisHistorySection
              historyItems={history}
              activeHistoryId={activeHistoryId}
              onSelectHistoryItem={handleSelectHistoryItem}
              onClearHistory={handleClearHistory}
            />
          </div>
        ) : (
          /* Upload & Workspace Section (Single / PDF) */
          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {/* Case 1: Active PDF Processing with Sequential Progress Bar */}
              {isAnalyzingPdf ? (
                <motion.div
                  key="pdf-progress-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 shadow-sm text-center font-sans"
                >
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-5 relative shadow-xs">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <FileText className="w-4 h-4 absolute text-indigo-400" />
                    </div>

                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 mb-2">
                      Multi-Page PDF Sequential Engine
                    </span>

                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {pdfProgress && pdfProgress.totalPages > 0
                        ? `Analyzing page ${pdfProgress.currentPage} of ${pdfProgress.totalPages}...`
                        : 'Preparing PDF for sequential analysis...'}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 mb-6">
                      {pdfProgress?.statusText || 'Rendering pages into canvas and executing real pixel diagnostics.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2 border border-slate-200">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${pdfProgress?.percent || 5}%` }}
                      />
                    </div>

                    <div className="w-full flex items-center justify-between text-xs text-slate-500 font-medium mb-6">
                      <span>
                        Page {pdfProgress?.currentPage || 0} of {pdfProgress?.totalPages || '...'}
                      </span>
                      <span className="font-bold text-indigo-600">
                        {pdfProgress?.percent || 0}% Complete
                      </span>
                    </div>

                    {pdfProgress && pdfProgress.totalPages > 15 && (
                      <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left">
                        <strong>Large PDF Document ({pdfProgress.totalPages} Pages):</strong> Sequential memory management is active. Canvas buffers are flushed after each page to guarantee browser stability.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCancelPdf}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      Cancel Analysis
                    </button>
                  </div>
                </motion.div>
              ) : !hasActiveItem ? (
                /* Case 2: DropZone & Sample Presets */
                <motion.div
                  key="upload-zone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <DropZone
                    onFileSelect={handleFileSelect}
                    onOpenCamera={() => setIsCameraOpen(true)}
                    onSwitchToBatch={() => setCheckerMode('batch')}
                    onMultipleFilesSelect={handleMultipleFilesSelect}
                    isProcessing={isProcessingUpload}
                  />

                  {/* Quick Sample Presets */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Test with diverse sample assets:
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Instantly test sharpness, blur, lighting, &amp; multi-page PDFs
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Multi-Page PDF Sample */}
                      <button
                        type="button"
                        id="load-sample-pdf-btn"
                        onClick={handleSamplePdf}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50/90 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Sample Multi-Page PDF (3 Pages)
                      </button>

                      <button
                        type="button"
                        id="load-sample-sharp-document-btn"
                        onClick={() => handleSampleImage('sharp-document')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Sharp Document (Pass)
                      </button>

                      <button
                        type="button"
                        id="load-sample-sharp-photo-btn"
                        onClick={() => handleSampleImage('sharp-photo')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Sharp Photo (Pass)
                      </button>

                      <button
                        type="button"
                        id="load-sample-blurry-btn"
                        onClick={() => handleSampleImage('blurry')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                        Blurry Image (Retake)
                      </button>

                      <button
                        type="button"
                        id="load-sample-dark-btn"
                        onClick={() => handleSampleImage('dark')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                      >
                        <Moon className="w-3.5 h-3.5 mr-1.5 text-slate-700" />
                        Dark Image (Retake)
                      </button>

                      <button
                        type="button"
                        id="load-sample-bright-btn"
                        onClick={() => handleSampleImage('bright')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                      >
                        <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                        Overexposed (Retake)
                      </button>

                      <button
                        type="button"
                        id="sample-bar-image-tools-btn"
                        onClick={() => setCurrentPage('tools')}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer sm:ml-auto"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                        Image Tools
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : pdfDocumentResult ? (
                /* Case 3: Completed Multi-Page PDF Results */
                <motion.div
                  key="pdf-results-zone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                  ref={resultsRef}
                >
                  {activeHistoryId && (
                    <div
                      id="history-active-pdf-banner"
                      className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 shadow-2xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <History className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>
                          Viewing archived multi-page report for{' '}
                          <strong className="font-semibold">{pdfDocumentResult.fileName}</strong> ({pdfDocumentResult.totalPages} pages).
                        </span>
                      </div>
                      <button
                        type="button"
                        id="exit-pdf-history-btn"
                        onClick={handleRemoveImage}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold bg-white hover:bg-indigo-100/50 text-indigo-700 border border-indigo-200 transition cursor-pointer self-start sm:self-auto"
                      >
                        Upload New File
                      </button>
                    </div>
                  )}

                  <PdfResultsSection
                    pdfResult={pdfDocumentResult}
                    onReset={handleRemoveImage}
                  />
                </motion.div>
              ) : (
                /* Case 4: Single Image Preview & Results (Existing Image Workflow) */
                <motion.div
                  key="preview-zone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  {currentImage && (
                    <ImagePreview
                      imageDetails={currentImage}
                      onReplaceImage={() => {
                        const input = document.getElementById('file-upload-input-replace') as HTMLInputElement;
                        if (input) input.click();
                      }}
                      onRemoveImage={handleRemoveImage}
                      onAnalyze={handleAnalyze}
                      onOpenCamera={() => setIsCameraOpen(true)}
                      isAnalyzed={showResults}
                      isAnalyzing={isAnalyzing}
                    />
                  )}

                  {/* Hidden input for replacing file directly from preview */}
                  <input
                    type="file"
                    id="file-upload-input-replace"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    aria-label="Replace current file"
                  />

                  {/* Single Image Results */}
                  {showResults && currentImage && (
                    <div ref={resultsRef} className="pt-2 space-y-8">
                      {activeHistoryId && (
                        <div
                          id="history-active-banner"
                          className="mb-4 p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 shadow-2xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <History className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span>
                              Viewing archived diagnostic report for{' '}
                              <strong className="font-semibold text-slate-900">{currentImage.name}</strong> loaded from history.
                            </span>
                          </div>
                          <button
                            type="button"
                            id="exit-history-view-btn"
                            onClick={handleRemoveImage}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg font-semibold bg-white hover:bg-indigo-100/50 text-indigo-700 border border-indigo-200 transition cursor-pointer self-start sm:self-auto"
                          >
                            Check / Upload New Asset
                          </button>
                        </div>
                      )}
                      <ResultsPlaceholderSection
                        imageDetails={currentImage}
                        analysisResult={analysisResult}
                        isAnalyzing={isAnalyzing}
                        onReset={handleRemoveImage}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Analysis History Section */}
            <AnalysisHistorySection
              historyItems={history}
              activeHistoryId={activeHistoryId}
              onSelectHistoryItem={handleSelectHistoryItem}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}
      </main>

      {/* Live Webcam Capture Modal */}
      <CameraCapture
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Footer */}
      <footer id="app-footer" className="w-full border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Smart Image Quality Checker • Real Client-Side Image &amp; PDF Analysis</p>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>JPG • PNG • PDF</span>
            <span>Sequential Page Rendering</span>
            <span>Real Pixel Analysis</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
