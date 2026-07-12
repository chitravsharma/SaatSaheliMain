import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LanguageProvider } from './LanguageContext';
import { LoginGateProvider } from './contexts/LoginGateContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
   <BrowserRouter>
    <LanguageProvider>
      <AuthProvider>
        <LoginGateProvider>
          <CartProvider>
            <FavoritesProvider>
              <App />
            </FavoritesProvider>
          </CartProvider>
        </LoginGateProvider>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register the PWA service worker (FrontEnd/public/service-worker.js).
// Production only — in dev the SW caches the stable-named dev bundle cache-first
// and serves stale code across full reloads (breaks new routes after redirects).
// Must be on HTTPS or localhost. Keep registration after React mounts so it
// doesn't compete with the initial paint.
if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register(`${process.env.PUBLIC_URL || ""}/service-worker.js`)
            .catch(() => { /* SW registration failed — site still works without offline */ });
    });
}
