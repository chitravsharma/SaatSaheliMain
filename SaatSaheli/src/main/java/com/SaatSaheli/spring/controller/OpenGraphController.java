package com.SaatSaheli.spring.controller;

import com.SaatSaheli.spring.model.*;
import com.SaatSaheli.spring.repository.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Server-side Open Graph / Twitter-card injection for shareable detail pages.
 *
 * The app is a single-page React build served as a static index.html (see
 * {@code SpaForwardingConfig}); its social-share meta tags are baked in and
 * point at one generic card. Social scrapers (facebookexternalhit, Twitterbot,
 * WhatsApp, iMessage) do not run JavaScript, so React can never give them a
 * per-item preview. This controller intercepts the known detail routes, loads
 * the entity, and returns the same index.html shell with the og, twitter, and
 * title tags rewritten to that item's real image and title. React still
 * boots normally for humans — the only change they'd notice is a correct tab
 * title. A @Controller mapping takes precedence over the "/**" resource handler,
 * so only these paths are affected; everything else still gets the default card.
 *
 * Fails safe: unknown id, missing entity, or a missing template all fall back to
 * the default shell, so sharing never breaks.
 */
@RestController
public class OpenGraphController {

    private static final Logger log = LoggerFactory.getLogger(OpenGraphController.class);

    private static final String SITE_NAME = "Saat Saheli";
    private static final String DEFAULT_TITLE = "SaatSaheli — Creative Publishing & Community Platform";
    private static final String DEFAULT_DESC =
            "Explore and publish Story · Article · Artwork · Ideas · Poems · Gallery · Magazine and more. "
                    + "A community for passion and creativity.";
    private static final int DESC_MAX = 200;

    /** Minimal shell used only when the static build isn't on the classpath
     *  (e.g. local dev, where the React app runs on :3000). Enough for scrapers. */
    private static final String FALLBACK_SHELL =
            "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/>"
                    + "<meta property=\"og:type\" content=\"website\" />"
                    + "<meta property=\"og:title\" content=\"" + DEFAULT_TITLE + "\" />"
                    + "<meta property=\"og:description\" content=\"" + DEFAULT_DESC + "\" />"
                    + "<meta property=\"og:image\" content=\"/og-card.jpg\" />"
                    + "<meta property=\"og:site_name\" content=\"" + SITE_NAME + "\" />"
                    + "<meta name=\"twitter:card\" content=\"summary_large_image\" />"
                    + "<meta name=\"twitter:title\" content=\"" + DEFAULT_TITLE + "\" />"
                    + "<meta name=\"twitter:description\" content=\"" + DEFAULT_DESC + "\" />"
                    + "<meta name=\"twitter:image\" content=\"/og-card.jpg\" />"
                    + "<title>" + DEFAULT_TITLE + "</title></head>"
                    + "<body><div id=\"root\"></div></body></html>";

    private final ArticleRepository articleRepo;
    private final BookRepository bookRepo;
    private final MarketplaceListingRepository listingRepo;
    private final RecipeRepository recipeRepo;
    private final RecipeImageRepository recipeImageRepo;
    private final GalleryRepository galleryRepo;
    private final GalleryImageRepository galleryImageRepo;

    /** Lazily-loaded, cached copy of the built index.html. */
    private volatile String template;

    public OpenGraphController(ArticleRepository articleRepo,
                               BookRepository bookRepo,
                               MarketplaceListingRepository listingRepo,
                               RecipeRepository recipeRepo,
                               RecipeImageRepository recipeImageRepo,
                               GalleryRepository galleryRepo,
                               GalleryImageRepository galleryImageRepo) {
        this.articleRepo = articleRepo;
        this.bookRepo = bookRepo;
        this.listingRepo = listingRepo;
        this.recipeRepo = recipeRepo;
        this.recipeImageRepo = recipeImageRepo;
        this.galleryRepo = galleryRepo;
        this.galleryImageRepo = galleryImageRepo;
    }

    // ── Routes (mirror FrontEnd/src/App.js detail routes) ──────────────────

