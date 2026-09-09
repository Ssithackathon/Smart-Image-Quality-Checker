import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  FileImage,
  ArrowRight,
  Download,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  Lock,
  Unlock,
  Sparkles,
  Layers,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  FileArchive,
} from 'lucide-react';
import { formatFileSize } from '../utils';
import { TargetSizeCompressionSection } from './TargetSizeCompressionSection';

export type OutputImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';

interface ImageToolsPageProps {
  onBack: () => void;
}

interface LoadedImageData {
  file: File;
  previewUrl: string;
  name: string;
  originalSizeBytes: number;
  originalSizeFormatted: string;
  originalWidth: number;
  originalHeight: number;
  originalFormatLabel: string;
  mimeType: string;
  imgElement: HTMLImageElement;
}

interface ConversionResult {
  finalWidth: number;
  finalHeight: number;
  finalFormatMime: OutputImageFormat;
  finalFormatLabel: string;
  finalSizeBytes: number;
  finalSizeFormatted: string;
  downloadUrl: string;
  downloadFileName: string;
  convertedAt: number;
}

export const ImageToolsPage: React.FC<ImageToolsPageProps> = ({ onBack }) => {
  const [image, setImage] = useState<LoadedImageData | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [targetFormat, setTargetFormat] = useState<OutputImageFormat>('image/png');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount or file replacement
  useEffect(() => {
    return () => {
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
      if (conversionResult?.downloadUrl) {
        URL.revokeObjectURL(conversionResult.downloadUrl);
      }
    };
  }, [image, conversionResult]);

  const detectFormatLabel = (mimeType: string, fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mimeType === 'image/png' || ext === 'png') return 'PNG';
    if (mimeType === 'image/webp' || ext === 'webp') return 'WEBP';
    if (mimeType === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') return 'JPG / JPEG';
    return ext.toUpperCase() || 'Image';
  };

  const getFormatExtension = (format: OutputImageFormat): string => {
    switch (format) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      case 'image/png':
      default:
        return 'png';
    }
  };

  const getFormatDisplayName = (format: OutputImageFormat): string => {
    switch (format) {
      case 'image/jpeg':
        return 'JPG / JPEG';
      case 'image/webp':
        return 'WEBP';
      case 'image/png':
        return 'PNG';
    }
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setConversionResult(null);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');

    if (!validTypes.includes(file.type) && !isValidExt) {
      setErrorMessage('Please upload a supported image file (JPG, JPEG, PNG, or WEBP).');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const naturalWidth = img.naturalWidth || 800;
      const naturalHeight = img.naturalHeight || 600;
      const formatLabel = detectFormatLabel(file.type, file.name);

      // Clean up previous image preview URL if existing
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }

      setImage({
        file,
        previewUrl,
        name: file.name,
        originalSizeBytes: file.size,
        originalSizeFormatted: formatFileSize(file.size),
        originalWidth: naturalWidth,
        originalHeight: naturalHeight,
        originalFormatLabel: formatLabel,
        mimeType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        imgElement: img,
      });

      setWidth(naturalWidth);
      setHeight(naturalHeight);

      // Default target format: if original is PNG, default to JPG or WEBP; otherwise default to PNG
      if (file.type === 'image/png' || ext === 'png') {
        setTargetFormat('image/jpeg');
      } else {
        setTargetFormat('image/png');
      }
    };

    img.onerror = () => {
      setErrorMessage('Failed to decode the image file. Please try another image.');
      URL.revokeObjectURL(previewUrl);
    };

    img.src = previewUrl;
  };

  const handleWidthChange = (val: number) => {
    const newWidth = Math.max(1, Math.min(16000, Math.round(val)));
    setWidth(newWidth);

    if (maintainAspectRatio && image) {
      const ratio = image.originalWidth / image.originalHeight;
      const calculatedHeight = Math.max(1, Math.round(newWidth / ratio));
      setHeight(calculatedHeight);
    }
  };

  const handleHeightChange = (val: number) => {
    const newHeight = Math.max(1, Math.min(16000, Math.round(val)));
    setHeight(newHeight);

    if (maintainAspectRatio && image) {
      const ratio = image.originalWidth / image.originalHeight;
      const calculatedWidth = Math.max(1, Math.round(newHeight * ratio));
      setWidth(calculatedWidth);
    }
  };

  const applyScalePreset = (percent: number) => {
    if (!image) return;
    const factor = percent / 100;
    const newW = Math.max(1, Math.round(image.originalWidth * factor));
    const newH = Math.max(1, Math.round(image.originalHeight * factor));
    setWidth(newW);
    setHeight(newH);
  };

  const handleConvertAndDownload = async () => {
    if (!image) return;
    setIsConverting(true);
    setErrorMessage(null);

    // Yield to allow UI to show loading state
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to initialize 2D canvas context.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // If converting to JPEG, transparent areas in PNG/WEBP must be drawn over a clean white background
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw the resized source image
      ctx.drawImage(image.imgElement, 0, 0, width, height);

      // Convert to blob using HTML5 Canvas API
      const quality = targetFormat === 'image/png' ? undefined : 0.92;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          targetFormat,
          quality
        );
      });

      if (!blob) {
        throw new Error('Canvas conversion failed to produce an image Blob.');
      }

      // Revoke prior conversion URL if existing
      if (conversionResult?.downloadUrl) {
        URL.revokeObjectURL(conversionResult.downloadUrl);
      }

      const downloadUrl = URL.createObjectURL(blob);
      const ext = getFormatExtension(targetFormat);
      const baseName = image.name.replace(/\.[^/.]+$/, '');
      const isFormatChanged = detectFormatLabel(image.mimeType, image.name).toLowerCase() !== getFormatDisplayName(targetFormat).toLowerCase();
      const downloadFileName = isFormatChanged
        ? `${baseName}-converted.${ext}`
        : `${baseName}-resized.${ext}`;

      // Automatically trigger the download
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = downloadFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setConversionResult({
        finalWidth: width,
        finalHeight: height,
        finalFormatMime: targetFormat,
        finalFormatLabel: getFormatDisplayName(targetFormat),
        finalSizeBytes: blob.size,
        finalSizeFormatted: formatFileSize(blob.size),
        downloadUrl,
        downloadFileName,
        convertedAt: Date.now(),
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred during image conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  const loadSampleImage = () => {
    // Generate a high quality synthetic test image
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#4338ca');
    grad.addColorStop(1, '#065f46');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Decorative shapes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(300, 360, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(980, 260, 120, 0, Math.PI * 2);
    ctx.fill();

    // Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('Sample Test Image', 360, 340);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('1280 × 720 High-Resolution Canvas Asset', 360, 385);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'sample-test-asset.png', { type: 'image/png' });
        handleFile(file);
      }
    }, 'image/png');
  };

  return (
    <div id="image-tools-page" className="min-h-screen bg-slate-50 flex flex-col text-slate-800 pb-20">
      {/* Top Banner Navigation Bar */}
      <div className="w-full bg-white/95 border-b border-slate-200 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            type="button"
            id="back-to-quality-checker-btn"
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600" />
            <span>Back to Image Quality Checker</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Client-Side Tools
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h1 id="image-tools-heading" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Image Tools: Compress, Resize &amp; Convert
            </h1>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Compress images to an exact target file size (KB / MB), resize pixel dimensions, and convert seamlessly between JPG, PNG, and WEBP formats directly in your browser.
          </p>
        </div>

        {errorMessage && (
          <div
            id="tools-error-alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2.5 shadow-2xs"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-900">Action could not be completed</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Upload Zone (if no image loaded) */}
        {!image ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 shadow-sm text-center relative overflow-hidden">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-14 flex flex-col items-center justify-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 scale-[0.99] shadow-xs'
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Upload image to resize or convert
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6">
                Drag and drop your image here, or browse files from your computer. Supported formats: JPG, JPEG, PNG, and WEBP.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  id="tools-browse-button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer"
                >
                  Select Image File
                </button>
                <button
                  type="button"
                  id="tools-sample-image-button"
                  onClick={loadSampleImage}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-2xs transition cursor-pointer"
                >
                  Load Sample Image
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                aria-label="Upload image to resize and convert"
              />

              <div className="mt-6 flex items-center space-x-2 text-xs font-medium text-slate-400">
                <FileImage className="w-3.5 h-3.5 text-blue-600" />
                <span>Accepted formats: JPG, JPEG, PNG, WEBP • Fast client-side conversion</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Image Tool Workspace */
          <div className="space-y-8">
            {/* Top Workspace Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <img
                    src={image.previewUrl}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {image.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-blue-600">{image.originalFormatLabel}</span>
                    <span>•</span>
                    <span>{image.originalSizeFormatted}</span>
                    <span>•</span>
                    <span>{image.originalWidth} × {image.originalHeight} px</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  type="button"
                  id="tools-replace-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                >
                  Choose Different Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFile(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  aria-label="Replace image file"
                />
              </div>
            </div>

            {/* Grid of Image Information & Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Image Information & Visual Preview */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
                    <FileImage className="w-4 h-4 text-blue-600" />
                    <span>Image Information</span>
                  </h2>

                  {/* Visual Preview */}
                  <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-2 mb-5">
                    <img
                      src={image.previewUrl}
                      alt={image.name}
                      className="max-h-64 max-w-full rounded-lg object-contain shadow-2xs"
                    />
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/80 text-white text-[11px] font-semibold">
                      {image.originalWidth} × {image.originalHeight}
                    </div>
                  </div>

                  {/* Metadata Table */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500">File Name</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={image.name}>
                        {image.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500">Original File Size</span>
                      <span className="font-semibold text-blue-600">
                        {image.originalSizeFormatted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500">Original Width</span>
                      <span className="font-semibold text-slate-800">
                        {image.originalWidth} px
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500">Original Height</span>
                      <span className="font-semibold text-slate-800">
                        {image.originalHeight} px
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500">Original Format</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {image.originalFormatLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Target Compression, Resize & Format Conversion Settings */}
              <div className="lg:col-span-7 space-y-6">
                {/* Compress to Target Size Feature Section */}
                <TargetSizeCompressionSection image={image} />

                {/* Resize Feature Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                      <span>Resize Feature</span>
                    </h2>

                    {/* Maintain Aspect Ratio Toggle */}
                    <button
                      type="button"
                      id="maintain-aspect-ratio-toggle"
                      onClick={() => setMaintainAspectRatio(!maintainAspectRatio)}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        maintainAspectRatio
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {maintainAspectRatio ? (
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Maintain Aspect Ratio ({maintainAspectRatio ? 'On' : 'Off'})</span>
                    </button>
                  </div>

                  {/* Width and Height Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="resize-width-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Width (pixels)
                      </label>
                      <div className="relative">
                        <input
                          id="resize-width-input"
                          type="number"
                          min="1"
                          max="16000"
                          value={width || ''}
                          onChange={(e) => handleWidthChange(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold text-slate-900 transition"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs text-slate-400">
                          px
                        </span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="resize-height-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Height (pixels)
                      </label>
                      <div className="relative">
                        <input
                          id="resize-height-input"
                          type="number"
                          min="1"
                          max="16000"
                          value={height || ''}
                          onChange={(e) => handleHeightChange(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold text-slate-900 transition"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs text-slate-400">
                          px
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Options */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">
                      Quick Scaling Presets:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Original Size', percent: 100 },
                        { label: '75%', percent: 75 },
                        { label: '50%', percent: 50 },
                        { label: '25%', percent: 25 },
                      ].map((preset) => {
                        const isCurrent =
                          width === Math.round(image.originalWidth * (preset.percent / 100)) &&
                          height === Math.round(image.originalHeight * (preset.percent / 100));
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            id={`preset-scale-${preset.percent}`}
                            onClick={() => applyScalePreset(preset.percent)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border text-center ${
                              isCurrent
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Format Conversion Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Format Conversion</span>
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Select the target output container format. Real Canvas API processing guarantees clean conversion.
                  </p>

                  <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Convert To
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        mime: 'image/jpeg' as OutputImageFormat,
                        title: 'JPG / JPEG',
                        desc: 'Universal photo format, minimal size',
                        badge: 'Compatible',
                      },
                      {
                        mime: 'image/png' as OutputImageFormat,
                        title: 'PNG',
                        desc: 'Lossless graphic compression with alpha',
                        badge: 'Lossless',
                      },
                      {
                        mime: 'image/webp' as OutputImageFormat,
                        title: 'WEBP',
                        desc: 'Next-gen modern web compression',
                        badge: 'Next-Gen',
                      },
                    ].map((fmt) => {
                      const isSelected = targetFormat === fmt.mime;
                      return (
                        <button
                          key={fmt.mime}
                          type="button"
                          id={`format-selector-${fmt.title.replace(/\s+|\//g, '-').toLowerCase()}`}
                          onClick={() => setTargetFormat(fmt.mime)}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-2xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm text-slate-900">{fmt.title}</span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{fmt.desc}</p>
                          </div>
                          <span className={`mt-3 text-[10px] font-semibold px-2 py-0.5 rounded border self-start ${
                            isSelected
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {fmt.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pre-Conversion Summary Details Card */}
                <div
                  id="pre-conversion-summary"
                  className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-2xs"
                >
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Summary Before Conversion
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[11px] text-slate-500">Original Dimensions</span>
                      <span className="font-semibold text-slate-900">
                        {image.originalWidth} × {image.originalHeight} px
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[11px] text-slate-500">New Dimensions</span>
                      <span className="font-semibold text-blue-600">
                        {width} × {height} px
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[11px] text-slate-500">Original Format</span>
                      <span className="font-semibold text-slate-900">
                        {image.originalFormatLabel}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="block text-[11px] text-slate-500">Selected Output</span>
                      <span className="font-semibold text-blue-600">
                        {getFormatDisplayName(targetFormat)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span>Original Size: <strong className="text-slate-800">{image.originalSizeFormatted}</strong></span>
                    <span>
                      Dimension Delta:{' '}
                      <strong className="text-blue-600">
                        {Math.round((width / image.originalWidth) * 100)}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Primary Action Button: Convert & Download */}
                <div>
                  <button
                    type="button"
                    id="convert-and-download-button"
                    disabled={isConverting}
                    onClick={handleConvertAndDownload}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                      isConverting
                        ? 'bg-slate-100 text-slate-400 cursor-wait border border-slate-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-[0.99]'
                    }`}
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Converting &amp; Generating File...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Convert &amp; Download</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-500 mt-2">
                    Applies custom resolution, performs client-side format conversion, and initiates immediate browser download.
                  </p>
                </div>

                {/* Result Details (Displayed After Conversion) */}
                {conversionResult && (
                  <div
                    id="conversion-result-card"
                    className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-sm"
                  >
                    <div className="flex items-start space-x-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">
                          Conversion Completed Successfully!
                        </h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          File <span className="font-semibold text-emerald-900">{conversionResult.downloadFileName}</span> has been downloaded.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                        <span className="block text-[11px] text-slate-500">Final Dimensions</span>
                        <span className="text-sm font-bold text-slate-900">
                          {conversionResult.finalWidth} × {conversionResult.finalHeight} px
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                        <span className="block text-[11px] text-slate-500">Final Format</span>
                        <span className="text-sm font-bold text-slate-900">
                          {conversionResult.finalFormatLabel}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                        <span className="block text-[11px] text-slate-500">Actual Final File Size</span>
                        <span className="text-sm font-bold text-blue-600">
                          {conversionResult.finalSizeFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                      <a
                        id="download-again-btn"
                        href={conversionResult.downloadUrl}
                        download={conversionResult.downloadFileName}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Again
                      </a>

                      <button
                        type="button"
                        id="convert-another-image-btn"
                        onClick={() => {
                          setConversionResult(null);
                          fileInputRef.current?.click();
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Convert Another Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
