import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import TermsGate from "../components/TermsGate";
import "../Account.css";

const API = process.env.REACT_APP_API_URL;
const API_BOOKS = `${API}/api/books`;
const API_AUTH = `${API}/api/auth`;
const UPLOAD_API = `${API}/api/upload`;
const API_GALLERIES = `${API}/api/galleries`;

function Account() {
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [galleries, setGalleries] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryMsg, setGalleryMsg] = useState("");
  const [newGalleryTitle, setNewGalleryTitle] = useState("");
  const [selectedGalleryId, setSelectedGalleryId] = useState(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [booksRes, profileRes, galleriesRes] = await Promise.all([
          axios.get(`${API_BOOKS}/user/${user.userId}`),
          axios.get(`${API_AUTH}/user/${user.userId}`),
          axios.get(`${API_GALLERIES}/user/${user.userId}`),
        ]);
        setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
        setProfile(profileRes.data);
        const gals = Array.isArray(galleriesRes.data) ? galleriesRes.data : [];
        setGalleries(gals);
        if (gals.length > 0) {
          setSelectedGalleryId(gals[0].id);
          setGalleryImages(gals[0].images || []);
        }
      } catch {
        setError(strings.account.error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleCreateGallery = async () => {
    if (!newGalleryTitle.trim()) return;
    try {
      const res = await axios.post(API_GALLERIES, { title: newGalleryTitle.trim(), userId: user.userId });
      setGalleries([res.data, ...galleries]);
      setSelectedGalleryId(res.data.id);
      setGalleryImages([]);
      setNewGalleryTitle("");
      setGalleryMsg("Gallery created!");
    } catch {
      setGalleryMsg("Failed to create gallery");
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedGalleryId) return;
    setUploadingGallery(true);
    setGalleryMsg("");
    let uploaded = 0;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", user.userId);
        formData.append("caption", file.name);
        const res = await axios.post(`${API_GALLERIES}/${selectedGalleryId}/images`, formData);
        setGalleryImages(prev => [...prev, res.data]);
        uploaded++;
      } catch {
        // skip failed uploads
      }
    }
    if (uploaded > 0) {
      setGalleryMsg(`${uploaded} image(s) uploaded!`);
    }
    setUploadingGallery(false);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const removeGalleryImage = async (imageId) => {
    try {
      await axios.delete(`${API_GALLERIES}/images/${imageId}?userId=${user.userId}`);
      setGalleryImages(galleryImages.filter(img => img.id !== imageId));
    } catch { /* ignore */ }
  };

  const handleSelectGallery = (galleryId) => {
    setSelectedGalleryId(galleryId);
    const gal = galleries.find(g => g.id === galleryId);
    setGalleryImages(gal?.images || []);
  };

  const handleDeleteGallery = async (galleryId) => {
    if (!window.confirm("Delete this gallery?")) return;
    try {
      await axios.delete(`${API_GALLERIES}/${galleryId}?userId=${user.userId}`);
      const updated = galleries.filter(g => g.id !== galleryId);
      setGalleries(updated);
      if (selectedGalleryId === galleryId) {
        setSelectedGalleryId(updated[0]?.id || null);
        setGalleryImages(updated[0]?.images || []);
      }
      setGalleryMsg("Gallery deleted!");
    } catch { setGalleryMsg("Failed to delete gallery"); }
  };

  const userInterests = profile?.interests ? profile.interests.split(",").map(s => s.trim()) : [];

  if (!user) {
    return (
      <div className="account-page">
        <p className="acct-login-prompt">{strings.account.loginRequired}</p>
        <div style={{ textAlign: "center" }}>
          <button
            className="bm-btn bm-btn-create"
            onClick={() => navigate("/Login")}
          >
            {strings.header.navLogin}
          </button>
        </div>
      </div>
    );
  }

  const statusClass = (status) => {
    switch (status) {
      case "PUBLISHED": return "bm-status-published";
      case "DRAFT": return "bm-status-draft";
      default: return "bm-status-draft";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <TermsGate userId={user.userId}>
    <div className="account-page">
      <div className="acct-nav-bar">
        <button className="bm-btn bm-btn-back" onClick={() => navigate(-1)}>
          {strings.common.back}
        </button>
      </div>
      <h1>{strings.account.heading}</h1>

      <div className="acct-profile-card">
        <div className="acct-profile-top">
          <div className="acct-avatar-wrap">
            {profile && profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl.startsWith("http") ? profile.profileImageUrl : `${process.env.REACT_APP_API_URL}${profile.profileImageUrl}`}
                alt={profile.displayName || user.name}
                className="acct-profile-avatar"
              />
            ) : (
              <div className="acct-avatar-placeholder">
                {(profile?.displayName || user.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="acct-profile-details">
            <h2 className="acct-display-name">{profile?.displayName || user.name}</h2>
            {profile?.headline && (
              <p className="acct-headline">{profile.headline}</p>
            )}
            <div className="acct-meta-row">
              <span className="acct-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {user.email}
              </span>
              {profile?.location && (
                <span className="acct-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {profile?.bio && (
          <div className="acct-bio-section">
            <h3 className="acct-bio-label">{strings.account.labelBio}</h3>
            <p className="acct-bio-text">{profile.bio}</p>
          </div>
        )}
        {profile?.interests && (
          <div className="acct-tags-section">
            <h3 className="acct-bio-label">{strings.account.labelInterests}</h3>
            <div className="acct-tags">
              {profile.interests.split(",").map((item, i) => (
                <span key={i} className="acct-tag">{item.trim()}</span>
              ))}
            </div>
          </div>
        )}
        {profile?.fields && (
          <div className="acct-tags-section">
            <h3 className="acct-bio-label">{strings.account.labelFields}</h3>
            <div className="acct-tags">
              {profile.fields.split(",").map((item, i) => (
                <span key={i} className="acct-tag acct-tag-field">{item.trim()}</span>
              ))}
            </div>
          </div>
        )}
        <div className="acct-profile-actions">
          <Link to="/profile" className="acct-profile-link">
            {profile?.displayName ? strings.account.editProfile : strings.account.createProfile}
          </Link>
          {profile?.displayName && (
            <Link to={`/profile/${user.userId}`} className="acct-profile-link acct-profile-link-secondary">
              {strings.account.viewPublicProfile}
            </Link>
          )}
        </div>
      </div>

      {loading && <div className="loading-spinner" />}
      {error && <p className="acct-error">{error}</p>}

      {!loading && !error && (userInterests.includes("Book") || books.length > 0) && (
        <>
          <h2>{strings.account.booksHeading}</h2>

          {books.length === 0 && (
            <p className="acct-empty">{strings.account.emptyState}</p>
          )}

          {books.length > 0 && (
        <table className="acct-books-table">
          <thead>
            <tr>
              <th>{strings.account.thTitle}</th>
              <th>{strings.account.thStatus}</th>
              <th>{strings.account.thCreated}</th>
              <th>{strings.account.thModified}</th>
              <th>{strings.account.thActions}</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id}>
                <td>
                  <Link to={`/read/${book.id}`} className="acct-book-link">
                    {book.title}
                  </Link>
                </td>
                <td>
                  <span className={`bm-status ${statusClass(book.status)}`}>
                    {book.status}
                  </span>
                </td>
                <td>{formatDate(book.createdDate)}</td>
                <td>{formatDate(book.modifiedDate)}</td>
                <td>
                  <button
                    className="bm-btn bm-btn-edit bm-btn-sm"
                    onClick={() =>
                      navigate("/books", { state: { editBookId: book.id } })
                    }
                  >
                    {strings.account.editButton}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          )}
        </>
      )}

      {/* Interest-based sections */}
      {!loading && userInterests.length > 0 && (
        <div className="acct-interests-sections">
          <h2>My Sections</h2>

          {userInterests.includes("Gallery") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Gallery
              </h3>

              {/* Create new gallery */}
              <div className="acct-gallery-create" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={newGalleryTitle}
                  onChange={(e) => setNewGalleryTitle(e.target.value)}
                  placeholder="New gallery title..."
                  className="acct-gallery-input"
                  style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #3a5a7b", fontSize: "0.88rem", background: "#0f1923", color: "#f0f4f8" }}
                />
                <button className="ss-btn ss-btn-primary ss-btn-sm" onClick={handleCreateGallery} disabled={!newGalleryTitle.trim()}>Create Gallery</button>
              </div>

              {/* Gallery tabs */}
              {galleries.length > 0 && (
                <div className="acct-gallery-tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {galleries.map(g => (
                    <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <button
                        className={`ss-btn ss-btn-sm ${selectedGalleryId === g.id ? "ss-btn-primary" : "ss-btn-outline"}`}
                        onClick={() => handleSelectGallery(g.id)}
                      >
                        {g.title}
                      </button>
                      <button
                        className="acct-gallery-remove"
                        onClick={() => handleDeleteGallery(g.id)}
                        title="Delete gallery"
                        style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "1rem" }}
                      >&times;</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Gallery images */}
              {selectedGalleryId && (
                <>
                  <div className="acct-gallery-grid">
                    {galleryImages.map((img) => (
                      <div key={img.id} className="acct-gallery-item">
                        <img src={img.imageUrl} alt={img.caption || "Gallery photo"} className="acct-gallery-img" />
                        <button className="acct-gallery-remove" onClick={() => removeGalleryImage(img.id)} title="Remove">&times;</button>
                      </div>
                    ))}
                  </div>
                  {galleryMsg && <p className="acct-gallery-msg">{galleryMsg}</p>}
                  <div className="acct-gallery-upload" style={{ marginTop: 8 }}>
                    <label className="ss-btn ss-btn-secondary ss-btn-sm" style={{ cursor: "pointer" }}>
                      {uploadingGallery ? "Uploading..." : "Upload Photos"}
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        disabled={uploadingGallery}
                        style={{ display: "none" }}
                      />
                    </label>
                    <Link to={`/gallery/${selectedGalleryId}`} className="ss-btn ss-btn-outline ss-btn-sm" style={{ marginLeft: 8 }}>
                      View Gallery
                    </Link>
                  </div>
                </>
              )}

              {galleries.length === 0 && <p className="acct-section-desc">Create your first gallery to start sharing photos!</p>}
            </div>
          )}

          {userInterests.includes("My Page") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                My Page
              </h3>
              <p className="acct-section-desc">Your personal page. <Link to={`/profile/${user.userId}`}>View your public profile</Link> to see how it looks.</p>
            </div>
          )}

          {userInterests.includes("Book") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                Books
              </h3>
              <p className="acct-section-desc">Create and manage your books. <Link to="/books">Go to Book Manager</Link></p>
            </div>
          )}

          {userInterests.includes("Poems") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Poems
              </h3>
              <p className="acct-section-desc">Share your poetry with the community. <Link to="/category/writing">Create in Writing category</Link></p>
            </div>
          )}

          {userInterests.includes("Blog") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Blog
              </h3>
              <p className="acct-section-desc">Write blog posts to share your thoughts. <Link to="/books">Create a new book as your blog</Link></p>
            </div>
          )}

          {userInterests.includes("Article") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Articles
              </h3>
              <p className="acct-section-desc">Publish articles on your favorite topics. <Link to="/books">Create a new book as your article</Link></p>
            </div>
          )}

          {userInterests.includes("Recipes") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                Recipes
              </h3>
              <p className="acct-section-desc">Share your favorite recipes. <Link to="/books">Create a recipe book</Link></p>
            </div>
          )}

          {userInterests.includes("DIY") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
                DIY
              </h3>
              <p className="acct-section-desc">Share your DIY projects and tutorials. <Link to="/category/creativity">Explore Creativity</Link></p>
            </div>
          )}

          {userInterests.includes("Other") && (
            <div className="acct-section-card">
              <h3 className="acct-section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Other
              </h3>
              <p className="acct-section-desc">Explore and create content across all categories. <Link to="/books">Go to Book Manager</Link></p>
            </div>
          )}
        </div>
      )}

      {!loading && userInterests.length === 0 && profile?.displayName && (
        <div className="acct-no-interests">
          <p>You haven't selected any interests yet. <Link to="/profile">Edit your profile</Link> to choose what you'd like to create.</p>
        </div>
      )}
    </div>
    </TermsGate>
  );
}

export default Account;
