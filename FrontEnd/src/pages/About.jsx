import './About.css';

const About = () => (
  <div className="about-page">
    <div className="about-hero">
      <h1>About SaatSaheli</h1>
      <hr className="about-divider" />
    </div>
    <div className="about-card">
      <p>
        Do you have a hobby, skill, or passion you can't stop talking about?
        Whether you're an artist, musician, writer, tech enthusiast, or simply
        someone who loves trying new things, Saat Saheli is the perfect creative
        community for you to share, learn, and connect through hobby sharing.
      </p>
    </div>
    <div className="about-tags">
      <span className="about-tag">Art</span>
      <span className="about-tag">Music</span>
      <span className="about-tag">Writing</span>
      <span className="about-tag">Tech</span>
      <span className="about-tag">Creativity</span>
      <span className="about-tag">Community</span>
    </div>
  </div>
);

export default About;