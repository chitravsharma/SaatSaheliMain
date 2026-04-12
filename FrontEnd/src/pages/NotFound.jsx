import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 24px',
      maxWidth: '520px',
      margin: '0 auto',
    }}>
      <h1 style={{
        fontSize: '5rem',
        fontWeight: 800,
        margin: '0 0 8px',
        background: 'linear-gradient(135deg, #2563eb, #60a5fa, #f59e0b)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text-primary, #333)' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '1.05rem', color: 'var(--text-muted, #666)', lineHeight: 1.6, marginBottom: '32px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {user ? (
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: '10px',
              textDecoration: 'none',
            }}
          >
            Back to Home
          </Link>
        ) : (
          <>
            <Link
              to="/Login"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              Log In
            </Link>
            <Link
              to="/register"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                background: 'transparent',
                color: 'var(--accent-blue, #2563eb)',
                fontSize: '1rem',
                fontWeight: 600,
                border: '2px solid var(--accent-blue, #2563eb)',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default NotFound;
