// Build a carrier tracking URL from a free-text carrier name + tracking number.
// The seller enters the carrier as free text, so we keyword-match the common
// carriers and fall back to a Google search — that way ANY carrier still links
// out to something useful.

const CARRIERS = [
  { match: /\bups\b/i, url: (n) => `https://www.ups.com/track?tracknum=${n}` },
  { match: /usps|postal\s*service/i, url: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
  { match: /fedex/i, url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { match: /dhl/i, url: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}` },
  { match: /delhivery/i, url: (n) => `https://www.delhivery.com/track/package/${n}` },
  { match: /dtdc/i, url: (n) => `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${n}` },
  { match: /blue\s*dart/i, url: (n) => `https://www.bluedart.com/tracking?trackNo=${n}` },
];

/**
 * @returns {string|null} a tracking URL, or null if there's no tracking number.
 */
export function getTrackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null;
  const num = encodeURIComponent(String(trackingNumber).trim());
  const c = (carrier || "").trim();
  if (c) {
    const hit = CARRIERS.find((e) => e.match.test(c));
    if (hit) return hit.url(num);
  }
  // Unknown or blank carrier → Google search for "<carrier> tracking <number>".
  const q = encodeURIComponent(`${c ? c + " " : ""}tracking ${String(trackingNumber).trim()}`);
  return `https://www.google.com/search?q=${q}`;
}
