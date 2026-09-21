package com.SaatSaheli.spring.service;

import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Semaphore;

/**
 * Share-preview renditions for Open Graph images.
 *
 * WhatsApp drops og:image files larger than roughly 300 KB (Facebook allows 8 MB,
 * which is why the same link can preview fine there). Users upload multi-MB
 * profile photos and gallery pictures, so OpenGraphController routes every image
 * through {@link #shareVariant}: small originals pass through untouched; an
 * oversized one is downscaled once to a ≤1200 px JPEG under {@code og/<sha1>.jpg}
 * on R2 and that URL is used from then on. Any failure falls back to the
 * original URL — a share is never made worse than it was.
 */
@Service
public class OgImageService {

    private static final Logger log = LoggerFactory.getLogger(OgImageService.class);

    /** Originals at or below this size are used as-is. */
    static final long MAX_SHARE_BYTES = 300 * 1024L;
    /** Refuse to download originals larger than this. */
    private static final long MAX_DOWNLOAD_BYTES = 30L * 1024 * 1024;
    /** Refuse to decode rasters larger than this (pixels) — keeps heap bounded. */
    private static final long MAX_PIXELS = 40_000_000L;
    private static final int MAX_EDGE = 1200;
    private static final int TIMEOUT_MS = 6000;
    private static final String KEY_PREFIX = "og/";

    /** Resolved result: the URL to publish plus dimensions when we know them. */
    public record ShareImage(String url, Integer width, Integer height, String mimeType) {}

    @Autowired(required = false)
    private R2StorageService r2;

    /** url → resolved; bounded LRU so a scraper storm cannot grow it unboundedly. */
    private final Map<String, ShareImage> cache = Collections.synchronizedMap(
            new LinkedHashMap<>(256, 0.75f, true) {
                @Override protected boolean removeEldestEntry(Map.Entry<String, ShareImage> e) { return size() > 500; }
            });

    /** One rendition at a time — rasterising a large upload is the memory-heavy step. */
    private final Semaphore renderSlot = new Semaphore(1);

    public ShareImage shareVariant(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return null;
        if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
            return new ShareImage(imageUrl, null, null, null); // site-relative asset, e.g. /og-card.jpg
        }
        ShareImage cached = cache.get(imageUrl);
        if (cached != null) return cached;

        ShareImage result = resolve(imageUrl);
        cache.put(imageUrl, result);
        return result;
    }

    private ShareImage resolve(String imageUrl) {
        ShareImage original = new ShareImage(imageUrl, null, null, null);
        try {
            long size = contentLength(imageUrl);
            if (size >= 0 && size <= MAX_SHARE_BYTES) return original;
            if (r2 == null) return original;

            String key = KEY_PREFIX + sha1(imageUrl) + ".jpg";
            if (r2.exists(key)) {
                return new ShareImage(r2.publicUrlFor(key), null, null, "image/jpeg");
            }
            if (size > MAX_DOWNLOAD_BYTES) {
                log.info("OG image {} is {} bytes — too large to render a share variant", imageUrl, size);
                return original;
            }

            if (!renderSlot.tryAcquire()) {
                // Another share is rendering; serve the original this once rather than queue.
                return original;
            }
            try {
                // Re-check: the other renderer may have produced this exact key.
                if (r2.exists(key)) return new ShareImage(r2.publicUrlFor(key), null, null, "image/jpeg");
                return render(imageUrl, key, original);
            } finally {
                renderSlot.release();
            }
        } catch (Exception e) {
            log.warn("OG share variant for {} failed, using original: {}", imageUrl, e.toString());
            return original;
        }
    }

    private ShareImage render(String imageUrl, String key, ShareImage original) throws Exception {
        byte[] data = download(imageUrl);
        if (data == null) return original;

        BufferedImage src = ImageIO.read(new ByteArrayInputStream(data));
        data = null; // release the encoded bytes before scaling
        if (src == null) {
            log.info("OG image {} is in a format ImageIO cannot decode (webp?) — using original", imageUrl);
            return original;
        }
        if ((long) src.getWidth() * src.getHeight() > MAX_PIXELS) {
            log.info("OG image {} is {}x{} — too many pixels to rasterise safely", imageUrl, src.getWidth(), src.getHeight());
            return original;
        }

        // Step the quality/size down until the JPEG fits WhatsApp's budget.
        int edge = MAX_EDGE;
        double quality = 0.85;
        byte[] jpeg = null;
        BufferedImage out = null;
        for (int attempt = 0; attempt < 4; attempt++) {
            out = Thumbnails.of(src).size(edge, edge).keepAspectRatio(true).outputQuality(1.0).asBufferedImage();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Thumbnails.of(out).scale(1.0).outputFormat("jpg").outputQuality(quality).toOutputStream(baos);
            jpeg = baos.toByteArray();
            if (jpeg.length <= MAX_SHARE_BYTES) break;
            if (quality > 0.7) quality = 0.7; else edge = Math.max(600, edge * 3 / 4);
        }
        src.flush();

        String url = r2.putDerived(jpeg, key, "image/jpeg");
        log.info("OG share variant rendered for {} → {} ({}x{}, {} KB)", imageUrl, url,
                out.getWidth(), out.getHeight(), jpeg.length / 1024);
        return new ShareImage(url, out.getWidth(), out.getHeight(), "image/jpeg");
    }

    /** Content-Length via HEAD, or -1 when the server does not say. */
    private long contentLength(String url) throws Exception {
        HttpURLConnection c = open(url, "HEAD");
        try {
            int status = c.getResponseCode();
            if (status < 200 || status >= 300) return -1;
            return c.getContentLengthLong();
        } finally {
            c.disconnect();
        }
    }

    private byte[] download(String url) throws Exception {
        HttpURLConnection c = open(url, "GET");
        try (InputStream in = c.getInputStream(); ByteArrayOutputStream buf = new ByteArrayOutputStream()) {
            if (c.getResponseCode() != 200) return null;
            byte[] chunk = new byte[64 * 1024];
            long total = 0;
            int n;
            while ((n = in.read(chunk)) > 0) {
                total += n;
                if (total > MAX_DOWNLOAD_BYTES) return null;
                buf.write(chunk, 0, n);
            }
            return buf.toByteArray();
        } finally {
            c.disconnect();
        }
    }

    private static HttpURLConnection open(String url, String method) throws Exception {
        HttpURLConnection c = (HttpURLConnection) URI.create(url).toURL().openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(TIMEOUT_MS);
        c.setReadTimeout(TIMEOUT_MS);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "SaatSaheli-OG/1.0");
        return c;
    }

    private static String sha1(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-1").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
