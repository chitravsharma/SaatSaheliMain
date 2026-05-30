import { useStrings } from '../LanguageContext';
import './SitePolicies.css';

const SitePolicies = () => {
  const strings = useStrings();
  return (
  <div className="policies-page">
    <div className="policies-hero">
      <h1>{strings.sitePolicies.heading}</h1>
      <hr className="policies-divider" />
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.termsHeading}</h2>
      <p>{strings.sitePolicies.termsBody}</p>
      <p>{strings.sitePolicies.termsListIntro}</p>
      <ul>
        {strings.sitePolicies.termsList.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
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
      <p><strong>{strings.sitePolicies.contentAcceptance}</strong></p>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.privacyHeading}</h2>
      <p>{strings.sitePolicies.privacyBody}</p>

      <h3>{strings.sitePolicies.privacyCollectHeading}</h3>
      <p>{strings.sitePolicies.privacyCollectIntro}</p>
      <ul>
        {strings.sitePolicies.privacyCollectList.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3>{strings.sitePolicies.privacyUseHeading}</h3>
      <p>{strings.sitePolicies.privacyUseIntro}</p>
      <ul>
        {strings.sitePolicies.privacyUseList.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3>{strings.sitePolicies.privacyProcessorsHeading}</h3>
      <p>{strings.sitePolicies.privacyProcessorsIntro}</p>
      <ul>
        {strings.sitePolicies.privacyProcessors.map((p) => (
          <li key={p.name}><strong>{p.name}</strong> — {p.desc}</li>
        ))}
      </ul>
      <p>{strings.sitePolicies.privacyProcessorsNote}</p>

      <h3>{strings.sitePolicies.privacyCookiesHeading}</h3>
      <p>{strings.sitePolicies.privacyCookiesBody}</p>

      <h3>{strings.sitePolicies.privacyDeleteHeading}</h3>
      <p>{strings.sitePolicies.privacyDeleteBody}</p>
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

    <div className="policies-section" id="refunds">
      <h2>{strings.sitePolicies.refundHeading}</h2>
      <p>{strings.sitePolicies.refundIntro}</p>
      <h3>{strings.sitePolicies.refundDonationsHeading}</h3>
      <p>{strings.sitePolicies.refundDonationsBody}</p>
      <h3>{strings.sitePolicies.refundRecurringHeading}</h3>
      <p>{strings.sitePolicies.refundRecurringBody}</p>
      <h3>{strings.sitePolicies.refundSubscriptionsHeading}</h3>
      <p>{strings.sitePolicies.refundSubscriptionsBody}</p>
      <h3>{strings.sitePolicies.refundMarketplaceHeading}</h3>
      <p>{strings.sitePolicies.refundMarketplaceBody}</p>
      <h3>{strings.sitePolicies.refundHowHeading}</h3>
      <p>{strings.sitePolicies.refundHowBody}</p>
    </div>

    <div className="policies-section policies-buysell">
      <h2>Buy/Sell Marketplace Disclaimer</h2>
      <p><strong>SaatSaheli provides the Buy/Sell Marketplace as a community convenience feature only.</strong></p>
      <p>
        SaatSaheli, its owners, administrators, and affiliates are <strong>not responsible</strong> for any actions,
        items, transactions, disputes, or outcomes arising from the use of the Buy/Sell Marketplace. This includes
        but is not limited to:
      </p>
      <ul>
        <li>The quality, safety, legality, or accuracy of any listed items or descriptions</li>
        <li>The ability of sellers to sell items or buyers to pay for items</li>
        <li>Any damages, losses, or injuries resulting from marketplace transactions</li>
        <li>Any disputes between buyers and sellers</li>
        <li>The authenticity or ownership of items listed for sale</li>
        <li>Shipping, delivery, or condition of items upon receipt</li>
      </ul>
      <p>
        <strong>All transactions are conducted entirely at the risk of the buyer and seller.</strong> Both
        parties are fully responsible for their own actions, communications, and agreements. SaatSaheli does
        not mediate disputes, process payments, or guarantee any transactions.
      </p>
      <p>
        Users are encouraged to exercise caution, verify items before purchasing, meet in safe public locations
        for in-person exchanges, and never share sensitive financial information through the platform.
      </p>
      <p>
        By using the Buy/Sell Marketplace, you acknowledge and agree to these terms. SaatSaheli reserves the
        right to remove any listing at any time without notice.
      </p>
    </div>

    <div className="policies-section">
      <h2>{strings.sitePolicies.contactHeading}</h2>
      <p>
        {strings.sitePolicies.contactBody}{' '}
        <a href={`mailto:${strings.sitePolicies.contactEmail}`} style={{ color: '#f59e0b', fontWeight: 600 }}>
          {strings.sitePolicies.contactEmail}
        </a>.
      </p>
    </div>

    <div className="policies-updated">{strings.sitePolicies.lastUpdated}</div>
  </div>
  );
};

export default SitePolicies;
