import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import ImageEditor from "../components/ImageEditor";
import "../Profile.css";

const API = process.env.REACT_APP_API_URL;

const TEAM_ROLE_OPTIONS = [
  "Founder / Editor-in-Chief",
  "Managing Editor",
  "Content Head",
  "Community Manager",
  "Marketing/Growth Lead",
  "Tech Lead (or CTO)",
];

const BIO_MAX = 3000; // ~500 words

// Mirrors ProfileHandleService.slugify: "Chitra  Sharma!" → "Chitra-Sharma".
function suggestHandle(name) {
  return (name || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function Profile() {
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();
  const s = strings.profile;
  const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");

  const [form, setForm] = useState({
    displayName: "",
    handle: "",
    headline: "",
    occupation: "",
    location: "",
    bio: "",
    teamRole: "",
  });
  const [interests, setInterests] = useState([]);
  const [fields, setFields] = useState([]);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editorFile, setEditorFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Profile URL id: letters, digits, hyphens; never only digits (those are legacy ids).
  const handleValid = (h) => /^[\p{L}\p{M}\p{N}-]{2,40}$/u.test(h) && !/^\p{N}+$/u.test(h);
  const [handleStatus, setHandleStatus] = useState(null); // null | "checking" | "ok" | "taken" | "invalid"
  const [handleTouched, setHandleTouched] = useState(false);
  const [savedHandle, setSavedHandle] = useState("");

  useEffect(() => {
    const h = (form.handle || "").trim();
    if (!h) { setHandleStatus(null); return; }
    if (!handleValid(h)) { setHandleStatus("invalid"); return; }
    if (h.toLowerCase() === savedHandle.toLowerCase()) { setHandleStatus("ok"); return; }
    setHandleStatus("checking");
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`${API}/api/auth/handle-available`, { params: { handle: h } });
        setHandleStatus(res.data?.available ? "ok" : "taken");
      } catch {
        setHandleStatus(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.handle, savedHandle]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const res = await api.get(`${API}/api/auth/user/${user.userId}`);
        const data = res.data;
        setForm({
          displayName: data.displayName || "",
          handle: data.handle || "",
          headline: data.headline || "",
          occupation: data.occupation || "",
          location: data.location || "",
          bio: data.bio || "",
          teamRole: data.teamRole || "",
        });
        setProfileImageUrl(data.profileImageUrl || "");
        setSavedHandle(data.handle || "");
        setInterests(data.interests ? data.interests.split(",") : []);
        setFields(data.fields ? data.fields.split(",") : []);
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

  // Suggest a URL id from the display name until the creator edits the id themselves.
  const handleDisplayNameChange = (e) => {
    const displayName = e.target.value;
    setForm(f => ({
      ...f,
      displayName,
      handle: handleTouched || savedHandle ? f.handle : suggestHandle(displayName),
    }));
  };
  const handleHandleChange = (e) => {
    setHandleTouched(true);
    setForm(f => ({ ...f, handle: e.target.value.replace(/\s+/g, "-") }));
  };

  const uploadProfileImage = async (file) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`${API}/api/upload`, formData);
      setProfileImageUrl(res.data.url);
      setMessage(s.imageUploaded);
    } catch {
      setError(s.imageUploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      setError("Image must be under 5MB.");
      e.target.value = "";
      return;
    }
    setEditorFile(file);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError(s.nameRequired);
      return;
    }
    if (form.handle.trim() && handleStatus === "invalid") {
      setError(s.handleInvalid);
      return;
    }
    if (handleStatus === "taken") {
      setError(s.handleTaken);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        displayName: form.displayName,
        handle: form.handle.trim(), // blank → server generates one from the name
        headline: form.headline,
        occupation: form.occupation,
        location: form.location,
        bio: form.bio,
        profileImageUrl: profileImageUrl,
        interests: interests.join(","),
        fields: fields.join(","),
      };
      if (isAdmin) payload.teamRole = form.teamRole;
      const res = await api.put(`${API}/api/auth/user/${user.userId}`, payload);
      const saved = res.data || {};
      navigate(profileUrl(user.userId, saved.displayName || form.displayName || user.name, saved.handle));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) setError(s.handleTaken);
      else if (status === 400 && err?.response?.data?.error) setError(s.handleInvalid);
      else setError(s.saveFailed);
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
            onChange={handleDisplayNameChange}
            placeholder={s.placeholderDisplayName}
            maxLength={100}
            required
          />
        </div>

        <div className="profile-field">
          <label htmlFor="handle">{s.labelHandle}</label>
          <div className="profile-handle-row">
            <span className="profile-handle-prefix">saatsaheli.com/profile/</span>
            <input
              id="handle"
              name="handle"
              type="text"
              value={form.handle}
              onChange={handleHandleChange}
              placeholder={s.placeholderHandle}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="handle-help"
            />
          </div>
          <small id="handle-help" className={`profile-handle-help profile-handle-${handleStatus || "idle"}`}>
            {handleStatus === "checking" && s.handleChecking}
            {handleStatus === "ok" && s.handleAvailable}
            {handleStatus === "taken" && s.handleTaken}
            {handleStatus === "invalid" && s.handleInvalid}
            {!handleStatus && s.handleHelp}
          </small>
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
          <label htmlFor="occupation">Role (optional)</label>
          <input
            id="occupation"
            name="occupation"
            type="text"
            value={form.occupation}
            onChange={handleChange}
            placeholder="e.g., Writer, Poet, Artist, Engineer"
            maxLength={100}
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
            rows={10}
            maxLength={BIO_MAX}
          />
          <div className="profile-char-counter" style={{ fontSize: 12, color: "#666", textAlign: "right", marginTop: 4 }}>
            {form.bio.length} / {BIO_MAX} characters (~500 words)
          </div>
        </div>

        {isAdmin && (
          <div className="profile-field">
            <label htmlFor="teamRole">SaatSaheli Team Role</label>
            <select
              id="teamRole"
              name="teamRole"
              value={form.teamRole}
              onChange={handleChange}
            >
              <option value="">— None —</option>
              {TEAM_ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        <div className="profile-field">
          <label>{s.labelInterests}</label>
          <div className="profile-checkbox-group">
            {s.interestOptions.map((opt) => (
              <label
                key={opt}
                className={`profile-checkbox-label${interests.includes(opt) ? " checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={interests.includes(opt)}
                  onChange={() =>
                    setInterests((prev) =>
                      prev.includes(opt) ? prev.filter((i) => i !== opt) : [...prev, opt]
                    )
                  }
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="profile-field">
          <label>{s.labelFields}</label>
          <div className="profile-checkbox-group">
            {s.fieldOptions.map((opt) => (
              <label
                key={opt}
                className={`profile-checkbox-label${fields.includes(opt) ? " checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={fields.includes(opt)}
                  onChange={() =>
                    setFields((prev) =>
                      prev.includes(opt) ? prev.filter((f) => f !== opt) : [...prev, opt]
                    )
                  }
                />
                {opt}
              </label>
            ))}
          </div>
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
      {editorFile && (
        <ImageEditor
          file={editorFile}
          onDone={(editedFile) => { uploadProfileImage(editedFile); setEditorFile(null); }}
          onCancel={() => setEditorFile(null)}
        />
      )}
    </div>
  );
}

export default Profile;
