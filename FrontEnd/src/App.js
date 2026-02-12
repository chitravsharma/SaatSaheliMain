import './App.css';

import React from "react";

import Header from './modules/Header';
import Footer from './modules/Footer';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Contacts from './pages/Contacts';
import Login from './pages/Login';
import Logout from './pages/Logout';
import BookManager from './pages/BookManager';
import SearchBooks from './pages/SearchBooks';
import ReadBook from './pages/ReadBook';
import SitePolicies from './pages/SitePolicies';


function App() {
  return (
    <div className="App">
      <Header />
      <main id="main-content">
        <Routes>
          <Route path="/Login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/about" element={<About />} />
          <Route path="/books" element={<BookManager />} />
          <Route path="/search" element={<SearchBooks />} />
          <Route path="/read/:bookId" element={<ReadBook />} />
          <Route path="/policies" element={<SitePolicies />} />
          <Route path="/logout" element={<Logout />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}


export default App;
