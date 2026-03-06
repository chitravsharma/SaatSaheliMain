import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useStrings } from "../LanguageContext";
import "../PublicProfile.css";

const API = process.env.REACT_APP_API_URL;

function PublicProfile() {
  const { userId } = useParams();
  const strings = useStrings();
  const s = strings.publicProfile;

  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, booksRes] = await Promise.all([
          axios.get(`${API}/api/auth/user/${userId}`),
          axios.get(`${API}/api/books/user/${userId}`),
        ]);
        setProfile(profileRes.data);
        const published = (Array.isArray(booksRes.data) ? booksRes.data : [])
          .filter((b) => b.status === "PUBLISHED");
        setBooks(published);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) {
    return <div className="pub-profile-page"><p className="pub-profile-loading">{s.loading}</p></div>;
  }

  if (error || !profile) {
    return <div className="pub-profile-page"><p className="pub-profile-not-found">{s.notFound}</p></div>;
  }

  const displayName = profile.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;

  return (
    <div className="pub-profile-page">
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

      <h2>{s.booksHeading}</h2>
      {books.length === 0 ? (
        <p className="pub-profile-no-books">{s.noBooks}</p>
      ) : (
        <div className="pub-profile-books">
          {books.map((book) => (
            <Link to={`/read/${book.id}`} key={book.id} className="pub-profile-book-card">
              <span className="pub-profile-book-title">{book.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default PublicProfile;
