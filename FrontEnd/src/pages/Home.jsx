import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { getAnonId, profileUrl } from "../utils/api";
import { useAuth } from "../AuthContext";
import { useStrings } from "../LanguageContext";
import AdBanner from "../modules/AdBanner";
import ScrollRow from "../components/ScrollRow";
import { optimizeCloudinary } from "../utils/imageUrl";
import "./Home.css";
import "./Magazine.css";

const API = process.env.REACT_APP_API_URL;

// Hero backdrop carousel — self-hosted JPGs in FrontEnd/public/images/heroes/.
// Bundled with the React build, served by Render's static handler with browser
// caching, so $0 of Cloudinary bandwidth per home pageview. To swap a hero
// photo: replace the slot file under public/images/heroes/ and redeploy. The
// AdminDashboard "Hero Slides" tab still configures /api/hero-slides for any
// future surface that wants admin-curated images, but Home.jsx no longer reads
// from it.
const STATIC_HERO_BACKDROPS = [
  "/images/heroes/slot1.jpg",
  "/images/heroes/slot2.jpg",
  "/images/heroes/slot3.jpg",
  "/images/heroes/slot4.jpg",
  "/images/heroes/slot5.jpg",
];

function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API}${url}`;
  const match = url.match(/\/file\/d\/([^/]+)\//);
  if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200`;
  return optimizeCloudinary(url);
}

