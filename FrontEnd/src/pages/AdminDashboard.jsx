import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import MagazineEditor from "./MagazineEditor";
import "./AdminDashboard.css";

const API = process.env.REACT_APP_API_URL;

const PST_TZ = "America/Los_Angeles";
const toPSTTime = (dateStr) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleTimeString("en-US", { timeZone: PST_TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
};
const toPSTDate = (dateStr, opts) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", { timeZone: PST_TZ, ...opts });
};
// Backend sends timestamps as "yyyy-MM-dd HH:mm:ss" with no zone suffix; the
// underlying LocalDateTime.now() is captured in UTC on the Render JVM. Treat
// the string as UTC (append "Z" after swapping the space for "T") and render
// in Pacific with the TZ abbreviation so admins aren't guessing the zone.
const toPSTDateTime = (dateStr) => {
    if (!dateStr) return "\u2014";
    const iso = typeof dateStr === "string" && !dateStr.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(dateStr)
        ? dateStr.replace(" ", "T") + "Z"
        : dateStr;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", {
        timeZone: PST_TZ,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZoneName: "short",
    });
};

const fmtMoney = (amt, cur) => (amt == null ? "\u2014" : `${(cur || "").toUpperCase()} ${Number(amt).toFixed(2)}`);

// Click-to-sort helpers for the admin tables. Cycle: unsorted \u2192 asc \u2192 desc \u2192 unsorted.
// `type: "date"` accessors should return ISO strings (or null) \u2014 string compare handles
// ordering correctly for ISO dates. `type: "string"` lower-cases for case-insensitive sort.
const toggleSort = (setSort, key) => {
    setSort(prev => {
        if (prev.key !== key) return { key, dir: "asc" };
        if (prev.dir === "asc") return { key, dir: "desc" };
        return { key: null, dir: "asc" };
    });
};

const applySort = (rows, sort, accessors) => {
    if (!sort.key) return rows;
    const acc = accessors[sort.key];
    if (!acc) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
        const av = acc(a);
        const bv = acc(b);
        const aNull = av == null || av === "";
        const bNull = bv == null || bv === "";
        if (aNull && bNull) return 0;
        if (aNull) return 1;      // nulls last, regardless of direction
        if (bNull) return -1;
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
    });
    return copy;
};

const SortArrow = ({ sort, col }) => {
    if (sort.key !== col) return <span style={{ marginLeft: 4, fontSize: "0.7em", opacity: 0.3 }}>\u2195</span>;
    return <span style={{ marginLeft: 4, fontSize: "0.75em" }}>{sort.dir === "asc" ? "\u25b2" : "\u25bc"}</span>;
};

const sortableTh = (label, sort, setSort, col) => (
    <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(setSort, col)}>
        {label}<SortArrow sort={sort} col={col} />
    </th>
);

