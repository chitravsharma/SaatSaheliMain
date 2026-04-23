import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import "./Recipes.css";
import "./RecipeView.css";

const API = process.env.REACT_APP_API_URL;
const TARGET_TYPE = "RECIPE";

export default function RecipeView() {
  const { recipeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const commentInputRef = useRef(null);
  const loginPromptRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    api
      .get(`${API}/api/recipes/${recipeId}`)
      .then((res) => {
        setRecipe(res.data);
        setLikeCount(res.data.likeCount || 0);
      })
      .catch(() => setError("Recipe not found."))
      .finally(() => setLoading(false));
  }, [recipeId]);

  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      try {
        const [likeRes, favRes, commentsRes] = await Promise.all([
          api.get(`${API}/api/social/like?targetType=${TARGET_TYPE}&targetId=${recipeId}${user ? `&userId=${user.userId}` : ""}`),
          user ? api.get(`${API}/api/social/favorite?targetType=${TARGET_TYPE}&targetId=${recipeId}&userId=${user.userId}`) : Promise.resolve({ data: { favorited: false } }),
          api.get(`${API}/api/social/comments?targetType=${TARGET_TYPE}&targetId=${recipeId}`),
        ]);
        if (user) {
          setLiked(likeRes.data.liked || false);
          setFavorited(favRes.data.favorited || false);
        } else {
          // Reflect anonymous localStorage state so the hearts/stars persist visually
          setLiked(localStorage.getItem(`anon_like_RECIPE_${recipeId}`) === "true");
          setFavorited(localStorage.getItem(`anon_fav_RECIPE_${recipeId}`) === "true");
        }
        setLikeCount(likeRes.data.count || 0);
        setComments(Array.isArray(commentsRes.data) ? commentsRes.data : []);
      } catch (err) {
        // non-fatal
      }
    })();
  }, [recipeId, user]);

  const handleLike = async () => {
    if (!user) {
      const key = `anon_like_RECIPE_${recipeId}`;
      const wasLiked = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasLiked ? "false" : "true");
      setLiked(!wasLiked);
      return;
    }
    try {
      const res = await api.post(`${API}/api/social/like`, {
        userId: user.userId, targetType: TARGET_TYPE, targetId: Number(recipeId),
      });
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch (err) { console.error(err); }
  };

  const handleFavorite = async () => {
    if (!user) {
      const key = `anon_fav_RECIPE_${recipeId}`;
      const wasFav = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasFav ? "false" : "true");
      setFavorited(!wasFav);
      return;
    }
    try {
      const res = await api.post(`${API}/api/social/favorite`, {
        userId: user.userId, targetType: TARGET_TYPE, targetId: Number(recipeId),
      });
      setFavorited(res.data.favorited);
    } catch (err) { console.error(err); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/recipes/${recipeId}`;
    const shareData = {
      title: recipe?.recipeName || "Recipe",
      text: `Check out "${recipe?.recipeName || 'this recipe'}" on Saat Saheli!`,
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    try {
      const res = await api.post(`${API}/api/social/comments`, {
        userId: user.userId, targetType: TARGET_TYPE, targetId: Number(recipeId), content: newComment.trim(),
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) { console.error(err); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`${API}/api/social/comments/${commentId}?userId=${user.userId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) { console.error(err); }
  };

  const handlePublish = async () => {
    if (!user || !recipe) return;
    if (!window.confirm("Publish this recipe? It will become visible to everyone.")) return;
    try {
      const res = await api.put(`${API}/api/recipes/${recipeId}`, {
        userId: user.userId,
        recipeName: recipe.recipeName,
        cuisine: recipe.cuisine,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        status: "PUBLISHED",
        images: (recipe.images || []).map((i) => ({ imageUrl: i.imageUrl, caption: i.caption || "" })),
      });
      setRecipe(res.data);
    } catch (err) {
      console.error("Publish failed:", err);
      setError("Failed to publish recipe.");
    }
  };

  const canEdit = user && recipe && user.userId === recipe.userId;
  const isDraft = recipe?.status === "DRAFT";

  if (loading) return <div className="recipes-page"><p className="recipes-status">Loading…</p></div>;
  if (error) return <div className="recipes-page"><p className="recipes-status recipes-error">{error}</p></div>;
  if (!recipe) return null;

  return (
    <div className="recipes-page recipe-view">
      <div className="recipe-view-header">
        <h1 className="recipe-view-title">
          {recipe.recipeName}
          {isDraft && <span className="recipe-draft-badge">DRAFT</span>}
        </h1>
        {recipe.cuisine && <p className="recipe-view-cuisine">{recipe.cuisine}</p>}
        {recipe.authorName && (
          <p className="recipe-view-author">
            by <Link to={profileUrl(recipe.userId, recipe.authorName)}>{recipe.authorName}</Link>
          </p>
        )}

        <div className="recipe-view-actions">
          <button className={`ss-btn-icon ${liked ? "active" : ""}`} onClick={handleLike} title="Like">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span>{likeCount}</span>
          </button>
          <button className={`ss-btn-icon ${favorited ? "active" : ""}`} onClick={handleFavorite} title="Favorite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button className={`ss-btn-icon ${showComments ? "active" : ""}`} onClick={() => { setShowComments(!showComments); if (!showComments) setTimeout(() => { const t = commentInputRef.current || loginPromptRef.current; t?.focus(); t?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100); }} title="Comments">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{comments.length}</span>
          </button>
          <button className="ss-btn-icon" onClick={handleShare} title="Share">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {shareCopied && <span className="recipe-share-copied">Link copied</span>}
          </button>
          {canEdit && (
            <Link to={`/recipes/${recipeId}/edit`} className="ss-btn ss-btn-outline ss-btn-sm">Edit</Link>
          )}
          {canEdit && isDraft && (
            <button className="ss-btn ss-btn-primary ss-btn-sm recipe-publish-btn" onClick={handlePublish}>
              Publish
            </button>
          )}
        </div>
      </div>

      <div className="recipe-view-body">
        <section className="recipe-section">
          <h2 className="recipe-section-title">सामग्री / Ingredients</h2>
          <div className="recipe-section-content">
            {recipe.ingredients
              ? recipe.ingredients.split("\n").filter(Boolean).map((line, i) => <div key={i}>{line}</div>)
              : <em>No ingredients listed.</em>}
          </div>
        </section>

        <section className="recipe-section">
          <h2 className="recipe-section-title">निर्देश / Instructions</h2>
          <div className="recipe-section-content recipe-instructions-with-images">
            <div className="recipe-instructions-text">
              {recipe.instructions
                ? recipe.instructions.split("\n").filter(Boolean).map((line, i) => <p key={i}>{line}</p>)
                : <em>No instructions.</em>}
            </div>
            {recipe.images && recipe.images.length > 0 && (
              <aside className="recipe-instructions-images">
                {recipe.images.map((img) => (
                  <figure key={img.id} className="recipe-image-figure">
                    <img src={img.imageUrl} alt={img.caption || "Recipe photo"} />
                    {img.caption && <figcaption>{img.caption}</figcaption>}
                  </figure>
                ))}
              </aside>
            )}
          </div>
        </section>
      </div>

      {showComments && (
        <div className="rb-comments">
          <h3 className="rb-comments-heading">Comments ({comments.length})</h3>
          {user ? (
            <form onSubmit={handleAddComment} className="rb-comment-form">
              <input
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="rb-comment-input"
              />
              <button type="submit" className="ss-btn ss-btn-primary ss-btn-sm" disabled={!newComment.trim()}>Post</button>
            </form>
          ) : (
            <p className="rb-login-prompt">
              <Link to={`/Login?redirect=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`} ref={loginPromptRef}>Login with Google or create an account</Link> to comment on this item.
            </p>
          )}
          <div className="rb-comment-list">
            {comments.map((c) => (
              <div key={c.id} className="rb-comment-item">
                <div className="rb-comment-header">
                  <span className="rb-comment-author">{c.userName}</span>
                  <span className="rb-comment-date">{new Date(c.createdDate).toLocaleDateString()}</span>
                  {user && user.userId === c.userId && (
                    <button className="rb-comment-delete" onClick={() => handleDeleteComment(c.id)}>Delete</button>
                  )}
                </div>
                <p className="rb-comment-text">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
