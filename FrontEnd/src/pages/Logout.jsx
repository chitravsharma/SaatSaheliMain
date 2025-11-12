import React from 'react';
import { googleLogout } from '@react-oauth/google';

function Logout({ setUser, setPage }) {
  const handleLogout = () => {
    googleLogout();         // Log out from Google OAuth
    setUser(null);          // Clear logged-in user state
    setPage('welcome');     // Navigate back to welcome screen
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}

export default Logout;