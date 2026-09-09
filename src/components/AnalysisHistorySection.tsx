import React, { useState } from 'react';
import {
  History,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Focus,
  Sun,
  Camera,
  Maximize2,
  AlertCircle,
  X,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { AnalysisHistoryItem } from '../types';

interface AnalysisHistorySectionProps {
  historyItems: AnalysisHistoryItem[];
  activeHistoryId?: string | null;
  onSelectHistoryItem: (item: AnalysisHistoryItem) => void;
  onClearHistory: () => void;
}

export const AnalysisHistorySection: React.FC<AnalysisHistorySectionProps> = ({
  historyItems,
  activeHistoryId,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [inspectItem, setInspectItem] = useState<AnalysisHistoryItem | null>(null);

  const handleConfirmClear = () => {
    onClearHistory();
    setShowClearConfirm(false);
    if (inspectItem) {
      setInspectItem(null);
    }
  };

  return (
    <section
      id="analysis-history-section"
      className="w-full mt-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8"
      aria-labelledby="analysis-history-heading"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <History className="w-4 h-4" />
            </span>
            <h2 id="analysis-history-heading" className="text-xl font-bold tracking-tight text-slate-900">
              Analysis History
            </h2>
            <span
              id="history-count-badge"
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
            >
              {historyItems.length} / 5 saved
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Recent image quality inspections saved locally in your browser (retains up to 5 latest).
          </p>
        </div>

        {/* Clear History Button */}
        {historyItems.length > 0 && (
          <div className="flex items-center">
            {!showClearConfirm ? (
              <button
                type="button"
                id="clear-history-button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition cursor-pointer shadow-2xs"
                title="Clear all saved analysis records"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                <span>Clear History</span>
              </button>
            ) : (
              <div
                id="clear-history-confirm-dialog"
                className="flex items-center space-x-2 p-1.5 pl-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-medium">Clear all records?</span>
                <button
                  type="button"
                  id="confirm-clear-btn"
                  onClick={handleConfirmClear}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition cursor-pointer shadow-xs"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  id="cancel-clear-btn"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-300 transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {historyItems.length === 0 ? (
        <div
          id="history-empty-state"
          className="py-12 px-4 text-center flex flex-col items-center justify-center text-slate-500"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800">No analysis history yet</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Uploaded images and camera captures that you analyze will be automatically saved here for quick comparison.
          </p>
        </div>
      ) : (
        /* History Items List / Cards */
        <div id="history-items-container" className="mt-5 space-y-3">
          {historyItems.map((item, index) => {
            const isPass = item.decision === 'PASS';
            const isActive = activeHistoryId === item.id;

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                onClick={() => onSelectHistoryItem(item)}
                className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectHistoryItem(item);
                  }
                }}
                aria-label={`View analysis for ${item.imageName}, score ${item.overallScore}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Thumbnail & Image Info */}
                  <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={`Thumbnail of ${item.imageName}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-900/80 text-white">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md group-hover:text-blue-600 transition-colors">
                          {item.imageName}
                        </h3>
                        {item.batchSummaryResult && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Batch ({item.batchSummaryResult.totalImages})
                          </span>
                        )}
                        {item.pdfDocumentResult && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            PDF ({item.pdfDocumentResult.totalPages}p)
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            Active in Viewer
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-500">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {item.formattedDate}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {item.resolution}
                        </span>
                      </div>

                      {/* Metric Chips (Sharpness, Brightness, Exposure) */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                          <Focus className="w-3 h-3 mr-1 text-indigo-500" />
                          Sharpness: <strong className="ml-1 text-slate-900">{item.sharpnessScore}/100</strong>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                          <Sun className="w-3 h-3 mr-1 text-amber-500" />
                          Brightness: <strong className="ml-1 text-slate-900">{item.brightnessScore}/100</strong>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                          <Camera className="w-3 h-3 mr-1 text-teal-600" />
                          Exposure: <strong className="ml-1 text-slate-900">{item.exposureScore}/100</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score, Pass/Retake Badge, and Actions */}
                  <div className="flex items-center justify-between md:justify-end space-x-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Score badge */}
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Quality Score
                      </div>
                      <div className="text-xl font-extrabold text-slate-900 leading-tight">
                        {item.overallScore}
                        <span className="text-xs font-semibold text-slate-400">/100</span>
                      </div>
                    </div>

                    {/* PASS or RETAKE Badge */}
                    <div
                      id={`history-badge-${item.id}`}
                      className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border tracking-wide uppercase ${
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

                    {/* Quick View Button */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        id={`quick-inspect-btn-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectItem(item);
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
                        title="Quick Inspect Details in Modal"
                        aria-label="Quick inspect modal"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        id={`load-details-btn-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHistoryItem(item);
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-blue-600 text-white transition cursor-pointer active:scale-98 shadow-2xs"
                        title="Load into main results view"
                      >
                        <span>View Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Inspection Detail Modal */}
      {inspectItem && (
        <div
          id="history-inspect-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setInspectItem(null)}
        >
          <div
            id="history-inspect-modal"
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 p-6 relative animate-in fade-in zoom-in-95 duration-200 text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                {inspectItem.thumbnailUrl && (
                  <img
                    src={inspectItem.thumbnailUrl}
                    alt={inspectItem.imageName}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                  />
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">{inspectItem.imageName}</h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    <span>{inspectItem.formattedDate}</span>
                    <span>•</span>
                    <span className="font-semibold text-blue-600">{inspectItem.resolution}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="close-history-inspect-modal"
                onClick={() => setInspectItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer border border-slate-200 shadow-2xs"
                aria-label="Close detail modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="mt-5 space-y-5">
              {/* Score & Decision Highlight */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall Assessment</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {inspectItem.overallScore}
                    <span className="text-sm font-semibold text-slate-400">/100</span>
                  </div>
                </div>

                <div
                  className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold border tracking-wide uppercase ${
                    inspectItem.decision === 'PASS'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {inspectItem.decision === 'PASS' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                      PASS - Verified Quality
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 mr-1.5 text-rose-600" />
                      RETAKE - Action Required
                    </>
                  )}
                </div>
              </div>

              {/* 4 Pillars Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Sharpness</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectItem.sharpnessScore}/100</div>
                  <div className="text-[11px] font-medium text-blue-600 mt-0.5 truncate">
                    {inspectItem.analysisResult.sharpness.classification}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Brightness</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectItem.brightnessScore}/100</div>
                  <div className="text-[11px] font-medium text-amber-600 mt-0.5 truncate">
                    {inspectItem.analysisResult.brightness.classification}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Exposure</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{inspectItem.exposureScore}/100</div>
                  <div className="text-[11px] font-medium text-teal-600 mt-0.5 truncate">
                    {inspectItem.analysisResult.exposure.classification}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Resolution</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {inspectItem.analysisResult.resolution.score}/100
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                    {inspectItem.analysisResult.resolution.megapixels} MP
                  </div>
                </div>
              </div>

              {/* Recommendations list */}
              {inspectItem.analysisResult.recommendations && inspectItem.analysisResult.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Actionable Recommendations
                  </h4>
                  <div className="space-y-2">
                    {inspectItem.analysisResult.recommendations.map((rec) => (
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
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer border border-slate-200 shadow-2xs"
              >
                Close
              </button>

              <button
                type="button"
                id="modal-load-into-viewer-btn"
                onClick={() => {
                  onSelectHistoryItem(inspectItem);
                  setInspectItem(null);
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                <span>Open in Main Results Viewer</span>
                <ArrowUpRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
