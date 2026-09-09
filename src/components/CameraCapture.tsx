import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  X,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export type RealTimeLightingStatus = 'Good Lighting' | 'Too Dark' | 'Too Bright' | 'Adjust Lighting';

interface CameraCaptureProps {
  isOpen: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onCapture,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastAnalyzedTimeRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lightingStatus, setLightingStatus] = useState<RealTimeLightingStatus>('Good Lighting');
  const [lightingLuminance, setLightingLuminance] = useState<number>(128);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);

  // Stop media tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    stopTracks();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Webcam access is not supported in this browser or context. Please use file upload.'
        );
      }

      // Check available devices to see if switch is possible
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch (err) {
        console.warn('Could not enumerate devices:', err);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((playErr) => {
            console.error('Error playing video feed:', playErr);
          });
          setIsLoading(false);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let message = 'Unable to access camera. Please check your browser permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera permissions in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No camera found on this device. Please connect a camera or upload a file.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Camera is in use by another application. Please close other camera apps and retry.';
      } else if (err.message) {
        message = err.message;
      }
      setErrorMessage(message);
      setIsLoading(false);
    }
  }, [facingMode, stopTracks]);

  // Handle open/close and cleanup
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
    }

    return () => {
      stopTracks();
    };
  }, [isOpen, startCamera, stopTracks]);

  // Real-time lightweight visual feedback analysis loop
  useEffect(() => {
    if (!isOpen) return;

    if (!analysisCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 48;
      analysisCanvasRef.current = canvas;
    }

    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const analyzeFrame = (timestamp: number) => {
      // Analyze every 250ms for low CPU usage while keeping feedback real-time
      if (timestamp - lastAnalyzedTimeRef.current >= 250) {
        lastAnalyzedTimeRef.current = timestamp;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0 && ctx) {
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const totalPixels = data.length / 4;

            let totalLuminance = 0;
            let darkClipped = 0;
            let brightClipped = 0;

            for (let i = 0; i < data.length; i += 4) {
              // Standard perceptual luminance (ITU-R BT.601)
              const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              totalLuminance += lum;
              if (lum < 16) darkClipped++;
              if (lum > 240) brightClipped++;
            }

            const avgLuminance = totalLuminance / totalPixels;
            const darkClippedPct = (darkClipped / totalPixels) * 100;
            const brightClippedPct = (brightClipped / totalPixels) * 100;

            setLightingLuminance(Math.round(avgLuminance));

            // Classify real-time status according to specified criteria:
            // "Too Dark", "Too Bright", "Good Lighting", or "Adjust Lighting"
            if (avgLuminance < 70) {
              setLightingStatus('Too Dark');
            } else if (avgLuminance > 185) {
              setLightingStatus('Too Bright');
            } else if (darkClippedPct > 20 || brightClippedPct > 20) {
              setLightingStatus('Adjust Lighting');
            } else if (avgLuminance >= 75 && avgLuminance <= 180) {
              setLightingStatus('Good Lighting');
            } else {
              setLightingStatus('Adjust Lighting');
            }
          } catch (e) {
            // Ignore frame capture issues on unready video
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    };

    animationFrameRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isOpen]);

  // Capture current frame as File
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth || 1280;
    captureCanvas.height = video.videoHeight || 720;
    const ctx = captureCanvas.getContext('2d');

    if (!ctx) return;

    // Draw the exact frame
    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    captureCanvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          // Stop stream and send file to parent
          stopTracks();
          onCapture(file);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div
      id="camera-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
    >
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 id="camera-modal-title" className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
                <span>Live Camera Capture</span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Real-Time
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Align subject and monitor real-time lighting feedback
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {hasMultipleCameras && (
              <button
                type="button"
                id="switch-camera-btn"
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer border border-slate-200 shadow-2xs"
                title="Switch Camera"
                aria-label="Switch camera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              id="cancel-camera-btn-close"
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer border border-slate-200 shadow-2xs"
              aria-label="Close camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewport Area */}
        <div className="relative bg-slate-950 flex items-center justify-center min-h-[340px] sm:min-h-[460px] overflow-hidden">
          {isLoading && !errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white space-y-3 z-20">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Initializing live optical feed...</p>
            </div>
          )}

          {errorMessage ? (
            <div className="p-8 text-center max-w-md z-20">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-4">
                <CameraOff className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Camera Unavailable</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">{errorMessage}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer shadow-md"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer border border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Live Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain max-h-[520px]"
              />

              {/* Shutter flash animation overlay */}
              {isShutterFlashing && (
                <div className="absolute inset-0 bg-white pointer-events-none z-40 animate-out fade-out duration-200" />
              )}

              {/* Viewfinder Reticle Framing Overlay */}
              <div className="absolute inset-8 sm:inset-12 pointer-events-none flex flex-col justify-between border border-white/20 rounded-2xl">
                <div className="flex justify-between p-2">
                  <div className="w-6 h-6 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
                  <div className="w-6 h-6 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
                </div>
                {/* Center crosshair */}
                <div className="self-center flex items-center justify-center w-8 h-8 pointer-events-none opacity-40">
                  <div className="w-4 h-0.5 bg-white" />
                  <div className="w-0.5 h-4 bg-white absolute" />
                </div>
                <div className="flex justify-between p-2">
                  <div className="w-6 h-6 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
                  <div className="w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-br-sm" />
                </div>
              </div>

              {/* Real-time Visual Feedback Status Indicator Overlay (Requirement 5) */}
              <div
                id="camera-lighting-status"
                className="absolute top-4 left-4 z-30 flex items-center space-x-2"
              >
                <div
                  className={`px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-lg flex items-center space-x-2 text-xs font-bold border transition-all ${
                    lightingStatus === 'Good Lighting'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      : lightingStatus === 'Too Dark'
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : lightingStatus === 'Too Bright'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        lightingStatus === 'Good Lighting'
                          ? 'bg-emerald-400'
                          : lightingStatus === 'Too Dark'
                          ? 'bg-amber-400'
                          : lightingStatus === 'Too Bright'
                          ? 'bg-rose-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        lightingStatus === 'Good Lighting'
                          ? 'bg-emerald-500'
                          : lightingStatus === 'Too Dark'
                          ? 'bg-amber-500'
                          : lightingStatus === 'Too Bright'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </span>

                  {lightingStatus === 'Good Lighting' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : lightingStatus === 'Too Dark' ? (
                    <Moon className="w-3.5 h-3.5 text-amber-400" />
                  ) : lightingStatus === 'Too Bright' ? (
                    <Sun className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}

                  <span>{lightingStatus}</span>
                </div>

                {/* Real-time luminance gauge pill */}
                <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white shadow-md">
                  <Sliders className="w-3 h-3 text-blue-400" />
                  <span>Lum: {lightingLuminance}/255</span>
                </div>
              </div>

              {/* Dynamic live advice tooltip badge at bottom center of viewport */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-full px-4 flex justify-center">
                <div className="px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-xs text-white text-center max-w-sm shadow-xl">
                  {lightingStatus === 'Good Lighting' &&
                    '✓ Balanced lighting. Hold steady for clean capture.'}
                  {lightingStatus === 'Too Dark' &&
                    '⚠ Low light detected. Move to a brighter area or turn on lighting.'}
                  {lightingStatus === 'Too Bright' &&
                    '⚠ Strong glare/light detected. Avoid direct light sources.'}
                  {lightingStatus === 'Adjust Lighting' &&
                    '⚠ Harsh contrast or clipping. Adjust angle to reduce shadows.'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer controls: Capture Image & Cancel (Requirement 2) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>High-resolution frame ready for automated quality inspection</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="cancel-camera-btn"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 transition cursor-pointer border border-slate-200 shadow-2xs"
            >
              Cancel
            </button>

            <button
              type="button"
              id="capture-image-btn"
              disabled={isLoading || !!errorMessage}
              onClick={handleCapture}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition shadow-md cursor-pointer ${
                isLoading || !!errorMessage
                  ? 'bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-98'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Capture Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
