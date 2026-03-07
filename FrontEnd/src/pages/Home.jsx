import React from "react";
import { Link } from "react-router-dom";
import { useStrings } from "../LanguageContext";
import "./Home.css";

function Home() {
  const strings = useStrings();
  return (
    <div className="home-container">
      <div className="home-hero">
        <h1>{strings.home.welcomeHeading}</h1>
        <hr className="home-divider" />
      </div>
      <div className="home-tags">
        {strings.about.tags.map((tag) => (
          <Link
            key={tag}
            to={`/category/${tag.toLowerCase()}`}
            className="home-tag-link"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;
