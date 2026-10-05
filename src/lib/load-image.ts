import { lumaFromRgb } from "@/engine";

export interface ReferenceImage {
  name: string;
  width: number;
  height: number;
  luma: Uint8Array;
}

const MAX_SIDE_PX = 1600;
const MAX_BYTES = 12 * 1024 * 1024;

export async function lumaFromImageFile(file: File): Promise<ReferenceImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large. Use a file under 12 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Could not read that image file.");
  }

  try {
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Could not convert the image to black and white.");
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const luma = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      luma[p] = lumaFromRgb(pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0);
    }
    return { name: file.name, width, height, luma };
  } finally {
    bitmap.close();
  }
}
