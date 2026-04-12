import { Link } from 'react-router-dom';
import { useStrings } from '../LanguageContext';
import './About.css';

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