function Home() {
  const strings = useStrings();
  const { user, flashAccount, dismissAccountFlash } = useAuth();
  const navigate = useNavigate();
  const [recentBooks, setRecentBooks] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [recentRecipes, setRecentRecipes] = useState([]);
  const [recentPodcasts, setRecentPodcasts] = useState([]);
  const [magazines, setMagazines] = useState([]);
  const [magazineIndex, setMagazineIndex] = useState(0);
  const [bookCounts, setBookCounts] = useState({ likes: {}, comments: {} });
  const [galleryCounts, setGalleryCounts] = useState({ likes: {}, comments: {} });
  const [articleCounts, setArticleCounts] = useState({ likes: {}, comments: {} });
  const [userLikes, setUserLikes] = useState({});
  const [userFavorites, setUserFavorites] = useState({});
  const [loading, setLoading] = useState(true);
  const [shareCopiedId, setShareCopiedId] = useState(null);
  const [podcastShareCopiedId, setPodcastShareCopiedId] = useState(null);
  const [podcastCounts, setPodcastCounts] = useState({ likes: {}, comments: {} });
  const [actionError, setActionError] = useState("");
  const [busyActions, setBusyActions] = useState(new Set());
  const [testimonials, setTestimonials] = useState([]);
  const [heroBackdropIdx, setHeroBackdropIdx] = useState(0);
  // Mobile-only carousel that swaps the hero photo through:
  // girl image → slide 1 → ... → slide N → girl image → ...
  const [isMobileHero, setIsMobileHero] = useState(false);
  const [mobileHeroIdx, setMobileHeroIdx] = useState(0);

  // Fetch testimonials (recent feedback with ratings)
  useEffect(() => {
    api.get(`${API}/api/contact/reviews?limit=6`)
      .then(res => setTestimonials(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTestimonials([]));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [booksRes, galleriesRes, articlesRes, recipesRes, podcastsRes, magazineRes, bookCountsRes, galleryCountsRes, articleCountsRes, podcastCountsRes] = await Promise.all([
          api.get(`${API}/api/books/search?status=PUBLISHED`),
          api.get(`${API}/api/galleries`),
          api.get(`${API}/api/articles`).catch(() => ({ data: [] })),
          api.get(`${API}/api/recipes`).catch(() => ({ data: [] })),
          api.get(`${API}/api/podcasts`).catch(() => ({ data: [] })),
          api.get(`${API}/api/books/magazines`).catch(() => ({ data: [] })),
          api.get(`${API}/api/social/counts?targetType=BOOK`).catch(() => ({ data: { likes: {}, comments: {} } })),
          api.get(`${API}/api/social/counts?targetType=GALLERY`).catch(() => ({ data: { likes: {}, comments: {} } })),
          api.get(`${API}/api/social/counts?targetType=ARTICLE`).catch(() => ({ data: { likes: {}, comments: {} } })),
          api.get(`${API}/api/social/counts?targetType=PODCAST`).catch(() => ({ data: { likes: {}, comments: {} } })),
        ]);

        const books = Array.isArray(booksRes.data) ? booksRes.data : [];
        books.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
        setRecentBooks(books.slice(0, 12));

        const gals = Array.isArray(galleriesRes.data) ? galleriesRes.data : [];
        gals.sort((a, b) => new Date(b.modifiedDate) - new Date(a.modifiedDate));
        setGalleries(gals.slice(0, 8));

        const arts = Array.isArray(articlesRes.data) ? articlesRes.data : [];
        arts.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        // Cap per content type so a sparse type (e.g. 2 Blogs) isn't dropped
        // when there are many recent items of another type (e.g. 18 Poems).
        const topNByType = (predicate) => arts.filter(predicate).slice(0, 6);
        setRecentArticles([
          ...topNByType(a => a.contentType === "Poetry"),
          ...topNByType(a => a.contentType === "Blog"),
          ...topNByType(a => !a.contentType || (a.contentType !== "Poetry" && a.contentType !== "Blog")),
        ]);

        const recs = Array.isArray(recipesRes.data) ? recipesRes.data : [];
        recs.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        setRecentRecipes(recs.slice(0, 6));

        const pods = (Array.isArray(podcastsRes.data) ? podcastsRes.data : [])
          .filter(p => p.status === "PUBLISHED");
        pods.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        setRecentPodcasts(pods.slice(0, 6));

        const mags = (Array.isArray(magazineRes.data) ? magazineRes.data : [])
          .filter(m => m && m.id && (m.status === "PUBLISHED" || !m.status));
        // Sort: prefer Hindi first so the rotation starts on the Hindi cover, then English.
        mags.sort((a, b) => {
          const aHi = a.language === "hi" ? 0 : 1;
          const bHi = b.language === "hi" ? 0 : 1;
          if (aHi !== bHi) return aHi - bHi;
          return new Date(b.modifiedDate || b.createdDate) - new Date(a.modifiedDate || a.createdDate);
        });
        setMagazines(mags);

        setBookCounts(bookCountsRes.data || { likes: {}, comments: {} });
        setGalleryCounts(galleryCountsRes.data || { likes: {}, comments: {} });
        setArticleCounts(articleCountsRes.data || { likes: {}, comments: {} });
        setPodcastCounts(podcastCountsRes.data || { likes: {}, comments: {} });
      } catch (err) {
        console.error("Failed to fetch home page data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch user's likes and favorites
  useEffect(() => {
    if (!user) {
      // Load anonymous likes/favorites from localStorage
      const likeMap = {};
      const favMap = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith("anon_like_") && localStorage.getItem(k) === "true") {
          likeMap[k.replace("anon_like_", "")] = true;
        }
        if (k.startsWith("anon_fav_") && localStorage.getItem(k) === "true") {
          favMap[k.replace("anon_fav_", "")] = true;
        }
      }
      setUserLikes(likeMap);
      setUserFavorites(favMap);
      return;
    }
    const fetchUserSocial = async () => {
      try {
        const [bookFavs, galleryFavs, articleFavs] = await Promise.all([
          api.get(`${API}/api/social/favorites?userId=${user.userId}&targetType=BOOK`),
          api.get(`${API}/api/social/favorites?userId=${user.userId}&targetType=GALLERY`),
          api.get(`${API}/api/social/favorites?userId=${user.userId}&targetType=ARTICLE`),
        ]);
        const favMap = {};
        (bookFavs.data || []).forEach(f => { favMap[`BOOK_${f.targetId}`] = true; });
        (galleryFavs.data || []).forEach(f => { favMap[`GALLERY_${f.targetId}`] = true; });
        (articleFavs.data || []).forEach(f => { favMap[`ARTICLE_${f.targetId}`] = true; });
        setUserFavorites(favMap);
      } catch (err) { console.error("Failed to fetch user social data:", err); }
    };
    fetchUserSocial();
  }, [user]);

  const handleLike = async (targetType, targetId) => {
    const actionKey = `like_${targetType}_${targetId}`;
    if (busyActions.has(actionKey)) return;
    setBusyActions(prev => new Set(prev).add(actionKey));
    const key = `${targetType}_${targetId}`;
    const prevLiked = userLikes[key];
    setUserLikes(prev => ({ ...prev, [key]: !prevLiked }));
    try {
      const body = user
        ? { userId: user.userId, targetType, targetId }
        : { anonId: getAnonId(), targetType, targetId };
      const res = await api.post(`${API}/api/social/like`, body);
      setUserLikes(prev => ({ ...prev, [key]: res.data.liked }));
      if (targetType === "BOOK") {
        setBookCounts(prev => ({ ...prev, likes: { ...prev.likes, [targetId]: res.data.count } }));
      } else if (targetType === "GALLERY") {
        setGalleryCounts(prev => ({ ...prev, likes: { ...prev.likes, [targetId]: res.data.count } }));
      } else if (targetType === "ARTICLE") {
        setArticleCounts(prev => ({ ...prev, likes: { ...prev.likes, [targetId]: res.data.count } }));
      }
    } catch {
      setUserLikes(prev => ({ ...prev, [key]: prevLiked }));
      setActionError("Something went wrong. Please try again.");
    } finally {
      setBusyActions(prev => { const n = new Set(prev); n.delete(actionKey); return n; });
    }
  };

  const handleFavorite = async (targetType, targetId) => {
    const actionKey = `fav_${targetType}_${targetId}`;
    if (busyActions.has(actionKey)) return;
    setBusyActions(prev => new Set(prev).add(actionKey));
    const key = `${targetType}_${targetId}`;
    const prevFav = userFavorites[key];
    setUserFavorites(prev => ({ ...prev, [key]: !prevFav }));
    try {
      const body = user
        ? { userId: user.userId, targetType, targetId }
        : { anonId: getAnonId(), targetType, targetId };
      const res = await api.post(`${API}/api/social/favorite`, body);
      setUserFavorites(prev => ({ ...prev, [key]: res.data.favorited }));
    } catch {
      setUserFavorites(prev => ({ ...prev, [key]: prevFav }));
      setActionError("Something went wrong. Please try again.");
    } finally {
      setBusyActions(prev => { const n = new Set(prev); n.delete(actionKey); return n; });
    }
  };

  const handleShare = async (article) => {
    const typePath = article.contentType === "Poetry" ? "poems"
      : article.contentType === "Blog" ? "blogs" : "articles";
    const url = `${window.location.origin}/${typePath}/${article.id}`;
    const text = `Check out "${article.headline}" on Saat Saheli!`;
    if (navigator.share) {
      try { await navigator.share({ title: article.headline, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareCopiedId(article.id);
      setTimeout(() => setShareCopiedId(null), 2000);
    }
  };

  const handlePodcastShare = async (podcast) => {
    const url = `${window.location.origin}/podcasts`;
    const text = `Check out "${podcast.title}" on Saat Saheli!`;
    if (navigator.share) {
      try { await navigator.share({ title: podcast.title, text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setPodcastShareCopiedId(podcast.id);
      setTimeout(() => setPodcastShareCopiedId(null), 2000);
    }
  };

  const magLabel = strings.home.catMagazine || "Magazine";
  const booksLabel = strings.home.catBooks || "Books";
  const categoryIcons = {
    [magLabel]: "\uD83D\uDCD6",
    [booksLabel]: "\uD83D\uDCDA",
  };

  // Group books into only two categories: Magazine and Books
  const grouped = {};
  recentBooks.forEach((book) => {
    const cat = (book.category || "").toUpperCase() === "MAGAZINE" ? magLabel : booksLabel;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(book);
  });
  // Sort magazines: English first, then Hindi
  if (grouped[magLabel]) {
    grouped[magLabel].sort((a, b) => {
      const aIsHindi = a.language === "hi" ? 1 : 0;
      const bIsHindi = b.language === "hi" ? 1 : 0;
      return aIsHindi - bIsHindi;
    });
  }

  // Auto-dismiss action error after 4 seconds
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(""), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  // Rotate the hero magazine card between Hindi/English (and any other published editions) every 6s.
  // Skipped if the user prefers reduced motion or there's only one magazine.
  useEffect(() => {
    if (magazines.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const t = setInterval(() => {
      setMagazineIndex(i => (i + 1) % magazines.length);
    }, 6000);
    return () => clearInterval(t);
  }, [magazines]);

  // Hero backdrop carousel uses self-hosted static images (see STATIC_HERO_BACKDROPS
  // at top of file). Memoized to a stable reference so the rotation effect below
  // doesn't re-fire on unrelated state updates.
  const heroBackdrops = useMemo(() => STATIC_HERO_BACKDROPS, []);

  useEffect(() => {
    if (heroBackdrops.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const t = setInterval(() => {
      setHeroBackdropIdx(i => (i + 1) % heroBackdrops.length);
    }, 5500);
    return () => clearInterval(t);
  }, [heroBackdrops]);

  // Track mobile viewport so the hero photo can rotate on phones (and only there).
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobileHero(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener("change", update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else mq.removeListener(update);
    };
  }, []);

  // Mobile-only carousel: cycle the hero photo through the girl image first,
  // then each active hero backdrop, then back to the girl image. Effectively
  // the girl image is just slide 0 in a 1+N rotation.
  const mobileHeroSequence = useMemo(
    () => ["/images/SSheroimg.jpg", ...heroBackdrops],
    [heroBackdrops]
  );

  useEffect(() => {
    if (!isMobileHero) return;
    if (mobileHeroSequence.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const t = setInterval(() => {
      setMobileHeroIdx(i => (i + 1) % mobileHeroSequence.length);
    }, 5500);
    return () => clearInterval(t);
  }, [isMobileHero, mobileHeroSequence]);

  // On mobile, swap the photo src through the rotation; on desktop the photo
  // stays static (the .home-hero-creator-backdrop on the right rotates instead).
  const heroPhotoSrc = isMobileHero && mobileHeroSequence.length > 1
    ? mobileHeroSequence[mobileHeroIdx % mobileHeroSequence.length]
    : "/images/SSheroimg.jpg";

  return (
    <div className="home-container">
      {actionError && (
        <div className="home-action-error" role="alert" style={{ background: "#fef2f2", color: "#b91c1c", padding: "8px 16px", borderRadius: 8, margin: "8px 0", textAlign: "center", fontSize: 14 }}>
          {actionError}
          <button onClick={() => setActionError("")} style={{ marginLeft: 12, background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontWeight: "bold" }} aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* Quick nav links */}
      <div className="home-tags">
        <Link to="/magazine" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
          </span>
          {strings.header.navMagazine}
        </Link>
        <Link to="/about" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </span>
          {strings.header.navAbout}
        </Link>
        <Link to="/books" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          </span>
          Books
        </Link>
        <Link to="/poems" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </span>
          Poems
        </Link>
        <Link to="/articles" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </span>
          Articles
        </Link>
        <Link to="/blogs" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          </span>
          Blogs
        </Link>
        <Link to="/recipes" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          </span>
          Recipes
        </Link>
        <Link to="/podcasts" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </span>
          Podcasts
        </Link>
        <Link to="/writers" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </span>
          Writers
        </Link>
        <Link to="/writers?type=artist" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
          </span>
          Artists
        </Link>
        <Link to="/galleries" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </span>
          Galleries
        </Link>
        <Link to="/marketplace" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </span>
          Buy/Sell
        </Link>
        <Link to="/manual" className="home-tag-link">
          <span className="home-tag-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
          Help
        </Link>
        {user && (
          <Link
            to="/account"
            className={`home-tag-link${flashAccount ? " home-tag-link-flash" : ""}`}
            onClick={dismissAccountFlash}
          >
            <span className="home-tag-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            My Account
          </Link>
        )}
        {user && (
          <Link to="/help-support" className="home-tag-link">
            <span className="home-tag-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            Need Help in Content Creation
          </Link>
        )}
      </div>

      {/* Hero — only shown to logged-out visitors; logged-in users go straight to content. */}
      {!user && (
        <section className="home-hero" aria-labelledby="home-hero-title">
          <div className="home-hero-grid">
            <div className="home-hero-visual" aria-hidden="true">
              <img
                key={heroPhotoSrc}
                src={heroPhotoSrc}
                alt=""
                className="home-hero-visual-img"
                loading="eager"
                fetchPriority="high"
              />
            </div>

            <div className="home-hero-left">
              <h1 id="home-hero-title" className="home-hero-title">
                Give your creativity<br />
                <span className="home-hero-title-soft">a stage.</span>
              </h1>
              <p className="home-hero-title-hi" lang="hi">जहाँ आपकी रचना को मंच मिलता है</p>
              <p className="home-hero-who">For writers, artists &amp; storytellers.</p>
              <ul className="home-hero-funnel">
                <li>
                  <svg className="home-hero-funnel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  Write &amp; publish
                </li>
                <li>
                  <svg className="home-hero-funnel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="13.5" cy="6.5" r="1.2" />
                    <circle cx="17.5" cy="10.5" r="1.2" />
                    <circle cx="8.5" cy="7.5" r="1.2" />
                    <circle cx="6.5" cy="12.5" r="1.2" />
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12-.29-.29-.44-.65-.44-1.12a1.64 1.64 0 011.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
                  </svg>
                  Share your art
                </li>
              </ul>
              <div className="home-hero-cta">
                <Link to="/Login" className="home-hero-cta-btn">
                  <span className="home-hero-cta-btn-label">Join &amp; Share Your Creativity</span>
                  <span className="home-hero-cta-btn-arrow" aria-hidden="true">→</span>
                </Link>
                <p className="home-hero-cta-trust">Be part of a growing creative community.</p>
                <div className="home-hero-cta-secondary">
                  <Link to="/magazine" className="home-hero-ghostbtn">Browse Magazine <span aria-hidden="true">→</span></Link>
                  <a href="#explore-latest" className="home-hero-ghostbtn">See What Creators Share <span aria-hidden="true">↓</span></a>
                </div>
              </div>
            </div>
            {heroBackdrops.length > 0 && (
              <div
                key={heroBackdrops[heroBackdropIdx]}
                className="home-hero-creator-backdrop"
                style={{ backgroundImage: `url(${heroBackdrops[heroBackdropIdx]})` }}
                aria-hidden="true"
              />
            )}
          </div>

          <aside className="home-hero-magazine" aria-label="Magazine">
            <p className="home-hero-magazine-heading">
              <span className="home-hero-magazine-emoji" aria-hidden="true">📖</span>
              Get published in our magazine
            </p>
            <p className="home-hero-magazine-dek">A Hindi + English creative magazine &mdash; monthly issue.</p>
            {(() => {
              const mag = magazines[magazineIndex] || null;
              return (
                <Link to="/magazine" className="home-hero-magazine-card">
                  <div className="home-hero-magazine-fade" key={mag?.id || "placeholder"}>
                    {mag && resolveImageUrl(mag.coverImageUrl) ? (
                      <img
                        src={resolveImageUrl(mag.coverImageUrl)}
                        alt={mag.title || "Saat Saheli Magazine cover"}
                        className="home-hero-magazine-coverimg"
                        loading="lazy"
                      />
                    ) : (
                      <span className="home-hero-magazine-cover" aria-hidden="true">📰</span>
                    )}
                    <div className="home-hero-magazine-meta">
                      <p className="home-hero-magazine-title">
                        {mag?.title || "Saat Saheli Magazine"}
                      </p>
                      <span className="home-hero-magazine-link">
                        Browse Magazine <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })()}
          </aside>

          <ul className="home-hero-promises" aria-label="What sets us apart">
            <li>
              <p className="home-hero-promises-title">No algorithm suppression</p>
              <p className="home-hero-promises-sub">Every post reaches every reader.</p>
            </li>
            <li>
              <p className="home-hero-promises-title">Real publication opportunity</p>
              <p className="home-hero-promises-sub">Featured work prints in our monthly issue.</p>
            </li>
            <li>
              <p className="home-hero-promises-title">Community visibility</p>
              <p className="home-hero-promises-sub">An audience that actually reads.</p>
            </li>
          </ul>
        </section>
      )}

      {loading && <div className="loading-spinner" />}

      {/* 1. Recently Added Books (top) — also the anchor target for the hero "see what creators are sharing" link */}
      <div id="explore-latest" />

      {!loading && (
        <div className="home-section home-section-books">
          {recentBooks.length === 0 && (
            <p className="home-empty">No published content yet. Be the first to create!</p>
          )}

          {recentBooks.length > 0 && (
            <div className="home-section-header">
              <h2 className="home-section-heading">Books</h2>
              <div className="home-section-actions">
                <Link to="/books" className="ss-btn ss-btn-outline">Browse Books</Link>
                <Link to="/writers?type=writer" className="ss-btn ss-btn-outline">Meet Our Writers</Link>
              </div>
            </div>
          )}

          {Object.keys(grouped).length > 0 && (
            <div className="home-categories">
              {Object.entries(grouped).map(([category, books]) => (
                <div key={category} className="home-category-group">
                  <h3 className="home-category-title">
                    <span className="home-category-icon">{categoryIcons[category] || "\uD83D\uDCDA"}</span>
                    {category}
                  </h3>
                  <ScrollRow className="home-books-row">
                    {books.map((book) => {
                      const likeC = bookCounts.likes[book.id] || 0;
                      const commentC = bookCounts.comments[book.id] || 0;
                      const isLiked = userLikes[`BOOK_${book.id}`];
                      const isFav = userFavorites[`BOOK_${book.id}`];

                      return (
                        <div key={book.id} className="home-book-card">
                          <Link to={`/read/${book.id}`} className="home-book-link">
                            <div className="home-book-cover">
                              {book.coverImageUrl ? (
                                <img
                                  src={resolveImageUrl(book.coverImageUrl)}
                                  alt={book.title}
                                  className="home-book-cover-img"
                                />
                              ) : (
                                <span className="home-book-cover-title">{book.title}</span>
                              )}
                              {(book.category || "").toUpperCase() === "MAGAZINE" && book.language && (
                                <span className={`home-book-lang-badge ${book.language === "hi" ? "lang-hi" : "lang-en"}`}>
                                  {book.language === "hi" ? "हिंदी" : "English"}
                                </span>
                              )}
                            </div>
                            <div className="home-book-info">
                              <span className="home-book-title">{book.title}</span>
                            </div>
                          </Link>
                          {category !== magLabel && book.authorName && (
                            <Link
                              to={profileUrl(book.userId, book.authorName)}
                              className="home-book-author"
                            >by {book.authorName}</Link>
                          )}
                          <div className="home-card-social">
                            <button className={`ss-btn-icon-sm ${isLiked ? "active" : ""}`} onClick={() => handleLike("BOOK", book.id)} title="Like">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#e74c3c" : "none"} stroke={isLiked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                              <span>{likeC}</span>
                            </button>
                            <Link to={`/read/${book.id}?focus=comments`} className="ss-btn-icon-sm" title="Comments">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                              <span>{commentC}</span>
                            </Link>
                            <button className={`ss-btn-icon-sm ${isFav ? "active" : ""}`} onClick={() => handleFavorite("BOOK", book.id)} title="Favorite">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "#d4a017" : "none"} stroke={isFav ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </ScrollRow>
                  {category === magLabel && (
                    <div style={{ textAlign: 'left', margin: '16px 0 8px' }}>
                      <Link to="/magazine/submit" className="magazine-submit-cta">
                        Submit Your Creative Work for the Next Magazine Edition
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Side-rail ad slot */}
      {!loading && (
        <div className="home-ad-section">
          <AdBanner placement="SIDE_RAIL" />
        </div>
      )}

      {/* 2. Photo Galleries */}
      {!loading && galleries.length > 0 && (
        <div className="home-section home-section-galleries">
          <div className="home-section-header">
            <h2 className="home-section-heading">Photo Galleries</h2>
            <div className="home-section-actions">
              <Link to="/galleries" className="ss-btn ss-btn-outline">See all Galleries</Link>
              <Link to="/writers?type=artist" className="ss-btn ss-btn-outline">Meet Our Artists</Link>
            </div>
          </div>
          <ScrollRow className="home-gallery-row">
            {galleries.map((gallery) => {
              const coverImg = gallery.coverImageUrl || (gallery.images && gallery.images[0]?.imageUrl);
              const imgCount = gallery.images ? gallery.images.length : 0;
              const likeC = galleryCounts.likes[gallery.id] || gallery.likeCount || 0;
              const commentC = galleryCounts.comments[gallery.id] || gallery.commentCount || 0;
              const isLiked = userLikes[`GALLERY_${gallery.id}`];
              const isFav = userFavorites[`GALLERY_${gallery.id}`];

              return (
                <div key={gallery.id} className="home-gallery-card">
                  <Link to={`/gallery/${gallery.id}`} className="home-gallery-link">
                    <div className="home-gallery-cover">
                      {coverImg ? (
                        <img src={coverImg} alt={gallery.title} className="home-gallery-cover-img" />
                      ) : (
                        <div className="home-gallery-cover-placeholder">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                      )}
                      <span className="home-gallery-count">{imgCount} photos</span>
                    </div>
                    <div className="home-gallery-info">
                      <span className="home-gallery-title">{gallery.title}</span>
                    </div>
                  </Link>
                  {gallery.authorName && (
                    <Link
                      to={profileUrl(gallery.userId, gallery.authorName)}
                      className="home-gallery-author"
                    >by {gallery.authorName}</Link>
                  )}
                  <div className="home-card-social">
                    <button className={`ss-btn-icon-sm ${isLiked ? "active" : ""}`} onClick={() => handleLike("GALLERY", gallery.id)} title="Like">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? "#e74c3c" : "none"} stroke={isLiked ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                      <span>{likeC}</span>
                    </button>
                    <Link to={`/gallery/${gallery.id}`} className="ss-btn-icon-sm" title="Comments">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      <span>{commentC}</span>
                    </Link>
                    <button className={`ss-btn-icon-sm ${isFav ? "active" : ""}`} onClick={() => handleFavorite("GALLERY", gallery.id)} title="Favorite">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "#d4a017" : "none"} stroke={isFav ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </ScrollRow>
        </div>
      )}

      {/* 3. Content rows — separate sections per type, compact card when no image */}
      {(() => {
        const poems = recentArticles.filter(a => a.contentType === "Poetry").slice(0, 6);
        const blogs = recentArticles.filter(a => a.contentType === "Blog").slice(0, 6);
        const arts  = recentArticles.filter(a => !a.contentType || (a.contentType !== "Poetry" && a.contentType !== "Blog")).slice(0, 6);

        const renderArticleCard = (article) => {
          const typePath = article.contentType === "Poetry" ? "poems"
            : article.contentType === "Blog" ? "blogs"
            : "articles";
          const hasImage = !!article.imageUrl;
          return (
            <div key={`a-${article.id}`} className={`home-article-card ${hasImage ? "" : "home-article-card-compact"}`}>
              <Link to={`/${typePath}/${article.id}`} className="home-article-link">
                {hasImage && (
                  <img src={resolveImageUrl(article.imageUrl)} alt={article.headline} className="home-article-img" />
                )}
                <div className="home-article-info">
                  <span className={`home-article-type home-article-type-${(article.contentType || "article").toLowerCase()}`}>
                    {article.contentType || "Article"}
                  </span>
                  <span className="home-article-title">{article.headline}</span>
                  <span className="home-article-date">{new Date(article.createdDate).toLocaleDateString()}</span>
                </div>
              </Link>
              {article.authorName && (
                <Link
                  to={profileUrl(article.userId, article.authorName)}
                  className="home-article-author home-article-author-link"
                >by {article.authorName}</Link>
              )}
              <div className="home-card-social">
                <button className={`ss-btn-icon-sm ${userLikes[`ARTICLE_${article.id}`] ? "active" : ""}`} onClick={() => handleLike("ARTICLE", article.id)} title="Like">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={userLikes[`ARTICLE_${article.id}`] ? "#e74c3c" : "none"} stroke={userLikes[`ARTICLE_${article.id}`] ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <span>{articleCounts.likes[article.id] || 0}</span>
                </button>
                <Link to={`/${typePath}/${article.id}`} className="ss-btn-icon-sm" title="Comments">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <span>{articleCounts.comments[article.id] || 0}</span>
                </Link>
                <button className={`ss-btn-icon-sm ${userFavorites[`ARTICLE_${article.id}`] ? "active" : ""}`} onClick={() => handleFavorite("ARTICLE", article.id)} title="Favorite">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={userFavorites[`ARTICLE_${article.id}`] ? "#d4a017" : "none"} stroke={userFavorites[`ARTICLE_${article.id}`] ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <button className="ss-btn-icon-sm" onClick={() => handleShare(article)} title="Share">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  {shareCopiedId === article.id ? <span>Copied!</span> : <span>Share</span>}
                </button>
              </div>
            </div>
          );
        };

        const renderPodcastCard = (podcast) => {
          const hasImage = !!podcast.coverImageUrl;
          return (
            <div key={`p-${podcast.id}`} className={`home-article-card ${hasImage ? "" : "home-article-card-compact"}`}>
              <Link to={`/podcasts`} className="home-article-link">
                {hasImage && <img src={optimizeCloudinary(podcast.coverImageUrl)} alt={podcast.title} className="home-article-img" />}
                <div className="home-article-info">
                  <span className="home-article-type home-article-type-poetry">Podcast</span>
                  <span className="home-article-title">{podcast.title}</span>
                  {podcast.category && <span className="home-article-author">{podcast.category}</span>}
                  <span className="home-article-date">{new Date(podcast.createdDate).toLocaleDateString()}</span>
                </div>
              </Link>
              {podcast.authorName && (
                <Link
                  to={profileUrl(podcast.userId, podcast.authorName)}
                  className="home-article-author home-article-author-link"
                >by {podcast.authorName}</Link>
              )}
              <div className="home-card-social">
                <button className={`ss-btn-icon-sm ${userLikes[`PODCAST_${podcast.id}`] ? "active" : ""}`} onClick={() => handleLike("PODCAST", podcast.id)} title="Like">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={userLikes[`PODCAST_${podcast.id}`] ? "#e74c3c" : "none"} stroke={userLikes[`PODCAST_${podcast.id}`] ? "#e74c3c" : "currentColor"} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                  <span>{podcastCounts.likes[podcast.id] || 0}</span>
                </button>
                <Link to="/podcasts" className="ss-btn-icon-sm" title="Comments">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <span>{podcastCounts.comments[podcast.id] || 0}</span>
                </Link>
                <button className={`ss-btn-icon-sm ${userFavorites[`PODCAST_${podcast.id}`] ? "active" : ""}`} onClick={() => handleFavorite("PODCAST", podcast.id)} title="Favorite">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={userFavorites[`PODCAST_${podcast.id}`] ? "#d4a017" : "none"} stroke={userFavorites[`PODCAST_${podcast.id}`] ? "#d4a017" : "currentColor"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
                <button className="ss-btn-icon-sm" onClick={() => handlePodcastShare(podcast)} title="Share">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  {podcastShareCopiedId === podcast.id ? <span>Copied!</span> : <span>Share</span>}
                </button>
              </div>
            </div>
          );
        };

        const renderRecipeCard = (recipe) => {
          const cover = recipe.images && recipe.images[0]?.imageUrl;
          const hasImage = !!cover;
          return (
            <div key={`r-${recipe.id}`} className={`home-article-card ${hasImage ? "" : "home-article-card-compact"}`}>
              <Link to={`/recipes/${recipe.id}`} className="home-article-link">
                {hasImage && <img src={cover} alt={recipe.recipeName} className="home-article-img" />}
                <div className="home-article-info">
                  <span className="home-article-type home-article-type-recipe">Recipe</span>
                  <span className="home-article-title">{recipe.recipeName}</span>
                  {recipe.cuisine && <span className="home-article-author">{recipe.cuisine}</span>}
                  {recipe.authorName && <span className="home-article-author">by {recipe.authorName}</span>}
                  <span className="home-article-date">{new Date(recipe.createdDate).toLocaleDateString()}</span>
                </div>
              </Link>
            </div>
          );
        };

        return (
          <>
            {!loading && poems.length > 0 && (
              <div className="home-section home-section-articles">
                <div className="home-section-header">
                  <h2 className="home-section-heading">Poems / कविताएँ</h2>
                  <div className="home-section-actions">
                    <Link to="/poems" className="ss-btn ss-btn-outline">See all Poems</Link>
                    <Link to="/writers?type=poet" className="ss-btn ss-btn-outline">Meet Our Poets</Link>
                  </div>
                </div>
                <ScrollRow className={`home-articles-row ${poems.length < 5 ? "home-row-few" : ""}`}>{poems.map(renderArticleCard)}</ScrollRow>
              </div>
            )}

            {!loading && blogs.length > 0 && (
              <div className="home-section home-section-articles">
                <div className="home-section-header">
                  <h2 className="home-section-heading">Blogs</h2>
                  <div className="home-section-actions">
                    <Link to="/blogs" className="ss-btn ss-btn-outline">See all Blogs</Link>
                    <Link to="/writers?type=writer" className="ss-btn ss-btn-outline">Meet Our Writers</Link>
                  </div>
                </div>
                <ScrollRow className={`home-articles-row ${blogs.length < 5 ? "home-row-few" : ""}`}>{blogs.map(renderArticleCard)}</ScrollRow>
              </div>
            )}

            {!loading && arts.length > 0 && (
              <div className="home-section home-section-articles">
                <div className="home-section-header">
                  <h2 className="home-section-heading">Articles</h2>
                  <div className="home-section-actions">
                    <Link to="/articles" className="ss-btn ss-btn-outline">See all Articles</Link>
                    <Link to="/writers?type=writer" className="ss-btn ss-btn-outline">Meet Our Writers</Link>
                  </div>
                </div>
                <ScrollRow className={`home-articles-row ${arts.length < 5 ? "home-row-few" : ""}`}>{arts.map(renderArticleCard)}</ScrollRow>
              </div>
            )}

            {!loading && recentRecipes.length > 0 && (
              <div className="home-section home-section-articles">
                <div className="home-section-header">
                  <h2 className="home-section-heading">Recipes / व्यंजन</h2>
                  <div className="home-section-actions">
                    <Link to="/recipes" className="ss-btn ss-btn-outline">See all Recipes</Link>
                    <Link to="/writers?type=cook" className="ss-btn ss-btn-outline">Meet Our Cooks</Link>
                  </div>
                </div>
                <ScrollRow className={`home-articles-row ${recentRecipes.length < 5 ? "home-row-few" : ""}`}>{recentRecipes.map(renderRecipeCard)}</ScrollRow>
              </div>
            )}

            {!loading && recentPodcasts.length > 0 && (
              <div className="home-section home-section-articles">
                <div className="home-section-header">
                  <h2 className="home-section-heading">Podcasts</h2>
                  <div className="home-section-actions">
                    <Link to="/podcasts" className="ss-btn ss-btn-outline">See all Podcasts</Link>
                    <Link to="/writers" className="ss-btn ss-btn-outline">Meet Our Creators</Link>
                  </div>
                </div>
                <ScrollRow className={`home-articles-row ${recentPodcasts.length < 5 ? "home-row-few" : ""}`}>{recentPodcasts.map(renderPodcastCard)}</ScrollRow>
              </div>
            )}
          </>
        );
      })()}

      {/* Testimonials - What Our Readers Say */}
      {!loading && testimonials.length > 0 && (
        <div className="home-section home-section-testimonials">
          <h2 className="home-section-heading">What Our Readers Say</h2>
          <div className="home-testimonials-row">
            {testimonials.map((t, idx) => {
              const stars = t.rating === "Excellent" ? 5
                : t.rating === "Good" ? 4
                : t.rating === "Average" ? 3
                : t.rating === "Poor" ? 2 : 1;
              return (
                <div key={idx} className="home-testimonial-card">
                  <div className="home-testimonial-stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={i < stars ? "star-filled" : "star-empty"}>★</span>
                    ))}
                  </div>
                  <p className="home-testimonial-message">"{t.message}"</p>
                  <div className="home-testimonial-footer">
                    <span className="home-testimonial-name">— {t.name}</span>
                    {t.category && <span className="home-testimonial-category">{t.category}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="home-section-more home-feedback-more">
            <Link to="/feedback" className="ss-btn ss-btn-outline home-feedback-cta">Share Your Feedback</Link>
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;
