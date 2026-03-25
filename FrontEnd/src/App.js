import './App.css';

import React from "react";

import Header from './modules/Header';
import Footer from './modules/Footer';
import ServerWakeUp from './components/ServerWakeUp';
import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contacts from './pages/Contacts';
import Login from './pages/Login';
import Logout from './pages/Logout';
import BookManager from './pages/BookManager';
import SearchBooks from './pages/SearchBooks';
import ReadBook from './pages/ReadBook';
import SitePolicies from './pages/SitePolicies';
import Account from './pages/Account';
import CategoryPage from './pages/CategoryPage';
import TechPage from './pages/TechPage';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import UserManual from './pages/UserManual';
import AdminManual from './pages/AdminManual';
import GalleryView from './pages/GalleryView';
import Pricing from './pages/Pricing';
import Articles from './pages/Articles';
import Podcasts from './pages/Podcasts';
import ProtectedRoute from './components/ProtectedRoute';
import DownloadProtection from './components/DownloadProtection';
import Checkout from './pages/Checkout';


function BookManagerWrapper() {
  const location = useLocation();
  return <BookManager key={location.key} />;
}

function App() {
  return (
    <ServerWakeUp>
    <div className="App">
      <Header />
      <main id="main-content">
        <DownloadProtection>
        <Routes>
          <Route path="/Login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/about" element={<About />} />
          <Route path="/books" element={<BookManagerWrapper />} />
          <Route path="/search" element={<SearchBooks />} />
          <Route path="/read/:bookId" element={<ReadBook />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="/policies" element={<SitePolicies />} />
          <Route path="/category/tech" element={<TechPage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:contentType" element={<Articles />} />
          <Route path="/podcasts" element={<Podcasts />} />
          <Route path="/gallery/:galleryId" element={<GalleryView />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/manual" element={<UserManual />} />
          <Route path="/admin-manual" element={<ProtectedRoute requiredRole="ADMIN"><AdminManual /></ProtectedRoute>} />
          <Route path="/logout" element={<Logout />} />
        </Routes>
        </DownloadProtection>
      </main>
      <Footer />
    </div>
    </ServerWakeUp>
  );
}


export default App;
