import React, { useState } from 'react';
import axios from 'axios';
import './Contacts.css';

const API_BASE = process.env.REACT_APP_API_URL;

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${API_BASE}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        website: honeypot,
      });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send message. Please try again.';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <h1>Contact Us</h1>
        <hr className="contact-divider" />
      </div>

      <div className="contact-intro">
        <h2>We'd Love to Hear From You</h2>
        <p>
          Have a question, suggestion, or feedback? Fill out the form below and
          our team will get back to you as soon as possible.
        </p>
      </div>

      <div className="contact-form-card">
        {sent ? (
          <div className="contact-sent">
            Thank you for reaching out! We'll get back to you soon.
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error" role="alert">{error}</div>}

            {/* Honeypot — hidden from real users, bots auto-fill it */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <input type="text" name="confirm_email_hp" tabIndex="-1" autoComplete="off"
                value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-name">Name *</label>
              <input
                id="contact-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-email">Email *</label>
              <input
                id="contact-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-subject">Subject *</label>
              <input
                id="contact-subject"
                type="text"
                placeholder="What is this about?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="contact-field">
              <label htmlFor="contact-message">Message *</label>
              <textarea
                id="contact-message"
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
              />
            </div>

            <button
              type="submit"
              className="contact-submit"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>

      <p className="contact-email">
        Or email us directly at{' '}
        <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>
      </p>
    </div>
  );
};

export default Contact;
