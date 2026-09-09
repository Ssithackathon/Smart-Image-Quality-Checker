import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Focus,
  Sun,
  Camera,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { PdfDocumentAnalysisResult, PdfPageAnalysisResult } from '../types';

interface PdfResultsSectionProps {
  pdfResult: PdfDocumentAnalysisResult;
  onReset: () => void;
}

export const PdfResultsSection: React.FC<PdfResultsSectionProps> = ({
  pdfResult,
  onReset,
}) => {
  const [expandedPage, setExpandedPage] = useState<number | null>(null);
  const [inspectPage, setInspectPage] = useState<PdfPageAnalysisResult | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'retake' | 'pass'>('all');

  const isOverallPass = pdfResult.decision === 'PASS';
  const hasAttentionPages = pdfResult.pagesRequiringAttention.length > 0;

  const filteredPages = pdfResult.pageResults.filter((page) => {
    if (filterMode === 'retake') return page.result.decision === 'RETAKE';
    if (filterMode === 'pass') return page.result.decision === 'PASS';
    return true;
  });

  return (
    <section
      id="pdf-analysis-results"
      className="w-full space-y-6 animate-in fade-in duration-300"
      aria-label="Multi-page PDF Analysis Results"
    >
      {/* 1. Executive Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-2xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  PDF Inspection
                </span>
                <span className="text-xs text-slate-500">
                  {pdfResult.formattedSize}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5 break-all">
                {pdfResult.fileName}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div
              id="overall-pdf-decision-badge"
              className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold border tracking-wide uppercase ${
                isOverallPass
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isOverallPass ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                  OVERALL PASS
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 mr-1.5 text-rose-600" />
                  RETAKE REQUIRED
                </>
              )}
            </div>

            <button
              type="button"
              id="analyze-another-pdf-btn"
              onClick={onReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer border border-slate-200 shadow-2xs"
            >
              Analyze Another
            </button>
          </div>
        </div>

        {/* 2. Key Statistical Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
          {/* Metric: Overall Score */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Overall Score
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {pdfResult.overallScore}
              <span className="text-sm font-semibold text-slate-400">/100</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Average across {pdfResult.totalPages} pages
            </div>
          </div>

          {/* Metric: Total Pages */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Pages</span>
              <Layers className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {pdfResult.totalPages}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Sequentially analyzed
            </div>
          </div>

          {/* Metric: Pages Passed */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
              <span>Pages Passed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-1">
              {pdfResult.passedPagesCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Satisfy thresholds
            </div>
          </div>

          {/* Metric: Pages Requiring Retake */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider flex items-center justify-between">
              <span>Requiring Retake</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-3xl font-black text-rose-700 mt-1">
              {pdfResult.retakePagesCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Below criteria
            </div>
          </div>

          {/* Metric: Lowest Quality Page */}
          <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Lowest Quality
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline space-x-1.5">
              <span>Page {pdfResult.lowestQualityPage.pageNumber}</span>
              <span className="text-xs font-semibold text-slate-400">
                ({pdfResult.lowestQualityPage.score}/100)
              </span>
            </div>
            <div className="text-xs text-rose-600 font-medium mt-1 truncate" title={pdfResult.lowestQualityPage.reason}>
              {pdfResult.lowestQualityPage.reason}
            </div>
          </div>
        </div>

        {/* 3. Attention Banner */}
        {hasAttentionPages ? (
          <div
            id="pdf-attention-alert"
            className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-start sm:items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <strong className="font-bold text-rose-900">
                  Pages requiring attention: Page {pdfResult.pagesRequiringAttention.join(', Page ')}
                </strong>
                <p className="text-xs text-rose-700 mt-0.5">
                  These pages contain blur, underexposure, or low resolution that may cause document rejection.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilterMode('retake')}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer self-start sm:self-auto shadow-xs"
            >
              Filter Retake Pages
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        ) : (
          <div
            id="pdf-pass-alert"
            className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3 text-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <strong className="font-bold text-emerald-900">All {pdfResult.totalPages} pages passed quality inspection!</strong>
              <p className="text-xs text-emerald-700 mt-0.5">
                Every page in this document meets or exceeds all sharpness, contrast, and resolution requirements.
              </p>
            </div>
          </div>
        )}

        {/* 4. Overall Recommendation */}
        <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-blue-900">
            <span className="font-bold text-blue-950">Executive Recommendation: </span>
            <span>{pdfResult.summaryRecommendation}</span>
          </div>
        </div>
      </div>

      {/* 5. Page-by-Page Breakdown Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Page-by-Page Quality Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual diagnostics and pixel metrics evaluated for each page of the PDF.
            </p>
          </div>

          {/* Filter buttons */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterMode === 'all' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              All ({pdfResult.totalPages})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('retake')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterMode === 'retake'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'hover:text-rose-600'
              }`}
            >
              Retake ({pdfResult.retakePagesCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pass')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterMode === 'pass'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'hover:text-emerald-700'
              }`}
            >
              Passed ({pdfResult.passedPagesCount})
            </button>
          </div>
        </div>

        {/* Pages List */}
        <div className="mt-6 space-y-4">
          {filteredPages.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No pages match the selected filter.
            </div>
          ) : (
            filteredPages.map((page) => {
              const isPass = page.result.decision === 'PASS';
              const isExpanded = expandedPage === page.pageNumber;
              const isLowest = page.pageNumber === pdfResult.lowestQualityPage.pageNumber;

              return (
                <div
                  key={page.pageNumber}
                  id={`pdf-page-card-${page.pageNumber}`}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isPass
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                      : 'border-rose-200 bg-rose-50/30 hover:border-rose-300 shadow-2xs'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Thumbnail & Page Identifier */}
                    <div className="flex items-start sm:items-center space-x-4 min-w-0">
                      {/* Thumbnail with click-to-enlarge */}
                      <div
                        onClick={() => setInspectPage(page)}
                        className="w-16 h-20 sm:w-20 sm:h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative group flex-shrink-0 cursor-pointer shadow-2xs"
                        title="Click to inspect page full size"
                      >
                        <img
                          src={page.thumbnailUrl}
                          alt={`Thumbnail of Page ${page.pageNumber}`}
                          className="w-full h-full object-contain bg-slate-50"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-5 h-5" />
                        </div>
                        <span className="absolute bottom-1 right-1 text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-900/80 text-white">
                          p.{page.pageNumber}
                        </span>
                      </div>

                      {/* Info & Metrics */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900">
                            Page {page.pageNumber}
                          </h4>
                          {isLowest && pdfResult.totalPages > 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Lowest Quality Page
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-medium">
                            {page.resolutionStr} ({page.result.resolution.megapixels} MP)
                          </span>
                        </div>

                        {/* Pixel Pillar Chips */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                          {/* Sharpness */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-medium ${
                              page.result.sharpness.score >= 70
                                ? 'bg-slate-50 border-slate-200 text-slate-700'
                                : 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                            }`}
                          >
                            <Focus className="w-3.5 h-3.5 mr-1.5 text-indigo-500 flex-shrink-0" />
                            Sharpness: {page.result.sharpness.score}/100 ({page.result.sharpness.classification})
                          </span>

                          {/* Brightness */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-medium ${
                              page.result.brightness.score >= 70
                                ? 'bg-slate-50 border-slate-200 text-slate-700'
                                : 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                            }`}
                          >
                            <Sun className="w-3.5 h-3.5 mr-1.5 text-amber-500 flex-shrink-0" />
                            Brightness: {page.result.brightness.score}/100 ({page.result.brightness.classification})
                          </span>

                          {/* Exposure */}
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-medium ${
                              page.result.exposure.score >= 70
                                ? 'bg-slate-50 border-slate-200 text-slate-700'
                                : 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5 mr-1.5 text-teal-600 flex-shrink-0" />
                            Exposure: {page.result.exposure.score}/100 ({page.result.exposure.classification})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Score, Pass/Retake Badge, Expand button */}
                    <div className="flex items-center justify-between md:justify-end space-x-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {/* Score */}
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">
                          Score
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">
                          {page.result.overallScore}
                          <span className="text-xs font-semibold text-slate-400">/100</span>
                        </div>
                      </div>

                      {/* PASS or RETAKE Badge */}
                      <div
                        className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold border tracking-wide uppercase ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isPass ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            PASS
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                            RETAKE
                          </>
                        )}
                      </div>

                      {/* Toggle Recommendations & Detail Button */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectPage(page)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer shadow-2xs"
                          title="View Full Diagnostics"
                        >
                          Diagnostics
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPage(isExpanded ? null : page.pageNumber)
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
                          aria-label={isExpanded ? 'Collapse recommendations' : 'Expand recommendations'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Recommendations for this specific page */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 animate-in fade-in duration-150">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                        Page {page.pageNumber} Recommendations & Action Items
                      </h5>
                      {page.result.recommendations.length === 0 ? (
                        <p className="text-xs text-slate-500">No issues detected on this page.</p>
                      ) : (
                        <div className="space-y-2">
                          {page.result.recommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className={`p-3 rounded-xl text-xs border ${
                                rec.severity === 'critical'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : rec.severity === 'warning'
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              }`}
                            >
                              <div className="font-semibold">{rec.title}</div>
                              <div className="text-slate-600 mt-0.5">{rec.message}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Full Page Diagnostic Modal */}
      {inspectPage && (
        <div
          id="pdf-page-inspect-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setInspectPage(null)}
        >
          <div
            id="pdf-page-inspect-modal"
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 relative animate-in fade-in zoom-in-95 duration-200 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <img
                  src={inspectPage.thumbnailUrl}
                  alt={`Page ${inspectPage.pageNumber}`}
                  className="w-12 h-16 rounded-lg object-contain bg-slate-50 border border-slate-200"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {pdfResult.fileName} — Page {inspectPage.pageNumber}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Resolution: <span className="font-semibold text-blue-600">{inspectPage.resolutionStr}</span> ({inspectPage.result.resolution.megapixels} MP)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectPage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-slate-200 shadow-2xs"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mt-5 space-y-5">
              {/* Score & Decision */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Page Quality Score</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {inspectPage.result.overallScore}
                    <span className="text-sm font-semibold text-slate-400">/100</span>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold border tracking-wide uppercase ${
                    inspectPage.result.decision === 'PASS'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {inspectPage.result.decision === 'PASS' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                      PAGE PASSED
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-600" />
                      PAGE RETAKE
                    </>
                  )}
                </div>
              </div>

              {/* 4 Pillars Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Sharpness</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectPage.result.sharpness.score}/100</div>
                  <div className="text-[11px] font-medium text-blue-600 mt-0.5 truncate">{inspectPage.result.sharpness.classification}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Brightness</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectPage.result.brightness.score}/100</div>
                  <div className="text-[11px] font-medium text-amber-600 mt-0.5 truncate">{inspectPage.result.brightness.classification}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Exposure</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectPage.result.exposure.score}/100</div>
                  <div className="text-[11px] font-medium text-teal-600 mt-0.5 truncate">{inspectPage.result.exposure.classification}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Resolution</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectPage.result.resolution.score}/100</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{inspectPage.result.resolution.classification}</div>
                </div>
              </div>

              {/* Page Recommendations */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Actionable Recommendations for Page {inspectPage.pageNumber}
                </h4>
                <div className="space-y-2">
                  {inspectPage.result.recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-xl text-xs border ${
                        rec.severity === 'critical'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : rec.severity === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <div className="font-semibold">{rec.title}</div>
                      <div className="text-slate-600 mt-0.5">{rec.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setInspectPage(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer border border-slate-200 shadow-2xs"
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
