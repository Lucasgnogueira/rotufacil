import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export type ExportType = 'table_png' | 'seals_png' | 'full_pdf';

interface ExportRecord {
  id: string;
  storage_path: string;
  export_type: string;
}

/**
 * Check if an export already exists for a given version+type.
 * Returns a signed URL if cached, null otherwise.
 */
export async function getCachedExport(
  versionId: string,
  exportType: ExportType,
): Promise<string | null> {
  const { data } = await supabase
    .from('recipe_exports')
    .select('storage_path')
    .eq('recipe_version_id', versionId)
    .eq('export_type', exportType)
    .maybeSingle();

  if (!data?.storage_path) return null;

  const { data: urlData } = await supabase.storage
    .from('exports')
    .createSignedUrl(data.storage_path, 3600, { download: true });

  return urlData?.signedUrl ?? null;
}

/**
 * Capture a DOM node as a high-res PNG blob.
 */
export async function captureNodeAsPng(
  node: HTMLElement,
  pixelRatio = 3,
): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio,
    backgroundColor: '#ffffff',
    style: {
      // Force print-safe styles
      fontFamily: "'Inter', sans-serif",
    },
  });

  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Upload a blob to Supabase Storage under the user's folder.
 */
async function uploadToStorage(
  userId: string,
  fileName: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const path = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('exports')
    .upload(path, blob, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
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
  // Upsert: delete old then insert
  await supabase
    .from('recipe_exports')
    .delete()
    .eq('recipe_version_id', versionId)
    .eq('export_type', exportType);

  await supabase.from('recipe_exports').insert({
    recipe_version_id: versionId,
    owner_user_id: userId,
    export_type: exportType,
    storage_path: storagePath,
  });

  const { data } = await supabase.storage
    .from('exports')
    .createSignedUrl(storagePath, 3600);

  return data?.signedUrl ?? '';
}

/**
 * Export a DOM node as PNG, upload to storage, return signed URL.
 */
export async function exportPngToStorage(
  node: HTMLElement,
  versionId: string,
  userId: string,
  exportType: 'table_png' | 'seals_png',
  recipeName: string,
): Promise<string> {
  const blob = await captureNodeAsPng(node);
  const suffix = exportType === 'table_png' ? 'tabela' : 'selos';
  const fileName = `${versionId}_${suffix}.png`;
  const path = await uploadToStorage(userId, fileName, blob, 'image/png');
  return saveExportRecord(versionId, userId, exportType, path);
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

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(recipeName, margin, 20);

  // Nutrition table as image
  const tableBlob = await captureNodeAsPng(tableNode, 3);
  const tableDataUrl = await blobToDataUrl(tableBlob);

  // Calculate dimensions to fit width
  const img = await loadImage(tableDataUrl);
  const imgRatio = img.height / img.width;
  const imgWidth = Math.min(contentWidth, 90); // max 90mm wide
  const imgHeight = imgWidth * imgRatio;

  pdf.addImage(tableDataUrl, 'PNG', margin, 28, imgWidth, imgHeight);

  let yPos = 28 + imgHeight + 10;

  // Ingredients
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Ingredientes:', margin, yPos);
  yPos += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const ingLines = pdf.splitTextToSize(`Ingredientes: ${ingredientsList}`, contentWidth);
  pdf.text(ingLines, margin, yPos);
  yPos += ingLines.length * 4 + 6;

  // Allergens
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

  // Seals
  if (sealsNode) {
    const sealsBlob = await captureNodeAsPng(sealsNode, 3);
    const sealsDataUrl = await blobToDataUrl(sealsBlob);
    const sealsImg = await loadImage(sealsDataUrl);
    const sealsRatio = sealsImg.height / sealsImg.width;
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
  const fileName = `${versionId}_completo.pdf`;
  const path = await uploadToStorage(userId, fileName, pdfBlob, 'application/pdf');
  return saveExportRecord(versionId, userId, 'full_pdf', path);
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
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
