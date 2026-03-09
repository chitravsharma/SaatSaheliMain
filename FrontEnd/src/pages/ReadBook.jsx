import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import FlipBook from "../FlipBook";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import "../BookManager.css";

const API = process.env.REACT_APP_API_URL;

function ReadBook() {
  const { bookId } = useParams();
  const { user } = useAuth();
  const strings = useStrings();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef(null);

  // Fetch book info
  useEffect(() => {
    if (!bookId) return;
    axios.get(`${API}/api/books/${bookId}`)
      .then(res => setBook(res.data))
      .catch(() => {});
  }, [bookId]);

  // Fetch social data
  useEffect(() => {
    if (!bookId) return;
    const fetchSocial = async () => {
      try {
        const [likeRes, favRes, commentsRes] = await Promise.all([
          axios.get(`${API}/api/social/like?targetType=BOOK&targetId=${bookId}${user ? `&userId=${user.userId}` : ""}`),
          user ? axios.get(`${API}/api/social/favorite?targetType=BOOK&targetId=${bookId}&userId=${user.userId}`) : Promise.resolve({ data: { favorited: false } }),
          axios.get(`${API}/api/social/comments?targetType=BOOK&targetId=${bookId}`),
        ]);
        // For anonymous users, restore like/fav state from localStorage
        if (!user) {
          setLiked(localStorage.getItem(`anon_like_BOOK_${bookId}`) === "true");
          setFavorited(localStorage.getItem(`anon_fav_BOOK_${bookId}`) === "true");
        } else {
          setLiked(likeRes.data.liked);
          setFavorited(favRes.data.favorited);
        }
        setLikeCount(likeRes.data.count);
        setComments(commentsRes.data || []);
      } catch { /* ignore */ }
    };
    fetchSocial();
  }, [bookId, user]);

  const handleLike = async () => {
    if (!user) {
      // Anonymous like — toggle in localStorage
      const key = `anon_like_BOOK_${bookId}`;
      const wasLiked = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasLiked ? "false" : "true");
      setLiked(!wasLiked);
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/like`, { userId: user.userId, targetType: "BOOK", targetId: Number(bookId) });
      setLiked(res.data.liked);
      setLikeCount(res.data.count);
    } catch { /* ignore */ }
  };

  const handleFavorite = async () => {
    if (!user) {
      // Anonymous favorite — toggle in localStorage
      const key = `anon_fav_BOOK_${bookId}`;
      const wasFav = localStorage.getItem(key) === "true";
      localStorage.setItem(key, wasFav ? "false" : "true");
      setFavorited(!wasFav);
      return;
    }
    try {
      const res = await axios.post(`${API}/api/social/favorite`, { userId: user.userId, targetType: "BOOK", targetId: Number(bookId) });
      setFavorited(res.data.favorited);
    } catch { /* ignore */ }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/Login");
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${API}/api/social/comment`, {
        userId: user.userId, targetType: "BOOK", targetId: Number(bookId), content: newComment.trim(),
      });
      setComments([res.data, ...comments]);
      setNewComment("");
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/api/social/comment/${commentId}?userId=${user.userId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  return (
    <div className="book-manager">
      {/* Back arrow + social actions in one row */}
      <div className="rb-top-bar">
        <button className="rb-back-arrow" onClick={() => navigate(-1)} aria-label={strings.common.back} title={strings.common.back}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {strings.common.back}
        </button>
        <div className="rb-top-social">
          <button className={`ss-btn-icon ${liked ? "active" : ""}`} onClick={handleLike} title="Like">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? "#e74c3c" : "none"} stroke={liked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span>{likeCount}</span>
          </button>
          <button className={`ss-btn-icon ${showComments ? "active" : ""}`} onClick={() => { setShowComments(!showComments); if (!showComments) setTimeout(() => commentInputRef.current?.focus(), 100); }} title="Comments">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span>{comments.length}</span>
          </button>
          <button className={`ss-btn-icon ${favorited ? "active" : ""}`} onClick={handleFavorite} title="Favorite">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={favorited ? "#d4a017" : "none"} stroke={favorited ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
      </div>

      {/* Book title & author */}
      {book && (
        <div className="rb-book-header">
          <h2 className="rb-book-title">{book.title}</h2>
          {book.authorName && (
            <Link to={`/profile/${book.userId}`} className="rb-book-author">by {book.authorName}</Link>
          )}
        </div>
      )}

      <FlipBook bookId={bookId} />

      {/* Comments section */}
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
              <Link to="/Login">Log in</Link> to post a comment.
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
            {comments.length === 0 && <p className="rb-no-comments">No comments yet. Be the first!</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReadBook;
