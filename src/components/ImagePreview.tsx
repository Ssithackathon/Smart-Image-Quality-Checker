import React from 'react';
import { ImageFileDetails } from '../types';
import { Sparkles, RefreshCw, Trash2, CheckCircle, Loader2, Camera, Cpu } from 'lucide-react';

interface ImagePreviewProps {
  imageDetails: ImageFileDetails;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  onAnalyze: () => void;
  onOpenCamera?: () => void;
  isAnalyzed: boolean;
  isAnalyzing?: boolean;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageDetails,
  onReplaceImage,
  onRemoveImage,
  onAnalyze,
  onOpenCamera,
  isAnalyzed,
  isAnalyzing = false,
}) => {
  return (
    <div
      id="image-preview-container"
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all"
    >
      {/* Top action / status bar */}
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
            {imageDetails.name}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase">
            {imageDetails.mimeType.replace('image/', '')}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenCamera && (
            <button
              type="button"
              id="camera-retake-btn"
              onClick={onOpenCamera}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Use Camera
            </button>
          )}
          <button
            type="button"
            id="replace-image-btn"
            onClick={onReplaceImage}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Replace
          </button>
          <button
            type="button"
            id="remove-image-btn"
            onClick={onRemoveImage}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 bg-white border border-rose-200 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Remove
          </button>
        </div>
      </div>

      {/* Main Preview Visual Frame */}
      <div className="p-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="relative w-full lg:w-3/5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden min-h-[320px] max-h-[480px]">
          <img
            id="uploaded-image-preview"
            src={imageDetails.previewUrl}
            alt={imageDetails.name}
            className="relative z-10 max-h-[440px] w-auto max-w-full object-contain rounded shadow-sm"
          />
        </div>

        {/* Info & Call to Action Column */}
        <div className="w-full lg:w-2/5 flex flex-col justify-between self-stretch">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Image Specifications</span>
              </h4>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                Ready for analysis
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Resolution</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {imageDetails.width && imageDetails.height
                    ? `${imageDetails.width} × ${imageDetails.height} px`
                    : 'Reading...'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">File Size</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {imageDetails.formattedSize}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Format</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {imageDetails.mimeType}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aspect Ratio</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {imageDetails.aspectRatio || 'Auto'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 mb-5">
              <div className="flex items-center space-x-2 text-blue-800 text-xs font-semibold mb-1">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Asset Staged Successfully</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Image loaded in memory. Client-side canvas analysis will evaluate edge sharpness, illumination, exposure, and resolution.
              </p>
            </div>
          </div>

          {/* Prompt 8: Show an "Analyze Image" button after an image is uploaded */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              id="analyze-image-button"
              disabled={isAnalyzing}
              onClick={onAnalyze}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm ${
                isAnalyzing
                  ? 'bg-blue-100 text-blue-700 cursor-wait'
                  : isAnalyzed
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                  <span>Analyzing image pixels...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{isAnalyzed ? 'Re-analyze Image' : 'Analyze Image'}</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 mt-2">
              {isAnalyzing
                ? 'Evaluating sharpness, brightness, exposure, and resolution...'
                : 'Click to start automated pass / retake assessment'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

