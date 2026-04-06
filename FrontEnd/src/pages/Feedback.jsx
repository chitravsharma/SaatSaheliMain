import React, { useState } from 'react';
import axios from 'axios';
import './Feedback.css';

const API_BASE = process.env.REACT_APP_API_URL;

const FEEDBACK_CATEGORIES = [
  "Website Experience",
  "Content Quality",
  "Book Creator Tool",
  "Chat & Community",
  "Design & Layout",
  "Performance / Speed",
  "Other",
];

const Feedback = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSending(true);
    try {
      const fullMessage = `Category: ${category || "General"}\nRating: ${rating || "Not provided"}\n\nFeedback:\n${message.trim()}`;

      await axios.post(`${API_BASE}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: `Feedback: ${category || "General"}`,
        message: fullMessage,
      });
      setSent(true);
      setName(''); setEmail(''); setCategory('');
      setRating(''); setMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="feedback-page">
      <div className="feedback-hero">
        <h1>Feedback</h1>
        <hr className="feedback-divider" />
      </div>

      <div className="feedback-intro">
        <h2>Share Your Feedback</h2>
        <p>
          Your feedback helps us improve. Tell us what you think about our platform, features, or content.
          We read every submission!
        </p>
      </div>

      <div className="feedback-form-card">
        {sent ? (
          <div className="feedback-sent">
            Thank you for your feedback! We appreciate your input.
            <br />
            <button className="feedback-submit" style={{ marginTop: 16 }} onClick={() => setSent(false)}>
              Submit More Feedback
            </button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            {error && <div className="feedback-error" role="alert">{error}</div>}

            <fieldset className="feedback-section">
              <legend className="feedback-section-title">Your Information</legend>
              <div className="feedback-field">
                <label htmlFor="fb-name">Name *</label>
                <input id="fb-name" type="text" placeholder="Your name"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="feedback-field">
                <label htmlFor="fb-email">Email *</label>
                <input id="fb-email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </fieldset>

            <fieldset className="feedback-section">
              <legend className="feedback-section-title">Your Feedback</legend>
              <div className="feedback-field">
                <label htmlFor="fb-category">What area is your feedback about?</label>
                <select id="fb-category" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="feedback-select">
                  <option value="">Select a category...</option>
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="feedback-field">
                <label>How would you rate your experience?</label>
                <div className="feedback-rating-group">
                  {[
                    { value: "Excellent", emoji: "★★★★★" },
                    { value: "Good", emoji: "★★★★" },
                    { value: "Average", emoji: "★★★" },
                    { value: "Poor", emoji: "★★" },
                    { value: "Very Poor", emoji: "★" },
                  ].map(opt => (
                    <label key={opt.value} className="feedback-radio-label">
                      <input type="radio" name="rating" value={opt.value}
                        checked={rating === opt.value}
                        onChange={(e) => setRating(e.target.value)} />
                      <span className="feedback-rating-stars">{opt.emoji}</span>
                      {opt.value}
                    </label>
                  ))}
                </div>
              </div>

              <div className="feedback-field">
                <label htmlFor="fb-message">Your feedback *</label>
                <textarea id="fb-message" placeholder="Tell us what you liked, what can be improved, or any suggestions you have..."
                  value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} />
              </div>
            </fieldset>

            <button type="submit" className="feedback-submit" disabled={sending}>
              {sending ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>

      <p className="feedback-email-note">
        Or email us directly at{' '}
        <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>
      </p>
    </div>
  );
};

export default Feedback;
