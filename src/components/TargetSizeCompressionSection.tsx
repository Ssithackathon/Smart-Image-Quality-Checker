import React, { useState, useEffect } from 'react';
import {
  FileArchive,
  Download,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import {
  compressToTargetSize,
  CompressibleFormat,
  TargetCompressionResult,
} from '../targetSizeCompressor';
import { formatFileSize } from '../utils';

interface TargetSizeCompressionSectionProps {
  image: {
    file: File;
    name: string;
    originalSizeBytes: number;
    originalSizeFormatted: string;
    originalWidth: number;
    originalHeight: number;
    originalFormatLabel: string;
    mimeType: string;
    imgElement: HTMLImageElement;
  };
}

export const TargetSizeCompressionSection: React.FC<TargetSizeCompressionSectionProps> = ({
  image,
}) => {
  const [targetValue, setTargetValue] = useState<string>('50');
  const [unit, setUnit] = useState<'KB' | 'MB'>('KB');
  const isOriginalPng =
    image.mimeType === 'image/png' ||
    image.name.toLowerCase().endsWith('.png') ||
    image.originalFormatLabel.toUpperCase() === 'PNG';

  const [outputFormat, setOutputFormat] = useState<CompressibleFormat>(
    image.mimeType === 'image/webp' || image.name.toLowerCase().endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'
  );

  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressStep, setProgressStep] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(12);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [compressionResult, setCompressionResult] = useState<TargetCompressionResult | null>(null);

  // Clean up object URLs when result changes or unmounts
  useEffect(() => {
    return () => {
      if (compressionResult?.downloadUrl) {
        URL.revokeObjectURL(compressionResult.downloadUrl);
      }
    };
  }, [compressionResult]);

  // Reset result when image file changes
  useEffect(() => {
    setCompressionResult(null);
    setErrorMessage(null);
    // Suggest appropriate default target based on original size
    if (image.originalSizeBytes > 0) {
      const suggestedKb = Math.max(20, Math.round((image.originalSizeBytes / 1024) * 0.3));
      setTargetValue(suggestedKb.toString());
      setUnit('KB');
    }
  }, [image.file, image.name, image.originalSizeBytes]);

  // Calculate target bytes
  const numericVal = parseFloat(targetValue) || 0;
  const targetBytes = unit === 'MB' ? numericVal * 1024 * 1024 : numericVal * 1024;

  const isUnrealistic =
    numericVal > 0 &&
    (targetBytes < 15 * 1024 || (image.originalSizeBytes > 0 && targetBytes < image.originalSizeBytes * 0.03));

  const handleCompress = async () => {
    setErrorMessage(null);
    if (!numericVal || numericVal <= 0) {
      setErrorMessage('Please enter a valid target file size greater than 0.');
      return;
    }

    setIsCompressing(true);
    setProgressStep(0);
    setProgressStatus('Initializing client-side binary search...');

    try {
      const result = await compressToTargetSize({
        img: image.imgElement,
        originalSizeBytes: image.originalSizeBytes,
        targetBytes,
        format: outputFormat,
        onProgress: (status, current, total) => {
          setProgressStatus(status);
          setProgressStep(current);
          setProgressTotal(total);
        },
      });

      setCompressionResult(result);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Compression failed. Please try a different target size.');
    } finally {
      setIsCompressing(false);
      setProgressStatus('');
    }
  };

  const handleDownload = () => {
    if (!compressionResult) return;

    const baseName = image.name.replace(/\.[^/.]+$/, '');
    const ext = compressionResult.finalFormat === 'image/jpeg' ? 'jpg' : 'webp';
    const targetDescriptor = `${numericVal}${unit.toLowerCase()}`;
    const filename = `${baseName}-${targetDescriptor}.${ext}`;

    const link = document.createElement('a');
    link.href = compressionResult.downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      id="compress-to-target-size-section"
      className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6 text-slate-800"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
              <FileArchive className="w-4 h-4" />
            </div>
            <h2
              id="compress-to-target-size-heading"
              className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
            >
              Compress to Target Size
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Specify an exact target file size in KB or MB. Real-time client-side binary search calibrates quality and resolution to match your goal.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          <span>Original Size:</span>
          <strong id="compress-original-size-badge" className="text-blue-600 font-bold">
            {image.originalSizeFormatted}
          </strong>
        </div>
      </div>

      {/* PNG Guidance Notice */}
      {isOriginalPng && (
        <div
          id="png-compression-notice"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5 shadow-2xs"
        >
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">
              Format Guidance for Lossless PNG
            </p>
            <p className="text-amber-800 leading-relaxed">
              PNG is a lossless format and cannot reliably reach an exact target size without artifacts.
              <strong className="text-amber-900"> Convert to JPG or WEBP for more effective size compression.</strong>
            </p>
          </div>
        </div>
      )}

      {/* Target Size Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
        {/* Input & Unit Selector */}
        <div className="sm:col-span-6 space-y-1.5">
          <label
            htmlFor="target-file-size-input"
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            Target File Size
          </label>
          <div className="flex rounded-xl shadow-2xs overflow-hidden border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            <input
              id="target-file-size-input"
              type="number"
              min="1"
              step="any"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="Example: 50"
              disabled={isCompressing}
              className="w-full px-3.5 py-2.5 bg-transparent text-sm font-bold text-slate-900 focus:outline-hidden"
            />
            <div className="flex border-l border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                id="unit-selector-kb"
                onClick={() => setUnit('KB')}
                disabled={isCompressing}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  unit === 'KB'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KB
              </button>
              <button
                type="button"
                id="unit-selector-mb"
                onClick={() => setUnit('MB')}
                disabled={isCompressing}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  unit === 'MB'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                MB
              </button>
            </div>
          </div>
        </div>

        {/* Output Format Selector */}
        <div className="sm:col-span-6 space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Output Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="target-format-jpg"
              onClick={() => setOutputFormat('image/jpeg')}
              disabled={isCompressing}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                outputFormat === 'image/jpeg'
                  ? 'bg-blue-50/80 border-blue-500 text-blue-700 ring-2 ring-blue-500/20 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span>JPG / JPEG</span>
              {outputFormat === 'image/jpeg' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
            </button>

            <button
              type="button"
              id="target-format-webp"
              onClick={() => setOutputFormat('image/webp')}
              disabled={isCompressing}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                outputFormat === 'image/webp'
                  ? 'bg-blue-50/80 border-blue-500 text-blue-700 ring-2 ring-blue-500/20 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <span>WEBP</span>
              {outputFormat === 'image/webp' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Quick Target Sizes */}
      <div>
        <span className="block text-xs font-medium text-slate-500 mb-1.5">
          Quick Target Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '50 KB', val: '50', u: 'KB' as const },
            { label: '100 KB', val: '100', u: 'KB' as const },
            { label: '200 KB', val: '200', u: 'KB' as const },
            { label: '500 KB', val: '500', u: 'KB' as const },
            { label: '1 MB', val: '1', u: 'MB' as const },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              id={`preset-target-${preset.label.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => {
                setTargetValue(preset.val);
                setUnit(preset.u);
              }}
              disabled={isCompressing}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                targetValue === preset.val && unit === preset.u
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Warning for unrealistically small sizes */}
      {isUnrealistic && (
        <div
          id="unrealistic-size-warning"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2 shadow-2xs"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Target Size Notice</p>
            <p className="text-amber-800 mt-0.5">
              Reaching this target may significantly reduce image quality or resolution.
            </p>
          </div>
        </div>
      )}

      {/* Quality Notice */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
        <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        <span>Reducing file size may reduce image quality and image resolution.</span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          id="target-compression-error"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 shadow-2xs"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Primary Action Button */}
      <div>
        <button
          type="button"
          id="compress-to-target-size-btn"
          disabled={isCompressing || !numericVal || numericVal <= 0}
          onClick={handleCompress}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isCompressing
              ? 'bg-slate-100 text-slate-400 cursor-wait border border-slate-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-[0.99]'
          }`}
        >
          {isCompressing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>
                {progressStatus || 'Compressing to Target Size...'}
              </span>
            </>
          ) : (
            <>
              <FileArchive className="w-5 h-5" />
              <span>Compress to Target Size</span>
            </>
          )}
        </button>
      </div>

      {/* Results Section */}
      {compressionResult && (
        <div
          id="target-compression-result-card"
          className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm space-y-5"
        >
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                Target Compression Finished
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Calibrated across {compressionResult.iterationsCount} client-side passes to match requested target size.
              </p>
            </div>
          </div>

          {/* Statistical Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Requested Target</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {targetValue} {unit}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Actual Final Size</span>
              <span className="text-sm font-bold text-blue-600 mt-0.5 block">
                {compressionResult.actualSizeFormatted}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Original Size</span>
              <span className="text-sm font-bold text-slate-700 mt-0.5 block">
                {compressionResult.originalSizeFormatted}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Space Saved</span>
              <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
                {compressionResult.spaceSavedFormatted} ({compressionResult.spaceSavedPercent}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Reduction</span>
              <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
                {compressionResult.spaceSavedPercent}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Output Format</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {compressionResult.finalFormatLabel}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Final Resolution</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {compressionResult.finalWidth} × {compressionResult.finalHeight} px
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              id="download-compressed-image-btn"
              onClick={handleDownload}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" />
              <span>Download Compressed Image</span>
            </button>

            <span className="text-xs text-slate-500">
              Calibrated Quality: <span className="text-blue-600 font-semibold">{compressionResult.qualityUsed}%</span> • Scale: <span className="text-blue-600 font-semibold">{compressionResult.scaleUsed}%</span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
