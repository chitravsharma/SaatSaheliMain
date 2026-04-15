import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { profileUrl } from '../utils/api';
import { useStrings } from '../LanguageContext';
import './About.css';

const API = process.env.REACT_APP_API_URL;

function firstSentence(text) {
  if (!text) return '';
  const match = text.match(/[^.!?]+[.!?]/);
  const sentence = (match ? match[0] : text).trim();
  return sentence.length > 140 ? sentence.slice(0, 137) + '…' : sentence;
}

const categoryIcons = {
  Art: "\uD83C\uDFA8",
  Music: "\uD83C\uDFB5",
  Writing: "\u270D\uFE0F",
  Tech: "\uD83D\uDCBB",
  Creativity: "\u2728",
  Community: "\uD83C\uDF10",
};

const About = () => {
  const strings = useStrings();
  const a = strings.about;
  const [team, setTeam] = useState([]);

  useEffect(() => {
    api.get(`${API}/api/auth/team-members`)
      .then((res) => setTeam(Array.isArray(res.data) ? res.data : []))
      .catch(() => setTeam([]));
  }, []);

  return (
  <div className="about-page">
    <div className="about-hero">
      <h1>{a.heading}</h1>
      <hr className="about-divider" />
      <p className="about-subtitle">{a.subtitle}</p>
    </div>

    <div className="about-card">
      <p>{a.description}</p>
    </div>

    {team.length > 0 && (
      <div className="about-section about-team-section">
        <h2 className="about-section-title">Founder Profile</h2>
        <div className="about-team-grid">
          {team.map((m) => {
            const url = profileUrl(m.id, m.displayName);
            const imgSrc = m.profileImageUrl
              ? (m.profileImageUrl.startsWith('http') ? m.profileImageUrl : `${API}${m.profileImageUrl}`)
              : null;
            const teaser = firstSentence(m.bio);
            return (
              <div key={m.id} className="about-team-card">
                <Link to={url} className="about-team-photo-link" aria-label={`View ${m.displayName}'s profile`}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={m.displayName} className="about-team-photo" />
                  ) : (
                    <div className="about-team-photo about-team-photo-placeholder">
                      {(m.displayName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="about-team-info">
                  <span className="about-team-role">{m.teamRole}</span>
                  <Link to={url} className="about-team-name">{m.displayName}</Link>
                  {m.headline && <p className="about-team-headline">{m.headline}</p>}
                  {teaser && (
                    <Link to={url} className="about-team-teaser">{teaser}</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    <div className="about-section">
      <h2 className="about-section-title">{a.sectionTitle}</h2>
      <p className="about-section-desc">{a.sectionDesc}</p>
    </div>

    <div className="about-features-grid">
      {a.features.map((f) => (
        <div key={f.title} className="about-feature-card">
          <span className="about-feature-icon">{f.icon}</span>
          <h3 className="about-feature-title">{f.title}</h3>
          <p className="about-feature-desc">{f.desc}</p>
          <Link to={f.link} className="about-feature-link">{f.linkText} &rarr;</Link>
        </div>
      ))}
    </div>

    <div className="about-section">
      <h2 className="about-section-title">{a.hobbyTitle}</h2>
      <p className="about-section-desc">{a.hobbyDesc}</p>
      <div className="about-hobby-tags">
        {a.hobbyIdeas.map((h) => (
          <span key={h} className="about-hobby-tag">{h}</span>
        ))}
      </div>
    </div>

    <div className="about-section about-highlights">
      <h2 className="about-section-title">{a.whyTitle}</h2>
      <div className="about-highlights-grid">
        {a.whyItems.map((item) => (
          <div key={item.title} className="about-highlight">
            <span className="about-highlight-icon">{item.icon}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="about-cta-section">
      <h2 className="about-cta-title">{a.ctaTitle}</h2>
      <p className="about-cta-desc">{a.ctaDesc}</p>
      <div className="about-cta-buttons">
        <Link to="/register" className="about-cta-btn about-cta-primary">{a.ctaSignUp}</Link>
        <Link to="/books" className="about-cta-btn about-cta-secondary">{a.ctaExplore}</Link>
      </div>
    </div>

    <div className="about-tags">
      {a.tags.map((tag) => (
        <Link key={tag} to={`/category/${tag.toLowerCase()}`} className="about-tag-link">
          <span className="about-tag-icon">{categoryIcons[tag] || "\uD83D\uDCDA"}</span>
          {tag}
        </Link>
      ))}
    </div>
  </div>
  );
};

export default About;