    @GetMapping("/marketplace/item/{id}")
    public ResponseEntity<String> marketplaceItem(@PathVariable String id, HttpServletRequest req) {
        Long lid = parseId(id);
        MarketplaceListing l = lid == null ? null : listingRepo.findById(lid).orElse(null);
        if (l == null) return html(defaultDoc(), req);
        return html(render(l.getTitle(), l.getDescription(), l.getImage1Url(), "product", req), req);
    }

    @GetMapping({"/articles/{id}", "/blogs/{id}", "/poems/{id}"})
    public ResponseEntity<String> article(@PathVariable String id, HttpServletRequest req) {
        Long lid = parseId(id);
        Article a = lid == null ? null : articleRepo.findById(lid).orElse(null);
        if (a == null) return html(defaultDoc(), req);
        return html(render(a.getHeadline(), a.getContent(), a.getImageUrl(), "article", req), req);
    }

    @GetMapping("/read/{id}")
    public ResponseEntity<String> book(@PathVariable String id, HttpServletRequest req) {
        Long lid = parseId(id);
        Book b = lid == null ? null : bookRepo.findById(lid).orElse(null);
        if (b == null) return html(defaultDoc(), req);
        String desc = b.getAuthorName() != null && !b.getAuthorName().isBlank()
                ? "A book by " + b.getAuthorName() + " on " + SITE_NAME + "."
                : "Read this book on " + SITE_NAME + ".";
        return html(render(b.getTitle(), desc, b.getCoverImageUrl(), "article", req), req);
    }

    @GetMapping("/recipes/{id}")
    public ResponseEntity<String> recipe(@PathVariable String id, HttpServletRequest req) {
        Long lid = parseId(id);
        Recipe r = lid == null ? null : recipeRepo.findById(lid).orElse(null);
        if (r == null) return html(defaultDoc(), req);
        List<RecipeImage> imgs = recipeImageRepo.findByRecipeIdOrderByOrderIndexAsc(r.getId());
        String image = imgs.isEmpty() ? null : imgs.get(0).getImageUrl();
        String desc = r.getCuisine() != null && !r.getCuisine().isBlank()
                ? "A " + r.getCuisine() + " recipe on " + SITE_NAME + ". " + safe(r.getIngredients())
                : safe(r.getInstructions());
        return html(render(r.getRecipeName(), desc, image, "article", req), req);
    }

    @GetMapping("/gallery/{id}")
    public ResponseEntity<String> gallery(@PathVariable String id,
                                          @RequestParam(value = "img", required = false) String img,
                                          HttpServletRequest req) {
        Long lid = parseId(id);
        Gallery g = lid == null ? null : galleryRepo.findById(lid).orElse(null);
        if (g == null) return html(defaultDoc(), req);
        String image = g.getCoverImageUrl();
        Long imgId = parseId(img);
        if (imgId != null) {
            GalleryImage gi = galleryImageRepo.findById(imgId).orElse(null);
            if (gi != null && gi.getImageUrl() != null && !gi.getImageUrl().isBlank()) {
                image = gi.getImageUrl();
            }
        }
        return html(render(g.getTitle(), g.getDescription(), image, "article", req), req);
    }

    // ── Rendering ──────────────────────────────────────────────────────────

    private String render(String rawTitle, String rawDesc, String rawImage, String type, HttpServletRequest req) {
        String doc = loadTemplate();
        String title = blank(rawTitle) ? DEFAULT_TITLE : stripAndTrim(rawTitle, 90);
        String fullTitle = blank(rawTitle) ? DEFAULT_TITLE : title + " · " + SITE_NAME;
        String desc = blank(rawDesc) ? DEFAULT_DESC : stripAndTrim(rawDesc, DESC_MAX);
        String image = absolutize(rawImage, req);
        boolean customImage = image != null;
        if (image == null) image = absolutize("/og-card.jpg", req);
        String url = absoluteRequestUrl(req);

        String out = doc;
        out = replaceMetaProp(out, "og:type", type);
        out = replaceMetaProp(out, "og:title", fullTitle);
        out = replaceMetaProp(out, "og:description", desc);
        out = replaceMetaProp(out, "og:image", image);
        out = replaceMetaName(out, "twitter:title", fullTitle);
        out = replaceMetaName(out, "twitter:description", desc);
        out = replaceMetaName(out, "twitter:image", image);
        out = replaceTitle(out, fullTitle);

        // The baked-in 1200×630 dimensions describe the default card; a real item
        // image is usually a different shape, so drop the hints rather than
        // mislead scrapers into a wrong crop.
        if (customImage) {
            out = out.replaceAll("(?s)\\s*<meta property=\"og:image:(?:width|height)\"[^>]*>", "");
        }

        // Inject canonical og:url / twitter:url just before </head> (idempotent enough).
        String extra = "<meta property=\"og:url\" content=\"" + HtmlUtils.htmlEscape(url) + "\" />"
                + "<meta name=\"twitter:url\" content=\"" + HtmlUtils.htmlEscape(url) + "\" />";
        out = out.replaceFirst("(?i)</head>", Matcher.quoteReplacement(extra) + "</head>");
        return out;
    }

