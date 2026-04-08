/**
 * Client-side image compression utility.
 * Resizes large images and compresses them before uploading to reduce
 * upload time and network payload significantly.
 */

const MAX_DIMENSION = 1920; // Max width or height
const JPEG_QUALITY = 0.82; // Good balance of quality vs size

/**
 * Compress and resize an image file on the client side.
 * Returns a base64 string (without the data:... prefix) and the resulting mime type.
 *
 * For images smaller than maxDimension, only JPEG re-encoding is applied.
 * For larger images, they are resized proportionally.
 *
 * Typical results:
 * - 10MB photo → ~200-400KB (95-97% reduction)
 * - 3MB photo → ~150-300KB (90-95% reduction)
 */
export async function compressImageToBase64(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if needed, maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Always output as JPEG for best compression
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve({
              base64: result.split(",")[1],
              mimeType: "image/jpeg",
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback: read the original file as base64
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          base64: result.split(",")[1],
          mimeType: file.type,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = url;
  });
}
