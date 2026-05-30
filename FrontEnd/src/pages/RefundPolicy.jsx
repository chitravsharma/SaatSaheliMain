import { Link } from 'react-router-dom';
import { useStrings } from '../LanguageContext';
import './SitePolicies.css';

// Dedicated, standalone Refund & Cancellation Policy page (also surfaced as a
// section on /policies). Stripe account review expects a clear, dedicated URL.
const RefundPolicy = () => {
  const s = useStrings().sitePolicies;
  return (
    <div className="policies-page">
      <div className="policies-hero">
        <h1>{s.refundHeading}</h1>
        <hr className="policies-divider" />
      </div>

      <div className="policies-section">
        <p>{s.refundIntro}</p>

        <h3>{s.refundDonationsHeading}</h3>
        <p>{s.refundDonationsBody}</p>

        <h3>{s.refundRecurringHeading}</h3>
        <p>{s.refundRecurringBody}</p>

        <h3>{s.refundSubscriptionsHeading}</h3>
        <p>{s.refundSubscriptionsBody}</p>

        <h3>{s.refundMarketplaceHeading}</h3>
        <p>{s.refundMarketplaceBody}</p>

        <h3>{s.refundHowHeading}</h3>
        <p>{s.refundHowBody}</p>

        <p>
          {s.contactBody}{' '}
          <a href={`mailto:${s.contactEmail}`} style={{ color: '#f59e0b', fontWeight: 600 }}>
            {s.contactEmail}
          </a>.
        </p>

        <p style={{ marginTop: '1.25rem' }}>
          <Link to="/policies" style={{ color: '#f59e0b', fontWeight: 600 }}>
            ← All Site Policies
          </Link>
        </p>
      </div>

      <div className="policies-updated">{s.lastUpdated}</div>
    </div>
  );
};

export default RefundPolicy;
