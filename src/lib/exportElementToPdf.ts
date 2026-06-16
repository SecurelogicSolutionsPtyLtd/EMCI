/**
 * High-resolution element → A4 PDF export.
 *
 * Captures a single DOM node (the rendered summary page) with html2canvas-pro —
 * the fork that understands Tailwind v4's `oklch()` colours — and places it into
 * an A4 jsPDF document. Only the supplied element is rendered, so the surrounding
 * app shell (sidebar, toolbars) is never included in the output.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CSS_DPI = 96;

/**
 * Renders `element` to a PDF and triggers a download.
 *
 * @param dpi Target raster resolution. 600 DPI yields print-grade output at the
 *            cost of a large canvas (~6.25× the on-screen pixels).
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  dpi = 600,
): Promise<void> {
  const scale = dpi / CSS_DPI;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  if (imgHeight <= pageHeight + 0.5) {
    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, imgHeight);
  } else {
    // Content taller than one page: slice it across pages by offsetting the
    // image upward and clipping to each A4 page.
    let remaining = imgHeight;
    let position = 0;
    while (remaining > 0) {
      pdf.addImage(imgData, 'PNG', 0, position, A4_WIDTH_MM, imgHeight);
      remaining -= A4_HEIGHT_MM;
      if (remaining > 0) {
        pdf.addPage();
        position -= A4_HEIGHT_MM;
      }
    }
  }

  pdf.save(filename);
}
