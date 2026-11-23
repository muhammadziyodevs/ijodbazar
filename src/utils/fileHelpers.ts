import type { Timestamp } from 'firebase/firestore';
import { BLUEPRINT_LIMITS, type WorkCategory } from '../types';

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

export function formatDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'Hozirgina';
  try {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Hozirgina';
  }
}

export function formatDateTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'Hozirgina';
  try {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('uz-UZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Hozirgina';
  }
}

export function detectCategoryFromFile(file: File): WorkCategory {
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (
    mime.startsWith('image/') &&
    ['fig', 'sketch', 'psd', 'ai', 'svg'].includes(ext)
  ) {
    return 'design';
  }
  if (['fig', 'sketch', 'xd', 'psd', 'ai', 'afdesign'].includes(ext)) {
    return 'design';
  }
  if (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'html', 'css', 'scss', 'sql', 'yaml', 'yml', 'json', 'sh'].includes(ext)
  ) {
    return ext === 'md' || ext === 'txt' ? 'document' : 'code';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'rtf'].includes(ext)
  ) {
    return 'document';
  }
  if (mime.startsWith('image/') || mime.startsWith('audio/') || mime.startsWith('video/')) {
    return 'media';
  }
  return 'other';
}

export function isTextPreviewable(mimeType: string, fileName: string): boolean {
  const mime = mimeType.toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'image/svg+xml') {
    return true;
  }
  return ['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'md', 'txt', 'css', 'html', 'csv', 'yaml', 'yml', 'sql', 'xml', 'svg'].includes(ext);
}

const CHUNK_CHAR_SIZE = 580000; // Strictly under 750,000 limit

export async function fileToBase64Chunks(file: File): Promise<string[]> {
  if (file.size > BLUEPRINT_LIMITS.SAFE_UPLOAD_FILE_BYTES) {
    throw new Error(
      `Fayl hajmi juda katta (${formatBytes(file.size)}). Maksimal ruxsat etilgan hajm: ${formatBytes(BLUEPRINT_LIMITS.SAFE_UPLOAD_FILE_BYTES)}.`
    );
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const blockSize = 0x8000;
  for (let i = 0; i < bytes.length; i += blockSize) {
    const slice = bytes.subarray(i, i + blockSize);
    binary += String.fromCharCode(...slice);
  }
  const base64 = btoa(binary);

  if (!base64) {
    return [];
  }

  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += CHUNK_CHAR_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_CHAR_SIZE));
  }

  if (chunks.length > BLUEPRINT_LIMITS.CHUNK_COUNT_MAX) {
    throw new Error(`Fayl bo'laklari soni limitdan (${BLUEPRINT_LIMITS.CHUNK_COUNT_MAX}) oshib ketdi.`);
  }

  return chunks;
}

export async function createImagePreviewDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return '';
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve('');
      img.onload = () => {
        const maxWidth = 880;
        const maxHeight = 660;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let dataUrl = canvas.toDataURL('image/webp', 0.78);
        if (dataUrl.length > BLUEPRINT_LIMITS.PREVIEW_DATA_URL_MAX) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        if (dataUrl.length > BLUEPRINT_LIMITS.PREVIEW_DATA_URL_MAX) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.45);
        }
        resolve(dataUrl.length <= BLUEPRINT_LIMITS.PREVIEW_DATA_URL_MAX ? dataUrl : '');
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function chunksToUint8Array(chunks: string[]): Uint8Array {
  const fullBase64 = chunks.join('');
  const binary = atob(fullBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function decodeChunksToText(chunks: string[]): string {
  const bytes = chunksToUint8Array(chunks);
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function chunksToBlob(chunks: string[], mimeType: string): Blob {
  const bytes = chunksToUint8Array(chunks);
  return new Blob([bytes.buffer as ArrayBuffer], {
    type: mimeType || 'application/octet-stream',
  });
}

export function triggerFileDownload(chunks: string[], fileName: string, mimeType: string): void {
  const blob = chunksToBlob(chunks, mimeType);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
