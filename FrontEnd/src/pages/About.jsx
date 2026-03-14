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
  return (
  <div className="about-page">
    <div className="about-hero">
      <h1>{strings.about.heading}</h1>
      <hr className="about-divider" />
    </div>
    <div className="about-card">
      <p>{strings.about.description}</p>
    </div>
    <div className="about-tags">
      {strings.about.tags.map((tag) => (
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
