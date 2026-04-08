import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useStrings } from "../LanguageContext";
import "../PublicProfile.css";

const API = process.env.REACT_APP_API_URL;

function PublicProfile() {
  const { userId } = useParams();
  const strings = useStrings();
  const navigate = useNavigate();
  const s = strings.publicProfile;

  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, booksRes] = await Promise.all([
          api.get(`${API}/api/auth/user/${userId}`),
          api.get(`${API}/api/books/user/${userId}`),
        ]);
        setProfile(profileRes.data);
        const published = (Array.isArray(booksRes.data) ? booksRes.data : [])
          .filter((b) => b.status === "PUBLISHED");
        setBooks(published);
        // Load gallery from localStorage
        const savedGallery = localStorage.getItem(`gallery_${userId}`);
        if (savedGallery) {
          setGalleryImages(JSON.parse(savedGallery));
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return <div className="pub-profile-page"><div className="loading-spinner" /></div>;
  }

  if (error || !profile) {
    return <div className="pub-profile-page"><p className="pub-profile-not-found">{s.notFound}</p></div>;
  }

  const displayName = profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;
  const userInterests = profile.interests ? profile.interests.split(",").map(s => s.trim()) : [];
  const userFields = profile.fields ? profile.fields.split(",").map(s => s.trim()) : [];

  return (
    <div className="pub-profile-page">
      <div className="pub-profile-nav">
        <button className="chat-back-arrow" onClick={() => navigate(-1)} aria-label={strings.common.back} title={strings.common.back}>
          &#8592;
        </button>
      </div>
      <div className="pub-profile-header">
        {profile.profileImageUrl && (
          <img
            src={profile.profileImageUrl.startsWith("http") ? profile.profileImageUrl : `${API}${profile.profileImageUrl}`}
            alt={displayName}
            className="pub-profile-avatar"
          />
        )}
        <div className="pub-profile-info">
          <h1>{displayName}</h1>
          {profile.headline && <p className="pub-profile-headline">{profile.headline}</p>}
          {profile.location && <p className="pub-profile-location">{profile.location}</p>}
          {profile.createdDate && (
            <p className="pub-profile-member">{s.memberSince} {new Date(profile.createdDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {profile.bio && (
        <div className="pub-profile-bio">
          <p>{profile.bio}</p>
        </div>
      )}

      {/* Interests & Fields tags */}
      {(userInterests.length > 0 || userFields.length > 0) && (
        <div className="pub-profile-tags-section">
          {userInterests.length > 0 && (
            <div className="pub-profile-tag-group">
              <h3 className="pub-profile-tag-label">{strings.account.labelInterests}</h3>
              <div className="pub-profile-tags">
                {userInterests.map((item, i) => (
                  <span key={i} className="pub-profile-tag">{item}</span>
                ))}
              </div>
            </div>
          )}
          {userFields.length > 0 && (
            <div className="pub-profile-tag-group">
              <h3 className="pub-profile-tag-label">{strings.account.labelFields}</h3>
              <div className="pub-profile-tags">
                {userFields.map((item, i) => (
                  <span key={i} className="pub-profile-tag pub-profile-tag-field">{item}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Published Books */}
      {books.length > 0 && (
        <>
          <h2>{s.booksHeading}</h2>
          <div className="pub-profile-books">
            {books.map((book) => (
              <Link to={`/read/${book.id}`} key={book.id} className="pub-profile-book-card">
                <div className="pub-book-cover">
                  <span className="pub-book-cover-title">{book.title}</span>
                </div>
                <span className="pub-profile-book-title">{book.title}</span>
                {book.category && <span className="pub-book-category">{book.category}</span>}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Gallery */}
      {galleryImages.length > 0 && (
        <>
          <h2>Gallery</h2>
          <div className="pub-profile-gallery">
            {galleryImages.map((img, i) => (
              <div key={i} className="pub-gallery-item">
                <img src={img.url} alt={img.name || "Gallery"} className="pub-gallery-img" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Show empty state only if no content at all */}
      {books.length === 0 && galleryImages.length === 0 && (
        <p className="pub-profile-no-books">{s.noBooks}</p>
      )}
    </div>
  );
}

export default PublicProfile;
