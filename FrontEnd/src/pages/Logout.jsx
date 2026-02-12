import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('saatSaheliUser');
    navigate('/Login');
  }, [navigate]);

  return null;
}

export default Logout;
