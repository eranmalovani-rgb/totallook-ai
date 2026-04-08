/**
 * Performance regression tests — verify optimizations are in place.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Performance optimizations", () => {
  const llmSource = fs.readFileSync(
    path.resolve(__dirname, "./_core/llm.ts"),
    "utf-8",
  );
  const productImagesSource = fs.readFileSync(
    path.resolve(__dirname, "./productImages.ts"),
    "utf-8",
  );

  describe("llm.ts image conversion", () => {
    it("should use 768px max side for faster processing", () => {
      expect(llmSource).toContain("maxSide > 768");
    });

    it("should use quality 60 for JPEG compression (speed optimized)", () => {
      expect(llmSource).toContain("quality: 60");
    });

    it("should skip sharp processing for small JPEGs (<200KB)", () => {
      expect(llmSource).toContain("isSmallJpeg");
      expect(llmSource).toContain("200_000");
    });

    it("should convert images in parallel with Promise.all", () => {
      expect(llmSource).toContain("Promise.all");
      // The convertImagesToBase64 function should use Promise.all for parallel conversion
      const convertFnMatch = llmSource.match(
        /async function convertImagesToBase64[\s\S]*?^}/m,
      );
      expect(convertFnMatch).toBeTruthy();
      expect(convertFnMatch![0]).toContain("Promise.all");
    });

    it("should have fetch timeout for image downloads", () => {
      expect(llmSource).toContain("setTimeout(() => controller.abort()");
    });
  });

  describe("productImages.ts concurrency", () => {
    it("should use MAX_CONCURRENT of 5", () => {
      expect(productImagesSource).toContain("MAX_CONCURRENT = 5");
    });

    it("should use 3s timeout for testImageUrl", () => {
      expect(productImagesSource).toContain("AbortSignal.timeout(3000)");
      expect(productImagesSource).not.toContain("AbortSignal.timeout(5000)");
    });

    it("should resolve outfit images in parallel with Promise.all", () => {
      // generateOutfitLookFromMetadata should use Promise.all for parallel resolution
      // Line ~542: const resolvedResults = await Promise.all(resolvePromises);
      const outfitSection = productImagesSource.slice(productImagesSource.indexOf("generateOutfitLookFromMetadata"));
      expect(outfitSection).toContain("Promise.all");
    });

    it("should have Brave Image Search as primary search provider", () => {
      expect(productImagesSource).toContain("searchBraveImages");
      expect(productImagesSource).toContain("buildBraveSearchQuery");
      expect(productImagesSource).toContain("pickBestBraveImage");
    });

    it("should have Google Image Search as fallback", () => {
      expect(productImagesSource).toContain("searchGoogleImages");
    });

    it("should use 8s timeout for store image fetching", () => {
      expect(productImagesSource).toContain("setTimeout(() => controller.abort(), 8000)");
    });
  });
});
