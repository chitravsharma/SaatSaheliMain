import React, { useState } from 'react';
import { useStrings } from '../LanguageContext';
import './Contacts.css';

const Contact = () => {
  const strings = useStrings();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailtoLink = `mailto:${strings.contact.email}?subject=${encodeURIComponent(strings.contact.mailtoSubject(name))}&body=${encodeURIComponent(strings.contact.mailtoBody(message, name, email))}`;
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
        <h1>{strings.contact.heading}</h1>
        <hr className="contact-divider" />
      </div>

      <div className="contact-intro">
        <h2>{strings.contact.subheading}</h2>
        <p>{strings.contact.intro}</p>
      </div>

      <div className="contact-form-card">
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-field">
            <label htmlFor="contact-name">{strings.contact.labelName}</label>
            <input
              id="contact-name"
              type="text"
              placeholder={strings.contact.placeholderName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="contact-field">
            <label htmlFor="contact-email">{strings.contact.labelEmail}</label>
            <input
              id="contact-email"
              type="email"
              placeholder={strings.contact.placeholderEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="contact-field">
            <label htmlFor="contact-message">{strings.contact.labelMessage}</label>
            <textarea
              id="contact-message"
              placeholder={strings.contact.placeholderMessage}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="contact-submit">{strings.contact.sendButton}</button>
        </form>
        {sent && <div className="contact-sent">{strings.contact.successMessage}</div>}
      </div>

      <div className="contact-email">
        {strings.contact.emailPrompt}{' '}
        <a href={`mailto:${strings.contact.email}`}>{strings.contact.email}</a>
      </div>
    </div>
  );
};

export default Contact;
