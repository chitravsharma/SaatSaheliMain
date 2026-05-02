// Inject f_auto + q_auto into Cloudinary URLs so the CDN serves WebP/AVIF
// at perceptual-threshold quality instead of the original PNG/JPEG bytes.
// Cuts bandwidth ~75% on the home hero carousel and other Cloudinary-served
// images. Non-Cloudinary URLs (Drive thumbnails, /uploads/ paths, absolute
// URLs from other hosts) pass through unchanged.
export function optimizeCloudinary(url) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com")) return url;
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx < 0) return url;
  // Skip if a transform segment is already present after /upload/ — avoids
  // stacking f_auto,q_auto on a URL that already has e.g. w_300,c_fill.
  const after = url.substring(uploadIdx + "/upload/".length);
  if (/^[a-z]_[a-z0-9_,.-]+\//i.test(after)) return url;
  return url.substring(0, uploadIdx + "/upload/".length) + "f_auto,q_auto/" + after;
}
