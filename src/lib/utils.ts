export { cn } from "cn";

/**
 * Sanitize and normalize image URLs to prevent invalid protocol crashes in Next.js Image component.
 */
export function sanitizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  let clean = url.trim();
  if (!clean) return null;

  // Fix common protocol typos
  clean = clean.replace(/^hhttps:\/\//i, "https://");
  clean = clean.replace(/^ttps:\/\//i, "https://");
  clean = clean.replace(/^http:\/\//i, "https://");
  clean = clean.replace(/^https\/\//i, "https://");
  clean = clean.replace(/^http\/\//i, "https://");

  // Fix double slashes protocol (e.g. //i.ibb.co.com/...)
  if (clean.startsWith("//")) {
    clean = `https:${clean}`;
  }

  // Validate that it begins with a recognized valid scheme or relative path
  if (clean.startsWith("/") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  return null;
}
