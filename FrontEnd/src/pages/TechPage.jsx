import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStrings } from "../LanguageContext";
import "./TechPage.css";

const TABS = ["technical", "career", "community", "other"];

function TechPage() {
    const strings = useStrings();
    const s = strings.techPage || {};
    const [activeTab, setActiveTab] = useState("technical");

    const tabLabels = {
        technical: s.tabTechnical || "Technical",
        career: s.tabCareer || "Career & Industry",
        community: s.tabCommunity || "Community & Representation",
        other: s.tabOther || "Other",
    };

    const tabIcons = {
        technical: "\uD83D\uDCBB",
        career: "\uD83D\uDCBC",
        community: "\uD83E\uDD1D",
        other: "\uD83D\uDD17",
    };

    const tabDescriptions = {
        technical: s.descTechnical || "Programming, coding tutorials, tools, and technical resources",
        career: s.descCareer || "Tech careers, job skills, industry insights, and professional growth",
        community: s.descCommunity || "Women in tech, diversity, inclusion, and representation stories",
        other: s.descOther || "Miscellaneous tech topics, trends, and interesting finds",
    };

    return (
        <div className="tech-page">
            <div className="tech-hero">
                <span className="tech-hero-icon">{"\uD83D\uDCBB"}</span>
                <h1>{s.heading || "Tech"}</h1>
                <p className="tech-hero-desc">
                    {s.description || "Explore technology topics across multiple dimensions"}
                </p>
            </div>

            {/* Subcategory tabs */}
            <div className="tech-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        className={`tech-tab ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        <span className="tech-tab-icon">{tabIcons[tab]}</span>
                        <span className="tech-tab-label">{tabLabels[tab]}</span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="tech-content">
                <div className="tech-content-header">
                    <h2>
                        <span>{tabIcons[activeTab]}</span> {tabLabels[activeTab]}
                    </h2>
                    <p className="tech-content-desc">{tabDescriptions[activeTab]}</p>
                </div>

                <div className="tech-placeholder">
                    <p>{s.comingSoon || "Content coming soon. Stay tuned!"}</p>
                </div>
            </div>

            <div className="tech-footer-link">
                <Link to="/">{strings.category.backToHome}</Link>
            </div>
        </div>
    );
}

export default TechPage;
