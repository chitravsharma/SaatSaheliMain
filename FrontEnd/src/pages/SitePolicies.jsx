import strings from '../constants/strings';
import './SitePolicies.css';

const SitePolicies = () => (
  <div className="policies-page">
    <div className="policies-hero">
      <h1>{strings.sitePolicies.heading}</h1>
      <hr className="policies-divider" />
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.termsHeading}</h2>
      <p>{strings.sitePolicies.termsBody}</p>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.contentHeading}</h2>
      <p>{strings.sitePolicies.contentIntro}</p>
      <ul>
        {strings.sitePolicies.contentRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <p>{strings.sitePolicies.contentFooter}</p>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.privacyHeading}</h2>
      <p>{strings.sitePolicies.privacyBody}</p>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.accountHeading}</h2>
      <ul>
        {strings.sitePolicies.accountRules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.ipHeading}</h2>
      <p>{strings.sitePolicies.ipBody}</p>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.contactHeading}</h2>
      <p>
        {strings.sitePolicies.contactBody}{' '}
        <a href={`mailto:${strings.sitePolicies.contactEmail}`} style={{ color: '#6366f1', fontWeight: 600 }}>
          {strings.sitePolicies.contactEmail}
        </a>.
      </p>
    </div>

    <div className="policies-updated">{strings.sitePolicies.lastUpdated}</div>
  </div>
);

export default SitePolicies;