const AdminDashboard = () => {
    const { user, isSuperAdmin } = useAuth();
    const strings = useStrings();
    const s = strings.admin || {};

    const [tab, setTab] = useState("stats");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [books, setBooks] = useState([]);
    const [articles, setArticles] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [recipeSearch, setRecipeSearch] = useState("");
    const [recipeStatusFilter, setRecipeStatusFilter] = useState("");
    const [galleries, setGalleries] = useState([]);
    const [gallerySearch, setGallerySearch] = useState("");
    const [galleryStatusFilter, setGalleryStatusFilter] = useState("");
    const [listings, setListings] = useState([]);
    const [listingSearch, setListingSearch] = useState("");
    const [listingStatusFilter, setListingStatusFilter] = useState("");
    const [bookSearch, setBookSearch] = useState("");
    const [bookStatusFilter, setBookStatusFilter] = useState("");
    const [auditRows, setAuditRows] = useState([]);
    const [auditActorFilter, setAuditActorFilter] = useState("");
    const [auditTargetFilter, setAuditTargetFilter] = useState("");
    const [auditPathFilter, setAuditPathFilter] = useState("");
    const [auditOnlyImpersonated, setAuditOnlyImpersonated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [articleSearch, setArticleSearch] = useState("");
    const [articleTypeFilter, setArticleTypeFilter] = useState("");
    const [articleStatusFilter, setArticleStatusFilter] = useState("");

    // Per-table sort state for the admin console. Null key = original order.
    const [userSort, setUserSort] = useState({ key: null, dir: "asc" });
    const [bookSort, setBookSort] = useState({ key: null, dir: "asc" });
    const [articleSort, setArticleSort] = useState({ key: null, dir: "asc" });
    const [recipeSort, setRecipeSort] = useState({ key: null, dir: "asc" });
    const [gallerySort, setGallerySort] = useState({ key: null, dir: "asc" });
    const [listingSort, setListingSort] = useState({ key: null, dir: "asc" });
    const [adSort, setAdSort] = useState({ key: null, dir: "asc" });
    const [querySort, setQuerySort] = useState({ key: null, dir: "asc" });
    const [payments, setPayments] = useState([]);
    const [paymentSummary, setPaymentSummary] = useState(null);
    const [paymentTypeFilter, setPaymentTypeFilter] = useState("");
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
    const [resetNewPassword, setResetNewPassword] = useState("");

    // Hero Slides — fixed 5-slot decorative carousel on the home hero.
    // sourceUrl = what admin pastes (page URL or direct image URL).
    // imageUrl  = resolved direct image URL returned by backend (read-only in form).
    const HERO_SLOT_COUNT = 5;
    const [heroSlides, setHeroSlides] = useState(() =>
        Array.from({ length: HERO_SLOT_COUNT }, (_, i) => ({ slot: i + 1, name: "", sourceUrl: "", imageUrl: "" }))
    );
    const [heroSavingSlides, setHeroSavingSlides] = useState(false);

    // Render resolved image URLs in the preview the same way the public site does.
    const resolveHeroImageUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("/uploads/")) return `${API}${url}`;
        const match = url.match(/\/file\/d\/([^/]+)\//);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
        return url;
    };

    const fetchHeroSlides = useCallback(async () => {
        try {
            const res = await api.get(`${API}/api/hero-slides/all`);
            const rows = Array.isArray(res.data) ? res.data : [];
            const merged = Array.from({ length: HERO_SLOT_COUNT }, (_, i) => {
                const found = rows.find(r => r.slot === i + 1);
                return {
                    slot: i + 1,
                    name: found?.name || "",
                    sourceUrl: found?.sourceUrl || "",
                    imageUrl: found?.imageUrl || "",
                };
            });
            setHeroSlides(merged);
        } catch { /* ignore */ }
    }, []);

    const updateHeroSlide = (slot, field, value) => {
        setHeroSlides(prev => prev.map(s => s.slot === slot ? { ...s, [field]: value } : s));
    };

    const clearHeroSlide = (slot) => {
        setHeroSlides(prev => prev.map(s => s.slot === slot ? { ...s, name: "", sourceUrl: "", imageUrl: "" } : s));
    };

    const saveHeroSlides = async () => {
        setHeroSavingSlides(true);
        try {
            const payload = {
                slides: heroSlides.map(s => ({
                    slot: s.slot,
                    name: s.name,
                    sourceUrl: s.sourceUrl,
                })),
            };
            await api.put(`${API}/api/hero-slides`, payload);
            setMessage("Hero slides saved");
            fetchHeroSlides();
        } catch {
            setMessage("Failed to save hero slides");
        }
        setHeroSavingSlides(false);
    };

    // Advertisement banner state
    const [advertisements, setAdvertisements] = useState([]);
    const [adTitle, setAdTitle] = useState("");
    const [adContentType, setAdContentType] = useState("text"); // "text" | "html" | "image"
    const [adHtmlContent, setAdHtmlContent] = useState("");
    const [adImageUrl, setAdImageUrl] = useState("");
    const [adImageFile, setAdImageFile] = useState(null);
    const [adLinkUrl, setAdLinkUrl] = useState("");
    const [adAnimation, setAdAnimation] = useState("static"); // "static" | "scroll" | "blink"
    const [adPlacement, setAdPlacement] = useState("HEADER_TOP"); // "HEADER_TOP" | "FOOTER_TOP" | "SIDE_RAIL"
    const [adWidth, setAdWidth] = useState(""); // px; blank = CSS default
    const [adHeight, setAdHeight] = useState(""); // px; blank = CSS default
    const [adActive, setAdActive] = useState(true);
    const [adUploading, setAdUploading] = useState(false);
    const [editingAdId, setEditingAdId] = useState(null);

    const fetchAdvertisements = useCallback(async () => {
        try {
            const res = await api.get(`${API}/api/advertisements`);
            setAdvertisements(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ }
    }, [user?.userId]);

    const handleAdImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setAdUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await api.post(`${API}/api/upload`, formData);
            setAdImageUrl(res.data.url);
            setAdImageFile(file);
        } catch {
            setMessage("Failed to upload image");
        }
        setAdUploading(false);
    };

    const resetAdForm = () => {
        setAdTitle(""); setAdHtmlContent(""); setAdImageUrl(""); setAdImageFile(null);
        setAdLinkUrl(""); setAdAnimation("static"); setAdPlacement("HEADER_TOP");
        setAdWidth(""); setAdHeight("");
        setAdActive(true); setAdContentType("text"); setEditingAdId(null);
    };

    const startEditAd = (ad) => {
        setEditingAdId(ad.id);
        setAdTitle(ad.title || "");
        setAdContentType(ad.contentType || "text");
        setAdHtmlContent(ad.htmlContent || "");
        setAdImageUrl(ad.imageUrl || "");
        setAdImageFile(null);
        setAdLinkUrl(ad.linkUrl || "");
        setAdAnimation(ad.animation || "static");
        setAdPlacement(ad.placement || "HEADER_TOP");
        setAdWidth(ad.width ? String(ad.width) : "");
        setAdHeight(ad.height ? String(ad.height) : "");
        setAdActive(ad.active !== false);
        setTimeout(() => {
            const form = document.querySelector(".admin-maint-form");
            if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
    };

    const saveAdvertisement = async () => {
        if (!adTitle.trim()) {
            setMessage("Please enter an advertisement title");
            return;
        }
        if (adContentType === "image" && !adImageUrl) {
            setMessage("Please upload an image for the advertisement");
            return;
        }
        if (adContentType === "html" && !adHtmlContent.trim()) {
            setMessage("Please enter HTML content for the advertisement");
            return;
        }
        try {
            const payload = {
                userId: user.userId,
                title: adTitle,
                contentType: adContentType,
                htmlContent: adContentType === "html" ? adHtmlContent : "",
                imageUrl: adContentType === "image" ? adImageUrl : "",
                linkUrl: adLinkUrl,
                animation: adAnimation,
                placement: adPlacement,
                width: adWidth === "" ? null : Number(adWidth),
                height: adHeight === "" ? null : Number(adHeight),
                active: adActive,
            };
            if (editingAdId) {
                await api.put(`${API}/api/advertisements/${editingAdId}`, payload);
                setMessage("Advertisement updated successfully");
            } else {
                await api.post(`${API}/api/advertisements`, payload);
                setMessage("Advertisement added successfully");
            }
            resetAdForm();
            fetchAdvertisements();
        } catch {
            setMessage(editingAdId ? "Failed to update advertisement" : "Failed to create advertisement");
        }
    };

    const removeAdvertisement = async (id) => {
        if (!window.confirm("Remove this advertisement?")) return;
        try {
            await api.delete(`${API}/api/advertisements/${id}`);
            setMessage("Advertisement removed");
            fetchAdvertisements();
        } catch {
            setMessage("Failed to remove advertisement");
        }
    };

    const toggleAdActive = async (id) => {
        try {
            await api.put(`${API}/api/advertisements/${id}/toggle`, {});
            fetchAdvertisements();
        } catch {
            setMessage("Failed to toggle advertisement status");
        }
    };

    // Maintenance window state
    const [maintenanceWindows, setMaintenanceWindows] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("ss_maintenance_windows") || "[]");
        } catch { return []; }
    });
    const [mwDate, setMwDate] = useState("");
    const [mwStartTime, setMwStartTime] = useState("");
    const [mwEndTime, setMwEndTime] = useState("");
    const [mwDescription, setMwDescription] = useState("");
    const [mwActive, setMwActive] = useState(true);

    const saveMaintenanceWindows = (windows) => {
        setMaintenanceWindows(windows);
        localStorage.setItem("ss_maintenance_windows", JSON.stringify(windows));
    };

    const addMaintenanceWindow = () => {
        if (!mwDate || !mwStartTime || !mwEndTime) {
            setMessage("Please fill in date, start time, and end time");
            return;
        }
        const newWindow = {
            id: Date.now(),
            date: mwDate,
            startTime: mwStartTime,
            endTime: mwEndTime,
            description: mwDescription || "Scheduled maintenance",
            active: mwActive,
        };
        saveMaintenanceWindows([...maintenanceWindows, newWindow]);
        setMwDate(""); setMwStartTime(""); setMwEndTime(""); setMwDescription(""); setMwActive(true);
        setMessage("Maintenance window added");
    };

    const removeMaintenanceWindow = (id) => {
        saveMaintenanceWindows(maintenanceWindows.filter(w => w.id !== id));
        setMessage("Maintenance window removed");
    };

    const toggleMaintenanceActive = (id) => {
        saveMaintenanceWindows(maintenanceWindows.map(w =>
            w.id === id ? { ...w, active: !w.active } : w
        ));
    };

    // Support Queries state
    const [supportQueries, setSupportQueries] = useState([]);
    const [supportLoading, setSupportLoading] = useState(false);
    const [supportFilter, setSupportFilter] = useState("ALL");
    const [supportSearch, setSupportSearch] = useState("");
    const [expandedQueryId, setExpandedQueryId] = useState(null);
    const [selectedQueryIds, setSelectedQueryIds] = useState(() => new Set());
    // Rows whose status was just changed — kept visible in the table for ~6 seconds
    // even if the active filter would otherwise hide them, so admins can see the
    // change persist instead of thinking the row was deleted.
    const [recentlyUpdatedQueryIds, setRecentlyUpdatedQueryIds] = useState(() => new Set());

    // Analytics state
    const [analytics, setAnalytics] = useState(null);
    const [analyticsDays, setAnalyticsDays] = useState(7);
    const [recentVisits, setRecentVisits] = useState([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const fetchAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const [summaryRes, recentRes] = await Promise.all([
                api.get(`${API}/api/analytics/summary?days=${analyticsDays}`),
                api.get(`${API}/api/analytics/recent?limit=30`),
            ]);
            setAnalytics(summaryRes.data);
            setRecentVisits(Array.isArray(recentRes.data) ? recentRes.data : []);
        } catch { /* ignore */ }
        setAnalyticsLoading(false);
    }, [user?.userId, analyticsDays]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get(`${API}/api/admin/stats`);
            setStats(res.data);
        } catch { /* ignore */ }
    }, [user?.userId]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/api/admin/users`);
            setUsers(res.data);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchBooks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/api/admin/books`);
            setBooks(res.data);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/api/admin/articles`);
            setArticles(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchRecipes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/api/admin/recipes`);
            setRecipes(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchGalleries = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/api/admin/galleries`);
            setGalleries(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchListings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API}/api/admin/marketplace`);
            setListings(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchAuditLog = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", "200");
            if (auditActorFilter.trim()) params.set("actorUserId", auditActorFilter.trim());
            if (auditTargetFilter.trim()) params.set("targetUserId", auditTargetFilter.trim());
            if (auditPathFilter.trim()) params.set("pathContains", auditPathFilter.trim());
            const res = await api.get(`${API}/api/admin/audit-log?${params.toString()}`);
            setAuditRows(Array.isArray(res.data) ? res.data : []);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId, auditActorFilter, auditTargetFilter, auditPathFilter]);

    const fetchSupportQueries = useCallback(async () => {
        setSupportLoading(true);
        try {
            const res = await api.get(`${API}/api/contact`);
            setSupportQueries(Array.isArray(res.data) ? res.data : []);
            setSelectedQueryIds(new Set());
        } catch { /* ignore */ }
        setSupportLoading(false);
    }, [user?.userId]);

    const fetchPayments = useCallback(async () => {
        setPaymentsLoading(true);
        try {
            const qs = paymentTypeFilter ? `?type=${encodeURIComponent(paymentTypeFilter)}` : "";
            const res = await api.get(`${API}/api/admin/payments${qs}`);
            setPayments(Array.isArray(res.data?.transactions) ? res.data.transactions : []);
            setPaymentSummary(res.data || null);
        } catch { /* ignore */ }
        setPaymentsLoading(false);
    }, [user?.userId, paymentTypeFilter]);

    const [refreshingReceiptId, setRefreshingReceiptId] = useState(null);
    const refreshReceipt = async (paymentId) => {
        setRefreshingReceiptId(paymentId);
        try {
            const res = await api.post(`${API}/api/admin/payments/${paymentId}/refresh-receipt`);
            const tx = res.data?.transaction;
            if (tx) {
                setPayments(prev => prev.map(p => (p.id === paymentId ? { ...p, ...tx } : p)));
            }
            if (!res.data?.updated) {
                window.alert("No receipt found on Stripe for this payment yet.");
            }
        } catch {
            window.alert("Could not refresh receipt from Stripe.");
        }
        setRefreshingReceiptId(null);
    };

    const updateQueryStatus = async (queryId, newStatus) => {
        try {
            await api.put(`${API}/api/contact/${queryId}/status`, { status: newStatus });
            // Optimistically patch the row in local state so the badge updates instantly,
            // and mark it as recently-updated so the filter keeps it visible.
            setSupportQueries(prev => prev.map(q => q.id === queryId ? { ...q, status: newStatus } : q));
            setRecentlyUpdatedQueryIds(prev => {
                const next = new Set(prev);
                next.add(queryId);
                return next;
            });
            setTimeout(() => {
                setRecentlyUpdatedQueryIds(prev => {
                    const next = new Set(prev);
                    next.delete(queryId);
                    return next;
                });
            }, 6000);
            setMessage("Status updated to " + newStatus.replace(/_/g, " "));
        } catch {
            setMessage("Failed to update status");
        }
    };

    const deleteQuery = async (queryId) => {
        if (!window.confirm("Delete this support query permanently?")) return;
        try {
            await api.delete(`${API}/api/contact/${queryId}`);
            setMessage("Support query deleted");
            fetchSupportQueries();
        } catch {
            setMessage("Failed to delete query");
        }
    };

    // Display ID derived from subject + raw db id. Classification mirrors
    // EmailService.sendContactNotification so the prefix matches the form type:
    //   M00026   — Magazine Submission
    //   HS00027  — Help & Support
    //   FE00028  — Feedback
    //   CU00029  — Contact Us (anything else)
    // DB primary key stays unchanged — this is purely display formatting.
    const formatQueryId = (q) => {
        const padded = String(q.id).padStart(5, "0");
        const subj = q.subject || "";
        if (subj.startsWith("Magazine Submission:")) return `M${padded}`;
        if (subj.startsWith("Help & Support:")) return `HS${padded}`;
        if (subj.toLowerCase().startsWith("feedback")) return `FE${padded}`;
        return `CU${padded}`;
    };

    const toggleQuerySelection = (queryId) => {
        setSelectedQueryIds(prev => {
            const next = new Set(prev);
            if (next.has(queryId)) next.delete(queryId);
            else next.add(queryId);
            return next;
        });
    };

    const bulkDeleteSelectedQueries = async () => {
        if (selectedQueryIds.size === 0) return;
        // Build a confirmation message that lists each row's id and subject so the
        // admin can verify exactly what they're about to delete.
        const selectedRows = supportQueries.filter(q => selectedQueryIds.has(q.id));
        const lines = selectedRows.map(q => `  ${formatQueryId(q)}  —  ${q.subject || "(no subject)"}`).join("\n");
        const confirmMsg =
            `Delete the following ${selectedRows.length} support ${selectedRows.length === 1 ? "query" : "queries"} permanently?\n\n` +
            lines +
            `\n\nThis cannot be undone.`;
        if (!window.confirm(confirmMsg)) return;
        try {
            const ids = Array.from(selectedQueryIds);
            const res = await api.post(`${API}/api/contact/bulk-delete`, { ids });
            setMessage(res?.data?.message || `Deleted ${ids.length} support queries`);
            setSelectedQueryIds(new Set());
            fetchSupportQueries();
        } catch {
            setMessage("Failed to delete selected queries");
        }
    };

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (tab === "users") fetchUsers();
        if (tab === "books") fetchBooks();
        if (tab === "articles") fetchArticles();
        if (tab === "recipes") fetchRecipes();
        if (tab === "galleries") fetchGalleries();
        if (tab === "marketplace") fetchListings();
        if (tab === "audit") fetchAuditLog();
        if (tab === "analytics") fetchAnalytics();
        if (tab === "advertisements") fetchAdvertisements();
        if (tab === "support") fetchSupportQueries();
        if (tab === "payments") fetchPayments();
        if (tab === "heroSlides") fetchHeroSlides();
    }, [tab, fetchUsers, fetchBooks, fetchArticles, fetchRecipes, fetchGalleries, fetchListings, fetchAuditLog, fetchAnalytics, fetchAdvertisements, fetchSupportQueries, fetchPayments, fetchHeroSlides]);

    const changeRole = async (userId, newRole) => {
        try {
            await api.put(`${API}/api/admin/users/${userId}/role`, { role: newRole });
            setMessage(s.roleUpdated || "Role updated");
            fetchUsers();
        } catch {
            setMessage(s.roleUpdateFailed || "Failed to update role");
        }
    };

    const changeStatus = async (userId, newStatus) => {
        try {
            await api.put(`${API}/api/admin/users/${userId}/status`, { status: newStatus });
            setMessage(s.statusUpdated || "Status updated");
            fetchUsers();
        } catch {
            setMessage(s.statusUpdateFailed || "Failed to update status");
        }
    };

    const deleteBook = async (bookId) => {
        if (!window.confirm(s.confirmDeleteBook || "Delete this book?")) return;
        try {
            await api.delete(`${API}/api/admin/books/${bookId}`);
            setMessage(s.bookDeleted || "Book deleted");
            fetchBooks();
            fetchStats();
        } catch {
            setMessage(s.bookDeleteFailed || "Failed to delete book");
        }
    };

    const archiveBook = async (bookId) => {
        try {
            await api.put(`${API}/api/admin/books/${bookId}/archive`, {});
            setMessage("Book archived");
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to archive book");
        }
    };

    const recoverBook = async (bookId) => {
        try {
            await api.put(`${API}/api/admin/books/${bookId}/recover`, {});
            setMessage("Book recovered to Draft");
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to recover book");
        }
    };

    const purgeBook = async (bookId) => {
        if (!window.confirm("Permanently purge this book and all its pages? This cannot be undone.")) return;
        try {
            await api.delete(`${API}/api/admin/books/${bookId}/purge`);
            setMessage("Book permanently purged");
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to purge book");
        }
    };

    // ─── Article Admin Actions ───
    const deleteArticle = async (articleId) => {
        if (!window.confirm("Delete this article/blog/poem?")) return;
        try {
            await api.delete(`${API}/api/admin/articles/${articleId}`);
            setMessage("Article deleted");
            fetchArticles();
            fetchStats();
        } catch {
            setMessage("Failed to delete article");
        }
    };

    const changeArticleStatus = async (articleId, newStatus) => {
        try {
            await api.put(`${API}/api/admin/articles/${articleId}/status`, { status: newStatus });
            setMessage(`Article ${newStatus === "PUBLISHED" ? "published" : "unpublished"}`);
            fetchArticles();
            fetchStats();
        } catch {
            setMessage("Failed to change article status");
        }
    };

    const handleArticleAction = (articleId, action, status) => {
        switch (action) {
            case "publish": changeArticleStatus(articleId, "PUBLISHED"); break;
            case "unpublish": changeArticleStatus(articleId, "DRAFT"); break;
            case "delete": deleteArticle(articleId); break;
            default: break;
        }
    };

    // ─── Recipe Admin Actions ───
    const deleteRecipe = async (recipeId) => {
        if (!window.confirm("Delete this recipe?")) return;
        try {
            await api.delete(`${API}/api/admin/recipes/${recipeId}`);
            setMessage("Recipe deleted");
            fetchRecipes();
            fetchStats();
        } catch {
            setMessage("Failed to delete recipe");
        }
    };

    const changeRecipeStatus = async (recipeId, newStatus) => {
        try {
            await api.put(`${API}/api/admin/recipes/${recipeId}/status`, { status: newStatus });
            setMessage(`Recipe ${newStatus === "PUBLISHED" ? "published" : "unpublished"}`);
            fetchRecipes();
            fetchStats();
        } catch {
            setMessage("Failed to change recipe status");
        }
    };

    const handleRecipeAction = (recipeId, action) => {
        switch (action) {
            case "publish": changeRecipeStatus(recipeId, "PUBLISHED"); break;
            case "unpublish": changeRecipeStatus(recipeId, "DRAFT"); break;
            case "delete": deleteRecipe(recipeId); break;
            default: break;
        }
    };

    const filteredRecipes = recipes.filter((r) => {
        if (recipeStatusFilter && r.status !== recipeStatusFilter) return false;
        if (!recipeSearch.trim()) return true;
        const q = recipeSearch.toLowerCase();
        return (
            (r.recipeName || "").toLowerCase().includes(q) ||
            (r.authorName || "").toLowerCase().includes(q) ||
            (r.cuisine || "").toLowerCase().includes(q) ||
            (r.status || "").toLowerCase().includes(q) ||
            String(r.id).includes(q)
        );
    });

    // ─── Gallery Admin Actions ───
    const deleteGallery = async (galleryId) => {
        if (!window.confirm("Delete this gallery and all its images?")) return;
        try {
            await api.delete(`${API}/api/admin/galleries/${galleryId}`);
            setMessage("Gallery deleted");
            fetchGalleries();
            fetchStats();
        } catch {
            setMessage("Failed to delete gallery");
        }
    };

    const changeGalleryStatus = async (galleryId, newStatus) => {
        try {
            await api.put(`${API}/api/admin/galleries/${galleryId}/status`, { status: newStatus });
            setMessage(`Gallery ${newStatus === "PUBLISHED" ? "published" : "unpublished"}`);
            fetchGalleries();
            fetchStats();
        } catch {
            setMessage("Failed to change gallery status");
        }
    };

    const handleGalleryAction = (galleryId, action) => {
        switch (action) {
            case "publish": changeGalleryStatus(galleryId, "PUBLISHED"); break;
            case "unpublish": changeGalleryStatus(galleryId, "DRAFT"); break;
            case "delete": deleteGallery(galleryId); break;
            default: break;
        }
    };

    const filteredGalleries = galleries.filter((g) => {
        if (galleryStatusFilter && (g.status || "").toUpperCase() !== galleryStatusFilter) return false;
        if (!gallerySearch.trim()) return true;
        const q = gallerySearch.toLowerCase();
        return (
            (g.title || "").toLowerCase().includes(q) ||
            (g.authorName || "").toLowerCase().includes(q) ||
            (g.description || "").toLowerCase().includes(q) ||
            (g.status || "").toLowerCase().includes(q) ||
            String(g.id).includes(q)
        );
    });

    // ─── Marketplace Admin Actions ───
    const deleteListing = async (listingId) => {
        if (!window.confirm("Delete this listing?")) return;
        try {
            await api.delete(`${API}/api/admin/marketplace/${listingId}`);
            setMessage("Listing deleted");
            fetchListings();
            fetchStats();
        } catch {
            setMessage("Failed to delete listing");
        }
    };

    const changeListingStatus = async (listingId, newStatus) => {
        try {
            await api.put(`${API}/api/admin/marketplace/${listingId}/status`, { status: newStatus });
            setMessage(`Listing set to ${newStatus.toLowerCase()}`);
            fetchListings();
            fetchStats();
        } catch {
            setMessage("Failed to change listing status");
        }
    };

    const handleListingAction = (listingId, action) => {
        switch (action) {
            case "activate": changeListingStatus(listingId, "ACTIVE"); break;
            case "sold": changeListingStatus(listingId, "SOLD"); break;
            case "remove": changeListingStatus(listingId, "REMOVED"); break;
            case "delete": deleteListing(listingId); break;
            default: break;
        }
    };

    const filteredBooks = books.filter((b) => {
        if (bookStatusFilter && (b.status || "").toUpperCase() !== bookStatusFilter) return false;
        if (!bookSearch.trim()) return true;
        const q = bookSearch.toLowerCase();
        return (
            (b.title || "").toLowerCase().includes(q) ||
            (b.authorName || "").toLowerCase().includes(q) ||
            (b.category || "").toLowerCase().includes(q) ||
            (b.status || "").toLowerCase().includes(q) ||
            String(b.id).includes(q)
        );
    });

    const filteredListings = listings.filter((l) => {
        if (listingStatusFilter && (l.status || "").toUpperCase() !== listingStatusFilter) return false;
        if (!listingSearch.trim()) return true;
        const q = listingSearch.toLowerCase();
        return (
            (l.title || "").toLowerCase().includes(q) ||
            (l.sellerName || "").toLowerCase().includes(q) ||
            (l.category || "").toLowerCase().includes(q) ||
            (l.status || "").toLowerCase().includes(q) ||
            String(l.id).includes(q)
        );
    });

    // Filter articles
    const filteredArticles = articles.filter((a) => {
        if (articleTypeFilter && a.contentType !== articleTypeFilter) return false;
        if (articleStatusFilter && a.status !== articleStatusFilter) return false;
        if (!articleSearch.trim()) return true;
        const q = articleSearch.toLowerCase();
        return (
            (a.headline || "").toLowerCase().includes(q) ||
            (a.authorName || "").toLowerCase().includes(q) ||
            (a.contentType || "").toLowerCase().includes(q) ||
            (a.category || "").toLowerCase().includes(q) ||
            String(a.id).includes(q)
        );
    });

    const handleUserAction = async (userId, action) => {
        switch (action) {
            case "block":
                changeStatus(userId, "BLOCKED");
                break;
            case "disable":
                changeStatus(userId, "DISABLED");
                break;
            case "activate":
                changeStatus(userId, "ACTIVE");
                break;
            case "delete":
                if (!window.confirm("Mark this user as deleted?")) return;
                changeStatus(userId, "DELETED");
                break;
            case "reset-password":
                setResetPasswordUserId(userId);
                setResetNewPassword("");
                break;
            default: break;
        }
    };

    const handleAdminResetPassword = async () => {
        if (!resetNewPassword || resetNewPassword.length < 6) {
            setMessage("Password must be at least 6 characters");
            return;
        }
        try {
            await api.put(`${API}/api/auth/admin-reset-password/${resetPasswordUserId}`, { newPassword: resetNewPassword });
            setMessage("Password reset successfully");
            setResetPasswordUserId(null);
            setResetNewPassword("");
        } catch {
            setMessage("Failed to reset password");
        }
    };

    // Filter users by search
    const filteredUsers = users.filter((u) => {
        if (!userSearch.trim()) return true;
        const q = userSearch.toLowerCase();
        return (
            (u.firstName || "").toLowerCase().includes(q) ||
            (u.lastName || "").toLowerCase().includes(q) ||
            (u.email || "").toLowerCase().includes(q) ||
            (u.role || "").toLowerCase().includes(q) ||
            (u.plan || "").toLowerCase().includes(q) ||
            (u.userType || "").toLowerCase().includes(q) ||
            (u.status || "").toLowerCase().includes(q) ||
            String(u.id).includes(q)
        );
    });

    const handleExport = async (bookId, format) => {
        setMessage(`Exporting ${format.toUpperCase()}...`);
        try {
            const res = await api.get(`${API}/api/books/${bookId}/export/${format}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const disposition = res.headers['content-disposition'];
            const filename = disposition ? disposition.split('filename=')[1]?.replace(/"/g, '') : `book_${bookId}.${format}`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setMessage(`${format.toUpperCase()} downloaded!`);
        } catch (err) {
            let msg = err.message;
            if (err.response?.data instanceof Blob) {
                try { const text = await err.response.data.text(); const json = JSON.parse(text); msg = json.error || text; } catch {}
            } else if (err.response?.data?.error) {
                msg = err.response.data.error;
            }
            setMessage(`Export failed: ${msg}`);
        }
    };

    const handleBookAction = (bookId, action, status) => {
        switch (action) {
            case "archive": archiveBook(bookId); break;
            case "delete": deleteBook(bookId); break;
            case "recover": recoverBook(bookId); break;
            case "purge": purgeBook(bookId); break;
            case "export-pdf": handleExport(bookId, "pdf"); break;
            case "export-docx": handleExport(bookId, "docx"); break;
            default: break;
        }
    };

    return (
        <div className="admin-dashboard">
            <h1>{s.heading || "Admin Dashboard"}</h1>
            {message && <div className="admin-message" onClick={() => setMessage("")} role="status">{message}</div>}

            <div className="admin-tabs">
                <button className={tab === "stats" ? "active" : ""} onClick={() => setTab("stats")}>
                    {s.tabStats || "Stats"}
                </button>
                <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
                    {s.tabUsers || "Users"}
                </button>
                <button className={tab === "books" ? "active" : ""} onClick={() => setTab("books")}>
                    {s.tabBooks || "Books"}
                </button>
                <button className={tab === "articles" ? "active" : ""} onClick={() => setTab("articles")}>
                    Articles
                </button>
                <button className={tab === "recipes" ? "active" : ""} onClick={() => setTab("recipes")}>
                    Recipes
                </button>
                <button className={tab === "galleries" ? "active" : ""} onClick={() => setTab("galleries")}>
                    Galleries
                </button>
                <button className={tab === "marketplace" ? "active" : ""} onClick={() => setTab("marketplace")}>
                    Buy/Sell
                </button>
                <button className={tab === "analytics" ? "active" : ""} onClick={() => setTab("analytics")}>
                    Analytics
                </button>
                <button className={tab === "maintenance" ? "active" : ""} onClick={() => setTab("maintenance")}>
                    Maintenance
                </button>
                <button className={tab === "support" ? "active" : ""} onClick={() => setTab("support")}>
                    Support Queries
                </button>
                <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}>
                    Payments
                </button>
                <button className={tab === "magazine" ? "active" : ""} onClick={() => setTab("magazine")}>
                    Magazine
                </button>
                <button className={tab === "heroSlides" ? "active" : ""} onClick={() => setTab("heroSlides")}>
                    Hero Slides
                </button>
                {isSuperAdmin && (
                    <button className={tab === "advertisements" ? "active" : ""} onClick={() => setTab("advertisements")}>
                        Advertisements
                    </button>
                )}
                {isSuperAdmin && (
                    <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>
                        Audit Log
                    </button>
                )}
            </div>

            {tab === "stats" && stats && (
                <div className="admin-stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalUsers}</div>
                        <div className="stat-label">{s.totalUsers || "Total Users"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.activeUsers}</div>
                        <div className="stat-label">{s.activeUsers || "Active Users"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.blockedUsers}</div>
                        <div className="stat-label">{s.blockedUsers || "Blocked Users"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.adminCount}</div>
                        <div className="stat-label">{s.adminCount || "Admins"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalBooks}</div>
                        <div className="stat-label">{s.totalBooks || "Total Books"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.publishedBooks}</div>
                        <div className="stat-label">{s.publishedBooks || "Published"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.draftBooks}</div>
                        <div className="stat-label">{s.draftBooks || "Drafts"}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalArticles || 0}</div>
                        <div className="stat-label">Total Articles</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalBlogs || 0}</div>
                        <div className="stat-label">Blogs</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalPoems || 0}</div>
                        <div className="stat-label">Poems</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalArticleType || 0}</div>
                        <div className="stat-label">Articles</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalPodcasts || 0}</div>
                        <div className="stat-label">Podcasts</div>
                    </div>
                </div>
            )}

            {tab === "users" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search users by name, email, role, plan, status..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                        {userSearch && (
                            <span className="admin-search-count">{filteredUsers.length} of {users.length} users</span>
                        )}
                    </div>

                    {/* Password reset modal */}
                    {resetPasswordUserId && (
                        <div className="admin-reset-modal">
                            <div className="admin-reset-card">
                                <h3>Reset Password for User #{resetPasswordUserId}</h3>
                                <input
                                    type="password"
                                    className="admin-search-input"
                                    placeholder="Enter new password (min 6 chars)"
                                    value={resetNewPassword}
                                    onChange={(e) => setResetNewPassword(e.target.value)}
                                />
                                <div className="admin-reset-actions">
                                    <button className="admin-purge-btn" style={{background: '#2563eb', borderColor: '#2563eb'}} onClick={handleAdminResetPassword}>Reset Password</button>
                                    <button className="admin-delete-btn" onClick={() => setResetPasswordUserId(null)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{s.colName || "Name"}</th>
                                    <th>{s.colEmail || "Email"}</th>
                                    <th>{s.colRole || "Role"}</th>
                                    <th>Plan</th>
                                    <th>Type</th>
                                    <th>Content</th>
                                    {sortableTh(s.colStatus || "Status", userSort, setUserSort, "status")}
                                    {sortableTh(s.colLastLogin || "Last Login", userSort, setUserSort, "lastLogin")}
                                    <th>{s.colActions || "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applySort(filteredUsers, userSort, {
                                    status: (u) => (u.status || "ACTIVE").toLowerCase(),
                                    lastLogin: (u) => u.lastLoginDate,
                                }).map((u) => (
                                    <tr key={u.id}>
                                        <td>{u.id}</td>
                                        <td>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "\u2014"}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            {isSuperAdmin ? (
                                                <select
                                                    value={u.role || "USER"}
                                                    onChange={(e) => changeRole(u.id, e.target.value)}
                                                >
                                                    <option value="USER">USER</option>
                                                    <option value="ADMIN">ADMIN</option>
                                                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                                </select>
                                            ) : (
                                                <span className={`role-badge role-${(u.role || "USER").toLowerCase()}`}>
                                                    {u.role || "USER"}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`plan-badge plan-${(u.plan || "Free").toLowerCase()}`}>
                                                {u.plan || "Free"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`type-badge type-${(u.userType || "Visitor").toLowerCase()}`}>
                                                {u.userType || "Visitor"}
                                            </span>
                                        </td>
                                        <td className="admin-content-counts">
                                            {u.bookCount > 0 && <span title="Books">B:{u.bookCount}</span>}
                                            {u.galleryCount > 0 && <span title="Galleries">G:{u.galleryCount}</span>}
                                            {u.articleCount > 0 && <span title="Articles">A:{u.articleCount}</span>}
                                            {(u.bookCount || 0) + (u.galleryCount || 0) + (u.articleCount || 0) === 0 && "\u2014"}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${(u.status || "ACTIVE").toLowerCase()}`}>
                                                {u.status || "ACTIVE"}
                                            </span>
                                        </td>
                                        <td>{toPSTDateTime(u.lastLoginDate)}</td>
                                        <td>
                                            <select
                                                className="admin-action-select"
                                                value=""
                                                onChange={(e) => { handleUserAction(u.id, e.target.value); e.target.value = ""; }}
                                            >
                                                <option value="" disabled>Action...</option>
                                                {u.status !== "ACTIVE" && <option value="activate">Activate</option>}
                                                {u.status !== "BLOCKED" && <option value="block">Block</option>}
                                                {u.status !== "DISABLED" && <option value="disable">Disable</option>}
                                                {u.status !== "DELETED" && <option value="delete">Delete</option>}
                                                {isSuperAdmin && <option value="reset-password">Reset Password</option>}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === "books" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search by title, author, category, status..."
                            value={bookSearch}
                            onChange={(e) => setBookSearch(e.target.value)}
                        />
                        <select
                            className="admin-search-input"
                            style={{ maxWidth: 140 }}
                            value={bookStatusFilter}
                            onChange={(e) => setBookStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                            <option value="DELETED">Deleted</option>
                        </select>
                        {(bookSearch || bookStatusFilter) && (
                            <span className="admin-search-count">
                                {filteredBooks.length} of {books.length} books
                            </span>
                        )}
                    </div>
                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{s.colTitle || "Title"}</th>
                                    <th>{s.colAuthor || "Author"}</th>
                                    {sortableTh(s.colBookStatus || "Status", bookSort, setBookSort, "status")}
                                    {sortableTh(s.colModified || "Modified", bookSort, setBookSort, "modified")}
                                    <th>{s.colActions || "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applySort(filteredBooks, bookSort, {
                                    status: (b) => (b.status || "").toLowerCase(),
                                    modified: (b) => b.modifiedDate,
                                }).map((b) => (
                                    <tr key={b.id}>
                                        <td>{b.id}</td>
                                        <td>{b.title}</td>
                                        <td>{b.authorName || "\u2014"}</td>
                                        <td>
                                            <span className={`status-badge status-${(b.status || "").toLowerCase()}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>{toPSTDateTime(b.modifiedDate)}</td>
                                        <td>
                                            <select
                                                className="admin-action-select"
                                                value=""
                                                onChange={(e) => { handleBookAction(b.id, e.target.value, b.status); e.target.value = ""; }}
                                            >
                                                <option value="" disabled>Action...</option>
                                                {b.status !== "ARCHIVED" && b.status !== "DELETED" && (
                                                    <option value="archive">Archive</option>
                                                )}
                                                {b.status !== "DELETED" && (
                                                    <option value="delete">Delete</option>
                                                )}
                                                {(b.status === "DELETED" || b.status === "ARCHIVED") && (
                                                    <option value="recover">Recover</option>
                                                )}
                                                {isSuperAdmin && (
                                                    <option value="purge">Purge</option>
                                                )}
                                                {isSuperAdmin && (
                                                    <>
                                                        <option value="export-pdf">Export PDF</option>
                                                        <option value="export-docx">Export DOCX</option>
                                                    </>
                                                )}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Articles Tab */}
            {tab === "articles" && (
                <div className="admin-table-wrap">
                    {/* Search and filters */}
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search by title, author, category..."
                            value={articleSearch}
                            onChange={(e) => setArticleSearch(e.target.value)}
                        />
                        <select
                            className="admin-action-select"
                            value={articleTypeFilter}
                            onChange={(e) => setArticleTypeFilter(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="Blog">Blogs</option>
                            <option value="Article">Articles</option>
                            <option value="Poetry">Poems</option>
                        </select>
                        <select
                            className="admin-action-select"
                            value={articleStatusFilter}
                            onChange={(e) => setArticleStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                        {(articleSearch || articleTypeFilter || articleStatusFilter) && (
                            <span className="admin-search-count">
                                {filteredArticles.length} of {articles.length} items
                            </span>
                        )}
                    </div>

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Category</th>
                                    <th>Author</th>
                                    {sortableTh("Status", articleSort, setArticleSort, "status")}
                                    {sortableTh("Created", articleSort, setArticleSort, "created")}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applySort(filteredArticles, articleSort, {
                                    status: (a) => (a.status || "").toLowerCase(),
                                    created: (a) => a.createdDate,
                                }).map((a) => (
                                    <tr key={a.id}>
                                        <td>{a.id}</td>
                                        <td className="admin-article-title">{a.headline}</td>
                                        <td>
                                            <span className={`admin-type-badge admin-type-${(a.contentType || "article").toLowerCase()}`}>
                                                {a.contentType === "Poetry" ? "Poem" : a.contentType || "Article"}
                                            </span>
                                        </td>
                                        <td>{a.category || "\u2014"}</td>
                                        <td>{a.authorName || "\u2014"}</td>
                                        <td>
                                            <span className={`status-badge status-${(a.status || "").toLowerCase()}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td>{toPSTDateTime(a.createdDate)}</td>
                                        <td>
                                            <select
                                                className="admin-action-select"
                                                value=""
                                                onChange={(e) => { handleArticleAction(a.id, e.target.value, a.status); e.target.value = ""; }}
                                            >
                                                <option value="" disabled>Action...</option>
                                                {a.status !== "PUBLISHED" && (
                                                    <option value="publish">Publish</option>
                                                )}
                                                {a.status !== "DRAFT" && (
                                                    <option value="unpublish">Unpublish</option>
                                                )}
                                                <option value="delete">Delete</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Recipes Tab */}
            {tab === "recipes" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search by recipe name, author, cuisine..."
                            value={recipeSearch}
                            onChange={(e) => setRecipeSearch(e.target.value)}
                        />
                        <select
                            className="admin-search-input"
                            style={{ maxWidth: 140 }}
                            value={recipeStatusFilter}
                            onChange={(e) => setRecipeStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                        {(recipeSearch || recipeStatusFilter) && (
                            <span className="admin-search-count">
                                {filteredRecipes.length} of {recipes.length} recipes
                            </span>
                        )}
                    </div>

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Recipe Name</th>
                                    <th>Cuisine</th>
                                    <th>Author</th>
                                    {sortableTh("Status", recipeSort, setRecipeSort, "status")}
                                    {sortableTh("Created", recipeSort, setRecipeSort, "created")}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applySort(filteredRecipes, recipeSort, {
                                    status: (r) => (r.status || "").toLowerCase(),
                                    created: (r) => r.createdDate,
                                }).map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.id}</td>
                                        <td className="admin-article-title">{r.recipeName}</td>
                                        <td>{r.cuisine || "—"}</td>
                                        <td>{r.authorName || "—"}</td>
                                        <td>
                                            <span className={`status-badge status-${(r.status || "").toLowerCase()}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td>{toPSTDateTime(r.createdDate)}</td>
                                        <td>
                                            <select
                                                className="admin-action-select"
                                                value=""
                                                onChange={(e) => { handleRecipeAction(r.id, e.target.value); e.target.value = ""; }}
                                            >
                                                <option value="" disabled>Action...</option>
                                                {r.status !== "PUBLISHED" && <option value="publish">Publish</option>}
                                                {r.status !== "DRAFT" && <option value="unpublish">Unpublish</option>}
                                                <option value="delete">Delete</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Galleries Tab */}
            {tab === "galleries" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search by title, author, description..."
                            value={gallerySearch}
                            onChange={(e) => setGallerySearch(e.target.value)}
                        />
                        <select
                            className="admin-search-input"
                            style={{ maxWidth: 140 }}
                            value={galleryStatusFilter}
                            onChange={(e) => setGalleryStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                        {(gallerySearch || galleryStatusFilter) && (
                            <span className="admin-search-count">
                                {filteredGalleries.length} of {galleries.length} galleries
                            </span>
                        )}
                    </div>

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Description</th>
                                    {sortableTh("Status", gallerySort, setGallerySort, "status")}
                                    {sortableTh("Created", gallerySort, setGallerySort, "created")}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applySort(filteredGalleries, gallerySort, {
                                    status: (g) => (g.status || "").toLowerCase(),
                                    created: (g) => g.createdDate,
                                }).map((g) => (
                                    <tr key={g.id}>
                                        <td>{g.id}</td>
                                        <td className="admin-article-title">{g.title}</td>
                                        <td>{g.authorName || "—"}</td>
                                        <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {g.description || "—"}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${(g.status || "").toLowerCase()}`}>
                                                {g.status || "—"}
                                            </span>
                                        </td>
                                        <td>{toPSTDateTime(g.createdDate)}</td>
                                        <td>
                                            <select
                                                className="admin-action-select"
                                                value=""
                                                onChange={(e) => { handleGalleryAction(g.id, e.target.value); e.target.value = ""; }}
                                            >
                                                <option value="" disabled>Action...</option>
                                                {(g.status || "").toUpperCase() !== "PUBLISHED" && <option value="publish">Publish</option>}
                                                {(g.status || "").toUpperCase() !== "DRAFT" && <option value="unpublish">Unpublish</option>}
                                                <option value="delete">Delete</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Buy/Sell (Marketplace) Tab */}
            {tab === "marketplace" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Search by title, seller, category..."
                            value={listingSearch}
                            onChange={(e) => setListingSearch(e.target.value)}
                        />
                        <select
                            className="admin-search-input"
                            style={{ maxWidth: 140 }}
                            value={listingStatusFilter}
                            onChange={(e) => setListingStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SOLD">Sold</option>
                            <option value="REMOVED">Removed</option>
                        </select>
                        {(listingSearch || listingStatusFilter) && (
                            <span className="admin-search-count">
                                {filteredListings.length} of {listings.length} listings
                            </span>
                        )}
                    </div>

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Seller</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    {sortableTh("Status", listingSort, setListingSort, "status")}
                                    {sortableTh("Created", listingSort, setListingSort, "created")}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applySort(filteredListings, listingSort, {
                                    status: (l) => (l.status || "").toLowerCase(),
                                    created: (l) => l.createdDate,
                                }).map((l) => (
                                    <tr key={l.id}>
                                        <td>{l.id}</td>
                                        <td className="admin-article-title">{l.title}</td>
                                        <td>{l.sellerName || "—"}</td>
                                        <td>{l.category || "—"}</td>
                                        <td>{l.price || "—"}</td>
                                        <td>
                                            <span className={`status-badge status-${(l.status || "").toLowerCase()}`}>
                                                {l.status || "—"}
                                            </span>
                                        </td>
                                        <td>{toPSTDateTime(l.createdDate)}</td>
                                        <td>
                                            <select
                                                className="admin-action-select"
                                                value=""
                                                onChange={(e) => { handleListingAction(l.id, e.target.value); e.target.value = ""; }}
                                            >
                                                <option value="" disabled>Action...</option>
                                                {(l.status || "").toUpperCase() !== "ACTIVE" && <option value="activate">Mark Active</option>}
                                                {(l.status || "").toUpperCase() !== "SOLD" && <option value="sold">Mark Sold</option>}
                                                {(l.status || "").toUpperCase() !== "REMOVED" && <option value="remove">Remove</option>}
                                                <option value="delete">Delete</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === "payments" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <select
                            className="admin-search-input"
                            style={{ maxWidth: 180 }}
                            value={paymentTypeFilter}
                            onChange={(e) => setPaymentTypeFilter(e.target.value)}
                        >
                            <option value="">All types</option>
                            <option value="support">Support</option>
                            <option value="sponsor">Sponsor</option>
                            <option value="subscription">Subscription</option>
                            <option value="payment">Payment</option>
                            <option value="refund">Refund</option>
                            <option value="other">Other</option>
                        </select>
                        <span className="admin-search-count">
                            {paymentSummary?.count ?? payments.length} payments
                        </span>
                        {paymentSummary?.grossByCurrency && Object.entries(paymentSummary.grossByCurrency).map(([cur, gross]) => (
                            <span key={cur} className="admin-search-count">
                                {cur} gross {Number(gross).toFixed(2)}
                                {paymentSummary.netByCurrency?.[cur] != null && ` · net ${Number(paymentSummary.netByCurrency[cur]).toFixed(2)}`}
                            </span>
                        ))}
                    </div>

                    {paymentsLoading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Reference</th>
                                    <th>Payment ID</th>
                                    <th>Type</th>
                                    <th>Provider</th>
                                    <th>Payer</th>
                                    <th>Amount</th>
                                    <th>Fee</th>
                                    <th>Net</th>
                                    <th>Tax</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                    <th>Refund / Dispute</th>
                                    <th>Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr><td colSpan={14} style={{ textAlign: "center" }}>No payments yet.</td></tr>
                                ) : payments.map((p) => (
                                    <tr key={p.id}>
                                        <td>{toPSTDateTime(p.createdAt)}</td>
                                        <td className="admin-article-title">{p.paymentReferenceId || "—"}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.8em", wordBreak: "break-all" }}>
                                            {p.providerPaymentId || "—"}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${(p.paymentType || "other").toLowerCase()}`}>
                                                {p.paymentType || "—"}
                                            </span>
                                        </td>
                                        <td>{p.provider || "—"}</td>
                                        <td>
                                            {p.payerName || "—"}
                                            {p.payerEmail && <div style={{ fontSize: "0.8em", opacity: 0.7 }}>{p.payerEmail}</div>}
                                        </td>
                                        <td>{fmtMoney(p.amount, p.currency)}</td>
                                        <td>{p.gatewayFee != null ? Number(p.gatewayFee).toFixed(2) : "—"}</td>
                                        <td>{p.netAmount != null ? Number(p.netAmount).toFixed(2) : "—"}</td>
                                        <td>{p.taxAmount != null ? Number(p.taxAmount).toFixed(2) : "—"}</td>
                                        <td>
                                            {p.cardBrand ? `${p.cardBrand} ••${p.last4 || ""}` : (p.paymentMethod || "—")}
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${(p.paymentStatus || "").toLowerCase()}`}>
                                                {p.paymentStatus || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            {p.refundStatus && <div>{p.refundStatus}</div>}
                                            {p.disputeStatus && <div style={{ color: "#b00" }}>{p.disputeStatus}</div>}
                                            {!p.refundStatus && !p.disputeStatus && "—"}
                                        </td>
                                        <td>
                                            {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer">view</a>}
                                            {p.invoiceUrl && (
                                                <>
                                                    {p.receiptUrl && " · "}
                                                    <a href={p.invoiceUrl} target="_blank" rel="noreferrer">invoice</a>
                                                </>
                                            )}
                                            {!p.receiptUrl && !p.invoiceUrl && (
                                                <button
                                                    onClick={() => refreshReceipt(p.id)}
                                                    disabled={refreshingReceiptId === p.id}
                                                    title="Re-fetch the receipt from Stripe"
                                                    style={{
                                                        background: "none", border: "none", padding: 0,
                                                        color: "#0a58ca", textDecoration: "underline",
                                                        cursor: refreshingReceiptId === p.id ? "default" : "pointer",
                                                        font: "inherit",
                                                    }}
                                                >
                                                    {refreshingReceiptId === p.id ? "…" : "fetch"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Audit Log Tab — #24 Phase 3 */}
            {tab === "audit" && (
                <div className="admin-table-wrap">
                    <div className="admin-search-bar">
                        <input
                            type="text"
                            className="admin-search-input"
                            style={{ maxWidth: 160 }}
                            placeholder="Actor userId"
                            value={auditActorFilter}
                            onChange={(e) => setAuditActorFilter(e.target.value)}
                        />
                        <input
                            type="text"
                            className="admin-search-input"
                            style={{ maxWidth: 160 }}
                            placeholder="Target userId"
                            value={auditTargetFilter}
                            onChange={(e) => setAuditTargetFilter(e.target.value)}
                        />
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Path contains (e.g. /api/books)"
                            value={auditPathFilter}
                            onChange={(e) => setAuditPathFilter(e.target.value)}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                            <input
                                type="checkbox"
                                checked={auditOnlyImpersonated}
                                onChange={(e) => setAuditOnlyImpersonated(e.target.checked)}
                            />
                            Only impersonated
                        </label>
                        <button className="admin-btn" onClick={fetchAuditLog}>Apply</button>
                    </div>

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Rev</th>
                                    <th>When</th>
                                    <th>Actor</th>
                                    <th>Target</th>
                                    <th>Path</th>
                                    <th>Impersonated?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(auditOnlyImpersonated ? auditRows.filter(r => r.impersonated) : auditRows).map((r) => (
                                    <tr key={r.rev}>
                                        <td style={{ fontFamily: "monospace" }}>{r.rev}</td>
                                        <td style={{ whiteSpace: "nowrap" }}>{toPSTDateTime(r.timestamp ? new Date(r.timestamp).toISOString() : null)}</td>
                                        <td>
                                            {r.actorName ? (
                                                <>{r.actorName} <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>#{r.actorUserId}</span></>
                                            ) : (r.actorUserId ? `#${r.actorUserId}` : "—")}
                                        </td>
                                        <td>
                                            {r.targetName ? (
                                                <>{r.targetName} <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>#{r.targetUserId}</span></>
                                            ) : (r.targetUserId ? `#${r.targetUserId}` : "—")}
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{r.requestPath || "—"}</td>
                                        <td>
                                            {r.impersonated ? (
                                                <span className="status-badge" style={{ background: "#fef3c7", color: "#92400e" }}>IMPERSONATED</span>
                                            ) : "—"}
                                        </td>
                                    </tr>
                                ))}
                                {auditRows.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                                        No audit entries yet.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Analytics Tab */}
            {tab === "analytics" && (
                <div className="admin-analytics">
                    <div className="analytics-header">
                        <h2>Site Analytics / Visitor Data</h2>
                        <div className="analytics-controls">
                            <select
                                className="admin-action-select"
                                value={analyticsDays}
                                onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                            >
                                <option value={1}>Last 24 Hours</option>
                                <option value={7}>Last 7 Days</option>
                                <option value={14}>Last 14 Days</option>
                                <option value={30}>Last 30 Days</option>
                                <option value={90}>Last 90 Days</option>
                            </select>
                            <button className="bm-btn bm-btn-edit bm-btn-sm" onClick={fetchAnalytics}>Refresh</button>
                            <a
                                href="https://analytics.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bm-btn bm-btn-create bm-btn-sm"
                            >
                                Open Google Analytics
                            </a>
                        </div>
                    </div>

                    {analyticsLoading && <p>Loading analytics...</p>}

                    {analytics && !analyticsLoading && (
                        <>
                            {/* Summary Cards */}
                            <div className="admin-stats-grid">
                                <div className="stat-card">
                                    <div className="stat-value">{analytics.totalPageViews}</div>
                                    <div className="stat-label">Page Views</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{analytics.uniqueVisitors}</div>
                                    <div className="stat-label">Unique Visitors</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{analytics.totalSessions}</div>
                                    <div className="stat-label">Sessions</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{analytics.anonymousVisitors}</div>
                                    <div className="stat-label">Anonymous Visitors</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{analytics.loggedInVisitors}</div>
                                    <div className="stat-label">Logged-in Visitors</div>
                                </div>
                            </div>

                            {/* Daily Trend */}
                            {analytics.dailyStats && analytics.dailyStats.length > 0 && (
                                <div className="analytics-section">
                                    <h3>Daily Trend</h3>
                                    <div className="analytics-chart">
                                        {analytics.dailyStats.map((day, i) => {
                                            const maxViews = Math.max(...analytics.dailyStats.map(d => Number(d.pageViews)), 1);
                                            const barHeight = Math.max(4, (Number(day.pageViews) / maxViews) * 120);
                                            return (
                                                <div key={i} className="analytics-bar-group" title={`${day.date}: ${day.pageViews} views, ${day.uniqueVisitors} visitors`}>
                                                    <div className="analytics-bar" style={{ height: `${barHeight}px` }} />
                                                    <span className="analytics-bar-label">{toPSTDate(day.date, { month: "short", day: "numeric" })}</span>
                                                    <span className="analytics-bar-value">{day.pageViews}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="analytics-panels">
                                {/* Top Pages */}
                                {analytics.topPages && analytics.topPages.length > 0 && (
                                    <div className="analytics-section analytics-panel">
                                        <h3>Top Pages</h3>
                                        <table className="admin-table">
                                            <thead>
                                                <tr><th>Page</th><th>Views</th></tr>
                                            </thead>
                                            <tbody>
                                                {analytics.topPages.map((p, i) => (
                                                    <tr key={i}>
                                                        <td>{p.page || "/"}</td>
                                                        <td>{p.views}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Device Breakdown */}
                                {analytics.devices && Object.keys(analytics.devices).length > 0 && (
                                    <div className="analytics-section analytics-panel">
                                        <h3>Devices</h3>
                                        <div className="analytics-breakdown">
                                            {Object.entries(analytics.devices).map(([device, count]) => {
                                                const total = Object.values(analytics.devices).reduce((a, b) => a + b, 0);
                                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                                return (
                                                    <div key={device} className="analytics-breakdown-row">
                                                        <span className="analytics-breakdown-label">
                                                            {device === "desktop" ? "Desktop" : device === "mobile" ? "Mobile" : device === "tablet" ? "Tablet" : device}
                                                        </span>
                                                        <div className="analytics-breakdown-bar-wrap">
                                                            <div className="analytics-breakdown-bar" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="analytics-breakdown-value">{count} ({pct}%)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Browser Breakdown */}
                                {analytics.browsers && Object.keys(analytics.browsers).length > 0 && (
                                    <div className="analytics-section analytics-panel">
                                        <h3>Browsers</h3>
                                        <div className="analytics-breakdown">
                                            {Object.entries(analytics.browsers).map(([browser, count]) => {
                                                const total = Object.values(analytics.browsers).reduce((a, b) => a + b, 0);
                                                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                                                return (
                                                    <div key={browser} className="analytics-breakdown-row">
                                                        <span className="analytics-breakdown-label">{browser}</span>
                                                        <div className="analytics-breakdown-bar-wrap">
                                                            <div className="analytics-breakdown-bar analytics-bar-alt" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="analytics-breakdown-value">{count} ({pct}%)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Recent Visits */}
                            {recentVisits.length > 0 && (
                                <div className="analytics-section">
                                    <h3>Recent Visits (Last 24h)</h3>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Page</th>
                                                <th>Device</th>
                                                <th>Browser</th>
                                                <th>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentVisits.map((v) => (
                                                <tr key={v.id}>
                                                    <td>{toPSTTime(v.visitedAt)}</td>
                                                    <td>{v.pagePath || "/"}</td>
                                                    <td>{v.device || "\u2014"}</td>
                                                    <td>{v.browser || "\u2014"}</td>
                                                    <td>
                                                        <span className={`admin-type-badge ${v.userId ? "admin-type-article" : "admin-type-poetry"}`}>
                                                            {v.userId ? "Logged in" : "Anonymous"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {!analytics && !analyticsLoading && (
                        <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
                            No visitor data yet. Data will appear as users visit the site.
                        </p>
                    )}
                </div>
            )}

            {/* Maintenance Tab */}
            {tab === "maintenance" && (
                <div className="admin-maintenance">
                    <h2>Maintenance Windows / Weekend Outage Schedule</h2>
                    <p className="admin-maint-desc">
                        Schedule planned maintenance or weekend outage windows. Active windows will be displayed to users as a banner notification.
                    </p>

                    {/* Add new window form */}
                    <div className="admin-maint-form">
                        <h3>Add Maintenance Window</h3>
                        <div className="admin-maint-fields">
                            <div className="admin-maint-field">
                                <label>Date</label>
                                <input type="date" value={mwDate} onChange={e => setMwDate(e.target.value)} className="bm-input" />
                            </div>
                            <div className="admin-maint-field">
                                <label>Start Time</label>
                                <input type="time" value={mwStartTime} onChange={e => setMwStartTime(e.target.value)} className="bm-input" />
                            </div>
                            <div className="admin-maint-field">
                                <label>End Time</label>
                                <input type="time" value={mwEndTime} onChange={e => setMwEndTime(e.target.value)} className="bm-input" />
                            </div>
                            <div className="admin-maint-field admin-maint-field-wide">
                                <label>Description</label>
                                <input type="text" value={mwDescription} onChange={e => setMwDescription(e.target.value)} placeholder="e.g. Database maintenance, server upgrade..." className="bm-input" />
                            </div>
                            <div className="admin-maint-field">
                                <label>
                                    <input type="checkbox" checked={mwActive} onChange={e => setMwActive(e.target.checked)} />
                                    {" "}Active (show to users)
                                </label>
                            </div>
                        </div>
                        <button className="bm-btn bm-btn-create" onClick={addMaintenanceWindow}>Add Window</button>
                    </div>

                    {/* Existing windows */}
                    <div className="admin-maint-list">
                        <h3>Scheduled Windows ({maintenanceWindows.length})</h3>
                        {maintenanceWindows.length === 0 ? (
                            <p className="admin-maint-empty">No maintenance windows scheduled.</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Time</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {maintenanceWindows
                                        .sort((a, b) => a.date.localeCompare(b.date))
                                        .map(w => (
                                        <tr key={w.id}>
                                            <td>{toPSTDate(w.date + "T00:00", { weekday: "short", month: "short", day: "numeric" })}</td>
                                            <td>{w.startTime} - {w.endTime}</td>
                                            <td>{w.description}</td>
                                            <td>
                                                <span className={`admin-maint-status ${w.active ? "admin-maint-active" : "admin-maint-inactive"}`}>
                                                    {w.active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="bm-btn bm-btn-sm bm-btn-edit" onClick={() => toggleMaintenanceActive(w.id)}>
                                                    {w.active ? "Deactivate" : "Activate"}
                                                </button>
                                                <button className="bm-btn bm-btn-sm bm-btn-delete" onClick={() => removeMaintenanceWindow(w.id)}>
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Upcoming weekends helper */}
                    <div className="admin-maint-weekends">
                        <h3>Quick Add — Upcoming Weekends</h3>
                        <div className="admin-maint-weekend-btns">
                            {[0, 1, 2, 3].map(weekOffset => {
                                const now = new Date();
                                const dayOfWeek = now.getDay();
                                const daysToSat = (6 - dayOfWeek + 7 * weekOffset) % 7 || 7 * (weekOffset || 1);
                                const sat = new Date(now);
                                sat.setDate(now.getDate() + daysToSat);
                                const sun = new Date(sat);
                                sun.setDate(sat.getDate() + 1);
                                const satStr = sat.toISOString().split("T")[0];
                                const sunStr = sun.toISOString().split("T")[0];
                                const label = `${sat.toLocaleDateString("en-US", { timeZone: PST_TZ, month: "short", day: "numeric" })} - ${sun.toLocaleDateString("en-US", { timeZone: PST_TZ, month: "short", day: "numeric" })}`;
                                return (
                                    <button
                                        key={weekOffset}
                                        className="bm-btn bm-btn-edit bm-btn-sm"
                                        onClick={() => {
                                            setMwDate(satStr);
                                            setMwStartTime("00:00");
                                            setMwEndTime("23:59");
                                            setMwDescription("Weekend maintenance window");
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Advertisements Tab (Super Admin only) */}
            {tab === "advertisements" && isSuperAdmin && (
                <div className="admin-maintenance">
                    <h2>Advertisement Banner Management</h2>
                    <p className="admin-maint-desc">
                        Create and manage advertisement banners displayed on the home page. You can add images, formatted HTML content, and choose animation styles.
                    </p>

                    {/* Add / edit advertisement form */}
                    <div className="admin-maint-form">
                        <h3>{editingAdId ? `Edit Advertisement #${editingAdId}` : "Create New Advertisement"}</h3>
                        <div className="admin-maint-fields">
                            <div className="admin-maint-field admin-maint-field-wide">
                                <label>Title</label>
                                <input type="text" value={adTitle} onChange={e => setAdTitle(e.target.value)} placeholder="Advertisement title..." className="bm-input" />
                            </div>
                            <div className="admin-maint-field">
                                <label>Content Type</label>
                                <select value={adContentType} onChange={e => setAdContentType(e.target.value)} className="admin-action-select" style={{ width: "100%" }}>
                                    <option value="text">Plain Text (Title Only)</option>
                                    <option value="html">Rich HTML Content</option>
                                    <option value="image">Image Banner</option>
                                </select>
                            </div>
                            <div className="admin-maint-field">
                                <label>Animation Style</label>
                                <select value={adAnimation} onChange={e => setAdAnimation(e.target.value)} className="admin-action-select" style={{ width: "100%" }}>
                                    <option value="static">Static</option>
                                    <option value="scroll">Scroll Left to Right</option>
                                    <option value="blink">Blinking</option>
                                </select>
                            </div>
                            <div className="admin-maint-field">
                                <label>Placement</label>
                                <select value={adPlacement} onChange={e => setAdPlacement(e.target.value)} className="admin-action-select" style={{ width: "100%" }}>
                                    <option value="HEADER_TOP">Header (top of every page)</option>
                                    <option value="FOOTER_TOP">Footer (above footer links)</option>
                                    <option value="SIDE_RAIL">Side rail (home page)</option>
                                    <option value="ARTICLE_TOP">Article top (writing pages)</option>
                                    <option value="PODCAST_TOP">Podcast top (podcasts page)</option>
                                </select>
                            </div>
                            <div className="admin-maint-field">
                                <label>Width (px, optional)</label>
                                <input type="number" min="0" max="2000" value={adWidth}
                                       onChange={e => setAdWidth(e.target.value)}
                                       placeholder="auto" className="bm-input" style={{ width: "100%" }} />
                            </div>
                            <div className="admin-maint-field">
                                <label>Height (px, optional)</label>
                                <input type="number" min="0" max="2000" value={adHeight}
                                       onChange={e => setAdHeight(e.target.value)}
                                       placeholder="auto" className="bm-input" style={{ width: "100%" }} />
                            </div>

                            {adContentType === "image" && (
                                <div className="admin-maint-field admin-maint-field-wide">
                                    <label>Upload Image {adUploading && "(Uploading...)"}</label>
                                    <input type="file" accept="image/*" onChange={handleAdImageUpload} className="bm-input" disabled={adUploading} />
                                    {adImageUrl && (
                                        <div style={{ marginTop: 8 }}>
                                            <img src={adImageUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 8, border: "1px solid #ccc" }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {adContentType === "html" && (
                                <div className="admin-maint-field admin-maint-field-wide">
                                    <label>HTML Content</label>
                                    <textarea
                                        value={adHtmlContent}
                                        onChange={e => setAdHtmlContent(e.target.value)}
                                        placeholder="<h3>Your Ad Here</h3><p>Formatted content...</p>"
                                        className="bm-input"
                                        rows={5}
                                        style={{ width: "100%", fontFamily: "monospace", resize: "vertical" }}
                                    />
                                    {adHtmlContent && (
                                        <div style={{ marginTop: 8, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                                            <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 4 }}>Preview:</div>
                                            <div dangerouslySetInnerHTML={{ __html: adHtmlContent }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="admin-maint-field admin-maint-field-wide">
                                <label>Link URL (optional)</label>
                                <input type="url" value={adLinkUrl} onChange={e => setAdLinkUrl(e.target.value)} placeholder="https://example.com" className="bm-input" />
                            </div>
                            <div className="admin-maint-field">
                                <label>
                                    <input type="checkbox" checked={adActive} onChange={e => setAdActive(e.target.checked)} />
                                    {" "}Active (show on homepage)
                                </label>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="bm-btn bm-btn-create" onClick={saveAdvertisement}>
                                {editingAdId ? "Update Advertisement" : "Create Advertisement"}
                            </button>
                            {editingAdId && (
                                <button className="bm-btn bm-btn-back" onClick={resetAdForm}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Existing advertisements */}
                    <div className="admin-maint-list">
                        <h3>Advertisements ({advertisements.length})</h3>
                        {advertisements.length === 0 ? (
                            <p className="admin-maint-empty">No advertisements created yet.</p>
                        ) : (
                            <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>Placement</th>
                                        <th>Animation</th>
                                        <th>Preview</th>
                                        {sortableTh("Status", adSort, setAdSort, "status")}
                                        {sortableTh("Created", adSort, setAdSort, "created")}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applySort(advertisements, adSort, {
                                        status: (ad) => ad.active ? "active" : "inactive",
                                        created: (ad) => ad.createdDate,
                                    }).map(ad => (
                                        <tr key={ad.id}>
                                            <td>{ad.title}</td>
                                            <td>
                                                <span className={`admin-type-badge admin-type-${ad.contentType === "html" ? "blog" : ad.contentType === "image" ? "article" : "poetry"}`}>
                                                    {ad.contentType === "html" ? "HTML" : ad.contentType === "image" ? "Image" : "Text"}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "0.8rem" }}>
                                                {ad.placement === "FOOTER_TOP" ? "Footer"
                                                    : ad.placement === "SIDE_RAIL" ? "Side rail"
                                                    : ad.placement === "ARTICLE_TOP" ? "Article top"
                                                    : ad.placement === "PODCAST_TOP" ? "Podcast top"
                                                    : "Header"}
                                            </td>
                                            <td style={{ textTransform: "capitalize" }}>{ad.animation}</td>
                                            <td style={{ maxWidth: 200 }}>
                                                {ad.contentType === "image" && ad.imageUrl && (
                                                    <img src={optimizeCloudinary(ad.imageUrl)} alt={ad.title} style={{ maxWidth: 120, maxHeight: 60, borderRadius: 4 }} />
                                                )}
                                                {ad.contentType === "html" && (
                                                    <div style={{ fontSize: "0.7rem", maxHeight: 60, overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: ad.htmlContent }} />
                                                )}
                                                {ad.contentType === "text" && <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Title only</span>}
                                            </td>
                                            <td>
                                                <span className={`admin-maint-status ${ad.active ? "admin-maint-active" : "admin-maint-inactive"}`}>
                                                    {ad.active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td>{toPSTDateTime(ad.createdDate)}</td>
                                            <td>
                                                <button className="bm-btn bm-btn-sm bm-btn-create" onClick={() => startEditAd(ad)}>
                                                    Edit
                                                </button>
                                                <button className="bm-btn bm-btn-sm bm-btn-edit" onClick={() => toggleAdActive(ad.id)}>
                                                    {ad.active ? "Deactivate" : "Activate"}
                                                </button>
                                                <button className="bm-btn bm-btn-sm bm-btn-delete" onClick={() => removeAdvertisement(ad.id)}>
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {tab === "support" && (() => {
                const STATUS_OPTIONS = [
                    { value: "NEW", label: "New", color: "#3498db" },
                    { value: "IN_PROGRESS", label: "In Progress", color: "#f39c12" },
                    { value: "IN_REVIEW", label: "In Review", color: "#9b59b6" },
                    { value: "APPOINTMENT_SETUP", label: "Appointment Setup", color: "#1abc9c" },
                    { value: "COMPLETED", label: "Completed", color: "#27ae60" },
                    { value: "CANCELLED", label: "Cancelled", color: "#e74c3c" },
                ];
                const filtered = supportQueries.filter(q => {
                    // Always show rows the admin just changed, even if the active
                    // filter would otherwise hide them — prevents the "row is gone"
                    // surprise after a status change.
                    if (recentlyUpdatedQueryIds.has(q.id)) return true;
                    if (supportFilter !== "ALL" && q.status !== supportFilter) return false;
                    if (supportSearch) {
                        const s = supportSearch.toLowerCase();
                        return (q.name || "").toLowerCase().includes(s)
                            || (q.email || "").toLowerCase().includes(s)
                            || (q.subject || "").toLowerCase().includes(s)
                            || formatQueryId(q).toLowerCase().includes(s)
                            // Legacy random tracking ids (e.g. SS-MAG-WHXYBN) on pre-cleanup rows.
                            || (q.trackingId || "").toLowerCase().includes(s);
                    }
                    return true;
                });
                const statusCounts = {};
                supportQueries.forEach(q => { statusCounts[q.status] = (statusCounts[q.status] || 0) + 1; });

                return (
                    <div>
                        <h2>Support Queries ({supportQueries.length})</h2>

                        {/* Status summary cards */}
                        <div className="admin-stats-grid" style={{ marginBottom: 16 }}>
                            {STATUS_OPTIONS.map(opt => (
                                <div key={opt.value} className="stat-card" style={{ cursor: "pointer", borderLeft: `4px solid ${opt.color}` }}
                                     onClick={() => setSupportFilter(supportFilter === opt.value ? "ALL" : opt.value)}>
                                    <div className="stat-value">{statusCounts[opt.value] || 0}</div>
                                    <div className="stat-label" style={{ color: opt.color }}>{opt.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Search and filter */}
                        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                            <input
                                type="text"
                                placeholder="Search by ID, name, email, or subject..."
                                value={supportSearch}
                                onChange={(e) => setSupportSearch(e.target.value)}
                                className="admin-search-input"
                                style={{ flex: 1, minWidth: 200 }}
                            />
                            <select value={supportFilter} onChange={(e) => setSupportFilter(e.target.value)}
                                    className="admin-select">
                                <option value="ALL">All Statuses</option>
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <button className="admin-btn" onClick={fetchSupportQueries}>Refresh</button>
                            {isSuperAdmin && selectedQueryIds.size > 0 && (
                                <button
                                    className="admin-btn admin-btn-danger"
                                    onClick={bulkDeleteSelectedQueries}
                                >
                                    Delete Selected ({selectedQueryIds.size})
                                </button>
                            )}
                        </div>

                        {supportLoading && <p>Loading...</p>}
                        {!supportLoading && filtered.length === 0 && <p>No support queries found.</p>}
                        {!supportLoading && filtered.length > 0 && (
                            <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        {isSuperAdmin && (
                                            <th style={{ width: 36 }}>
                                                <input
                                                    type="checkbox"
                                                    aria-label="Select all visible"
                                                    checked={filtered.length > 0 && filtered.every(q => selectedQueryIds.has(q.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedQueryIds(new Set(filtered.map(q => q.id)));
                                                        } else {
                                                            setSelectedQueryIds(new Set());
                                                        }
                                                    }}
                                                />
                                            </th>
                                        )}
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Subject</th>
                                        {sortableTh("Date", querySort, setQuerySort, "date")}
                                        {sortableTh("Status", querySort, setQuerySort, "status")}
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applySort(filtered, querySort, {
                                        date: (q) => q.createdDate,
                                        status: (q) => (q.status || "").toLowerCase(),
                                    }).map(q => {
                                        const statusOpt = STATUS_OPTIONS.find(o => o.value === q.status) || STATUS_OPTIONS[0];
                                        const isExpanded = expandedQueryId === q.id;
                                        return (
                                            <React.Fragment key={q.id}>
                                                <tr
                                                    style={{
                                                        cursor: "pointer",
                                                        background: recentlyUpdatedQueryIds.has(q.id) ? "rgba(217, 119, 6, 0.08)" : undefined,
                                                        transition: "background 0.4s ease",
                                                    }}
                                                    onClick={() => setExpandedQueryId(isExpanded ? null : q.id)}
                                                >
                                                    {isSuperAdmin && (
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                aria-label={`Select query ${q.id}`}
                                                                checked={selectedQueryIds.has(q.id)}
                                                                onChange={() => toggleQuerySelection(q.id)}
                                                            />
                                                        </td>
                                                    )}
                                                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{formatQueryId(q)}</td>
                                                    <td>{q.name}</td>
                                                    <td><a href={`mailto:${q.email}`}>{q.email}</a></td>
                                                    <td>{q.subject || "—"}</td>
                                                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                                                        {q.createdDate ? (() => {
                                                            // Backend stores UTC; format in America/Los_Angeles so
                                                            // every admin sees the same wall-clock time. timeZoneName:
                                                            // "short" yields "PDT" in summer / "PST" in winter automatically.
                                                            const d = new Date(q.createdDate);
                                                            const tz = "America/Los_Angeles";
                                                            const date = d.toLocaleDateString("en-US", { timeZone: tz, year: "numeric", month: "short", day: "2-digit" });
                                                            const time = d.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
                                                            return (
                                                                <>
                                                                    {date}<br />
                                                                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{time}</span>
                                                                </>
                                                            );
                                                        })() : "—"}
                                                    </td>
                                                    <td>
                                                        <span className="admin-status-badge" style={{ background: statusOpt.color, color: "#fff", padding: "3px 10px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 600 }}>
                                                            {statusOpt.label}
                                                        </span>
                                                    </td>
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <select
                                                            value={q.status}
                                                            onChange={(e) => updateQueryStatus(q.id, e.target.value)}
                                                            className="admin-select"
                                                            style={{ fontSize: "0.82rem", padding: "4px 8px" }}
                                                        >
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {isSuperAdmin && (
                                                            <button
                                                                className="admin-btn admin-btn-danger"
                                                                style={{ marginLeft: 8, fontSize: "0.78rem", padding: "4px 10px" }}
                                                                onClick={() => deleteQuery(q.id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={isSuperAdmin ? 8 : 7}>
                                                            <div className="support-query-detail">
                                                                <div className="support-query-meta">
                                                                    {q.trackingId && q.trackingId !== formatQueryId(q) && (
                                                                        <span><strong>Legacy Tracking ID:</strong> <code>{q.trackingId}</code></span>
                                                                    )}
                                                                    <span><strong>Submitted:</strong> {q.createdDate ? new Date(q.createdDate).toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" }) : "—"}</span>
                                                                    {q.updatedDate && <span><strong>Last Updated:</strong> {new Date(q.updatedDate).toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" })}</span>}
                                                                </div>
                                                                <div className="support-query-message">
                                                                    <strong>Message:</strong>
                                                                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: "8px 0 0", lineHeight: 1.6 }}>{q.message}</pre>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        )}
                    </div>
                );
            })()}
            {tab === "magazine" && (
                <MagazineEditor />
            )}
            {tab === "heroSlides" && (
                <div className="admin-hero-slides">
                    <h2 style={{ marginBottom: 4 }}>Hero Slides</h2>
                    <p style={{ color: "#6b6258", marginTop: 0, fontSize: 14, lineHeight: 1.5 }}>
                        Up to 8 decorative images rotate behind the home page hero. Empty rows are skipped.<br/>
                        Paste a <b>page URL from this site</b> (e.g. <code>/read/2</code>, <code>/gallery/7?img=28</code>, <code>/recipes/2</code>, <code>/articles/12</code>, <code>/podcasts/3</code>) and we'll auto-pick the right image. Or paste a direct <code>https://...</code> image URL. Click <b>Save all</b> to persist; the preview thumb shows what the home page will display.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                        {heroSlides.map((s) => {
                            const empty = !s.sourceUrl && !s.name;
                            const previewSrc = s.imageUrl ? resolveHeroImageUrl(s.imageUrl) : "";
                            return (
                                <div key={s.slot} style={{
                                    display: "grid",
                                    gridTemplateColumns: "60px 1fr 1.5fr 80px 90px",
                                    gap: 10,
                                    alignItems: "center",
                                    padding: "10px 12px",
                                    background: empty ? "#fafaf7" : "#fff",
                                    border: "1px solid #e7e2d8",
                                    borderRadius: 8,
                                }}>
                                    <div style={{ fontWeight: 600, color: "#6b6258" }}>Slot {s.slot}</div>
                                    <input
                                        type="text"
                                        value={s.name}
                                        onChange={(e) => updateHeroSlide(s.slot, "name", e.target.value)}
                                        placeholder="Name (alt text / caption)"
                                        maxLength={120}
                                        style={{ padding: "8px 10px", border: "1px solid #d6cfc1", borderRadius: 6 }}
                                    />
                                    <input
                                        type="text"
                                        value={s.sourceUrl}
                                        onChange={(e) => updateHeroSlide(s.slot, "sourceUrl", e.target.value)}
                                        placeholder="/read/2  •  /gallery/7?img=28  •  /recipes/2  •  https://..."
                                        style={{ padding: "8px 10px", border: "1px solid #d6cfc1", borderRadius: 6 }}
                                    />
                                    {previewSrc ? (
                                        <img
                                            src={previewSrc}
                                            alt={s.name || `Slot ${s.slot} preview`}
                                            style={{ width: 70, height: 44, objectFit: "cover", borderRadius: 4, border: "1px solid #e7e2d8" }}
                                            onError={(e) => { e.currentTarget.style.opacity = 0.2; }}
                                            title={s.imageUrl}
                                        />
                                    ) : s.sourceUrl ? (
                                        <span style={{ color: "#a64646", fontSize: 11, textAlign: "center" }} title="No image found for this URL">no img</span>
                                    ) : (
                                        <span style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>—</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => clearHeroSlide(s.slot)}
                                        disabled={empty}
                                        style={{
                                            padding: "6px 10px",
                                            background: empty ? "#f3f0e9" : "#fff",
                                            border: "1px solid #d6cfc1",
                                            borderRadius: 6,
                                            cursor: empty ? "default" : "pointer",
                                            color: empty ? "#aaa" : "#a64646",
                                        }}
                                    >Clear</button>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
                        <button
                            type="button"
                            onClick={saveHeroSlides}
                            disabled={heroSavingSlides}
                            style={{
                                padding: "10px 18px",
                                background: "#d97706",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                fontWeight: 600,
                                cursor: heroSavingSlides ? "wait" : "pointer",
                                opacity: heroSavingSlides ? 0.7 : 1,
                            }}
                        >{heroSavingSlides ? "Saving..." : "Save all"}</button>
                        <button
                            type="button"
                            onClick={fetchHeroSlides}
                            disabled={heroSavingSlides}
                            style={{ padding: "10px 14px", background: "#fff", border: "1px solid #d6cfc1", borderRadius: 6, cursor: "pointer" }}
                        >Reload</button>
                        <span style={{ color: "#6b6258", fontSize: 13 }}>
                            {heroSlides.filter(s => s.imageUrl).length} / 8 active
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
