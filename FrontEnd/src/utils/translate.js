// Lightweight English -> Hindi translator with localStorage caching.
// Used as a fallback when the magazine editor has not supplied a Hindi
// translation for a text block or page content.

const CACHE_KEY = "saatSaheli_hiTranslations_v1";
const DEVANAGARI_RE = /[\u0900-\u097F]/;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
}

// Strip HTML tags but remember them so we can re-wrap. For simplicity we
// translate the text content only; if the source contained HTML we return
// plain translated text (the editor's Hindi field should be used for rich
// formatting).
function stripHtml(html) {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

export function hasDevanagari(text) {
  return !!text && DEVANAGARI_RE.test(text);
}

export async function translateToHindi(text) {
  if (!text) return text;
  const plain = stripHtml(text).trim();
  if (!plain) return text;
  // Already Hindi — leave as is.
  if (hasDevanagari(plain)) return text;

  const cache = readCache();
  if (cache[plain]) return cache[plain];

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      plain
    )}&langpair=en|hi`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (translated && typeof translated === "string") {
      cache[plain] = translated;
      writeCache(cache);
      return translated;
    }
  } catch {
    /* network error — fall back to original */
  }
  return text;
}
