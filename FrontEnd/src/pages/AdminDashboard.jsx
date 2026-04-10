import React, { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
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

const AdminDashboard = () => {
    const { user, isSuperAdmin } = useAuth();
    const strings = useStrings();
    const s = strings.admin || {};

    const [tab, setTab] = useState("stats");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [books, setBooks] = useState([]);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [articleSearch, setArticleSearch] = useState("");
    const [articleTypeFilter, setArticleTypeFilter] = useState("");
    const [articleStatusFilter, setArticleStatusFilter] = useState("");
    const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
    const [resetNewPassword, setResetNewPassword] = useState("");

    // Advertisement banner state
    const [advertisements, setAdvertisements] = useState([]);
    const [adTitle, setAdTitle] = useState("");
    const [adContentType, setAdContentType] = useState("text"); // "text" | "html" | "image"
    const [adHtmlContent, setAdHtmlContent] = useState("");
    const [adImageUrl, setAdImageUrl] = useState("");
    const [adImageFile, setAdImageFile] = useState(null);
    const [adLinkUrl, setAdLinkUrl] = useState("");
    const [adAnimation, setAdAnimation] = useState("static"); // "static" | "scroll" | "blink"
    const [adActive, setAdActive] = useState(true);
    const [adUploading, setAdUploading] = useState(false);

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

    const addAdvertisement = async () => {
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
            await api.post(`${API}/api/advertisements`, {
                userId: user.userId,
                title: adTitle,
                contentType: adContentType,
                htmlContent: adContentType === "html" ? adHtmlContent : "",
                imageUrl: adContentType === "image" ? adImageUrl : "",
                linkUrl: adLinkUrl,
                animation: adAnimation,
                active: adActive,
            });
            setAdTitle(""); setAdHtmlContent(""); setAdImageUrl(""); setAdImageFile(null);
            setAdLinkUrl(""); setAdAnimation("static"); setAdActive(true); setAdContentType("text");
            setMessage("Advertisement added successfully");
            fetchAdvertisements();
        } catch {
            setMessage("Failed to create advertisement");
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

    const fetchSupportQueries = useCallback(async () => {
        setSupportLoading(true);
        try {
            const res = await api.get(`${API}/api/contact`);
            setSupportQueries(Array.isArray(res.data) ? res.data : []);
            setSelectedQueryIds(new Set());
        } catch { /* ignore */ }
        setSupportLoading(false);
    }, [user?.userId]);

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
        if (tab === "analytics") fetchAnalytics();
        if (tab === "advertisements") fetchAdvertisements();
        if (tab === "support") fetchSupportQueries();
    }, [tab, fetchUsers, fetchBooks, fetchArticles, fetchAnalytics, fetchAdvertisements, fetchSupportQueries]);

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

    const purgeDeletedBooks = async () => {
        if (!window.confirm("Permanently delete ALL books marked as deleted? This cannot be undone.")) return;
        try {
            const res = await api.delete(`${API}/api/admin/books/purge`);
            setMessage(`Purged ${res.data.count} deleted books permanently.`);
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to purge deleted books");
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

    const purgeAllDraftArticles = async () => {
        if (!window.confirm("Permanently delete ALL draft articles? This cannot be undone.")) return;
        try {
            const res = await api.delete(`${API}/api/admin/articles/purge`);
            setMessage(`Purged ${res.data.count} draft articles permanently.`);
            fetchArticles();
            fetchStats();
        } catch {
            setMessage("Failed to purge draft articles");
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
                <button className={tab === "analytics" ? "active" : ""} onClick={() => setTab("analytics")}>
                    Analytics
                </button>
                <button className={tab === "maintenance" ? "active" : ""} onClick={() => setTab("maintenance")}>
                    Maintenance
                </button>
                <button className={tab === "support" ? "active" : ""} onClick={() => setTab("support")}>
                    Support Queries
                </button>
                <button className={tab === "magazine" ? "active" : ""} onClick={() => setTab("magazine")}>
                    Magazine
                </button>
                {isSuperAdmin && (
                    <button className={tab === "advertisements" ? "active" : ""} onClick={() => setTab("advertisements")}>
                        Advertisements
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
                                    <th>{s.colStatus || "Status"}</th>
                                    <th>{s.colLastLogin || "Last Login"}</th>
                                    <th>{s.colActions || "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
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
                                        <td>{u.lastLoginDate || "\u2014"}</td>
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
                    {isSuperAdmin && (
                        <div className="admin-purge-bar">
                            <button className="admin-purge-btn" onClick={purgeDeletedBooks}>
                                Permanently Delete All Removed Books
                            </button>
                            <span className="admin-purge-note">
                                This will permanently remove all books with &quot;DELETED&quot; status and their pages.
                            </span>
                        </div>
                    )}
                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{s.colTitle || "Title"}</th>
                                    <th>{s.colAuthor || "Author"}</th>
                                    <th>{s.colBookStatus || "Status"}</th>
                                    <th>{s.colModified || "Modified"}</th>
                                    <th>{s.colActions || "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((b) => (
                                    <tr key={b.id}>
                                        <td>{b.id}</td>
                                        <td>{b.title}</td>
                                        <td>{b.authorName || "\u2014"}</td>
                                        <td>
                                            <span className={`status-badge status-${(b.status || "").toLowerCase()}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td>{b.modifiedDate || "\u2014"}</td>
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

                    {/* Purge bar for Super Admin */}
                    {isSuperAdmin && (
                        <div className="admin-purge-bar">
                            <button className="admin-purge-btn" onClick={purgeAllDraftArticles}>
                                Permanently Delete All Draft Articles
                            </button>
                            <span className="admin-purge-note">
                                This will permanently remove all articles, blogs, and poems with &quot;DRAFT&quot; status.
                            </span>
                        </div>
                    )}

                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Category</th>
                                    <th>Author</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredArticles.map((a) => (
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
                                        <td>{toPSTDate(a.createdDate)}</td>
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

                    {/* Add new advertisement form */}
                    <div className="admin-maint-form">
                        <h3>Create New Advertisement</h3>
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
                        <button className="bm-btn bm-btn-create" onClick={addAdvertisement}>Create Advertisement</button>
                    </div>

                    {/* Existing advertisements */}
                    <div className="admin-maint-list">
                        <h3>Advertisements ({advertisements.length})</h3>
                        {advertisements.length === 0 ? (
                            <p className="admin-maint-empty">No advertisements created yet.</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>Animation</th>
                                        <th>Preview</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {advertisements.map(ad => (
                                        <tr key={ad.id}>
                                            <td>{ad.title}</td>
                                            <td>
                                                <span className={`admin-type-badge admin-type-${ad.contentType === "html" ? "blog" : ad.contentType === "image" ? "article" : "poetry"}`}>
                                                    {ad.contentType === "html" ? "HTML" : ad.contentType === "image" ? "Image" : "Text"}
                                                </span>
                                            </td>
                                            <td style={{ textTransform: "capitalize" }}>{ad.animation}</td>
                                            <td style={{ maxWidth: 200 }}>
                                                {ad.contentType === "image" && ad.imageUrl && (
                                                    <img src={ad.imageUrl} alt={ad.title} style={{ maxWidth: 120, maxHeight: 60, borderRadius: 4 }} />
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
                                            <td>{toPSTDate(ad.createdDate)}</td>
                                            <td>
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
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(q => {
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
                        )}
                    </div>
                );
            })()}
            {tab === "magazine" && (
                <MagazineEditor />
            )}
        </div>
    );
};

export default AdminDashboard;
