import React, { useState } from 'react';
import axios from 'axios';
import './HelpSupport.css';

const API_BASE = process.env.REACT_APP_API_URL;

const REQUEST_TYPE_OPTIONS = [
  "Content Creation (Book cover, poem, Article, blog posts)",
  "Technical Support (My account, Content Issue)",
];

const HelpSupport = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestTypes, setRequestTypes] = useState([]);
  const [otherType, setOtherType] = useState('');
  const [message, setMessage] = useState('');
  const [wantAppointment, setWantAppointment] = useState('');
  const [prefDate, setPrefDate] = useState('');
  const [prefTime, setPrefTime] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [timeline, setTimeline] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const toggleRequestType = (type) => {
    setRequestTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    if (type === "Other" && requestTypes.includes("Other")) setOtherType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (requestTypes.length === 0) {
      setError('Please select at least one request type.');
      return;
    }

    setSending(true);
    try {
      const types = requestTypes.includes("Other")
        ? [...requestTypes.filter(t => t !== "Other"), `Other: ${otherType}`].join(", ")
        : requestTypes.join(", ");
      const appointmentInfo = wantAppointment === "Yes"
        ? `\n\nAppointment Requested:\nDate: ${prefDate}\nTime: ${prefTime}\nMeeting Type: ${meetingType}`
        : "\n\nAppointment: No";
      const fullMessage = `Request Type: ${types}\nTimeline: ${timeline || "Not specified"}\nPhone: ${phone || "Not provided"}\n\nProject Details:\n${message.trim()}${appointmentInfo}`;

      await axios.post(`${API_BASE}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: `Help & Support: ${types}`,
        message: fullMessage,
        website: honeypot,
      });
      setSent(true);
      setName(''); setEmail(''); setPhone('');
      setRequestTypes([]); setOtherType('');
      setMessage(''); setWantAppointment(''); setPrefDate('');
      setPrefTime(''); setMeetingType(''); setTimeline('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="hs-page">
      <div className="hs-hero">
        <h1>Help & Support / Content Creation Request</h1>
        <hr className="hs-divider" />
      </div>

      <div className="hs-intro">
        <h2>We're Here to Help</h2>
        <p>
          Need help with your account, want to request content creation, or schedule a consultation?
          Fill out the form below and our team will get back to you within 24-48 hours.
        </p>
      </div>

      <div className="hs-form-card">
        {sent ? (
          <div className="hs-sent">
            Thank you for your request! We'll get back to you within 24-48 hours.
            <br />
            <button className="hs-submit" style={{ marginTop: 16 }} onClick={() => setSent(false)}>
              Submit Another Request
            </button>
          </div>
        ) : (
          <form className="hs-form" onSubmit={handleSubmit}>
            {error && <div className="hs-error" role="alert">{error}</div>}

            {/* Honeypot */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <input type="text" name="confirm_email_hp" tabIndex="-1" autoComplete="off"
                value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            {/* Section 1: Contact Information */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Section 1: Contact Information</legend>
              <div className="hs-field">
                <label htmlFor="hs-name">Full Name *</label>
                <input id="hs-name" type="text" placeholder="Your full name"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="hs-field">
                <label htmlFor="hs-email">Email Address *</label>
                <input id="hs-email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="hs-field">
                <label htmlFor="hs-phone">Phone Number</label>
                <input id="hs-phone" type="tel" placeholder="Your phone number"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </fieldset>

            {/* Section 2: Type of Request */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Section 2: Type of Request</legend>
              <div className="hs-field">
                <label>What do you need help with? * <span className="hs-hint">(Select one or more)</span></label>
                <div className="hs-checkbox-group">
                  {REQUEST_TYPE_OPTIONS.map((option) => (
                    <label key={option} className="hs-check-label">
                      <input type="checkbox" checked={requestTypes.includes(option)}
                        onChange={() => toggleRequestType(option)} />
                      {option}
                    </label>
                  ))}
                  <label className="hs-check-label">
                    <input type="checkbox" checked={requestTypes.includes("Other")}
                      onChange={() => toggleRequestType("Other")} />
                    Other (please specify)
                  </label>
                  {requestTypes.includes("Other") && (
                    <input type="text" placeholder="Please specify..." value={otherType}
                      onChange={(e) => setOtherType(e.target.value)} className="hs-other-input" />
                  )}
                </div>
              </div>
            </fieldset>

            {/* Section 3: Project Details */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Section 3: Project Details</legend>
              <div className="hs-field">
                <label htmlFor="hs-message">Briefly describe your request *</label>
                <p className="hs-hint-block">
                  Example: "Need help creating book cover" or "Help setting up my page"
                </p>
                <textarea id="hs-message" placeholder="Describe your request..."
                  value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} />
              </div>
            </fieldset>

            {/* Section 4: Appointment Request */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Section 4: Appointment Request</legend>
              <div className="hs-field">
                <label>Would you like to schedule a consultation?</label>
                <div className="hs-radio-group">
                  <label className="hs-radio-label">
                    <input type="radio" name="appointment" value="Yes"
                      checked={wantAppointment === "Yes"}
                      onChange={(e) => setWantAppointment(e.target.value)} />
                    Yes
                  </label>
                  <label className="hs-radio-label">
                    <input type="radio" name="appointment" value="No"
                      checked={wantAppointment === "No"}
                      onChange={(e) => setWantAppointment(e.target.value)} />
                    No
                  </label>
                </div>
              </div>
              {wantAppointment === "Yes" && (
                <div className="hs-appointment-details">
                  <div className="hs-field">
                    <label htmlFor="hs-date">Preferred Date</label>
                    <input id="hs-date" type="date" value={prefDate}
                      onChange={(e) => setPrefDate(e.target.value)} />
                  </div>
                  <div className="hs-field">
                    <label htmlFor="hs-time">Preferred Time</label>
                    <input id="hs-time" type="time" value={prefTime}
                      onChange={(e) => setPrefTime(e.target.value)} />
                  </div>
                  <div className="hs-field">
                    <label>Meeting Type</label>
                    <div className="hs-radio-group">
                      <label className="hs-radio-label">
                        <input type="radio" name="meetingType" value="Phone Call"
                          checked={meetingType === "Phone Call"}
                          onChange={(e) => setMeetingType(e.target.value)} />
                        Phone Call
                      </label>
                      <label className="hs-radio-label">
                        <input type="radio" name="meetingType" value="Video Call"
                          checked={meetingType === "Video Call"}
                          onChange={(e) => setMeetingType(e.target.value)} />
                        Video Call
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </fieldset>

            {/* Section 5: Timeline & Priority */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Section 5: Timeline & Priority</legend>
              <div className="hs-field">
                <label>When do you need this completed?</label>
                <div className="hs-radio-group">
                  {["As soon as possible", "Within a week", "Flexible"].map((option) => (
                    <label key={option} className="hs-radio-label">
                      <input type="radio" name="timeline" value={option}
                        checked={timeline === option}
                        onChange={(e) => setTimeline(e.target.value)} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>

            <button type="submit" className="hs-submit" disabled={sending}>
              {sending ? 'Sending...' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>

      <p className="hs-email-note">
        Or email us directly at{' '}
        <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>
      </p>
    </div>
  );
};

export default HelpSupport;
