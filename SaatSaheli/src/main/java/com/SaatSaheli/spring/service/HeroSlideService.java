package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.Article;
import com.SaatSaheli.spring.model.Gallery;
import com.SaatSaheli.spring.model.GalleryImage;
import com.SaatSaheli.spring.model.HeroSlide;
import com.SaatSaheli.spring.model.Page;
import com.SaatSaheli.spring.model.Podcast;
import com.SaatSaheli.spring.model.RecipeImage;
import com.SaatSaheli.spring.repository.ArticleRepository;
import com.SaatSaheli.spring.repository.GalleryImageRepository;
import com.SaatSaheli.spring.repository.GalleryRepository;
import com.SaatSaheli.spring.repository.HeroSlideRepository;
import com.SaatSaheli.spring.repository.PageRepository;
import com.SaatSaheli.spring.repository.PodcastRepository;
import com.SaatSaheli.spring.repository.RecipeImageRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class HeroSlideService {

    private static final Logger log = LoggerFactory.getLogger(HeroSlideService.class);
    public static final int SLOT_COUNT = 5;

    @Autowired
    private HeroSlideRepository repo;

    @Autowired
    private PageRepository pageRepo;

    @Autowired
    private GalleryRepository galleryRepo;

    @Autowired
    private GalleryImageRepository galleryImageRepo;

    @Autowired
    private RecipeImageRepository recipeImageRepo;

    @Autowired
    private ArticleRepository articleRepo;

    @Autowired
    private PodcastRepository podcastRepo;

    private static final Pattern BOOK_RE     = Pattern.compile("^/read/(\\d+)/?$");
    private static final Pattern GALLERY_RE  = Pattern.compile("^/gallery/(\\d+)/?$");
    private static final Pattern RECIPE_RE   = Pattern.compile("^/recipes/(\\d+)/?$");
    private static final Pattern ARTICLE_RE  = Pattern.compile("^/articles/(\\d+)/?$");
    private static final Pattern PODCAST_RE  = Pattern.compile("^/podcasts/(\\d+)/?$");

    // Ensure slots 1..SLOT_COUNT always exist as rows (with empty content). Lets the
    // admin form render a stable grid without per-slot create logic. Slots above
    // SLOT_COUNT may exist from prior config; getAllSlots/getActiveSlots filter them out.
    @PostConstruct
    public void seedEmptySlots() {
        try {
            List<HeroSlide> existing = repo.findAll();
            java.util.Set<Integer> have = new java.util.HashSet<>();
            for (HeroSlide s : existing) have.add(s.getSlot());
            List<HeroSlide> toCreate = new ArrayList<>();
            for (int i = 1; i <= SLOT_COUNT; i++) {
                if (!have.contains(i)) {
                    HeroSlide s = new HeroSlide();
                    s.setSlot(i);
                    s.setName(null);
                    s.setImageUrl(null);
                    s.setUpdatedAt(LocalDateTime.now());
                    toCreate.add(s);
                }
            }
            if (!toCreate.isEmpty()) {
                repo.saveAll(toCreate);
                log.info("Seeded {} empty hero_slides rows", toCreate.size());
            }
            // After empty slots exist, attempt one-time content-default seed so
            // that on first deploy the home hero shows the same kind of mosaic
            // visitors are seeing today (instead of falling through to the auto-
            // scrape until superadmin curates manually).
            seedDefaultsFromContentIfUntouched();
        } catch (Exception e) {
            log.warn("Hero slide seed failed: {}", e.getMessage());
        }
    }

    public List<HeroSlide> getAllSlots() {
        List<HeroSlide> all = repo.findAllByOrderBySlotAsc();
        List<HeroSlide> kept = new ArrayList<>();
        for (HeroSlide s : all) {
            if (s.getSlot() != null && s.getSlot() >= 1 && s.getSlot() <= SLOT_COUNT) {
                kept.add(s);
            }
        }
        return kept;
    }

    public List<HeroSlide> getActiveSlots() {
        List<HeroSlide> all = repo.findAllByOrderBySlotAsc();
        List<HeroSlide> active = new ArrayList<>();
        for (HeroSlide s : all) {
            if (s.getSlot() == null || s.getSlot() < 1 || s.getSlot() > SLOT_COUNT) continue;
            if (s.getImageUrl() != null && !s.getImageUrl().trim().isEmpty()) {
                active.add(s);
            }
        }
        return active;
    }

    public List<HeroSlide> upsertAll(List<Map<String, Object>> incoming, Long updatedBy) {
        Map<Integer, HeroSlide> existing = new HashMap<>();
        for (HeroSlide s : repo.findAll()) existing.put(s.getSlot(), s);

        LocalDateTime now = LocalDateTime.now();
        List<HeroSlide> toSave = new ArrayList<>();
        for (Map<String, Object> in : incoming) {
            Integer slot = parseInt(in.get("slot"));
            if (slot == null || slot < 1 || slot > SLOT_COUNT) continue;
            String name = trimToNull(stringOf(in.get("name")));
            // Admin form sends `sourceUrl` (the page URL or direct image URL they pasted).
            // Older callers may send `imageUrl` directly — accept both for safety.
            String sourceUrl = trimToNull(stringOf(in.get("sourceUrl")));
            if (sourceUrl == null) sourceUrl = trimToNull(stringOf(in.get("imageUrl")));
            String imageUrl = resolveSourceUrl(sourceUrl);

            HeroSlide row = existing.getOrDefault(slot, new HeroSlide());
            row.setSlot(slot);
            row.setName(name);
            row.setSourceUrl(sourceUrl);
            row.setImageUrl(imageUrl);
            row.setUpdatedAt(now);
            row.setUpdatedBy(updatedBy);
            toSave.add(row);
        }
        repo.saveAll(toSave);
        return repo.findAllByOrderBySlotAsc();
    }

    public Optional<HeroSlide> clearSlot(Integer slot, Long updatedBy) {
        if (slot == null || slot < 1 || slot > SLOT_COUNT) return Optional.empty();
        Optional<HeroSlide> opt = repo.findById(slot);
        if (opt.isEmpty()) return Optional.empty();
        HeroSlide row = opt.get();
        row.setName(null);
        row.setSourceUrl(null);
        row.setImageUrl(null);
        row.setUpdatedAt(LocalDateTime.now());
        row.setUpdatedBy(updatedBy);
        return Optional.of(repo.save(row));
    }

    /**
     * Turn an admin-pasted URL into a direct image URL.
     *
     * Recognized site routes (host/protocol stripped):
     *   /read/{bookId}                 → first page's image_url
     *   /gallery/{galleryId}?img={id}  → that gallery image's URL
     *   /gallery/{galleryId}           → gallery's coverImageUrl, or first image
     *   /recipes/{recipeId}            → first recipe image
     *   /articles/{articleId}          → article's image_url
     *   /podcasts/{podcastId}          → podcast's cover_image_url
     *
     * Anything else (already a direct image URL, Drive share link, etc.) is returned
     * as-is so the front-end can render it through its own resolveImageUrl helper.
     */
    public String resolveSourceUrl(String input) {
        if (input == null) return null;
        String url = input.trim();
        if (url.isEmpty()) return null;

        // Strip host/protocol. Anything not a path becomes "raw" → returned unchanged.
        String path;
        String query = "";
        try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                java.net.URI uri = java.net.URI.create(url);
                path = uri.getPath() == null ? "" : uri.getPath();
                query = uri.getQuery() == null ? "" : uri.getQuery();
            } else if (url.startsWith("/")) {
                int q = url.indexOf('?');
                if (q < 0) { path = url; }
                else { path = url.substring(0, q); query = url.substring(q + 1); }
            } else {
                return url; // not a path or absolute URL — assume direct image
            }
        } catch (Exception e) {
            return url;
        }

        try {
            Matcher m;
            if ((m = BOOK_RE.matcher(path)).matches()) {
                Long bookId = Long.parseLong(m.group(1));
                List<Page> pages = pageRepo.findByBookIdOrderByPageNumberAsc(bookId);
                for (Page p : pages) {
                    if (p.getImageUrl() != null && !p.getImageUrl().isBlank()) return p.getImageUrl();
                }
                return null;
            }
            if ((m = GALLERY_RE.matcher(path)).matches()) {
                Long galleryId = Long.parseLong(m.group(1));
                Long imgId = parseImgQueryParam(query);
                if (imgId != null) {
                    Optional<GalleryImage> gi = galleryImageRepo.findById(imgId);
                    if (gi.isPresent() && gi.get().getImageUrl() != null) return gi.get().getImageUrl();
                }
                Optional<Gallery> g = galleryRepo.findById(galleryId);
                if (g.isPresent() && g.get().getCoverImageUrl() != null) return g.get().getCoverImageUrl();
                List<GalleryImage> imgs = galleryImageRepo.findByGalleryIdOrderByOrderIndexAsc(galleryId);
                if (imgs != null && !imgs.isEmpty() && imgs.get(0).getImageUrl() != null) return imgs.get(0).getImageUrl();
                return null;
            }
            if ((m = RECIPE_RE.matcher(path)).matches()) {
                Long recipeId = Long.parseLong(m.group(1));
                List<RecipeImage> imgs = recipeImageRepo.findByRecipeIdOrderByOrderIndexAsc(recipeId);
                if (imgs != null && !imgs.isEmpty() && imgs.get(0).getImageUrl() != null) return imgs.get(0).getImageUrl();
                return null;
            }
            if ((m = ARTICLE_RE.matcher(path)).matches()) {
                Long articleId = Long.parseLong(m.group(1));
                Optional<Article> a = articleRepo.findById(articleId);
                if (a.isPresent() && a.get().getImageUrl() != null) return a.get().getImageUrl();
                return null;
            }
            if ((m = PODCAST_RE.matcher(path)).matches()) {
                Long podcastId = Long.parseLong(m.group(1));
                Optional<Podcast> p = podcastRepo.findById(podcastId);
                if (p.isPresent() && p.get().getCoverImageUrl() != null) return p.get().getCoverImageUrl();
                return null;
            }
        } catch (Exception e) {
            log.warn("Hero slide URL resolve failed for '{}': {}", url, e.getMessage());
            return null;
        }

        // Path didn't match any known route — assume it's a direct image URL.
        return url;
    }

    private Long parseImgQueryParam(String query) {
        if (query == null || query.isEmpty()) return null;
        for (String part : query.split("&")) {
            int eq = part.indexOf('=');
            if (eq < 0) continue;
            String key = part.substring(0, eq);
            String val = part.substring(eq + 1);
            if ("img".equals(key)) {
                try { return Long.parseLong(val); } catch (NumberFormatException e) { return null; }
            }
        }
        return null;
    }

    private Integer parseInt(Object v) {
        if (v == null) return null;
        try { return Integer.valueOf(v.toString().trim()); } catch (NumberFormatException e) { return null; }
    }

    private String stringOf(Object v) {
        return v == null ? null : v.toString();
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    // One-time content seed: only runs when no slot has ever been touched by an
    // admin AND no slot already carries a source/image URL. After superadmin
    // saves anything (including clearing slots), updated_by gets set and this
    // function permanently no-ops.
    private void seedDefaultsFromContentIfUntouched() {
        try {
            List<HeroSlide> all = repo.findAll();
            boolean anyTouched = all.stream().anyMatch(s ->
                s.getUpdatedBy() != null
                    || (s.getImageUrl() != null && !s.getImageUrl().isBlank())
                    || (s.getSourceUrl() != null && !s.getSourceUrl().isBlank())
            );
            if (anyTouched) return;

            List<DefaultSlide> picks = new ArrayList<>();
            collectFromGalleries(picks, 3);
            collectFromBooks(picks, 3);
            collectFromRecipes(picks, 1);
            collectFromArticles(picks, 1);
            collectFromPodcasts(picks, 1);
            if (picks.isEmpty()) {
                log.info("Hero slides: no content available to seed defaults");
                return;
            }
            if (picks.size() > SLOT_COUNT) picks = picks.subList(0, SLOT_COUNT);

            LocalDateTime now = LocalDateTime.now();
            int slot = 1;
            for (DefaultSlide d : picks) {
                if (slot > SLOT_COUNT) break;
                Optional<HeroSlide> opt = repo.findById(slot);
                HeroSlide row = opt.orElseGet(HeroSlide::new);
                row.setSlot(slot);
                row.setName(d.name);
                row.setSourceUrl(d.sourceUrl);
                row.setImageUrl(d.imageUrl);
                row.setUpdatedAt(now);
                // updated_by intentionally left null — flags this row as system-seeded,
                // never touched by an admin, so seed won't run again unless someone
                // manually clears updated_by in the DB.
                repo.save(row);
                slot++;
            }
            log.info("Seeded {} hero slides from existing content (admin can replace via Hero Slides tab)", picks.size());
        } catch (Exception e) {
            log.warn("Hero slides default content seed failed: {}", e.getMessage());
        }
    }

    private void collectFromGalleries(List<DefaultSlide> out, int max) {
        try {
            galleryRepo.findAll().stream()
                .filter(g -> g.getCoverImageUrl() != null && !g.getCoverImageUrl().isBlank())
                .filter(g -> g.getStatus() == null || "PUBLISHED".equalsIgnoreCase(g.getStatus()))
                .sorted((a, b) -> compareNullsLastDesc(a.getModifiedDate(), b.getModifiedDate()))
                .limit(max)
                .forEach(g -> out.add(new DefaultSlide(
                    "/gallery/" + g.getId(),
                    g.getCoverImageUrl(),
                    g.getTitle() != null ? g.getTitle() : "Gallery"
                )));
        } catch (Exception e) { log.warn("seed: gallery scan failed: {}", e.getMessage()); }
    }

    private void collectFromBooks(List<DefaultSlide> out, int max) {
        try {
            // Book.coverImageUrl is enriched at runtime, not a column — so we have
            // to walk through pages to find covers. Cheap on prod-scale data.
            // Group page rows by book and pick page 1 (or first non-empty image).
            java.util.Set<Long> seenBooks = new java.util.HashSet<>();
            int added = 0;
            // Iterate pages in any order; use page_number=1 preference and skip empties.
            // Using findAll() is OK for 8-row seed; data volume is small.
            List<Page> pages = pageRepo.findAll();
            // Sort: lower page_number first so we get covers, and group by book.
            pages.sort((a, b) -> Integer.compare(a.getPageNumber(), b.getPageNumber()));
            for (Page p : pages) {
                if (added >= max) break;
                if (p.getImageUrl() == null || p.getImageUrl().isBlank()) continue;
                if (seenBooks.contains(p.getBookId())) continue;
                seenBooks.add(p.getBookId());
                out.add(new DefaultSlide(
                    "/read/" + p.getBookId(),
                    p.getImageUrl(),
                    "Book"
                ));
                added++;
            }
        } catch (Exception e) { log.warn("seed: book scan failed: {}", e.getMessage()); }
    }

    private void collectFromRecipes(List<DefaultSlide> out, int max) {
        try {
            java.util.Set<Long> seen = new java.util.HashSet<>();
            int added = 0;
            // Walk all recipe images; first per recipe wins.
            for (RecipeImage ri : recipeImageRepo.findAll()) {
                if (added >= max) break;
                if (ri.getImageUrl() == null || ri.getImageUrl().isBlank()) continue;
                if (seen.contains(ri.getRecipeId())) continue;
                seen.add(ri.getRecipeId());
                out.add(new DefaultSlide(
                    "/recipes/" + ri.getRecipeId(),
                    ri.getImageUrl(),
                    "Recipe"
                ));
                added++;
            }
        } catch (Exception e) { log.warn("seed: recipe scan failed: {}", e.getMessage()); }
    }

    private void collectFromArticles(List<DefaultSlide> out, int max) {
        try {
            articleRepo.findAll().stream()
                .filter(a -> a.getImageUrl() != null && !a.getImageUrl().isBlank())
                .filter(a -> a.getStatus() == null || "PUBLISHED".equalsIgnoreCase(a.getStatus()))
                .sorted((a, b) -> compareNullsLastDesc(a.getCreatedDate(), b.getCreatedDate()))
                .limit(max)
                .forEach(a -> out.add(new DefaultSlide(
                    "/articles/" + a.getId(),
                    a.getImageUrl(),
                    a.getHeadline() != null ? a.getHeadline() : "Article"
                )));
        } catch (Exception e) { log.warn("seed: article scan failed: {}", e.getMessage()); }
    }

    private void collectFromPodcasts(List<DefaultSlide> out, int max) {
        try {
            podcastRepo.findAll().stream()
                .filter(p -> p.getCoverImageUrl() != null && !p.getCoverImageUrl().isBlank())
                .filter(p -> "PUBLISHED".equalsIgnoreCase(p.getStatus()))
                .sorted((a, b) -> compareNullsLastDesc(a.getCreatedDate(), b.getCreatedDate()))
                .limit(max)
                .forEach(p -> out.add(new DefaultSlide(
                    "/podcasts/" + p.getId(),
                    p.getCoverImageUrl(),
                    p.getTitle() != null ? p.getTitle() : "Podcast"
                )));
        } catch (Exception e) { log.warn("seed: podcast scan failed: {}", e.getMessage()); }
    }

    private static int compareNullsLastDesc(LocalDateTime a, LocalDateTime b) {
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        return b.compareTo(a);
    }

    private static class DefaultSlide {
        final String sourceUrl;
        final String imageUrl;
        final String name;
        DefaultSlide(String sourceUrl, String imageUrl, String name) {
            this.sourceUrl = sourceUrl;
            this.imageUrl = imageUrl;
            this.name = name;
        }
    }
}
