import React from "react";
import { Link } from "react-router-dom";
import strings from "../constants/strings";
import "./Home.css";

function Home() {
  return (
    <div className="home-container">
      <div className="home-hero">
        <h1>{strings.about.heading}</h1>
        <hr className="home-divider" />
      </div>
      <div className="home-card">
        <p>{strings.about.description}</p>
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
