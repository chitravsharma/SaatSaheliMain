import React, { useEffect } from 'react';

const Contact = () => {
  useEffect(() => {
    window.location.href = 'https://docs.google.com/forms/d/e/1FAIpQLScQln_ha-l5z2LKD8dDYtbGQntL1l1pKLBkR-PFva9TmcUrjQ/viewform?usp=sharing&ouid=101412432976448402064';
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <p>Redirecting to contact form...</p>
    </div>
  );
};

export default Contact;
