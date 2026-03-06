import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "../Profile.css";

const API = process.env.REACT_APP_API_URL;

function Profile() {
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();
  const s = strings.profile;

  const [form, setForm] = useState({
    displayName: "",
    headline: "",
    location: "",
    bio: "",
  });
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/api/auth/user/${user.userId}`);
        const data = res.data;
        setForm({
          displayName: data.displayName || "",
          headline: data.headline || "",
          location: data.location || "",
          bio: data.bio || "",
        });
        setProfileImageUrl(data.profileImageUrl || "");
      } catch {
        setError(s.loadError);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, s.loadError]);

  if (!user) {
    return (
      <div className="profile-page">
        <p className="profile-login-prompt">{s.loginRequired}</p>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/api/upload`, formData);
      setProfileImageUrl(res.data.url);
      setMessage(s.imageUploaded);
    } catch {
      setError(s.imageUploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError(s.nameRequired);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await axios.put(`${API}/api/auth/user/${user.userId}`, {
        displayName: form.displayName,
        headline: form.headline,
        location: form.location,
        bio: form.bio,
        profileImageUrl: profileImageUrl,
      });
      setMessage(s.saved);
    } catch {
      setError(s.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-page"><p className="profile-loading">{s.loading}</p></div>;
  }

  return (
    <div className="profile-page">
      <h1>{form.displayName ? s.editHeading : s.heading}</h1>

      {message && <p className="profile-msg profile-msg-success">{message}</p>}
      {error && <p className="profile-msg profile-msg-error">{error}</p>}

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-field">
          <label htmlFor="displayName">{s.labelDisplayName} *</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={form.displayName}
            onChange={handleChange}
            placeholder={s.placeholderDisplayName}
            maxLength={100}
            required
          />
        </div>

        <div className="profile-field">
          <label htmlFor="headline">{s.labelHeadline}</label>
          <input
            id="headline"
            name="headline"
            type="text"
            value={form.headline}
            onChange={handleChange}
            placeholder={s.placeholderHeadline}
            maxLength={150}
          />
        </div>

        <div className="profile-field">
          <label htmlFor="profileImage">{s.labelProfileImage}</label>
          <div className="profile-image-section">
            {profileImageUrl && (
              <img
                src={profileImageUrl.startsWith("http") ? profileImageUrl : `${API}${profileImageUrl}`}
                alt={s.imageAlt}
                className="profile-image-preview"
              />
            )}
            <input
              id="profileImage"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            {uploading && <span className="profile-uploading">{s.uploading}</span>}
          </div>
        </div>

        <div className="profile-field">
          <label htmlFor="location">{s.labelLocation}</label>
          <input
            id="location"
            name="location"
            type="text"
            value={form.location}
            onChange={handleChange}
            placeholder={s.placeholderLocation}
            maxLength={100}
          />
        </div>

        <div className="profile-field">
          <label htmlFor="bio">{s.labelBio}</label>
          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder={s.placeholderBio}
            rows={5}
            maxLength={1000}
          />
        </div>

        <div className="profile-actions">
          <button type="submit" className="bm-btn bm-btn-create" disabled={saving}>
            {saving ? s.saving : s.saveButton}
          </button>
          <button type="button" className="bm-btn bm-btn-edit" onClick={() => navigate("/account")}>
            {s.backToAccount}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profile;
