import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "./AdminDashboard.css";

const API = process.env.REACT_APP_API_URL;

const AdminDashboard = () => {
    const { user, isSuperAdmin } = useAuth();
    const strings = useStrings();
    const s = strings.admin || {};

    const [tab, setTab] = useState("stats");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [resetPasswordUserId, setResetPasswordUserId] = useState(null);
    const [resetNewPassword, setResetNewPassword] = useState("");

    const headers = { "X-User-Id": String(user?.userId || "") };

    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/admin/stats`, { headers });
            setStats(res.data);
        } catch { /* ignore */ }
    }, [user?.userId]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/admin/users`, { headers });
            setUsers(res.data);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    const fetchBooks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/api/admin/books`, { headers });
            setBooks(res.data);
        } catch { /* ignore */ }
        setLoading(false);
    }, [user?.userId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (tab === "users") fetchUsers();
        if (tab === "books") fetchBooks();
    }, [tab, fetchUsers, fetchBooks]);

    const changeRole = async (userId, newRole) => {
        try {
            await axios.put(`${API}/api/admin/users/${userId}/role`, { role: newRole }, { headers });
            setMessage(s.roleUpdated || "Role updated");
            fetchUsers();
        } catch {
            setMessage(s.roleUpdateFailed || "Failed to update role");
        }
    };

    const changeStatus = async (userId, newStatus) => {
        try {
            await axios.put(`${API}/api/admin/users/${userId}/status`, { status: newStatus }, { headers });
            setMessage(s.statusUpdated || "Status updated");
            fetchUsers();
        } catch {
            setMessage(s.statusUpdateFailed || "Failed to update status");
        }
    };

    const deleteBook = async (bookId) => {
        if (!window.confirm(s.confirmDeleteBook || "Delete this book?")) return;
        try {
            await axios.delete(`${API}/api/admin/books/${bookId}`, { headers });
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
            const res = await axios.delete(`${API}/api/admin/books/purge`, { headers });
            setMessage(`Purged ${res.data.count} deleted books permanently.`);
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to purge deleted books");
        }
    };

    const archiveBook = async (bookId) => {
        try {
            await axios.put(`${API}/api/admin/books/${bookId}/archive`, {}, { headers });
            setMessage("Book archived");
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to archive book");
        }
    };

    const recoverBook = async (bookId) => {
        try {
            await axios.put(`${API}/api/admin/books/${bookId}/recover`, {}, { headers });
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
            await axios.delete(`${API}/api/admin/books/${bookId}/purge`, { headers });
            setMessage("Book permanently purged");
            fetchBooks();
            fetchStats();
        } catch {
            setMessage("Failed to purge book");
        }
    };

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
            await axios.put(`${API}/api/auth/admin-reset-password/${resetPasswordUserId}`, { newPassword: resetNewPassword }, { headers });
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

    const handleBookAction = (bookId, action, status) => {
        switch (action) {
            case "archive": archiveBook(bookId); break;
            case "delete": deleteBook(bookId); break;
            case "recover": recoverBook(bookId); break;
            case "purge": purgeBook(bookId); break;
            default: break;
        }
    };

    return (
        <div className="admin-dashboard">
            <h1>{s.heading || "Admin Dashboard"}</h1>
            {message && <div className="admin-message" onClick={() => setMessage("")}>{message}</div>}

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
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
