export type SampleImageType = 'sharp-document' | 'blurry' | 'dark' | 'bright' | 'sharp-photo';

export function generateSampleImageFile(type: SampleImageType): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    if (type === 'sharp-document') {
      // 1. Sharp and well-lit image (High contrast text document, 1600x1200)
      canvas.width = 1600;
      canvas.height = 1200;

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clean border
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      // High contrast header
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(80, 80, canvas.width - 160, 90);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('OFFICIAL CLEAR VERIFICATION DOCUMENT', 110, 138);

      // Sharp crisp text lines
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px monospace';
      for (let y = 230; y < 1050; y += 42) {
        ctx.fillText(
          `RECORD REF #${1000 + y} • HIGH FREQUENCY CONTRAST PATTERN • VERIFIED ACCURACY 100%`,
          90,
          y
        );
        ctx.fillRect(90, y + 8, canvas.width - 200, 2);
      }

      // Barcode pattern for extreme sharp edges
      for (let x = 100; x < 700; x += 8) {
        ctx.fillStyle = (x / 8) % 2 === 0 ? '#000000' : '#ffffff';
        ctx.fillRect(x, 1070, 6, 50);
      }
    } else if (type === 'blurry') {
      // 2. Blurry image (Defocus blur simulation: low edge contrast, washed gradients)
      canvas.width = 1280;
      canvas.height = 800;

      // Smooth washed gradient
      const grad = ctx.createRadialGradient(640, 400, 50, 640, 400, 600);
      grad.addColorStop(0, '#94a3b8');
      grad.addColorStop(0.5, '#8595a8');
      grad.addColorStop(1, '#778697');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Very soft, diffused shapes with heavy transparency to prevent sharp edges
      for (let i = 0; i < 8; i++) {
        const softGrad = ctx.createRadialGradient(
          200 + i * 120,
          300 + (i % 3) * 80,
          10,
          200 + i * 120,
          300 + (i % 3) * 80,
          180
        );
        softGrad.addColorStop(0, 'rgba(148, 163, 184, 0.4)');
        softGrad.addColorStop(1, 'rgba(119, 134, 151, 0)');
        ctx.fillStyle = softGrad;
        ctx.beginPath();
        ctx.arc(200 + i * 120, 300 + (i % 3) * 80, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      // Apply multiple blur box passes manually to guarantee extremely low Laplacian variance (< 20)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Fast horizontal and vertical box blur
      for (let pass = 0; pass < 3; pass++) {
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            const left = (y * w + (x - 1)) * 4;
            const right = (y * w + (x + 1)) * 4;
            data[idx] = (data[left] + data[idx] + data[right]) / 3;
            data[idx + 1] = (data[left + 1] + data[idx + 1] + data[right + 1]) / 3;
            data[idx + 2] = (data[left + 2] + data[idx + 2] + data[right + 2]) / 3;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (type === 'dark') {
      // 3. Dark image (Very low luminance, heavy dark clipping, avg luma < 40)
      canvas.width = 1280;
      canvas.height = 800;

      ctx.fillStyle = '#070b14'; // Almost black
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Low visibility faint objects
      ctx.fillStyle = '#111827';
      ctx.fillRect(80, 80, canvas.width - 160, canvas.height - 160);

      ctx.fillStyle = '#1e293b';
      ctx.font = '24px sans-serif';
      ctx.fillText('UNDEROXPOSED NIGHT SCENE - SEVERELY LIMITED ILLUMINATION', 120, 200);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(640, 450, 150, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'bright') {
      // 4. Very bright / Overexposed image (Avg luma > 230, blown highlights)
      canvas.width = 1280;
      canvas.height = 800;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Harsh direct light flare
      const flare = ctx.createRadialGradient(640, 400, 10, 640, 400, 700);
      flare.addColorStop(0, '#ffffff');
      flare.addColorStop(0.7, '#fefefe');
      flare.addColorStop(1, '#f8fafc');
      ctx.fillStyle = flare;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('BLOWN HIGHLIGHTS - DIRECT FLASH OVEREXPOSURE', 200, 300);
    } else {
      // 5. Sharp photo (High resolution 1920x1080 sharp balanced colorful scene)
      canvas.width = 1920;
      canvas.height = 1080;

      // Studio background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(0.5, '#334155');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Crisp shapes with sharp borders
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(450, 500, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(960, 540, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(1450, 480, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sharp text labels
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px sans-serif';
      ctx.fillText('STUDIO REFERENCE PHOTO ASSET', 150, 200);

      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('FULL HD 1920 × 1080 • OPTIMAL ILLUMINATION & ACUTANCE', 150, 260);
    }

    const mimeType = type === 'sharp-document' ? 'image/jpeg' : 'image/png';
    const fileName = `${type}-sample.${mimeType === 'image/jpeg' ? 'jpg' : 'png'}`;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], fileName, { type: mimeType });
          resolve(file);
        }
      },
      mimeType,
      0.95
    );
  });
}

/**
 * Generates a batch of 5 diverse sample images (sharp, photo, blurry, dark, bright)
 * for testing the batch analysis workflow.
 */
export async function generateSampleBatchFiles(): Promise<File[]> {
  const types: SampleImageType[] = ['sharp-document', 'sharp-photo', 'blurry', 'dark', 'bright'];
  const files: File[] = [];

  for (const t of types) {
    const file = await generateSampleImageFile(t);
    files.push(file);
  }

  return files;
}
