import { QualityAnalysisResult, QualityRecommendation } from './types';

/**
 * Performs real client-side image quality analysis using HTML5 Canvas API and pixel data.
 * Calculates real Sharpness (Laplacian variance), Brightness (mean luminance),
 * Exposure (histogram clipping), and Resolution sufficiency.
 */
export async function analyzeImageQuality(
  imageSource: string | HTMLImageElement,
  sourceWidth?: number,
  sourceHeight?: number
): Promise<QualityAnalysisResult> {
  // 1. Ensure image is loaded into an HTMLImageElement
  const img = await loadImageElement(imageSource);
  const naturalW = sourceWidth || img.naturalWidth || img.width;
  const naturalH = sourceHeight || img.naturalHeight || img.height;

  // 2. Set up off-screen canvas for pixel extraction.
  // We analyze at a standardized working resolution (up to ~900-1000px max dimension)
  // for rapid pixel iteration without lag, while preserving high frequency spatial edges.
  const maxDimension = 960;
  let targetW = naturalW;
  let targetH = naturalH;

  if (targetW > maxDimension || targetH > maxDimension) {
    if (targetW > targetH) {
      targetH = Math.round((targetH / targetW) * maxDimension);
      targetW = maxDimension;
    } else {
      targetW = Math.round((targetW / targetH) * maxDimension);
      targetH = maxDimension;
    }
  }

  // Fallbacks to avoid 0 dimension
  targetW = Math.max(10, targetW);
  targetH = Math.max(10, targetH);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to create Canvas 2D rendering context');
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);
  const imageData = ctx.getImageData(0, 0, targetW, targetH);
  const pixels = imageData.data;
  const totalPixels = targetW * targetH;

  // 3. Grayscale conversion and Luminance Statistics
  const grayscale = new Float32Array(totalPixels);
  const histogram = new Uint32Array(256);
  let lumaSum = 0;
  let lumaSumSq = 0;

  let darkClippedCount = 0; // luma < 15
  let brightClippedCount = 0; // luma > 240

  for (let i = 0, p = 0; i < totalPixels; i++, p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];

    // Standard Rec. 601 perceived luminance formula
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscale[i] = luma;

    const roundedLuma = Math.min(255, Math.max(0, Math.round(luma)));
    histogram[roundedLuma]++;
    lumaSum += luma;
    lumaSumSq += luma * luma;

    if (luma < 15) {
      darkClippedCount++;
    } else if (luma > 240) {
      brightClippedCount++;
    }
  }

  const avgLuminance = lumaSum / totalPixels;
  const lumaVariance = Math.max(0, lumaSumSq / totalPixels - avgLuminance * avgLuminance);
  const lumaStdDev = Math.sqrt(lumaVariance);

  // 4. SHARPNESS / BLUR DETECTION via Discrete Laplacian Convolution
  // Kernel:
  // [ 0,  1,  0]
  // [ 1, -4,  1]
  // [ 0,  1,  0]
  let laplacianSum = 0;
  let laplacianSumSq = 0;
  let edgePixelsCount = 0;

  for (let y = 1; y < targetH - 1; y++) {
    const rowOffset = y * targetW;
    const prevRowOffset = (y - 1) * targetW;
    const nextRowOffset = (y + 1) * targetW;

    for (let x = 1; x < targetW - 1; x++) {
      const center = grayscale[rowOffset + x];
      const top = grayscale[prevRowOffset + x];
      const bottom = grayscale[nextRowOffset + x];
      const left = grayscale[rowOffset + (x - 1)];
      const right = grayscale[rowOffset + (x + 1)];

      const lap = top + bottom + left + right - 4 * center;
      laplacianSum += lap;
      laplacianSumSq += lap * lap;
      edgePixelsCount++;
    }
  }

  const laplacianMean = edgePixelsCount > 0 ? laplacianSum / edgePixelsCount : 0;
  const laplacianVariance =
    edgePixelsCount > 0
      ? Math.max(0, laplacianSumSq / edgePixelsCount - laplacianMean * laplacianMean)
      : 0;

  // Calibrate real sharpness score (0 to 100) based on Laplacian variance
  let sharpnessScore = 0;
  if (laplacianVariance <= 25) {
    sharpnessScore = Math.round((laplacianVariance / 25) * 35);
  } else if (laplacianVariance <= 120) {
    sharpnessScore = Math.round(35 + ((laplacianVariance - 25) / 95) * 25);
  } else if (laplacianVariance <= 350) {
    sharpnessScore = Math.round(60 + ((laplacianVariance - 120) / 230) * 22);
  } else if (laplacianVariance <= 800) {
    sharpnessScore = Math.round(82 + ((laplacianVariance - 350) / 450) * 14);
  } else {
    sharpnessScore = Math.min(100, Math.round(96 + ((laplacianVariance - 800) / 800) * 4));
  }
  sharpnessScore = Math.max(0, Math.min(100, sharpnessScore));

  let sharpnessClassification: 'Sharp' | 'Acceptable' | 'Slightly Blurry' | 'Blurry' = 'Blurry';
  if (sharpnessScore >= 80) {
    sharpnessClassification = 'Sharp';
  } else if (sharpnessScore >= 65) {
    sharpnessClassification = 'Acceptable';
  } else if (sharpnessScore >= 45) {
    sharpnessClassification = 'Slightly Blurry';
  } else {
    sharpnessClassification = 'Blurry';
  }

  // 5. BRIGHTNESS / LUMINANCE ANALYSIS
  let brightnessClassification: 'Too Dark' | 'Good Lighting' | 'Too Bright' = 'Good Lighting';
  if (avgLuminance < 75) {
    brightnessClassification = 'Too Dark';
  } else if (avgLuminance > 185) {
    brightnessClassification = 'Too Bright';
  } else {
    brightnessClassification = 'Good Lighting';
  }

  let brightnessScore = 100;
  if (brightnessClassification === 'Good Lighting') {
    // Peak score 100 near center (128), gently dropping to ~82 near bounds (75 and 185)
    const distFromIdeal = Math.abs(avgLuminance - 128);
    brightnessScore = Math.round(100 - (distFromIdeal / 57) * 18);
  } else if (brightnessClassification === 'Too Dark') {
    brightnessScore = Math.max(10, Math.round((avgLuminance / 75) * 80));
  } else {
    // Too bright
    const excess = avgLuminance - 185;
    brightnessScore = Math.max(10, Math.round(80 - (excess / 70) * 70));
  }
  brightnessScore = Math.max(0, Math.min(100, brightnessScore));

  // 6. EXPOSURE ANALYSIS
  const darkClippedPct = Number(((darkClippedCount / totalPixels) * 100).toFixed(1));
  const brightClippedPct = Number(((brightClippedCount / totalPixels) * 100).toFixed(1));

  let exposureClassification:
    | 'Balanced Exposure'
    | 'Overexposed'
    | 'Underexposed'
    | 'High Contrast / Clipped' = 'Balanced Exposure';

  if (darkClippedPct > 12 && brightClippedPct > 12) {
    exposureClassification = 'High Contrast / Clipped';
  } else if (brightClippedPct > 12) {
    exposureClassification = 'Overexposed';
  } else if (darkClippedPct > 12) {
    exposureClassification = 'Underexposed';
  } else {
    exposureClassification = 'Balanced Exposure';
  }

  // Exposure score from 0 to 100 penalizing clipping and severe low-contrast wash
  let exposureScore = 100;
  const darkPenalty = Math.min(45, darkClippedPct * 2.2);
  const brightPenalty = Math.min(45, brightClippedPct * 2.2);
  const lowContrastPenalty = lumaStdDev < 25 ? (25 - lumaStdDev) * 1.2 : 0;
  exposureScore = Math.round(100 - darkPenalty - brightPenalty - lowContrastPenalty);
  exposureScore = Math.max(0, Math.min(100, exposureScore));

  // 7. RESOLUTION ANALYSIS
  const totalNativePixels = naturalW * naturalH;
  const megapixels = Number((totalNativePixels / 1000000).toFixed(2));

  // Standards:
  // Optimal: 1920x1080 (Full HD, 2.07 MP) or higher => 100 score
  // Adequate: 1280x720 (0.92 MP) to 2.07 MP => 80-99 score
  // Low Resolution: < 720p => below 80 score
  let resolutionScore = 100;
  let resolutionClassification: 'Optimal (Full HD+)' | 'Adequate' | 'Low Resolution' =
    'Optimal (Full HD+)';
  let isSufficient = true;

  if (totalNativePixels >= 2000000) {
    resolutionScore = 100;
    resolutionClassification = 'Optimal (Full HD+)';
    isSufficient = true;
  } else if (totalNativePixels >= 921600) {
    resolutionScore = Math.round(80 + ((totalNativePixels - 921600) / 1078400) * 19);
    resolutionClassification = 'Adequate';
    isSufficient = true;
  } else {
    resolutionScore = Math.max(15, Math.round((totalNativePixels / 921600) * 75));
    resolutionClassification = 'Low Resolution';
    isSufficient = false;
  }
  resolutionScore = Math.max(0, Math.min(100, resolutionScore));

  // 8. OVERALL QUALITY SCORE (Weighted per user specification)
  // Sharpness: 40%
  // Brightness: 25%
  // Exposure: 20%
  // Resolution: 15%
  const overallScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        sharpnessScore * 0.4 +
          brightnessScore * 0.25 +
          exposureScore * 0.2 +
          resolutionScore * 0.15
      )
    )
  );

  // 9. PASS / RETAKE DECISION
  // PASS when overall score is 80 or above.
  // RETAKE when overall score is below 80.
  const decision: 'PASS' | 'RETAKE' = overallScore >= 80 ? 'PASS' : 'RETAKE';

  // 10. DYNAMIC ACTIONABLE RECOMMENDATIONS
  const problemRecommendations: QualityRecommendation[] = [];

  // Rule 1: SHARPNESS / BLUR
  // If sharpness score is below 40:
  // "Image is significantly blurry. Hold the camera steady, tap to focus on the subject, and retake the photo." (Priority 1: Severe blur)
  // If sharpness score is between 40 and 69:
  // "Image is slightly blurry. Hold the camera steady and tap to focus before taking the photo." (Priority 5: Minor quality issues)
  // If sharpness score is 70 or above:
  // Do not show a negative recommendation for sharpness.
  if (sharpnessScore < 40) {
    problemRecommendations.push({
      id: 'rec-sharpness-severe',
      title: 'Severe Blur Detected',
      message:
        'Image is significantly blurry. Hold the camera steady, tap to focus on the subject, and retake the photo.',
      category: 'sharpness',
      severity: 'critical',
      priority: 1,
    });
  } else if (sharpnessScore >= 40 && sharpnessScore <= 69) {
    problemRecommendations.push({
      id: 'rec-sharpness-minor',
      title: 'Focus & Clarity',
      message:
        'Image is slightly blurry. Hold the camera steady and tap to focus before taking the photo.',
      category: 'sharpness',
      severity: 'warning',
      priority: 5,
    });
  }

  // Rule 3: EXPOSURE (Priority 2: Severe exposure problems)
  // If the image has significant dark clipping:
  // "Some details are lost in dark areas. Improve lighting and avoid heavy shadows."
  // If the image has significant bright clipping:
  // "Some areas are overexposed. Avoid direct light sources and reduce brightness."
  // If exposure is balanced:
  // Do not show a negative recommendation.
  const hasSignificantDarkClipping =
    darkClippedPct >= 10 ||
    exposureClassification === 'Underexposed' ||
    exposureClassification === 'High Contrast / Clipped';

  const hasSignificantBrightClipping =
    brightClippedPct >= 10 ||
    exposureClassification === 'Overexposed' ||
    exposureClassification === 'High Contrast / Clipped';

  if (hasSignificantDarkClipping) {
    problemRecommendations.push({
      id: 'rec-exposure-dark',
      title: 'Shadow Detail Loss',
      message:
        'Some details are lost in dark areas. Improve lighting and avoid heavy shadows.',
      category: 'exposure',
      severity: 'critical',
      priority: 2,
    });
  }

  if (hasSignificantBrightClipping) {
    problemRecommendations.push({
      id: 'rec-exposure-bright',
      title: 'Highlight Overexposure',
      message:
        'Some areas are overexposed. Avoid direct light sources and reduce brightness.',
      category: 'exposure',
      severity: 'critical',
      priority: 2,
    });
  }

  // Rule 2: BRIGHTNESS (Priority 3: Brightness problems)
  // If brightness is classified as Too Dark:
  // "The image is too dark. Move to a brighter area or turn on additional lighting."
  // If brightness is classified as Too Bright:
  // "The image is too bright. Avoid direct strong light and reduce exposure if possible."
  // If brightness is Good Lighting:
  // Do not show a negative recommendation.
  if (brightnessClassification === 'Too Dark') {
    problemRecommendations.push({
      id: 'rec-brightness-dark',
      title: 'Insufficient Illumination',
      message:
        'The image is too dark. Move to a brighter area or turn on additional lighting.',
      category: 'brightness',
      severity: 'critical',
      priority: 3,
    });
  } else if (brightnessClassification === 'Too Bright') {
    problemRecommendations.push({
      id: 'rec-brightness-bright',
      title: 'Excessive Illumination',
      message:
        'The image is too bright. Avoid direct strong light and reduce exposure if possible.',
      category: 'brightness',
      severity: 'critical',
      priority: 3,
    });
  }

  // Rule 4: RESOLUTION (Priority 4: Resolution problems)
  // If resolution is inadequate:
  // "Image resolution is too low. Use a higher-resolution camera or capture the image again."
  // If resolution is adequate:
  // Do not show a negative recommendation.
  const isResolutionInadequate = !isSufficient || resolutionClassification === 'Low Resolution';

  if (isResolutionInadequate) {
    problemRecommendations.push({
      id: 'rec-resolution-low',
      title: 'Inadequate Resolution',
      message:
        'Image resolution is too low. Use a higher-resolution camera or capture the image again.',
      category: 'resolution',
      severity: 'critical',
      priority: 4,
    });
  }

  // Rule 7: PRIORITY ORDER
  // 1. Severe blur
  // 2. Severe exposure problems
  // 3. Brightness problems
  // 4. Resolution problems
  // 5. Minor quality issues
  problemRecommendations.sort((a, b) => a.priority - b.priority);

  // Rule 6: PASS RESULT
  // If the overall score is 80 or above and there are no major quality problems:
  // Show a positive recommendation:
  // "Image meets the quality requirements and is ready for submission."
  const hasMajorQualityProblems =
    sharpnessScore < 40 ||
    hasSignificantDarkClipping ||
    hasSignificantBrightClipping ||
    brightnessClassification !== 'Good Lighting' ||
    isResolutionInadequate;

  const recommendations: QualityRecommendation[] = [];

  if (overallScore >= 80 && !hasMajorQualityProblems) {
    recommendations.push({
      id: 'rec-submission-ready',
      title: 'Submission Ready',
      message: 'Image meets the quality requirements and is ready for submission.',
      category: 'pass',
      severity: 'positive',
      priority: 0,
    });
  }

  // Rule 5: MULTIPLE PROBLEMS
  // If multiple quality problems exist:
  // Show a separate recommendation card for EACH detected problem.
  // Do not limit recommendations to only one problem.
  recommendations.push(...problemRecommendations);

  return {
    overallScore,
    decision,
    sharpness: {
      score: sharpnessScore,
      variance: Math.round(laplacianVariance),
      classification: sharpnessClassification,
    },
    brightness: {
      score: brightnessScore,
      avgLuminance: Math.round(avgLuminance),
      classification: brightnessClassification,
    },
    exposure: {
      score: exposureScore,
      darkClippedPct,
      brightClippedPct,
      classification: exposureClassification,
    },
    resolution: {
      score: resolutionScore,
      width: naturalW,
      height: naturalH,
      megapixels,
      isSufficient,
      classification: resolutionClassification,
    },
    recommendations,
    analyzedAt: Date.now(),
  };
}

/**
 * Helper to load an image source into an HTMLImageElement
 */
function loadImageElement(source: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (typeof source !== 'string') {
    if (source.complete && source.naturalWidth !== 0) {
      return Promise.resolve(source);
    }
    return new Promise((resolve, reject) => {
      source.onload = () => resolve(source);
      source.onerror = (e) => reject(e);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = source;
  });
}
