import JSZip from 'jszip';
import { EXTENSION_FILES } from '../extension-files/extensionFiles';

/**
 * Creates high-contrast PNG icons for Chrome Extension using HTML5 Canvas
 */
export function generateExtensionIcon(size: number): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rounded rectangle background
    const radius = Math.floor(size * 0.22);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(1, '#047857');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Border
    ctx.lineWidth = Math.max(1, Math.floor(size * 0.04));
    ctx.strokeStyle = '#34d399';
    ctx.stroke();

    // Arabic letter "ت" (Ta for Tarjamah) in white
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.62)}px 'Cairo', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ت', size / 2, size / 2 + Math.floor(size * 0.02));

    canvas.toBlob((blob) => {
      resolve(blob || new Blob([]));
    }, 'image/png');
  });
}

/**
 * Packages all extension files and icon assets into a clean .zip download
 */
export async function downloadExtensionZip(onProgress?: (progressText: string) => void) {
  if (onProgress) onProgress('Preparing extension files...');
  const zip = new JSZip();

  // Add all text/code files
  for (const file of EXTENSION_FILES) {
    zip.file(file.path, file.content);
  }

  // Generate and attach real PNG icons
  if (onProgress) onProgress('Rendering extension icons (16px, 48px, 128px)...');
  const icon16Blob = await generateExtensionIcon(16);
  const icon48Blob = await generateExtensionIcon(48);
  const icon128Blob = await generateExtensionIcon(128);

  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    iconsFolder.file('icon16.png', icon16Blob);
    iconsFolder.file('icon48.png', icon48Blob);
    iconsFolder.file('icon128.png', icon128Blob);
  }

  if (onProgress) onProgress('Compiling .zip package...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'tarjamah-live-chrome-extension.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);

  if (onProgress) onProgress('Download complete!');
}
