import React, { useState } from 'react';
import './Contacts.css';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailtoLink = `mailto:saheli@saatsaheli.com?subject=Contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(message)}%0A%0AFrom: ${encodeURIComponent(name)} (${encodeURIComponent(email)})`;
    window.location.href = mailtoLink;
    setSent(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="contact-page">
      <div className="contact-hero">
        <h1>Contact Us</h1>
        <hr className="contact-divider" />
      </div>

      <div className="contact-intro">
        <h2>Questions or Comments?</h2>
        <p>
          Contact us today to join our creative community, create your own page,
          share your hobbies, and explore a world of talent and creativity with
          Saat Saheli!
        </p>
      </div>

      <div className="contact-form-card">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-field">
            <label htmlFor="contact-name">Name</label>
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
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="contact-field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="contact-submit">Send Message</button>
        </form>
        {sent && <div className="contact-sent">Thank you! Your message is ready to send.</div>}
      </div>

      <div className="contact-email">
        Or email us directly at{' '}
        <a href="mailto:saheli@saatsaheli.com">saheli@saatsaheli.com</a>
      </div>
    </div>
  );
};

export default Contact;