import { toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';

export type ExportType = 'table_png' | 'seals_png' | 'full_pdf';
type PngExportType = Extract<ExportType, 'table_png' | 'seals_png'>;

const EXPORT_BUCKET = 'exports';
const PNG_PIXEL_RATIO = 3;
const MIN_PNG_BYTES = 512;
const MIN_PDF_BYTES = 1024;
const RENDER_TIMEOUT_MS = 5000;

interface ElementMetrics {
  width: number;
  height: number;
  offsetWidth: number;
  offsetHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}

interface CaptureResult {
  blob: Blob;
  metrics: ElementMetrics;
}

function logExport(step: string, details: Record<string, unknown> = {}) {
  console.info(`[EXPORT] ${step}`, details);
}

/**
 * Check if an export already exists for a given version+type.
 * Returns a signed URL if cached, null otherwise.
 */
export async function getCachedExport(
  versionId: string,
  exportType: ExportType,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('recipe_exports')
    .select('storage_path')
    .eq('recipe_version_id', versionId)
    .eq('export_type', exportType)
    .maybeSingle();

  if (error || !data?.storage_path) {
    return null;
  }

  const { data: urlData, error: signedUrlError } = await supabase.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(data.storage_path, 3600, { download: true });

  if (signedUrlError) {
    logExport('cached-url-error', { exportType, message: signedUrlError.message });
    return null;
  }

  return urlData?.signedUrl ?? null;
}

/**
 * Capture a DOM node as a high-res PNG blob after ensuring the export surface is fully renderable.
 */
export async function captureNodeAsPng(
  node: HTMLElement,
  label: string,
  pixelRatio = PNG_PIXEL_RATIO,
): Promise<CaptureResult> {
  const metrics = await waitForRenderableNode(node, label);

  const blob = await toBlob(node, {
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: true,
    width: metrics.width,
    height: metrics.height,
    style: {
      margin: '0',
      transform: 'none',
      animation: 'none',
      transition: 'none',
      opacity: '1',
      backgroundColor: '#ffffff',
      color: '#000000',
    },
  });

  if (!blob || blob.size <= 0) {
    throw new Error('Falha ao gerar o blob PNG.');
  }

  logExport('blob-generated', {
    label,
    width: metrics.width,
    height: metrics.height,
    blobSize: blob.size,
    contentType: blob.type || 'image/png',
  });

  if (blob.size < MIN_PNG_BYTES) {
    throw new Error('O PNG gerado parece inválido ou vazio.');
  }

  return { blob, metrics };
}

/**
 * Upload a blob to storage under the user's folder.
 */
async function uploadToStorage(
  userId: string,
  fileName: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const path = `${userId}/${fileName}`;

  logExport('upload-start', {
    path,
    blobSize: blob.size,
    contentType,
  });

  const { data, error } = await supabase.storage
    .from(EXPORT_BUCKET)
    .upload(path, blob, {
      contentType,
      upsert: false,
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  logExport('upload-success', {
    path,
    returnedPath: data?.path ?? path,
    blobSize: blob.size,
    contentType,
  });

  return path;
}

async function verifyStoredFile(storagePath: string, expectedContentType: string) {
  const { data, error } = await supabase.storage
    .from(EXPORT_BUCKET)
    .download(storagePath);

  if (error) {
    throw new Error(`Falha ao verificar arquivo salvo: ${error.message}`);
  }

  logExport('upload-verified', {
    path: storagePath,
    blobSize: data.size,
    contentType: data.type || expectedContentType,
  });

  if (data.size <= 0) {
    throw new Error('O arquivo salvo no storage está vazio.');
  }
}

/**
 * Save export record and return signed download URL.
 */
async function saveExportRecord(
  versionId: string,
  userId: string,
  exportType: ExportType,
  storagePath: string,
): Promise<string> {
  const { error: deleteError } = await supabase
    .from('recipe_exports')
    .delete()
    .eq('recipe_version_id', versionId)
    .eq('export_type', exportType);

  if (deleteError) {
    throw new Error(`Falha ao limpar exportação anterior: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase.from('recipe_exports').insert({
    recipe_version_id: versionId,
    owner_user_id: userId,
    export_type: exportType,
    storage_path: storagePath,
  });

  if (insertError) {
    throw new Error(`Falha ao registrar exportação: ${insertError.message}`);
  }

  const { data, error } = await supabase.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(storagePath, 3600, { download: true });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Falha ao criar URL assinada da exportação.');
  }

  return data.signedUrl;
}

async function requestServerSidePngExport(versionId: string) {
  logExport('server-fallback-start', { versionId });

  const { data, error } = await supabase.functions.invoke('export-label-png', {
    body: { recipeVersionId: versionId },
  });

  if (error) {
    throw new Error(error.message || 'Falha no fallback server-side.');
  }

  if (!data?.signedUrl) {
    throw new Error(data?.error || 'Fallback server-side não retornou URL válida.');
  }

  logExport('server-fallback-success', {
    versionId,
    path: data.path,
    diagnostics: data.diagnostics,
  });

  return data.signedUrl as string;
}

/**
 * Export a DOM node as PNG, upload to storage, return signed URL.
 */
export async function exportPngToStorage(
  node: HTMLElement,
  versionId: string,
  userId: string,
  exportType: PngExportType,
  _recipeName: string,
): Promise<string> {
  try {
    const label = exportType === 'table_png' ? 'nutrition-table' : 'front-warnings';
    const { blob } = await captureNodeAsPng(node, label);
    const suffix = exportType === 'table_png' ? 'tabela' : 'selos';
    const fileName = `${versionId}_${Date.now()}_${suffix}.png`;
    const path = await uploadToStorage(userId, fileName, blob, 'image/png');
    await verifyStoredFile(path, 'image/png');
    return saveExportRecord(versionId, userId, exportType, path);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido na exportação';
    logExport('client-export-error', { exportType, message });

    if (exportType === 'table_png') {
      try {
        return await requestServerSidePngExport(versionId);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido no fallback';
        throw new Error(`Falha no client-side (${message}) e no fallback (${fallbackMessage}).`);
      }
    }

    throw error;
  }
}

/**
 * Generate a full PDF with nutrition table, ingredients, allergens, and seals.
 */
export async function exportFullPdf(
  tableNode: HTMLElement,
  sealsNode: HTMLElement | null,
  ingredientsList: string,
  allergenDecl: string,
  versionId: string,
  userId: string,
  recipeName: string,
): Promise<string> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(recipeName, margin, 20);

  const tableCapture = await captureNodeAsPng(tableNode, 'nutrition-table-pdf');
  const tableDataUrl = await blobToDataUrl(tableCapture.blob);

  const tableImage = await loadImage(tableDataUrl);
  const tableRatio = tableImage.height / tableImage.width;
  const tableWidth = Math.min(contentWidth, 90);
  const tableHeight = tableWidth * tableRatio;

  pdf.addImage(tableDataUrl, 'PNG', margin, 28, tableWidth, tableHeight);

  let yPos = 28 + tableHeight + 10;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Ingredientes:', margin, yPos);
  yPos += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const ingredientLines = pdf.splitTextToSize(`Ingredientes: ${ingredientsList}`, contentWidth);
  pdf.text(ingredientLines, margin, yPos);
  yPos += ingredientLines.length * 4 + 6;

  if (allergenDecl) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Declarações de Alergênicos:', margin, yPos);
    yPos += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const allergenLines = pdf.splitTextToSize(allergenDecl, contentWidth);
    pdf.text(allergenLines, margin, yPos);
    yPos += allergenLines.length * 4 + 6;
  }

  if (sealsNode) {
    const sealsCapture = await captureNodeAsPng(sealsNode, 'front-warnings-pdf');
    const sealsDataUrl = await blobToDataUrl(sealsCapture.blob);
    const sealsImage = await loadImage(sealsDataUrl);
    const sealsRatio = sealsImage.height / sealsImage.width;
    const sealsWidth = Math.min(contentWidth, 100);
    const sealsHeight = sealsWidth * sealsRatio;

    if (yPos + sealsHeight > pdf.internal.pageSize.getHeight() - 15) {
      pdf.addPage();
      yPos = 15;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('Rotulagem Frontal:', margin, yPos);
    yPos += 6;
    pdf.addImage(sealsDataUrl, 'PNG', margin, yPos, sealsWidth, sealsHeight);
  }

  const pdfBlob = pdf.output('blob');
  if (pdfBlob.size < MIN_PDF_BYTES) {
    throw new Error('O PDF gerado parece inválido ou vazio.');
  }

  logExport('pdf-generated', {
    blobSize: pdfBlob.size,
    contentType: 'application/pdf',
  });

  const fileName = `${versionId}_${Date.now()}_completo.pdf`;
  const path = await uploadToStorage(userId, fileName, pdfBlob, 'application/pdf');
  await verifyStoredFile(path, 'application/pdf');
  return saveExportRecord(versionId, userId, 'full_pdf', path);
}

async function waitForRenderableNode(node: HTMLElement, label: string) {
  await waitForNextFrames(2);
  await waitForFonts();
  await waitForImages(node);

  const startedAt = Date.now();

  while (Date.now() - startedAt < RENDER_TIMEOUT_MS) {
    const metrics = getElementMetrics(node);
    const visible = isRenderable(node);

    if (visible && metrics.width > 0 && metrics.height > 0) {
      logExport('node-ready', {
        label,
        width: metrics.width,
        height: metrics.height,
        offsetWidth: metrics.offsetWidth,
        offsetHeight: metrics.offsetHeight,
        scrollWidth: metrics.scrollWidth,
        scrollHeight: metrics.scrollHeight,
      });
      return metrics;
    }

    await waitForNextFrames(1);
  }

  const metrics = getElementMetrics(node);
  const visible = isRenderable(node);

  logExport('node-invalid', {
    label,
    width: metrics.width,
    height: metrics.height,
    offsetWidth: metrics.offsetWidth,
    offsetHeight: metrics.offsetHeight,
    scrollWidth: metrics.scrollWidth,
    scrollHeight: metrics.scrollHeight,
    visible,
  });

  if (!visible) {
    throw new Error('A área de exportação está invisível ou não renderizada.');
  }

  throw new Error('A área de exportação ficou com largura/altura zero.');
}

function getElementMetrics(node: HTMLElement): ElementMetrics {
  const rect = node.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    offsetWidth: node.offsetWidth,
    offsetHeight: node.offsetHeight,
    scrollWidth: node.scrollWidth,
    scrollHeight: node.scrollHeight,
  };
}

function isRenderable(node: HTMLElement) {
  const style = window.getComputedStyle(node);
  return node.isConnected && style.display !== 'none' && style.visibility !== 'hidden';
}

async function waitForFonts() {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          image.removeEventListener('load', handleLoad);
          image.removeEventListener('error', handleError);
        };

        const handleLoad = () => {
          cleanup();
          resolve();
        };

        const handleError = () => {
          cleanup();
          reject(new Error('Uma imagem interna da exportação falhou ao carregar.'));
        };

        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleError, { once: true });
      });
    }),
  );
}

async function waitForNextFrames(count: number) {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Generate a PDF with exact label dimensions (no A4, no margins, single page).
 * Uses html2canvas to capture the label node, then creates a jsPDF with matching dimensions.
 */
export async function exportLabelPdf(node: HTMLElement): Promise<Blob> {
  await waitForRenderableNode(node, 'label-pdf');

  const canvas = await html2canvas(node, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: node.scrollWidth,
    height: node.scrollHeight,
  });

  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  // Convert px to mm at 96 DPI base * scale factor
  const pxToMm = 25.4 / (96 * 3);
  const pdfW = imgWidthPx * pxToMm;
  const pdfH = imgHeightPx * pxToMm;

  const pdf = new jsPDF({
    orientation: pdfW > pdfH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfW, pdfH],
  });

  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

  const blob = pdf.output('blob');
  logExport('label-pdf-generated', { pdfW, pdfH, imgWidthPx, imgHeightPx, blobSize: blob.size });

  if (blob.size < MIN_PDF_BYTES) {
    throw new Error('O PDF gerado parece inválido ou vazio.');
  }

  return blob;
}
