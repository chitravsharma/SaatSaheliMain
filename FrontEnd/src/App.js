import './App.css';

import React from "react";

import Header from './modules/Header';
import Footer from './modules/Footer';
import AdBanner from './modules/AdBanner';
import ServerWakeUp from './components/ServerWakeUp';
import ScrollToTop from './components/ScrollToTop';
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
import Advertise from './pages/Advertise';
import SponsorUs from './pages/SponsorUs';
import Articles from './pages/Articles';
import Podcasts from './pages/Podcasts';
import Magazine from './pages/Magazine';
import ProtectedRoute from './components/ProtectedRoute';
import RequireProfile from './components/RequireProfile';
import DownloadProtection from './components/DownloadProtection';
import VisitorTracker from './components/VisitorTracker';
import MaintenanceBanner from './components/MaintenanceBanner';
import Checkout from './pages/Checkout';
import SupportUs from './pages/SupportUs';
import SupportThankYou from './pages/SupportThankYou';
import Marketplace from './pages/Marketplace';
import NotFound from './pages/NotFound';
import HelpSupport from './pages/HelpSupport';
import MagazineSubmit from './pages/MagazineSubmit';
import Feedback from './pages/Feedback';
import Writers from './pages/Writers';
import Galleries from './pages/Galleries';
import Recipes from './pages/Recipes';
import RecipeEditor from './pages/RecipeEditor';
import RecipeView from './pages/RecipeView';


function BookManagerWrapper() {
  const location = useLocation();
  return <BookManager key={location.key} />;
}

function App() {
  return (
    <ServerWakeUp>
    <div className="App">
      <ScrollToTop />
      <VisitorTracker />
      <MaintenanceBanner />
      <Header />
      <main id="main-content">
        <DownloadProtection>
        <Routes>
          <Route path="/Login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/help-support" element={<HelpSupport />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/about" element={<About />} />
          <Route path="/books" element={<BookManagerWrapper />} />
          <Route path="/search" element={<SearchBooks />} />
          <Route path="/read/:bookId" element={<ReadBook />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:userId/:nameSlug" element={<PublicProfile />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="/policies" element={<SitePolicies />} />
          <Route path="/category/tech" element={<TechPage />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:articleId" element={<Articles />} />
          <Route path="/blogs" element={<Articles />} />
          <Route path="/blogs/:articleId" element={<Articles />} />
          <Route path="/poems" element={<Articles />} />
          <Route path="/poems/:articleId" element={<Articles />} />
          <Route path="/writers" element={<Writers />} />
          <Route path="/podcasts" element={<Podcasts />} />
          <Route path="/magazine" element={<Magazine />} />
          <Route path="/magazine/submit" element={<MagazineSubmit />} />
          <Route path="/galleries" element={<Galleries />} />
          <Route path="/gallery/:galleryId" element={<GalleryView />} />
          <Route path="/recipes" element={<Recipes />} />
          <Route path="/recipes/create" element={<ProtectedRoute><RequireProfile><RecipeEditor /></RequireProfile></ProtectedRoute>} />
          <Route path="/recipes/:recipeId" element={<RecipeView />} />
          <Route path="/recipes/:recipeId/edit" element={<ProtectedRoute><RequireProfile><RecipeEditor /></RequireProfile></ProtectedRoute>} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/advertise" element={<Advertise />} />
          <Route path="/sponsor-us" element={<SponsorUs />} />
          <Route path="/support" element={<SupportUs />} />
          <Route path="/support/thank-you" element={<SupportThankYou />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/manual" element={<UserManual />} />
          <Route path="/admin-manual" element={<ProtectedRoute requiredRole="ADMIN"><AdminManual /></ProtectedRoute>} />
          <Route path="/logout" element={<Logout />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </DownloadProtection>
      </main>
      <AdBanner placement="FOOTER_TOP" />
      <Footer />
    </div>
    </ServerWakeUp>
  );
}


export default App;
