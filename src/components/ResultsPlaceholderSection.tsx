import React from 'react';
import {
  Sparkles,
  Gauge,
  Focus,
  Sun,
  Moon,
  Camera,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Check,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Cpu,
  Layers,
} from 'lucide-react';
import { ImageFileDetails, QualityAnalysisResult } from '../types';

interface ResultsPlaceholderSectionProps {
  imageDetails: ImageFileDetails;
  analysisResult: QualityAnalysisResult | null;
  isAnalyzing: boolean;
  onReset: () => void;
}

export const ResultsPlaceholderSection: React.FC<ResultsPlaceholderSectionProps> = ({
  imageDetails,
  analysisResult,
  isAnalyzing,
  onReset,
}) => {
  const isPass = analysisResult?.decision === 'PASS';
  const score = analysisResult?.overallScore ?? 0;

  // Circular gauge math (radius = 38, circumference = 2 * PI * 38 ≈ 238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <section
      id="analysis-results-section"
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
      aria-label="Image Quality Analysis Results"
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide uppercase ${
                isAnalyzing
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : isPass
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 text-blue-600 animate-spin" />
                  Analyzing image...
                </>
              ) : isPass ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Verified Quality
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Inspection Complete
                </>
              )}
            </span>
            <span className="text-xs text-slate-500">
              {isAnalyzing ? 'Processing Pixels via Canvas' : 'Client-side Analysis Engine'}
            </span>
          </div>
          <h2 id="results-heading" className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Image Quality Diagnostic Report</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analyzed asset: <span className="text-blue-700 font-semibold">{imageDetails.name}</span>
          </p>
        </div>

        <button
          type="button"
          id="upload-another-btn"
          onClick={onReset}
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          Check another image
        </button>
      </div>

      {/* Engine Status Callout */}
      <div
        id="engine-status-callout"
        className={`mt-6 mb-8 p-4 rounded-xl border flex items-start space-x-3 text-xs ${
          isAnalyzing
            ? 'bg-blue-50/70 border-blue-200 text-blue-900'
            : isPass
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}
      >
        {isAnalyzing ? (
          <Loader2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
        ) : isPass ? (
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-bold">
            {isAnalyzing
              ? 'Analyzing Image: '
              : isPass
              ? 'Quality Assessment Passed: '
              : 'Quality Assessment Flagged: '}
          </span>
          {isAnalyzing
            ? 'Calculating Laplacian edge acutance, luminance distribution, histogram clipping, and native resolution...'
            : isPass
            ? 'Calculations completed directly on image pixel data. All parameters satisfy the minimum submission threshold of 80/100.'
            : 'Calculations completed directly on image pixel data. One or more quality criteria fell below optimal thresholds.'}
        </div>
      </div>

      {/* Primary Highlights: Overall Score & Final PASS/RETAKE Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Overall Quality Score /100 with Animated Circular Gauge */}
        <div
          id="placeholder-overall-score"
          className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between relative overflow-hidden shadow-2xs"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span>Overall Quality Score</span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider ${
                isAnalyzing
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : isPass
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isAnalyzing
                ? 'Calculating...'
                : isPass
                ? 'Passing Score'
                : 'Below Threshold'}
            </span>
          </div>

          <div className="my-3 flex items-center justify-between gap-4">
            {/* Left: Score readout */}
            <div>
              {isAnalyzing ? (
                <div className="flex items-center space-x-2 py-2">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <span className="text-xl font-bold text-slate-500">Calculating...</span>
                </div>
              ) : (
                <div className="flex items-baseline space-x-2">
                  <span
                    className={`text-5xl sm:text-6xl font-black tracking-tight ${
                      isPass ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {analysisResult ? analysisResult.overallScore : '--'}
                  </span>
                  <span className="text-xl font-bold text-slate-400">/ 100</span>
                </div>
              )}
              <span className="text-xs text-slate-500 mt-1 block">
                {isPass ? '✓ Verified above standard (≥80)' : '⚠ Action required (<80)'}
              </span>
            </div>

            {/* Right: Circular Gauge */}
            <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                {/* Background Track */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200"
                  fill="transparent"
                />
                {/* Dynamic Value Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={isAnalyzing ? circumference * 0.4 : strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${
                    isAnalyzing
                      ? 'text-blue-500 animate-pulse'
                      : isPass
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                  }`}
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-slate-900">
                  {isAnalyzing ? '...' : `${score}%`}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Score</span>
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isAnalyzing
                  ? 'bg-blue-500 w-2/3 animate-pulse'
                  : isPass
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
              style={{
                width: isAnalyzing ? '60%' : `${analysisResult?.overallScore || 0}%`,
              }}
            />
          </div>

          <p className="text-xs text-slate-500">
            Weighted calculation: 40% Sharpness + 25% Brightness + 20% Exposure + 15% Resolution.
          </p>
        </div>

        {/* Final PASS or RETAKE status */}
        <div
          id="placeholder-final-status"
          className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between shadow-2xs"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
              {isPass ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              )}
              <span>Final Decision Status</span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border tracking-wider ${
                isAnalyzing
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : isPass
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isAnalyzing
                ? 'Evaluation in Progress'
                : isPass
                ? 'Ready for Submission'
                : 'Action Required'}
            </span>
          </div>

          <div className="my-3">
            {isAnalyzing ? (
              <div className="inline-flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm font-bold tracking-wide">EVALUATING PIXELS...</span>
              </div>
            ) : isPass ? (
              <div className="inline-flex items-center space-x-3 px-5 py-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 shadow-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="text-2xl font-black tracking-wider text-emerald-700">
                  PASS
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-3 px-5 py-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 shadow-xs">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
                <span className="text-2xl font-black tracking-wider text-rose-700">
                  RETAKE
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="text-emerald-700 font-medium">Threshold: PASS (Score ≥ 80)</span>
              <span className="text-rose-700 font-medium">RETAKE (Score &lt; 80)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isPass
                ? 'All mandatory image criteria verified above the minimum acceptance baseline.'
                : 'One or more criteria failed acceptance thresholds. Follow recommendations below.'}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Sharpness, Brightness, Exposure, Resolution */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Core Inspection Attributes</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sharpness */}
          <div
            id="placeholder-sharpness"
            className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Focus className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  analysisResult?.sharpness.classification === 'Sharp'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : analysisResult?.sharpness.classification === 'Acceptable'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {analysisResult ? analysisResult.sharpness.classification : 'Evaluating'}
              </span>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sharpness</h4>
            <div className="text-2xl font-bold text-slate-900 my-2">
              {isAnalyzing ? (
                <span className="text-slate-400">--</span>
              ) : (
                analysisResult?.sharpness.score ?? '--'
              )}{' '}
              <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {analysisResult
                ? `Laplacian var: ${analysisResult.sharpness.variance}. Edge focus and acutance.`
                : 'Laplacian variance convolution across pixel edges.'}
            </p>
          </div>

          {/* Brightness */}
          <div
            id="placeholder-brightness"
            className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  analysisResult?.brightness.classification === 'Good Lighting'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {analysisResult ? analysisResult.brightness.classification : 'Evaluating'}
              </span>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Brightness</h4>
            <div className="text-2xl font-bold text-slate-900 my-2">
              {isAnalyzing ? (
                <span className="text-slate-400">--</span>
              ) : (
                analysisResult?.brightness.score ?? '--'
              )}{' '}
              <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {analysisResult
                ? `Mean luminance: ${analysisResult.brightness.avgLuminance} / 255.`
                : 'Average pixel luminance and illumination level.'}
            </p>
          </div>

          {/* Exposure */}
          <div
            id="placeholder-exposure"
            className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  analysisResult?.exposure.classification === 'Balanced Exposure'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {analysisResult ? analysisResult.exposure.classification : 'Evaluating'}
              </span>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Exposure</h4>
            <div className="text-2xl font-bold text-slate-900 my-2">
              {isAnalyzing ? (
                <span className="text-slate-400">--</span>
              ) : (
                analysisResult?.exposure.score ?? '--'
              )}{' '}
              <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {analysisResult
                ? `Dark: ${analysisResult.exposure.darkClippedPct}% • Bright: ${analysisResult.exposure.brightClippedPct}%.`
                : 'Pixel distribution and highlight/shadow clipping.'}
            </p>
          </div>

          {/* Resolution */}
          <div
            id="placeholder-resolution"
            className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <Maximize2 className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  analysisResult?.resolution.isSufficient
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {analysisResult ? analysisResult.resolution.classification : 'Verified'}
              </span>
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolution</h4>
            <div className="text-lg font-bold text-slate-900 my-2">
              {imageDetails.width && imageDetails.height
                ? `${imageDetails.width} × ${imageDetails.height}`
                : '-- × --'}
              <span className="text-xs font-normal text-slate-400 ml-1">px</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {analysisResult
                ? `${analysisResult.resolution.megapixels} MP • ${
                    analysisResult.resolution.isSufficient
                      ? 'Sufficient for submission'
                      : 'Below standard'
                  }.`
                : 'Native dimensions extracted from image header.'}
            </p>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div id="placeholder-recommendations" className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm sm:text-base mb-2">
          <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span>Actionable Recommendations</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {isPass
            ? 'Evaluation confirmed no critical quality defects. Review findings below:'
            : 'Targeted actions based on real pixel analysis to resolve quality defects:'}
        </p>

        {isAnalyzing ? (
          <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Generating recommendations from calculated metrics...</span>
          </div>
        ) : analysisResult && analysisResult.recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analysisResult.recommendations.map((rec) => {
              const isPositive = rec.severity === 'positive';
              const isCritical = rec.severity === 'critical';

              return (
                <div
                  key={rec.id}
                  id={`recommendation-${rec.id}`}
                  className={`p-4 rounded-xl bg-white border flex items-start space-x-3 transition-all shadow-xs ${
                    isPositive
                      ? 'border-emerald-200 hover:border-emerald-300'
                      : isCritical
                      ? 'border-rose-200 hover:border-rose-300'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isPositive ? (
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : isCritical ? (
                      <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                        {rec.category === 'sharpness' ? (
                          <Focus className="w-4 h-4" />
                        ) : rec.category === 'exposure' ? (
                          <Camera className="w-4 h-4" />
                        ) : rec.id === 'rec-brightness-dark' ? (
                          <Moon className="w-4 h-4" />
                        ) : rec.category === 'brightness' ? (
                          <Sun className="w-4 h-4" />
                        ) : rec.category === 'resolution' ? (
                          <Maximize2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                        {rec.category === 'sharpness' ? (
                          <Focus className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {rec.title}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border tracking-wider ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isCritical
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isPositive ? 'Verified' : isCritical ? 'Attention' : 'Minor'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Image meets all quality criteria and is ready for submission.</span>
          </div>
        )}
      </div>
    </section>
  );
};

