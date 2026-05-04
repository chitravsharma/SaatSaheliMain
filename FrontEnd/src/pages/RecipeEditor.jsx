import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import { optimizeCloudinary } from "../utils/imageUrl";
import { useAuth } from "../AuthContext";
import "./Recipes.css";
import "./RecipeEditor.css";

const API = process.env.REACT_APP_API_URL;
const MAX_IMAGES = 4;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function RecipeEditor() {
  const { recipeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!recipeId;

  const [recipeName, setRecipeName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [images, setImages] = useState([]); // [{imageUrl, caption}]
  const [currentStatus, setCurrentStatus] = useState("DRAFT");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`${API}/api/recipes/${recipeId}`)
      .then((res) => {
        const r = res.data;
        setRecipeName(r.recipeName || "");
        setCuisine(r.cuisine || "");
        setIngredients(r.ingredients || "");
        setInstructions(r.instructions || "");
        setImages((r.images || []).map((i) => ({ imageUrl: i.imageUrl, caption: i.caption || "" })));
        setCurrentStatus((r.status || "DRAFT").toUpperCase());
      })
      .catch(() => setError("Failed to load recipe."));
  }, [recipeId, isEdit]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = MAX_IMAGES - images.length;
    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      setError(`Only the first ${remaining} image(s) will be uploaded (max ${MAX_IMAGES}).`);
    }
    const oversized = toUpload.filter((f) => f.size > MAX_SIZE);
    if (oversized.length) {
      setError(`${oversized.length} file(s) exceed 5MB limit.`);
      return;
    }
    setUploading(true);
    setError("");
    for (const file of toUpload) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post(`${API}/api/upload`, formData);
        const url = res.data.url || res.data;
        setImages((prev) => [...prev, { imageUrl: url, caption: "" }]);
      } catch (err) {
        console.error("Upload failed:", err);
        setError("Image upload failed.");
      }
    }
    setUploading(false);
    e.target.value = "";
  };

  const updateCaption = (idx, caption) => {
    setImages((prev) => prev.map((img, i) => (i === idx ? { ...img, caption } : img)));
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx, dir) => {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSave = async (targetStatus) => {
    if (!recipeName.trim()) {
      setError("Recipe name is required.");
      return;
    }
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        userId: user.userId,
        recipeName: recipeName.trim(),
        cuisine: cuisine.trim(),
        ingredients,
        instructions,
        status: targetStatus,
        images,
      };
      let res;
      if (isEdit) {
        res = await api.put(`${API}/api/recipes/${recipeId}`, body);
      } else {
        res = await api.post(`${API}/api/recipes`, body);
      }
      navigate(`/recipes/${res.data.id}`);
    } catch (err) {
      console.error("Save failed:", err);
      setError("Failed to save recipe.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="recipes-page">
        <p className="recipes-status">
          <Link to="/Login">Login with Google or create an account</Link> to create a recipe.
        </p>
      </div>
    );
  }

  return (
    <div className="recipes-page recipe-editor-page">
      <h1 className="recipe-editor-title">{isEdit ? "Edit Recipe" : "Create a Recipe"}</h1>

      {error && <p className="recipes-status recipes-error">{error}</p>}

      <div className="recipe-editor-form">
        <label className="recipe-field">
          <span className="recipe-field-label">पाक-शैली / Cuisine</span>
          <input
            type="text"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="e.g. Indian, Italian, Thai"
            maxLength={80}
          />
        </label>

        <label className="recipe-field">
          <span className="recipe-field-label">व्यंजन / Recipe Name *</span>
          <input
            type="text"
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="What is your recipe called?"
            maxLength={200}
          />
        </label>

        <label className="recipe-field">
          <span className="recipe-field-label">सामग्री / Ingredients</span>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder={"One ingredient per line, e.g.\n1 cup flour\n2 eggs\n1 tsp salt"}
            rows={6}
          />
        </label>

        <label className="recipe-field">
          <span className="recipe-field-label">निर्देश / Instructions</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step directions"
            rows={8}
          />
        </label>

        <div className="recipe-field">
          <span className="recipe-field-label">Photos ({images.length}/{MAX_IMAGES})</span>
          <div className="recipe-images-grid">
            {images.map((img, idx) => (
              <div key={idx} className="recipe-image-slot">
                <img src={optimizeCloudinary(img.imageUrl)} alt={img.caption || "Recipe photo"} />
                <button type="button" className="recipe-image-remove" onClick={() => removeImage(idx)} title="Remove">
                  &times;
                </button>
                <div className="recipe-image-reorder">
                  <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} title="Move left">‹</button>
                  <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} title="Move right">›</button>
                </div>
                <input
                  type="text"
                  value={img.caption}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  placeholder="Caption (optional)"
                  className="recipe-image-caption"
                  maxLength={120}
                />
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="recipe-image-upload">
                {uploading ? "Uploading…" : "+ Add Photo"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="recipe-editor-actions">
          {isEdit ? (
            <>
              {/* Save keeps whatever the current status is — doesn't silently publish a draft */}
              <button
                className="ss-btn ss-btn-primary"
                onClick={() => handleSave(currentStatus)}
                disabled={saving || uploading}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {currentStatus === "DRAFT" && (
                <button
                  className="ss-btn ss-btn-primary"
                  onClick={() => handleSave("PUBLISHED")}
                  disabled={saving || uploading}
                  style={{ background: "var(--accent-gold)" }}
                >
                  Publish
                </button>
              )}
              {currentStatus === "PUBLISHED" && (
                <button
                  className="ss-btn ss-btn-outline"
                  onClick={() => handleSave("DRAFT")}
                  disabled={saving || uploading}
                >
                  Unpublish to Draft
                </button>
              )}
            </>
          ) : (
            <>
              <button
                className="ss-btn ss-btn-primary"
                onClick={() => handleSave("PUBLISHED")}
                disabled={saving || uploading}
              >
                {saving ? "Saving…" : "Publish Recipe"}
              </button>
              <button
                className="ss-btn ss-btn-outline"
                onClick={() => handleSave("DRAFT")}
                disabled={saving || uploading}
              >
                Save as Draft
              </button>
            </>
          )}
          <button
            type="button"
            className="ss-btn ss-btn-outline"
            onClick={() => navigate("/recipes")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
