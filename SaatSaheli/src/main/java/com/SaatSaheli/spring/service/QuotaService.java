package com.SaatSaheli.spring.service;

import com.SaatSaheli.spring.model.*;
import com.SaatSaheli.spring.repository.*;
import com.SaatSaheli.spring.util.PlanLimitException;
import com.SaatSaheli.spring.util.PlanLimits;
import com.SaatSaheli.spring.util.RoleUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.*;

/**
 * Plan quotas for galleries / pictures / storage.
 *
 * Usage is derived from what the user's content currently references (so a
 * delete lowers it automatically) joined to the {@link MediaAsset} size ledger.
 * Limits only block NEW uploads — users already over a cap keep everything
 * (grandfathered). Admins are exempt.
 */
@Service
public class QuotaService {

    private static final Logger log = LoggerFactory.getLogger(QuotaService.class);

    @Autowired private UserRepository userRepo;
    @Autowired private GalleryRepository galleryRepo;
    @Autowired private GalleryImageRepository galleryImageRepo;
    @Autowired private BookRepository bookRepo;
    @Autowired private PageRepository pageRepo;
    @Autowired private RecipeRepository recipeRepo;
    @Autowired private RecipeImageRepository recipeImageRepo;
    @Autowired private ArticleRepository articleRepo;
    @Autowired private MediaAssetRepository mediaAssetRepo;

    @Value("${r2.public-base-url:}")
    private String r2PublicBaseUrl;

    @Value("${app.quota.backfill-on-startup:true}")
    private boolean backfillOnStartup;

