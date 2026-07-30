import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../AuthContext";
import ListingCard from "../components/ListingCard";
import "./Marketplace.css";

const API = process.env.REACT_APP_API_URL;

const CATEGORY_OPTIONS = ["Books", "Art", "Crafts", "Electronics", "Clothing", "Services", "Other"];
const CONDITION_OPTIONS = ["New", "Like New", "Good", "Fair"];

export default function Marketplace() {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = user?.userId;
  // Only Admin / SuperAdmin can create and manage listings ("My Listings").
  // Regular users get a browse-only Marketplace.
  const canManage = isAdmin;

  const [tab, setTab] = useState("browse");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState(searchParams.get("category") || "");

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState("inr");
  const [category, setCategory] = useState("Other");
  const [condition, setCondition] = useState("Good");
  const [contactInfo, setContactInfo] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("ACTIVE"); // ACTIVE (available) | INACTIVE (hidden)
  // Up to 4 photos per listing. images[0] is the primary/cover image.
  const [images, setImages] = useState(["", "", "", ""]);
  const setImageAt = (i) => (url) => setImages((prev) => {
    const next = [...prev];
    next[i] = url;
    return next;
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/api/marketplace/active`);
      setListings(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchMyListings = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`${API}/api/marketplace/user/${userId}`);
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
    // Show an instant local preview so the user sees the image immediately,
    // instead of waiting for the (potentially slow, multi-MB) upload to return
    // the remote URL. We swap in the uploaded URL on success.
    const localPreview = URL.createObjectURL(file);
    setImage(localPreview);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`${API}/api/upload`, formData);
      setImage(res.data.url);
    } catch (err) {
      console.error("Image upload failed:", err?.response?.status, err?.response?.data || err?.message);
      setImage("");
      setMessage(err.response?.data?.error
        || (err.request && !err.response ? "Couldn't reach the server to upload the image." : "Failed to upload image"));
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setPrice(""); setCategory("Other");
    setPriceAmount(""); setCurrency("inr");
    setCondition("Good"); setContactInfo(""); setImages(["", "", "", ""]);
    setQuantity("1"); setStatus("ACTIVE");
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { setMessage("Title is required"); return; }
    if (!price.trim()) { setMessage("Price is required"); return; }
    if (!contactInfo.trim()) { setMessage("Contact info is required"); return; }

    setSaving(true);
    const body = {
      userId,
      title: title.trim(),
      description: description.trim(),
      price: price.trim(),
      priceAmount: priceAmount.trim() === "" ? null : priceAmount.trim(),
      currency,
      category,
      condition,
      contactInfo: contactInfo.trim(),
      image1Url: images[0],
      image2Url: images[1],
      image3Url: images[2],
      image4Url: images[3],
      quantity: quantity.trim() === "" ? 1 : Math.max(0, parseInt(quantity, 10) || 0),
      status,
    };

    try {
      if (editingId) {
        await api.put(`${API}/api/marketplace/${editingId}`, body);
        setMessage("Listing updated");
      } else {
        await api.post(`${API}/api/marketplace`, body);
        setMessage("Listing created");
      }
      resetForm();
      fetchListings();
      if (userId) fetchMyListings();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to save listing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this listing?")) return;
    try {
      await api.delete(`${API}/api/marketplace/${id}?userId=${userId}`);
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
    setPriceAmount(item.priceAmount != null ? String(item.priceAmount) : "");
    setCurrency(item.currency || "inr");
    setCategory(item.category || "Other");
    setCondition(item.condition || "Good");
    setContactInfo(item.contactInfo || "");
    setImages([
      item.image1Url || "",
      item.image2Url || "",
      item.image3Url || "",
      item.image4Url || "",
    ]);
    setQuantity(String(item.quantity ?? 1));
    setStatus(item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setShowForm(true);
    setTab("my");
  };

  const filteredListings = filterCategory
    ? listings.filter(l => l.category === filterCategory)
    : listings;

  const renderListingCard = (item, isOwner) => (
    <ListingCard
      key={item.id}
      item={item}
      onMessage={setMessage}
      ownerActions={isOwner ? (
        <>
          <button className="bm-btn bm-btn-edit bm-btn-sm" onClick={() => handleEdit(item)}>Edit</button>
          <button className="bm-btn bm-btn-delete bm-btn-sm" onClick={() => handleDelete(item.id)}>Remove</button>
        </>
      ) : null}
    />
  );

  return (
    <div className="mp-page">
      <h1>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: 8 }}>
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
        </svg>
        Browse the Shop
      </h1>

      <p className="mp-disclaimer">
        Sold and shipped by Avika Ventures. Secure Stripe checkout with free cancellation within 24 hours (before shipping).
        <Link to="/marketplace/terms" className="mp-policy-link"> Terms</Link>
        <Link to="/marketplace/shipping" className="mp-policy-link"> Shipping &amp; Returns</Link>
      </p>

      {message && <div className="mp-message" onClick={() => setMessage("")} role="status">{message}</div>}

      <div className="mp-section-card">
        {/* Tabs */}
        <div className="mp-tabs">
          <button className={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}>Browse All</button>
          {canManage && <button className={tab === "my" ? "active" : ""} onClick={() => setTab("my")}>My Listings</button>}
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
              filteredListings.map(item => renderListingCard(item, canManage && item.userId === userId))
            }
          </div>
        )}

        {/* My Listings tab */}
        {tab === "my" && canManage && (
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
                <div className="mp-field-row">
                  <div className="mp-field">
                    <label>Purchase Price (number, enables Add to Cart)</label>
                    <input type="number" min="0" step="0.01" value={priceAmount} onChange={e => setPriceAmount(e.target.value)} placeholder="e.g. 499  (leave blank for contact-only)" className="bm-input" />
                  </div>
                  <div className="mp-field">
                    <label>Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="bm-input">
                      <option value="inr">INR (₹)</option>
                      <option value="usd">USD ($)</option>
                    </select>
                  </div>
                </div>
                <div className="mp-field">
                  <label>Contact Info * (email, phone, or message preference)</label>
                  <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="your@email.com or (555) 123-4567" className="bm-input" />
                </div>
                <div className="mp-field-row">
                  <div className="mp-field">
                    <label>Quantity in stock</label>
                    <input type="number" min="0" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="bm-input" />
                    <small style={{ color: "var(--text-muted)" }}>Decreases as items sell. 0 = shown as “Sold out”.</small>
                  </div>
                  <div className="mp-field">
                    <label>Availability</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="bm-input">
                      <option value="ACTIVE">Available (shown in shop)</option>
                      <option value="INACTIVE">Not available (hidden)</option>
                    </select>
                  </div>
                </div>
                <label className="mp-photos-label">Photos (up to 4 — the first is the cover){uploading && " · Uploading…"}</label>
                <div className="mp-photo-grid">
                  {images.map((img, i) => (
                    <div className="mp-field mp-photo-slot" key={i}>
                      <label>{i === 0 ? "Cover photo" : `Photo ${i + 1} (optional)`}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageUpload(e, setImageAt(i))}
                        className="bm-input"
                        disabled={uploading}
                      />
                      {img && (
                        <div className="mp-photo-preview-wrap">
                          <img src={img} alt={`Preview ${i + 1}`} className="mp-preview-img" />
                          <button
                            type="button"
                            className="mp-photo-remove"
                            onClick={() => setImageAt(i)("")}
                            aria-label={`Remove photo ${i + 1}`}
                          >×</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mp-form-actions">
                  <button className="bm-btn bm-btn-create" onClick={handleSave} disabled={saving || uploading}>
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

      </div>
    </div>
  );
}