    /** Default shell (no per-item rewrite) — used on miss / non-numeric id. */
    private String defaultDoc() {
        return loadTemplate();
    }

    private ResponseEntity<String> html(String body, HttpServletRequest req) {
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .header(HttpHeaders.CACHE_CONTROL, CacheControl.maxAge(5, TimeUnit.MINUTES).getHeaderValue())
                .body(body);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private String loadTemplate() {
        String t = template;
        if (t != null) return t;
        synchronized (this) {
            if (template != null) return template;
            try (InputStream in = new ClassPathResource("static/index.html").getInputStream()) {
                template = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.warn("OG: static/index.html not on classpath (dev?); using minimal shell");
                template = FALLBACK_SHELL;
            }
            return template;
        }
    }

    private static Long parseId(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Long.parseLong(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    /** Strip HTML tags, collapse whitespace, escape, and truncate with an ellipsis. */
    private static String stripAndTrim(String raw, int max) {
        String s = raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        if (s.length() > max) {
            s = s.substring(0, max - 1).trim() + "…";
        }
        return HtmlUtils.htmlEscape(s);
    }

    /** Absolute URL for a possibly-relative image path; null if blank. */
    private static String absolutize(String url, HttpServletRequest req) {
        if (blank(url)) return null;
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        String origin = originOf(req);
        return url.startsWith("/") ? origin + url : origin + "/" + url;
    }

    private static String absoluteRequestUrl(HttpServletRequest req) {
        String q = req.getQueryString();
        return originOf(req) + req.getRequestURI() + (q != null ? "?" + q : "");
    }

    /** scheme://host[:port], honoring reverse-proxy forwarded headers (Render). */
    private static String originOf(HttpServletRequest req) {
        String proto = header(req, "X-Forwarded-Proto");
        String host = header(req, "X-Forwarded-Host");
        String scheme = proto != null ? proto : req.getScheme();
        if (host != null) return scheme + "://" + host;
        String h = req.getServerName();
        int port = req.getServerPort();
        boolean defaultPort = (port == 80 || port == 443);
        return scheme + "://" + h + (defaultPort ? "" : ":" + port);
    }

    private static String header(HttpServletRequest req, String name) {
        String v = req.getHeader(name);
        if (v == null || v.isBlank()) return null;
        int comma = v.indexOf(',');           // forwarded headers can be a list
        return (comma >= 0 ? v.substring(0, comma) : v).trim();
    }

    private static String replaceMetaProp(String doc, String prop, String value) {
        return replaceMeta(doc, "property", prop, value);
    }

    private static String replaceMetaName(String doc, String name, String value) {
        return replaceMeta(doc, "name", name, value);
    }

    /** Replace the content="" of a specific &lt;meta {attr}="{key}" ...&gt; tag. */
    private static String replaceMeta(String doc, String attr, String key, String value) {
        Pattern p = Pattern.compile(
                "(<meta\\s+" + attr + "=\"" + Pattern.quote(key) + "\"\\s+content=\")[^\"]*(\")",
                Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(doc);
        if (!m.find()) return doc;
        return m.replaceFirst(Matcher.quoteReplacement(m.group(1)) + Matcher.quoteReplacement(value == null ? "" : value)
                + Matcher.quoteReplacement(m.group(2)));
    }

    private static String replaceTitle(String doc, String value) {
        Pattern p = Pattern.compile("(<title>)[^<]*(</title>)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(doc);
        if (!m.find()) return doc;
        return m.replaceFirst("$1" + Matcher.quoteReplacement(value) + "$2");
    }
}
