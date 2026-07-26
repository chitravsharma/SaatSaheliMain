package com.SaatSaheli.spring.util;

/**
 * Central definition of what each subscription plan allows. Keep this in sync
 * with the pricing page (FrontEnd/src/pages/Pricing.jsx).
 *
 * Caps are the real, enforceable cost drivers: books and pages (Neon DB) and
 * images (R2). Export (PDF/DOCX) is a paid-tier perk.
 */
public final class PlanLimits {

    public final String plan;
    public final int maxBooks;
    public final int maxPagesPerBook;
    public final int maxImages;
    public final boolean canExport;
    /** Book creation & document/PDF upload is a paid-tier feature — Free cannot create books. */
    public final boolean canCreateBooks;

    private PlanLimits(String plan, int maxBooks, int maxPagesPerBook, int maxImages,
                       boolean canExport, boolean canCreateBooks) {
        this.plan = plan;
        this.maxBooks = maxBooks;
        this.maxPagesPerBook = maxPagesPerBook;
        this.maxImages = maxImages;
        this.canExport = canExport;
        this.canCreateBooks = canCreateBooks;
    }

    public static PlanLimits forPlan(String plan) {
        String p = (plan == null || plan.isBlank()) ? "Free" : plan.trim();
        switch (p) {
            case "Premium":
                return new PlanLimits("Premium", 25, 100, 200, true, true);
            case "Gold":     // legacy tier (no longer sold) — treat as Creator-level
            case "Creator":
                return new PlanLimits(p, 100, 250, 500, true, true);
            case "Free":
            default:
                // Free tier is read-only for authoring — cannot create/upload books.
                return new PlanLimits("Free", 0, 20, 30, false, false);
        }
    }
}
