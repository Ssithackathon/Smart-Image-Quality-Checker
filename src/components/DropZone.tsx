import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  AlertCircle,
  FileCheck2,
  Camera,
  FileText,
  Images,
  Sparkles,
  Scan,
} from 'lucide-react';
import { isValidSupportedFile } from '../utils';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  onOpenCamera?: () => void;
  onSwitchToBatch?: () => void;
  onMultipleFilesSelect?: (files: FileList | File[]) => void;
  isProcessing?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  onOpenCamera,
  onSwitchToBatch,
  onMultipleFilesSelect,
  isProcessing = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setErrorMessage(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files.length > 1 && onMultipleFilesSelect) {
        onMultipleFilesSelect(files);
        return;
      }
      validateAndProcess(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setErrorMessage(null);
      validateAndProcess(files[0]);
      e.target.value = '';
    }
  };

  const validateAndProcess = (file: File) => {
    if (!isValidSupportedFile(file)) {
      setErrorMessage('Unsupported file format. Please upload a JPG, JPEG, PNG image or PDF document.');
      return;
    }
    setErrorMessage(null);
    onFileSelect(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      {errorMessage && (
        <div
          id="dropzone-error-alert"
          className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm animate-in fade-in shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-slate-900">Upload Error</p>
            <p className="text-rose-700 text-xs mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-semibold text-xs px-2 py-1 rounded hover:bg-rose-100 transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        id="image-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerFileInput();
          }
        }}
        className={`relative w-full rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer select-none group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 overflow-hidden transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/80 scale-[0.995] shadow-lg shadow-blue-500/10'
            : 'border-slate-200 hover:border-blue-400/80 bg-white/95 backdrop-blur-xs hover:bg-slate-50/30 shadow-xs hover:shadow-md card-hover-elevation'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload-input"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileInputChange}
          className="sr-only"
          aria-label="Upload image or PDF"
        />

        <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
          {/* Central Upload Icon */}
          <div
            className={`w-18 h-18 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${
              isDragOver
                ? 'bg-blue-600 text-white scale-110 shadow-md shadow-blue-500/25'
                : 'bg-blue-50/80 border border-blue-100 text-blue-600 group-hover:bg-blue-100/90 group-hover:scale-105 group-hover:text-blue-700 shadow-2xs'
            }`}
          >
            {isProcessing ? (
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-9 h-9" />
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
            {isDragOver ? (
              <span className="text-blue-600">Release to analyze files</span>
            ) : (
              'Drag & drop your files here'
            )}
          </h3>

          <p className="text-sm text-slate-500 mb-6 max-w-md leading-relaxed">
            Upload your images (JPG, PNG, WEBP) or multi-page PDF documents for automated sharpness, lighting, exposure, and resolution checks.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              id="browse-files-button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow hover:shadow-blue-500/20 active:scale-98 transition-all duration-200 cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Browse Files
            </button>

            {onSwitchToBatch && (
              <button
                type="button"
                id="switch-to-batch-dropzone-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchToBatch();
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 active:scale-98 transition-all duration-200 shadow-2xs cursor-pointer"
              >
                <Images className="w-4 h-4 mr-2 text-blue-600" />
                Analyze Multiple Images
              </button>
            )}

            {onOpenCamera && (
              <button
                type="button"
                id="use-camera-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCamera();
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 active:scale-98 transition-all duration-200 shadow-2xs cursor-pointer"
              >
                <Camera className="w-4 h-4 mr-2 text-slate-500" />
                Use Camera
              </button>
            )}
          </div>

          {/* Supported formats & specs badge bar */}
          <div className="mt-8 pt-5 border-t border-slate-100 w-full flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50/90 border border-slate-200/70 text-slate-600 shadow-2xs">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
              JPG, JPEG, PNG, WEBP
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-50/90 border border-slate-200/70 text-slate-600 shadow-2xs">
              <FileText className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
              Multi-Page PDF
            </span>
            <span className="text-slate-400">
              Up to 25 MB • Private browser processing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

