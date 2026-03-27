import React from "react";
import { useNavigate } from "react-router-dom";
import "./UserManual.css";

const UserManual = () => {
  const navigate = useNavigate();

  return (
    <div className="manual-page">
      <button className="manual-back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="manual-container">
        {/* ── Title ── */}
        <div className="manual-title-block">
          <h1>Sarayu User Manual</h1>
          <p className="manual-subtitle">
            Everything you need to know to get the most out of Sarayu
          </p>
        </div>

        {/* ── Table of Contents ── */}
        <nav className="manual-toc">
          <h2>Table of Contents</h2>
          <ol>
            <li><a href="#getting-started">Getting Started</a></li>
            <li><a href="#your-profile">Your Profile</a></li>
            <li><a href="#creating-books">Creating Books</a></li>
            <li><a href="#gallery">Gallery</a></li>
            <li><a href="#reading-books">Reading Books</a></li>
            <li><a href="#search">Search</a></li>
            <li><a href="#chat">Chat</a></li>
            <li><a href="#categories">Categories</a></li>
            <li><a href="#public-profile">Your Public Profile</a></li>
          </ol>
        </nav>

        {/* ── 1. Getting Started ── */}
        <section id="getting-started" className="manual-section">
          <h2>1. Getting Started</h2>

          <h3>Creating an Account</h3>
          <ol>
            <li>
              Click the <strong>Sign Up</strong> button on the home page or
              navigation bar.
            </li>
            <li>
              Enter your name, email address, and choose a password.
            </li>
            <li>
              After signing up you will be taken to your Account page where you
              can begin setting up your profile.
            </li>
          </ol>

          <h3>Logging In</h3>
          <ol>
            <li>
              Click <strong>Login</strong> in the navigation bar.
            </li>
            <li>Enter your registered email and password.</li>
            <li>
              Once logged in you will have access to your Account page, Book
              Manager, Chat, and all other member features.
            </li>
          </ol>

          <div className="manual-tip">
            Keep your login credentials safe. If you forget your password,
            contact the site administrator for assistance.
          </div>
        </section>

        {/* ── 2. Your Profile ── */}
        <section id="your-profile" className="manual-section">
          <h2>2. Your Profile</h2>

          <h3>Creating &amp; Editing Your Profile</h3>
          <p>
            Navigate to your <strong>Account</strong> page after logging in.
            Here you can set up or edit the information that appears on your
            public profile.
          </p>
          <ol>
            <li>
              Add a <strong>display name</strong> and a short bio to tell others
              about yourself.
            </li>
            <li>
              Upload a <strong>profile photo</strong> to personalize your page.
            </li>
            <li>
              Fill in any additional fields you would like to share, such as
              location or social links.
            </li>
          </ol>

          <h3>Choosing Your Interests</h3>
          <p>
            Select one or more interest categories that describe the kind of
            content you create or enjoy. These interests are displayed on your
            public profile and help other members discover you.
          </p>
          <ul className="manual-interests">
            <li>My Page</li>
            <li>Book</li>
            <li>Gallery</li>
            <li>Poems</li>
            <li>Blog</li>
            <li>Article</li>
            <li>Recipes</li>
            <li>DIY</li>
            <li>Other</li>
          </ul>

          <div className="manual-tip">
            You can update your profile and interests at any time from the
            Account page.
          </div>
        </section>

        {/* ── 3. Creating Books ── */}
        <section id="creating-books" className="manual-section">
          <h2>3. Creating Books</h2>
          <p>
            The <strong>Book Manager</strong> is your creative workspace. Here
            you can compose, design, and publish your own books.
          </p>

          <h3>Creating a New Book</h3>
          <ol>
            <li>
              Go to <strong>Book Manager</strong> from the navigation menu.
            </li>
            <li>
              Click <strong>Create New Book</strong>. Give your book a title,
              choose a category, and optionally add a description.
            </li>
            <li>
              Your new book will appear in your book list, ready for editing.
            </li>
          </ol>

          <h3>Adding &amp; Editing Pages</h3>
          <ol>
            <li>
              Open a book from your list and click <strong>Add Page</strong>.
            </li>
            <li>
              Each page supports <strong>text and images</strong>. Type or paste
              your content into the text area.
            </li>
            <li>
              Use the <strong>text formatting</strong> toolbar to apply bold,
              italic, headings, lists, and other formatting to your text.
            </li>
            <li>
              Use the <strong>Page Layout Editor</strong> to arrange text and
              image blocks on each page exactly how you want them.
            </li>
          </ol>

          <h3>Adding Images</h3>
          <ul>
            <li>
              <strong>Upload an image</strong> &mdash; select an image file from
              your device.
            </li>
            <li>
              <strong>AI Image Generation</strong> &mdash; describe the image
              you want and the built-in AI will generate one for you. This is
              great for illustrations, cover art, or decorative elements.
            </li>
          </ul>

          <h3>Upload from Document</h3>
          <p>
            You can upload content from an existing document to quickly populate
            your book pages, saving you from retyping long texts.
          </p>

          <div className="manual-tip">
            Save your work frequently. You can revisit and edit any book or page
            at any time from the Book Manager.
          </div>
        </section>

        {/* ── 4. Gallery ── */}
        <section id="gallery" className="manual-section">
          <h2>4. Gallery</h2>
          <p>
            Your gallery is a personal photo collection that is displayed on
            your public profile.
          </p>
          <ol>
            <li>
              Navigate to your <strong>Account</strong> page.
            </li>
            <li>
              Find the <strong>Gallery</strong> section and click{" "}
              <strong>Upload Photo</strong>.
            </li>
            <li>
              Select one or more images from your device. Supported formats
              include JPG, PNG, and similar image types.
            </li>
            <li>
              Your uploaded photos will appear in your gallery and will be
              visible to anyone who visits your public profile.
            </li>
          </ol>

          <div className="manual-tip">
            Use the gallery to showcase artwork, photography, or any images
            that complement your books and interests.
          </div>
        </section>

        {/* ── 5. Reading Books ── */}
        <section id="reading-books" className="manual-section">
          <h2>5. Reading Books</h2>
          <p>
            Sarayu features a <strong>FlipBook reader</strong> that
            presents books in a realistic page-turning format.
          </p>

          <h3>Opening a Book</h3>
          <p>
            Click on any book cover or title from the home page, search
            results, a category page, or a user's public profile to open it in
            the FlipBook reader.
          </p>

          <h3>Reader Controls</h3>
          <ul>
            <li>
              <strong>Navigation</strong> &mdash; use the left and right arrows
              or click the page edges to turn pages forward and backward.
            </li>
            <li>
              <strong>Zoom</strong> &mdash; use the zoom controls to enlarge
              text and images for a closer look.
            </li>
            <li>
              <strong>Fullscreen</strong> &mdash; click the fullscreen button to
              expand the reader to fill your entire screen for an immersive
              reading experience.
            </li>
          </ul>
        </section>

        {/* ── 6. Search ── */}
        <section id="search" className="manual-section">
          <h2>6. Search</h2>
          <p>
            Use the <strong>Search</strong> feature to find books across the
            entire Sarayu library.
          </p>

          <h3>Search Criteria</h3>
          <ul>
            <li>
              <strong>Title</strong> &mdash; search by the book's title or part
              of it.
            </li>
            <li>
              <strong>Author</strong> &mdash; search by the author's name.
            </li>
            <li>
              <strong>Book ID</strong> &mdash; if you know a specific book's ID
              you can look it up directly.
            </li>
            <li>
              <strong>Status</strong> &mdash; filter books by their publication
              status (e.g., published, draft).
            </li>
            <li>
              <strong>Category</strong> &mdash; narrow results to a specific
              category such as Art, Writing, or Recipes.
            </li>
          </ul>

          <div className="manual-tip">
            Combine multiple search criteria for more precise results. For
            example, search by both author and category at the same time.
          </div>
        </section>

        {/* ── 7. Chat ── */}
        <section id="chat" className="manual-section">
          <h2>7. Chat</h2>
          <p>
            Sarayu includes <strong>chat rooms</strong> where members can
            communicate in real time.
          </p>
          <ol>
            <li>
              Navigate to the <strong>Chat</strong> page from the navigation
              menu.
            </li>
            <li>
              Browse the available chat rooms and select one to join.
            </li>
            <li>
              Type your message in the input field at the bottom and press{" "}
              <strong>Send</strong> or hit Enter.
            </li>
            <li>
              Messages from other participants appear in the chat window in
              real time.
            </li>
          </ol>

          <div className="manual-tip">
            Chat rooms are a great way to discuss books, share ideas, and
            connect with fellow Sarayu members.
          </div>
        </section>

        {/* ── 8. Categories ── */}
        <section id="categories" className="manual-section">
          <h2>8. Categories</h2>
          <p>
            Browse content organized into themed categories. Each category page
            showcases books and creators related to that topic.
          </p>
          <ul>
            <li>
              <strong>Art</strong> &mdash; visual art, illustrations, and design.
            </li>
            <li>
              <strong>Music</strong> &mdash; music-related content, lyrics, and
              compositions.
            </li>
            <li>
              <strong>Writing</strong> &mdash; stories, poems, articles, and
              essays.
            </li>
            <li>
              <strong>Tech</strong> &mdash; technology tutorials, guides, and
              explorations.
            </li>
            <li>
              <strong>Creativity</strong> &mdash; DIY projects, recipes, crafts,
              and creative endeavors.
            </li>
            <li>
              <strong>Community</strong> &mdash; community updates,
              announcements, and collaborative projects.
            </li>
          </ul>
          <p>
            Access categories from the navigation menu or the home page to
            discover new books and authors.
          </p>
        </section>

        {/* ── 9. Public Profile ── */}
        <section id="public-profile" className="manual-section">
          <h2>9. Your Public Profile</h2>
          <p>
            Every member has a public profile page that other users can visit.
            Your public profile displays:
          </p>
          <ul>
            <li>Your display name, bio, and profile photo.</li>
            <li>Your selected interests.</li>
            <li>
              Your <strong>published books</strong> &mdash; visitors can click
              any book to open it in the FlipBook reader.
            </li>
            <li>
              Your <strong>gallery</strong> &mdash; all photos you have uploaded.
            </li>
          </ul>
          <p>
            To see how your profile looks to others, visit your own public
            profile link. You can share this link with anyone to showcase your
            work.
          </p>

          <div className="manual-tip">
            A complete profile with a photo, bio, interests, and published
            books makes the best impression on visitors.
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="manual-footer">
          Sarayu &mdash; Create, Share, Inspire
        </div>
      </div>
    </div>
  );
};

export default UserManual;
