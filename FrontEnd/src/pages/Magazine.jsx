import React, { useEffect, useState } from "react";
import axios from "axios";
import FlipBook from "../FlipBook";
import { useStrings } from "../LanguageContext";
import "./Magazine.css";

const API = process.env.REACT_APP_API_URL;

const Magazine = () => {
  const strings = useStrings();
  const [magazine, setMagazine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMagazine = async () => {
      try {
        const res = await axios.get(`${API}/api/books/magazine`);
        setMagazine(res.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchMagazine();
  }, []);

  if (loading) {
    return (
      <div className="magazine-container">
        <div className="loading-spinner" />
        <p className="magazine-loading">{strings.magazine.loading}</p>
      </div>
    );
  }

  if (error || !magazine) {
    return (
      <div className="magazine-container">
        <h2 className="magazine-heading">{strings.magazine.heading}</h2>
        <p className="magazine-not-found">{strings.magazine.notFound}</p>
      </div>
    );
  }

  return (
    <div className="magazine-container">
      <h2 className="magazine-heading">{strings.magazine.heading}</h2>
      <FlipBook bookId={magazine.id} />
    </div>
  );
};

export default Magazine;
