import strings from '../constants/strings';
import './About.css';

const About = () => (
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
        <span key={tag} className="about-tag">{tag}</span>
      ))}
    </div>
  </div>
);

export default About;
