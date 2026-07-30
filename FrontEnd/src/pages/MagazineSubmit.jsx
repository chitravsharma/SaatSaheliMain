import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../AuthContext';
import { useLoginGate } from '../contexts/LoginGateContext';
import MagazineAmazonCta from '../components/MagazineAmazonCta';
import './HelpSupport.css';

const API_BASE = process.env.REACT_APP_API_URL;

const SUBMISSION_TYPES = [
  "Poetry",
  "Short Story",
  "Article",
  "Personal Experience",
  "Artwork / Drawing",
  "Photography",
];

// country → state/region → cities. Cities lists end with "Other" so users can
// type a city that isn't in the dropdown. States lists also end with "Other".
// For Singapore (city-state) we still keep a single state so the dropdowns
// stay consistent.
const COUNTRIES = {
  "India": {
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Other"],
    "Delhi": ["Delhi", "Other"],
    "Karnataka": ["Bangalore", "Other"],
    "Telangana": ["Hyderabad", "Other"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Other"],
    "West Bengal": ["Kolkata", "Other"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Other"],
    "Rajasthan": ["Jaipur", "Other"],
    "Uttar Pradesh": ["Lucknow", "Other"],
    "Chandigarh": ["Chandigarh", "Other"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Other"],
    "Bihar": ["Patna", "Other"],
    "Kerala": ["Kochi", "Other"],
    "Andhra Pradesh": ["Visakhapatnam", "Other"],
    "Other": ["Other"],
  },
  "United States": {
    "New York": ["New York", "Other"],
    "California": ["Los Angeles", "San Francisco", "San Diego", "Other"],
    "Illinois": ["Chicago", "Other"],
    "Texas": ["Houston", "Dallas", "Other"],
    "Arizona": ["Phoenix", "Other"],
    "Washington": ["Seattle", "Other"],
    "Massachusetts": ["Boston", "Other"],
    "Georgia": ["Atlanta", "Other"],
    "Colorado": ["Denver", "Other"],
    "Florida": ["Miami", "Other"],
    "District of Columbia": ["Washington DC", "Other"],
    "Pennsylvania": ["Philadelphia", "Other"],
    "Other": ["Other"],
  },
  "United Kingdom": {
    "England": ["London", "Manchester", "Birmingham", "Leeds", "Bristol", "Liverpool", "Oxford", "Cambridge", "Other"],
    "Scotland": ["Glasgow", "Edinburgh", "Other"],
    "Other": ["Other"],
  },
  "Canada": {
    "Ontario": ["Toronto", "Ottawa", "Other"],
    "British Columbia": ["Vancouver", "Other"],
    "Quebec": ["Montreal", "Quebec City", "Other"],
    "Alberta": ["Calgary", "Edmonton", "Other"],
    "Manitoba": ["Winnipeg", "Other"],
    "Other": ["Other"],
  },
  "Australia": {
    "New South Wales": ["Sydney", "Other"],
    "Victoria": ["Melbourne", "Other"],
    "Queensland": ["Brisbane", "Gold Coast", "Other"],
    "Western Australia": ["Perth", "Other"],
    "South Australia": ["Adelaide", "Other"],
    "Australian Capital Territory": ["Canberra", "Other"],
    "Other": ["Other"],
  },
  "United Arab Emirates": {
    "Dubai": ["Dubai", "Other"],
    "Abu Dhabi": ["Abu Dhabi", "Other"],
    "Sharjah": ["Sharjah", "Other"],
    "Ajman": ["Ajman", "Other"],
    "Other": ["Other"],
  },
  "Singapore": {
    "Singapore": ["Singapore"],
  },
  "Germany": {
    "Berlin": ["Berlin", "Other"],
    "Bavaria": ["Munich", "Other"],
    "Hesse": ["Frankfurt", "Other"],
    "Hamburg": ["Hamburg", "Other"],
    "North Rhine-Westphalia": ["Cologne", "Other"],
    "Baden-Württemberg": ["Stuttgart", "Other"],
    "Other": ["Other"],
  },
  "France": {
    "Île-de-France": ["Paris", "Other"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Other"],
    "Provence-Alpes-Côte d'Azur": ["Marseille", "Nice", "Other"],
    "Occitania": ["Toulouse", "Other"],
    "Other": ["Other"],
  },
  "Nepal": {
    "Bagmati": ["Kathmandu", "Lalitpur", "Other"],
    "Gandaki": ["Pokhara", "Other"],
    "Province No. 1": ["Biratnagar", "Other"],
    "Other": ["Other"],
  },
  "Bangladesh": {
    "Dhaka": ["Dhaka", "Other"],
    "Chittagong": ["Chittagong", "Other"],
    "Khulna": ["Khulna", "Other"],
    "Rajshahi": ["Rajshahi", "Other"],
    "Other": ["Other"],
  },
  "Sri Lanka": {
    "Western": ["Colombo", "Other"],
    "Central": ["Kandy", "Other"],
    "Southern": ["Galle", "Other"],
    "Northern": ["Jaffna", "Other"],
    "Other": ["Other"],
  },
  "Other": {
    "Other": ["Other"],
  },
};

const MagazineSubmit = () => {
  const { user } = useAuth();
  const { requireLogin } = useLoginGate();
  const gateTriggeredRef = useRef(false);

  // Anonymous visitor lands here directly — open the login modal once.
  // After login the user state updates and the form renders normally.
  useEffect(() => {
    if (!user && !gateTriggeredRef.current) {
      gateTriggeredRef.current = true;
      requireLogin(window.location.pathname + window.location.search, {
        title: "Login to Submit",
        subtitle: "Sign in or create a free account to submit your creative work to Saat Saheli Magazine.",
      });
    }
  }, [user, requireLogin]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [otherState, setOtherState] = useState('');
  const [city, setCity] = useState('');
  const [otherCity, setOtherCity] = useState('');
  const [submissionType, setSubmissionType] = useState('');
  const [otherType, setOtherType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishedBefore, setPublishedBefore] = useState('');
  const [social, setSocial] = useState('');
  const [originalWork, setOriginalWork] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');
  // Synchronous guard so a fast double-click can't fire two POSTs before
  // the `sending` state has propagated to the disabled-button render.
  const submittingRef = useRef(false);

  // Refs for focusing the first invalid field on validation failure.
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const countryRef = useRef(null);
  const stateRef = useRef(null);
  const otherStateRef = useRef(null);
  const cityRef = useRef(null);
  const otherCityRef = useRef(null);
  const submissionTypeRef = useRef(null);
  const otherTypeRef = useRef(null);
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);
  const publishedBeforeRef = useRef(null);
  const originalWorkRef = useRef(null);

  const failValidation = (ref) => {
    setError('Please try again.');
    if (ref && ref.current) {
      ref.current.focus();
      if (typeof ref.current.scrollIntoView === 'function') {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // When state=Other we skip the city dropdown and require free-text otherCity instead.
  const cityIsValid = state === 'Other'
    ? otherCity.trim() !== ''
    : (city !== '' && (city !== 'Other' || otherCity.trim() !== ''));

  // All required fields filled? — used to enable/disable the submit button.
  const isFormValid =
    name.trim() !== '' &&
    email.trim() !== '' &&
    country !== '' &&
    state !== '' &&
    (state !== 'Other' || otherState.trim() !== '') &&
    cityIsValid &&
    submissionType !== '' &&
    (submissionType !== 'Other' || otherType.trim() !== '') &&
    title.trim() !== '' &&
    description.trim() !== '' &&
    publishedBefore !== '' &&
    originalWork === 'Yes';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setError('');

    if (!name.trim())              { failValidation(nameRef);            return; }
    if (!email.trim())             { failValidation(emailRef);           return; }
    if (!country)                  { failValidation(countryRef);         return; }
    if (!state)                    { failValidation(stateRef);           return; }
    if (state === 'Other' && !otherState.trim())           { failValidation(otherStateRef);      return; }
    // When state=Other the city dropdown is disabled — require free-text city.
    if (state === 'Other') {
      if (!otherCity.trim())       { failValidation(otherCityRef);       return; }
    } else {
      if (!city)                   { failValidation(cityRef);            return; }
      if (city === 'Other' && !otherCity.trim())           { failValidation(otherCityRef);       return; }
    }
    if (!submissionType)           { failValidation(submissionTypeRef);  return; }
    if (submissionType === 'Other' && !otherType.trim())   { failValidation(otherTypeRef);       return; }
    if (!title.trim())             { failValidation(titleRef);           return; }
    if (!description.trim())       { failValidation(descriptionRef);     return; }
    if (!publishedBefore)          { failValidation(publishedBeforeRef); return; }
    if (originalWork !== 'Yes')    { failValidation(originalWorkRef);    return; }

    submittingRef.current = true;
    setSending(true);
    try {
      const type = submissionType === 'Other' ? `Other: ${otherType.trim()}` : submissionType;
      const stateValue = state === 'Other' ? otherState.trim() : state;
      const cityValue = city === 'Other' ? otherCity.trim() : city;
      const fullMessage = [
        `Submission Type: ${type}`,
        `Title: ${title.trim()}`,
        `Location: ${cityValue}, ${stateValue}, ${country}`,
        `Phone: ${phone.trim() || "Not provided"}`,
        `Previously Published: ${publishedBefore}`,
        `Instagram / Website: ${social.trim() || "Not provided"}`,
        ``,
        `Description / Summary:`,
        description.trim(),
      ].join('\n');

      const res = await api.post(`${API_BASE}/api/contact`, {
        name: name.trim(),
        email: email.trim(),
        subject: `Magazine Submission: ${type} — ${title.trim()}`,
        message: fullMessage,
        // Honeypot kept in DOM but always empty in payload — see Advertise.jsx.
        website: "",
      });
      setTrackingId(res?.data?.trackingId || '');
      setSent(true);
      setName(''); setEmail(''); setPhone(''); setCountry('');
      setState(''); setOtherState(''); setCity(''); setOtherCity('');
      setSubmissionType(''); setOtherType(''); setTitle('');
      setDescription(''); setPublishedBefore(''); setSocial('');
      setOriginalWork('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send. Please try later.');
    } finally {
      setSending(false);
      submittingRef.current = false;
    }
  };

  if (!user) {
    return (
      <div className="hs-page">
        <div className="hs-hero">
          <h1>Saat Saheli Magazine — Creative Submission Form</h1>
          <hr className="hs-divider" />
        </div>
        <div className="hs-form-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <h2 style={{ marginBottom: 12 }}>Login required</h2>
          <p style={{ marginBottom: 20, color: '#666' }}>
            Please sign in or create a free account to submit your creative work.
          </p>
          <button
            type="button"
            className="hs-submit"
            style={{ maxWidth: 260, margin: '0 auto' }}
            onClick={() => requireLogin(window.location.pathname + window.location.search, {
              title: "Login to Submit",
              subtitle: "Sign in or create a free account to submit your creative work to Saat Saheli Magazine.",
            })}
          >
            Login to Submit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hs-page">
      <div className="hs-hero">
        <h1>Saat Saheli Magazine — Creative Submission Form</h1>
        <hr className="hs-divider" />
      </div>

      <MagazineAmazonCta />

      <div className="hs-intro">
        <h2>Share Your Voice</h2>
        <p>
          Submit your creative work for the next edition of Saat Saheli Magazine.
          Fill out the form below and email your full content or attachments to{' '}
          <strong>avikaventures.info@gmail.com</strong>.
        </p>
      </div>

      <div className="hs-form-card">
        {sent ? (
          <div className="hs-sent">
            <div className="hs-sent-icon" aria-hidden="true">✓</div>
            <h3 className="hs-sent-title">Submission Received</h3>
            <p className="hs-sent-subtitle">Thank you for your submission! We'll review it and get back to you soon.</p>
            {trackingId && (
              <>
                <div className="hs-tracking-box">
                  <span className="hs-tracking-label">Your Tracking ID</span>
                  <span className="hs-tracking-id">{trackingId}</span>
                </div>
                <p className="hs-tracking-hint">
                  Please save this ID — quote it in any follow-up email so we can locate your submission.
                </p>
              </>
            )}
            <div className="hs-sent-note">
              <strong>Next step:</strong> Email your full content (Word/PDF/images) to{' '}
              <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>
            </div>
            <div className="hs-sent-actions">
              <button className="hs-submit" onClick={() => { setSent(false); setTrackingId(''); }}>
                Submit Another
              </button>
            </div>
          </div>
        ) : (
          <form className="hs-form" onSubmit={handleSubmit}>
            {error && <div className="hs-error" role="alert">{error}</div>}

            {/* Honeypot */}
            <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
              <input type="text" name="ssh_alt_tagline" tabIndex="-1" autoComplete="off"
                value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            {/* Section 1: Contact Information */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Contact Information</legend>
              <div className="hs-field">
                <label htmlFor="ms-name">Full Name *</label>
                <input id="ms-name" type="text" placeholder="Your full name"
                  ref={nameRef}
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="hs-field">
                <label htmlFor="ms-email">Email Address *</label>
                <input id="ms-email" type="email" placeholder="you@example.com"
                  ref={emailRef}
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="hs-field">
                <label htmlFor="ms-phone">Phone Number</label>
                <input id="ms-phone" type="tel" placeholder="Your phone number"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="hs-field">
                <label htmlFor="ms-country">Country *</label>
                <select id="ms-country" value={country}
                  ref={countryRef}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState(''); setOtherState('');
                    setCity(''); setOtherCity('');
                  }}
                  required style={{ padding: '12px 14px', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-body)' }}>
                  <option value="">Select Country</option>
                  {Object.keys(COUNTRIES).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="hs-field">
                <label htmlFor="ms-state">State / Region *</label>
                <select id="ms-state" value={state}
                  ref={stateRef}
                  onChange={(e) => {
                    setState(e.target.value);
                    if (e.target.value !== 'Other') setOtherState('');
                    setCity(''); setOtherCity('');
                  }}
                  required disabled={!country}
                  style={{ padding: '12px 14px', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-body)' }}>
                  <option value="">Select State / Region</option>
                  {country && Object.keys(COUNTRIES[country] || {}).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {state === 'Other' && (
                  <input type="text" placeholder="Enter your state / region..." value={otherState}
                    ref={otherStateRef}
                    onChange={(e) => setOtherState(e.target.value)} className="hs-other-input" />
                )}
              </div>
              <div className="hs-field">
                <label htmlFor="ms-city">City *</label>
                <select id="ms-city" value={city}
                  ref={cityRef}
                  onChange={(e) => { setCity(e.target.value); if (e.target.value !== 'Other') setOtherCity(''); }}
                  required disabled={!state || state === 'Other'}
                  style={{ padding: '12px 14px', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-body)' }}>
                  <option value="">Select City</option>
                  {country && state && state !== 'Other' && (COUNTRIES[country]?.[state] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {(city === 'Other' || state === 'Other') && (
                  <input type="text" placeholder="Enter your city..." value={otherCity}
                    ref={otherCityRef}
                    onChange={(e) => {
                      // When state=Other the city dropdown is empty/disabled, so we
                      // free-text the city and shove it into the same otherCity field.
                      // Force city to 'Other' so validation/payload treats it as free-text.
                      if (state === 'Other') setCity('Other');
                      setOtherCity(e.target.value);
                    }} className="hs-other-input" />
                )}
              </div>
            </fieldset>

            {/* Section 2: Submission Details */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Submission Details</legend>
              <div className="hs-field">
                <label htmlFor="ms-type">Type of Submission *</label>
                <select id="ms-type" value={submissionType}
                  ref={submissionTypeRef}
                  onChange={(e) => { setSubmissionType(e.target.value); if (e.target.value !== 'Other') setOtherType(''); }}
                  required style={{ padding: '12px 14px', border: '1px solid var(--border-strong)', borderRadius: 10, fontSize: '1rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-body)' }}>
                  <option value="">Select</option>
                  {SUBMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="Other">Other</option>
                </select>
                {submissionType === 'Other' && (
                  <input type="text" placeholder="Please specify..." value={otherType}
                    ref={otherTypeRef}
                    onChange={(e) => setOtherType(e.target.value)} className="hs-other-input" />
                )}
              </div>
              <div className="hs-field">
                <label htmlFor="ms-title">Title of Your Submission *</label>
                <input id="ms-title" type="text" placeholder="Title of your work"
                  ref={titleRef}
                  value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="hs-field">
                <label htmlFor="ms-desc">Description / Summary *</label>
                <textarea id="ms-desc" placeholder="Briefly describe your submission..."
                  ref={descriptionRef}
                  value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} />
              </div>
            </fieldset>

            {/* Section 3: Background */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Background</legend>
              <div className="hs-field">
                <label>Have you previously been published? *</label>
                <div className="hs-radio-group">
                  <label className="hs-radio-label">
                    <input type="radio" name="publishedBefore" value="Yes"
                      ref={publishedBeforeRef}
                      checked={publishedBefore === "Yes"}
                      onChange={(e) => setPublishedBefore(e.target.value)} />
                    Yes
                  </label>
                  <label className="hs-radio-label">
                    <input type="radio" name="publishedBefore" value="No"
                      checked={publishedBefore === "No"}
                      onChange={(e) => setPublishedBefore(e.target.value)} />
                    No
                  </label>
                </div>
              </div>
              <div className="hs-field">
                <label htmlFor="ms-social">Instagram / Website</label>
                <input id="ms-social" type="text" placeholder="@yourhandle or https://..."
                  value={social} onChange={(e) => setSocial(e.target.value)} />
              </div>
            </fieldset>

            {/* Section 4: Consent */}
            <fieldset className="hs-section">
              <legend className="hs-section-title">Consent *</legend>
              <div className="hs-field">
                <label>I confirm that this is my original work and I give permission to Saat Saheli Magazine to review and publish it.</label>
                <div className="hs-radio-group">
                  <label className="hs-radio-label">
                    <input type="radio" name="originalWork" value="Yes"
                      ref={originalWorkRef}
                      checked={originalWork === "Yes"}
                      onChange={(e) => setOriginalWork(e.target.value)} />
                    Yes, I confirm
                  </label>
                  <label className="hs-radio-label">
                    <input type="radio" name="originalWork" value="No"
                      checked={originalWork === "No"}
                      onChange={(e) => setOriginalWork(e.target.value)} />
                    No
                  </label>
                </div>
              </div>
            </fieldset>

            <div className="hs-intro" style={{ textAlign: 'left', marginBottom: 0 }}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.7 }}>
                <strong>Important:</strong> After submitting this form, please email your full content (Word/PDF/images) to<br />
                <a href="mailto:avikaventures.info@gmail.com" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
                  avikaventures.info@gmail.com
                </a><br />
                Include your name and submission title in the subject line.
              </p>
            </div>

            <button type="submit" className="hs-submit" disabled={sending || !isFormValid}>
              {sending ? (<><span className="hs-spinner" aria-hidden="true" />Submitting...</>) : 'Submit Details'}
            </button>
          </form>
        )}
      </div>

      <p className="hs-email-note">
        Email your content directly to{' '}
        <a href="mailto:avikaventures.info@gmail.com">avikaventures.info@gmail.com</a>
      </p>
    </div>
  );
};

export default MagazineSubmit;
