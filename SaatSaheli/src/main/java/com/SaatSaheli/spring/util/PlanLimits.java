package com.SaatSaheli.spring.util;

/**
 * Per-plan feature limits. Single source of truth — the Pricing page and the
 * Account usage meter render from the same numbers (via /api/account/usage).
 *
 * Plans: Free (reader + basic gallery) · Premium ($3/mo) · Creator/Pro ($7/mo).
 * Gold is a legacy tier treated as Creator. Admins bypass caps (see callers).
 */
public final class PlanLimits {

    public static final int UNLIMITED = -1;
    public static final long MB = 1024L * 1024L;
    public static final long GB = 1024L * MB;

    public final String plan;
    public final int maxBooks;
    public final int maxPagesPerBook;
    /** @deprecated superseded by maxPictures; kept for callers that still read it. */
    public final int maxImages;
    public final boolean canExport;
    /** Book creation & document/PDF upload is a paid-tier feature — Free cannot create books. */
    public final boolean canCreateBooks;

    /** Galleries a user may own. */
    public final int maxGalleries;
    /** Pictures across galleries, recipes and articles (book pages are limited separately). */
    public final int maxPictures;
    /** Total bytes of media this user's content references on R2. */
    public final long maxStorageBytes;
    /** Seller side: mark gallery items For Sale and receive buyer enquiries in Messages. (Any member may contact a seller.) */
    public final boolean canUseMarketChat;
    /** Gallery items that may be marked For Sale at once — UNLIMITED on every paid plan (the gallery/picture/storage caps are the only limits). */
    public final int maxForSaleItems;

    private PlanLimits(String plan, int maxBooks, int maxPagesPerBook, int maxImages,
                       boolean canExport, boolean canCreateBooks,
                       int maxGalleries, int maxPictures, long maxStorageBytes,
                       boolean canUseMarketChat, int maxForSaleItems) {
        this.plan = plan;
        this.maxBooks = maxBooks;
        this.maxPagesPerBook = maxPagesPerBook;
        this.maxImages = maxImages;
        this.canExport = canExport;
        this.canCreateBooks = canCreateBooks;
        this.maxGalleries = maxGalleries;
        this.maxPictures = maxPictures;
        this.maxStorageBytes = maxStorageBytes;
        this.canUseMarketChat = canUseMarketChat;
        this.maxForSaleItems = maxForSaleItems;
    }

    public static PlanLimits forPlan(String plan) {
        String p = (plan == null || plan.isBlank()) ? "Free" : plan.trim();
        switch (p) {
            case "Premium":
                return new PlanLimits("Premium", 10, 50, 300, true, true,
                        15, 300, 2 * GB, true, UNLIMITED);
            case "Gold":     // legacy tier (no longer sold) — treat as Creator-level
            case "Creator":
                return new PlanLimits(p, 25, 100, 1500, true, true,
                        50, 1500, 10 * GB, true, UNLIMITED);
            case "Free":
            default:
                // Free can build a profile and a small gallery; cannot create
                // books, mark items For Sale, or message creators.
                return new PlanLimits("Free", 0, 20, 20, false, false,
                        2, 20, 100 * MB, false, 0);
        }
    }

    public static boolean isUnlimited(int limit) { return limit == UNLIMITED; }
}
