import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import "./Marketplace.css";

const API = process.env.REACT_APP_API_URL;

const CATEGORY_OPTIONS = ["Books", "Art", "Crafts", "Electronics", "Clothing", "Services", "Other"];
const CONDITION_OPTIONS = ["New", "Like New", "Good", "Fair"];

export default function Marketplace() {
  const { user } = useAuth();
  const userId = user?.userId;

  const [tab, setTab] = useState("browse");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [shareCopiedId, setShareCopiedId] = useState(null);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Other");
  const [condition, setCondition] = useState("Good");
  const [contactInfo, setContactInfo] = useState("");
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/marketplace/active`);
      setListings(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchMyListings = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/api/marketplace/user/${userId}`);
      setMyListings(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    if (tab === "my" && userId) fetchMyListings();
  }, [tab, userId]);

  const handleImageUpload = async (e, setImage) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/upload`, formData);
      setImage(res.data.url);
    } catch {
      setMessage("Failed to upload image");
    }
    setUploading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setPrice(""); setCategory("Other");
    setCondition("Good"); setContactInfo(""); setImage1(""); setImage2("");
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { setMessage("Title is required"); return; }
    if (!price.trim()) { setMessage("Price is required"); return; }
    if (!contactInfo.trim()) { setMessage("Contact info is required"); return; }

    const body = {
      userId,
      title: title.trim(),
      description: description.trim(),
      price: price.trim(),
      category,
      condition,
      contactInfo: contactInfo.trim(),
      image1Url: image1,
      image2Url: image2,
    };

    try {
      if (editingId) {
        await axios.put(`${API}/api/marketplace/${editingId}`, body);
        setMessage("Listing updated");
      } else {
        await axios.post(`${API}/api/marketplace`, body);
        setMessage("Listing created");
      }
      resetForm();
      fetchListings();
      if (userId) fetchMyListings();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to save listing");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this listing?")) return;
    try {
      await axios.delete(`${API}/api/marketplace/${id}?userId=${userId}`);
      setMessage("Listing removed");
      fetchListings();
      fetchMyListings();
    } catch {
      setMessage("Failed to remove listing");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setDescription(item.description || "");
    setPrice(item.price || "");
    setCategory(item.category || "Other");
    setCondition(item.condition || "Good");
    setContactInfo(item.contactInfo || "");
    setImage1(item.image1Url || "");
    setImage2(item.image2Url || "");
    setShowForm(true);
    setTab("my");
  };

  const handleShare = async (item) => {
    const url = `${window.location.origin}/#/marketplace`;
    const text = `Check out "${item.title}" for ${item.price} on Saat Saheli Marketplace!`;
    if (navigator.share) {
      try { await navigator.share({ title: item.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopiedId(item.id);
      setTimeout(() => setShareCopiedId(null), 2000);
    }
  };

  const filteredListings = filterCategory
    ? listings.filter(l => l.category === filterCategory)
    : listings;

  const renderListingCard = (item, isOwner) => (
    <div key={item.id} className="mp-card">
      <div className="mp-card-images">
        {item.image1Url ? (
          <img src={item.image1Url} alt={item.title} className="mp-card-img" />
        ) : (
          <div className="mp-card-img-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
        )}
        {item.image2Url && (
          <img src={item.image2Url} alt={`${item.title} 2`} className="mp-card-img mp-card-img-2" />
        )}
      </div>
      <div className="mp-card-info">
        <div className="mp-card-header">
          <h3 className="mp-card-title">{item.title}</h3>
          <span className="mp-card-price">{item.price}</span>
        </div>
        {item.description && <p className="mp-card-desc">{item.description}</p>}
        <div className="mp-card-meta">
          <span className="mp-card-badge mp-badge-category">{item.category}</span>
          <span className="mp-card-badge mp-badge-condition">{item.condition}</span>
        </div>
        {item.sellerName && <span className="mp-card-seller">by {item.sellerName}</span>}
        <div className="mp-card-contact">
          <strong>Contact:</strong> {item.contactInfo}
        </div>
        <div className="mp-card-actions">
          <button className="mp-share-btn" onClick={() => handleShare(item)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {shareCopiedId === item.id ? "Copied!" : "Share"}
          </button>
          {isOwner && (
            <>
              <button className="bm-btn bm-btn-edit bm-btn-sm" onClick={() => handleEdit(item)}>Edit</button>
              <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => handleDelete(item.id)}>Remove</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mp-page">
      <h1>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        Buy / Sell Marketplace
      </h1>

      <p className="mp-disclaimer">
        SaatSaheli is not responsible for any transactions, items, or outcomes of buying/selling.
        Buyers and sellers are fully responsible for their actions.
        <Link to="/policies" className="mp-policy-link"> Read full policies</Link>
      </p>

      {message && <div className="mp-message" onClick={() => setMessage("")}>{message}</div>}

      <div className="mp-section-card">
        {/* Tabs */}
        <div className="mp-tabs">
          <button className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}>Browse All</button>
          {userId && <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>My Listings</button>}
        </div>

        {/* Category filter */}
        {tab === "browse" && (
          <div className="mp-filter-bar">
            <button className={filterCategory === "" ? "active" : ""} onClick={() => setFilterCategory("")}>All</button>
            {CATEGORY_OPTIONS.map(cat => (
              <button key={cat} className={filterCategory === cat ? "active" : ""} onClick={() => setFilterCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Browse tab */}
        {tab === "browse" && (
          <div className="mp-grid">
            {loading ? <p>Loading...</p> :
              filteredListings.length === 0 ? <p className="mp-empty">No listings yet. Be the first to list an item!</p> :
              filteredListings.map(item => renderListingCard(item, userId && item.userId === userId))
            }
          </div>
        )}

        {/* My Listings tab */}
        {tab === "my" && userId && (
          <>
            <div className="mp-top-actions">
              <button className="bm-btn bm-btn-create" onClick={() => { resetForm(); setShowForm(true); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                + List an Item
              </button>
            </div>

            {/* Create / Edit Form */}
            {showForm && (
              <div className="mp-form">
                <h2>{editingId ? "Edit Listing" : "Create New Listing"}</h2>
                <div className="mp-field">
                  <label>Title *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you selling?" className="bm-input" />
                </div>
                <div className="mp-field">
                  <label>Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the item, its condition, features..." className="bm-input" rows={3} />
                </div>
                <div className="mp-field-row">
                  <div className="mp-field">
                    <label>Price *</label>
                    <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="$25 or Free or Best Offer" className="bm-input" />
                  </div>
                  <div className="mp-field">
                    <label>Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="bm-input">
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="mp-field">
                    <label>Condition</label>
                    <select value={condition} onChange={e => setCondition(e.target.value)} className="bm-input">
                      {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mp-field">
                  <label>Contact Info * (email, phone, or message preference)</label>
                  <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="your@email.com or (555) 123-4567" className="bm-input" />
                </div>
                <div className="mp-field-row">
                  <div className="mp-field">
                    <label>Photo 1 {uploading && "(Uploading...)"}</label>
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setImage1)} className="bm-input" disabled={uploading} />
                    {image1 && <img src={image1} alt="Preview 1" className="mp-preview-img" />}
                  </div>
                  <div className="mp-field">
                    <label>Photo 2 (optional) {uploading && "(Uploading...)"}</label>
                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setImage2)} className="bm-input" disabled={uploading} />
                    {image2 && <img src={image2} alt="Preview 2" className="mp-preview-img" />}
                  </div>
                </div>
                <div className="mp-form-actions">
                  <button className="bm-btn bm-btn-create" onClick={handleSave} disabled={uploading}>
                    {editingId ? "Update Listing" : "Publish Listing"}
                  </button>
                  <button className="bm-btn bm-btn-back" onClick={resetForm}>Cancel</button>
                </div>
              </div>
            )}

            {/* My listings grid */}
            <div className="mp-grid">
              {myListings.length === 0 && !showForm ? (
                <p className="mp-empty">No listings yet. Click "+ List an Item" to sell something!</p>
              ) : (
                myListings.map(item => renderListingCard(item, true))
              )}
            </div>
          </>
        )}

        {!userId && tab === "my" && (
          <p className="mp-empty">
            <Link to="/Login">Log in</Link> to create and manage your listings.
          </p>
        )}
      </div>
    </div>
  );
}
