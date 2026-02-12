import './SitePolicies.css';

const SitePolicies = () => (
  <div className="policies-page">
    <div className="policies-hero">
      <h1>Site Policies</h1>
      <hr className="policies-divider" />
    </div>

    <div className="policies-section">
      <h2>Terms of Use</h2>
      <p>
        By accessing and using SaatSaheli, you agree to comply with these terms.
        SaatSaheli is a creative community platform for sharing hobbies, skills,
        and passions. All users must use the platform respectfully and in
        accordance with applicable laws.
      </p>
    </div>

    <div className="policies-section">
      <h2>Content Policy</h2>
      <p>Users are responsible for the content they publish. Content must be:</p>
      <ul>
        <li>Original or properly attributed to the creator</li>
        <li>Free from hate speech, harassment, or harmful material</li>
        <li>Appropriate for a general audience</li>
        <li>Not infringing on any copyright or intellectual property rights</li>
      </ul>
      <p>
        SaatSaheli reserves the right to remove any content that violates these
        guidelines.
      </p>
    </div>

    <div className="policies-section">
      <h2>Privacy Policy</h2>
      <p>
        We value your privacy. SaatSaheli collects only the information necessary
        to provide our services, including your name, email address, and content
        you create. We do not sell or share your personal information with third
        parties. Your data is stored securely and used solely for operating the
        platform.
      </p>
    </div>

    <div className="policies-section">
      <h2>Account Policy</h2>
      <ul>
        <li>Users must provide accurate information when creating an account</li>
        <li>Each user may maintain one account</li>
        <li>Users are responsible for maintaining the security of their account</li>
        <li>Accounts found violating site policies may be suspended or removed</li>
      </ul>
    </div>

    <div className="policies-section">
      <h2>Intellectual Property</h2>
      <p>
        All content created and published on SaatSaheli remains the intellectual
        property of its creator. By publishing on our platform, you grant
        SaatSaheli a non-exclusive license to display your content within the
        platform. You may remove your content at any time.
      </p>
    </div>

    <div className="policies-section">
      <h2>Contact</h2>
      <p>
        For questions about these policies, please reach out to us at{' '}
        <a href="mailto:saheli@saatsaheli.com" style={{ color: '#6366f1', fontWeight: 600 }}>
          saheli@saatsaheli.com
        </a>.
      </p>
    </div>

    <div className="policies-updated">Last updated: February 2026</div>
  </div>
);

export default SitePolicies;