    /** Snapshot of a user's plan + usage, shaped for /api/account/usage. */
    public static class Usage {
        public String plan;
        public boolean admin;
        public int galleriesUsed;      public int galleriesLimit;
        public int picturesUsed;       public int picturesLimit;
        public long storageUsedBytes;  public long storageLimitBytes;
        public int forSaleUsed;        public int forSaleLimit;
        public boolean canUseMarketChat;
        public boolean canCreateBooks;
        public int booksUsed;          public int booksLimit;

        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("plan", plan);
            m.put("admin", admin);
            m.put("galleries", counter(galleriesUsed, galleriesLimit));
            m.put("pictures", counter(picturesUsed, picturesLimit));
            Map<String, Object> st = new LinkedHashMap<>();
            st.put("usedBytes", storageUsedBytes);
            st.put("limitBytes", storageLimitBytes);
            m.put("storage", st);
            m.put("forSale", counter(forSaleUsed, forSaleLimit));
            m.put("books", counter(booksUsed, booksLimit));
            m.put("canUseMarketChat", canUseMarketChat);
            m.put("canCreateBooks", canCreateBooks);
            return m;
        }
        private static Map<String, Object> counter(int used, int limit) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("used", used);
            c.put("limit", limit); // -1 = unlimited
            return c;
        }
    }

    public PlanLimits limitsFor(User u) {
        return PlanLimits.forPlan(u == null ? "Free" : u.getPlan());
    }

    public boolean isAdmin(User u) {
        return u != null && RoleUtil.isAdmin(u.getRole());
    }

    /** Full usage snapshot for the Account page meter. */
    public Usage usageFor(Long userId) {
        User u = userId == null ? null : userRepo.findById(userId).orElse(null);
        PlanLimits lim = limitsFor(u);
        Usage usage = new Usage();
        usage.plan = lim.plan;
        usage.admin = isAdmin(u);
        usage.galleriesLimit = lim.maxGalleries;
        usage.picturesLimit = lim.maxPictures;
        usage.storageLimitBytes = lim.maxStorageBytes;
        usage.forSaleLimit = lim.maxForSaleItems;
        usage.booksLimit = lim.maxBooks;
        usage.canUseMarketChat = lim.canUseMarketChat || usage.admin;
        usage.canCreateBooks = lim.canCreateBooks || usage.admin;
        if (u == null) return usage;

        Set<String> urls = new HashSet<>();
        int pictures = 0;
        int forSale = 0;

        List<Gallery> galleries = galleryRepo.findByUserId(userId);
        usage.galleriesUsed = galleries.size();
        for (Gallery g : galleries) {
            for (GalleryImage img : galleryImageRepo.findByGalleryIdOrderByOrderIndexAsc(g.getId())) {
                pictures++;
                if (img.isForSale()) forSale++;
                add(urls, img.getImageUrl());
            }
        }
        List<Book> books = bookRepo.findByUserId(userId);
        usage.booksUsed = books.size();
        for (Book b : books) {
            for (Page pg : pageRepo.findByBookIdOrderByPageNumberAsc(b.getId())) {
                add(urls, pg.getImageUrl());
                add(urls, pg.getImageUrl2());
            }
        }
        for (Recipe r : recipeRepo.findByUserIdOrderByCreatedDateDesc(userId)) {
            for (RecipeImage ri : recipeImageRepo.findByRecipeIdOrderByOrderIndexAsc(r.getId())) {
                pictures++;
                add(urls, ri.getImageUrl());
            }
        }
        for (Article a : articleRepo.findByUserIdOrderByCreatedDateDesc(userId)) {
            if (add(urls, a.getImageUrl())) pictures++;
        }
        add(urls, u.getProfileImageUrl());

        usage.picturesUsed = pictures;
        usage.forSaleUsed = forSale;
        usage.storageUsedBytes = bytesFor(urls);
        return usage;
    }

    private static boolean add(Set<String> urls, String url) {
        if (url == null || url.isBlank()) return false;
        urls.add(url);
        return true;
    }

    private long bytesFor(Set<String> urls) {
        if (urls.isEmpty()) return 0;
        long total = 0;
        List<String> list = new ArrayList<>(urls);
        for (int i = 0; i < list.size(); i += 500) {
            for (MediaAsset a : mediaAssetRepo.findByUrlIn(list.subList(i, Math.min(i + 500, list.size())))) {
                total += a.getSizeBytes();
            }
        }
        return total;
    }

    // ── Gates (throw PlanLimitException → 403 upgradeRequired) ───────────────

    /** Before creating a gallery. */
    public void assertCanCreateGallery(Long userId) {
        User u = userRepo.findById(userId).orElse(null);
        if (isAdmin(u)) return;
        PlanLimits lim = limitsFor(u);
        int used = galleryRepo.findByUserId(userId).size();
        if (!PlanLimits.isUnlimited(lim.maxGalleries) && used >= lim.maxGalleries) {
            throw new PlanLimitException("You've reached your " + lim.plan + " plan limit of "
                    + lim.maxGalleries + " galleries. Upgrade your plan to add more.");
        }
    }

    /** Before adding a picture to a gallery (count + storage). */
    public void assertCanAddPicture(Long userId, long incomingBytes) {
        User u = userRepo.findById(userId).orElse(null);
        if (isAdmin(u)) return;
        PlanLimits lim = limitsFor(u);
        Usage usage = usageFor(userId);
        if (!PlanLimits.isUnlimited(lim.maxPictures) && usage.picturesUsed >= lim.maxPictures) {
            throw new PlanLimitException("You've reached your " + lim.plan + " plan limit of "
                    + lim.maxPictures + " pictures. Upgrade your plan to upload more.");
        }
        assertStorage(lim, usage, incomingBytes);
    }

    /** Before any generic upload (storage only — the caller's context is unknown). */
    public void assertCanStore(Long userId, long incomingBytes) {
        if (userId == null) return;
        User u = userRepo.findById(userId).orElse(null);
        if (isAdmin(u)) return;
        assertStorage(limitsFor(u), usageFor(userId), incomingBytes);
    }

    private void assertStorage(PlanLimits lim, Usage usage, long incomingBytes) {
        if (lim.maxStorageBytes <= 0) return;
        // Incoming size is the raw upload; the stored JPEG is usually smaller, so this
        // is a conservative check. Already-over users are blocked only for NEW uploads.
        if (usage.storageUsedBytes >= lim.maxStorageBytes
                || usage.storageUsedBytes + incomingBytes > lim.maxStorageBytes) {
            throw new PlanLimitException("You've used " + human(usage.storageUsedBytes) + " of your "
                    + lim.plan + " plan's " + human(lim.maxStorageBytes)
                    + " storage. Delete some pictures or upgrade your plan.");
        }
    }

    public static String human(long bytes) {
        if (bytes >= PlanLimits.GB) return String.format("%.1f GB", bytes / (double) PlanLimits.GB);
        if (bytes >= PlanLimits.MB) return String.format("%.0f MB", bytes / (double) PlanLimits.MB);
        return String.format("%d KB", Math.max(1, bytes / 1024));
    }

    // ── One-time ledger backfill for objects uploaded before the ledger existed ──

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        if (backfillOnStartup) backfillLedger();
    }

    /** HEADs every referenced R2 URL that has no ledger row. Async, idempotent, non-fatal. */
    @Async("notificationExecutor")
    public void backfillLedger() {
        try {
            if (r2PublicBaseUrl == null || r2PublicBaseUrl.isBlank()) return;
            Set<String> urls = new HashSet<>();
            galleryImageRepo.findAll().forEach(i -> add(urls, i.getImageUrl()));
            pageRepo.findAll().forEach(p -> { add(urls, p.getImageUrl()); add(urls, p.getImageUrl2()); });
            recipeImageRepo.findAll().forEach(i -> add(urls, i.getImageUrl()));
            articleRepo.findAll().forEach(a -> add(urls, a.getImageUrl()));
            userRepo.findAll().forEach(u -> add(urls, u.getProfileImageUrl()));
            urls.removeIf(x -> !x.startsWith(r2PublicBaseUrl));

            Set<String> known = new HashSet<>();
            List<String> list = new ArrayList<>(urls);
            for (int i = 0; i < list.size(); i += 500) {
                mediaAssetRepo.findByUrlIn(list.subList(i, Math.min(i + 500, list.size())))
                        .forEach(a -> known.add(a.getUrl()));
            }
            int added = 0;
            for (String url : urls) {
                if (known.contains(url)) continue;
                long size = headSize(url);
                if (size < 0) continue;
                mediaAssetRepo.save(new MediaAsset(url, size, null));
                added++;
            }
            if (added > 0) log.info("Media ledger backfill: recorded sizes for {} existing object(s)", added);
        } catch (Exception e) {
            log.warn("Media ledger backfill failed: {}", e.getMessage());
        }
    }

    private static long headSize(String url) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setRequestMethod("HEAD");
            c.setConnectTimeout(4000);
            c.setReadTimeout(4000);
            if (c.getResponseCode() != 200) return -1;
            return c.getContentLengthLong();
        } catch (Exception e) {
            return -1;
        }
    }
}
