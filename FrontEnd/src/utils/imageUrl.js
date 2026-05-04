// Inject f_auto + q_auto + w_1600 into Cloudinary URLs so the CDN serves
// WebP/AVIF at perceptual-threshold quality, capped at 1600px wide. The
// width cap stops Cloudinary from delivering full-size JPEGs unchanged
// when q_auto can't squeeze them further (observed: hero JPEGs delivered
// at 1+ MB even with f_auto,q_auto until a width cap was added).
// Non-Cloudinary URLs (Drive thumbnails, /uploads/ paths, absolute URLs
// from other hosts) pass through unchanged.
export function optimizeCloudinary(url) {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com")) return url;
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx < 0) return url;
  // Skip if a transform segment is already present after /upload/ — avoids
  // stacking f_auto,q_auto on a URL that already has e.g. w_300,c_fill.
  const after = url.substring(uploadIdx + "/upload/".length);
  if (/^[a-z]_[a-z0-9_,.-]+\//i.test(after)) return url;
  return url.substring(0, uploadIdx + "/upload/".length) + "f_auto,q_auto,w_1600,c_limit/" + after;
}
