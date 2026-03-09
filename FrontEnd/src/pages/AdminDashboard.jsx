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
                    {loading ? <p>{strings.common.loading}</p> : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{s.colName || "Name"}</th>
                                    <th>{s.colEmail || "Email"}</th>
                                    <th>{s.colRole || "Role"}</th>
                                    <th>{s.colStatus || "Status"}</th>
                                    <th>{s.colLastLogin || "Last Login"}</th>
                                    <th>{s.colActions || "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
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
                                            <select
                                                value={u.status || "ACTIVE"}
                                                onChange={(e) => changeStatus(u.id, e.target.value)}
                                            >
                                                <option value="ACTIVE">ACTIVE</option>
                                                <option value="INACTIVE">INACTIVE</option>
                                                <option value="BLOCKED">BLOCKED</option>
                                                <option value="DISABLED">DISABLED</option>
                                            </select>
                                        </td>
                                        <td>{u.lastLoginDate || "\u2014"}</td>
                                        <td>\u2014</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === "books" && (
                <div className="admin-table-wrap">
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
                                            <button
                                                className="admin-delete-btn"
                                                onClick={() => deleteBook(b.id)}
                                            >
                                                {strings.common.delete}
                                            </button>
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
