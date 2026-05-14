/**
 * Utility functions for generating and exporting Instagram posts
 */

export interface ListingData {
  title: string;
  price: string;
  category: string;
  condition: string;
  area: string;
  description: string;
  imageSrc?: string;
}

/**
 * Download a canvas as PNG image
 */
export const downloadCanvasAsImage = (
  canvas: HTMLCanvasElement,
  filename: string = "handplockat-annonsbild.png"
) => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copy canvas as image to clipboard
 */
export const copyCanvasToClipboard = async (canvas: HTMLCanvasElement): Promise<boolean> => {
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch (err) {
    console.error("Fel vid kopiering:", err);
    return false;
  }
};

export const shareCanvasAsImage = async (
  canvas: HTMLCanvasElement,
  filename: string = "handplockat-annonsbild.png",
  title: string = "Handplockat-annons"
): Promise<boolean> => {
  if (!navigator.canShare || !navigator.canShare({ files: [] })) {
    return false;
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  const file = new File([blob], filename, { type: "image/png" });

  try {
    await navigator.share({
      files: [file],
      title,
      text: "Dela min Handplockat-annons på Instagram",
    });
    return true;
  } catch (err) {
    console.error("Delning misslyckades:", err);
    return false;
  }
};

/**
 * Generate Instagram-sized dimensions
 * Instagram post standard: 1080x1350px (4:5 ratio)
 */
export const INSTAGRAM_DIMENSIONS = {
  width: 1080,
  height: 1350,
} as const;

/**
 * Format price for display
 */
export const formatPrice = (price: string | number): string => {
  const num = Number(price);
  if (!isNaN(num)) {
    return num.toLocaleString("sv-SE");
  }
  return String(price);
};
