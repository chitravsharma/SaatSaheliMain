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
          <h1>Saat Saheli User Manual</h1>
          <p className="manual-subtitle">
            Everything you need to know to get the most out of Saat Saheli
          </p>
        </div>

        {/* ── Table of Contents ── */}
        <nav className="manual-toc">
          <h2>Table of Contents</h2>
          <ol>
            <li><a href="#getting-started">Getting Started</a></li>
            <li><a href="#your-profile">Your Profile</a></li>
            <li><a href="#creating-books">Creating Books</a></li>
            <li><a href="#articles-poems-blogs">Articles, Poems &amp; Blogs</a></li>
            <li><a href="#recipes">Recipes</a></li>
            <li><a href="#podcasts">Podcasts</a></li>
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
        {/* ── 4. Articles, Poems & Blogs ── */}
        <section id="articles-poems-blogs" className="manual-section">
          <h2>4. Articles, Poems &amp; Blogs</h2>
          <p>
            Alongside full-length books, you can share shorter pieces of
            writing. Articles, poems, and blogs all share the same editor and
            appear on your public profile and in community listings.
          </p>
          <ol>
            <li>
              From your <strong>Account</strong> page, open the writing
              section and choose <strong>New Article</strong>,{" "}
              <strong>New Poem</strong>, or <strong>New Blog</strong>.
            </li>
            <li>
              Enter a title, pick a category (Art, Music, Creativity,
              Community, Tech, etc.), and write your content. The editor
              supports rich formatting.
            </li>
            <li>
              Save as <strong>Draft</strong> while you work, or{" "}
              <strong>Publish</strong> when ready. Only published pieces are
              visible to others.
            </li>
            <li>
              Readers can like, favorite, comment on, and share each piece.
              Anonymous visitors can like and favorite too.
            </li>
          </ol>

          <div className="manual-tip">
            Use the category and language filters on the Writers page to help
            the right audience discover your work.
          </div>
        </section>

        {/* ── 5. Recipes ── */}
        <section id="recipes" className="manual-section">
          <h2>5. Recipes</h2>
          <p>
            Share family recipes, seasonal specialties, or original creations.
            Each recipe has a side-by-side detail view so readers can follow
            along while they cook.
          </p>
          <ol>
            <li>
              From your <strong>Account</strong> page open{" "}
              <strong>My Recipes</strong> and click{" "}
              <strong>+ New Recipe</strong>.
            </li>
            <li>
              Enter a title and select a language (Hindi, English, or
              Bilingual).
            </li>
            <li>
              Add the <strong>ingredients</strong> list and{" "}
              <strong>step-by-step instructions</strong>. Use line breaks
              between items so each one renders on its own line.
            </li>
            <li>
              Upload up to <strong>four images</strong> (the finished dish,
              key steps, plating) and add an optional caption to each image.
            </li>
            <li>
              Save as <strong>Draft</strong> to keep working, or{" "}
              <strong>Publish</strong> to make it visible to everyone. Drafts
              are marked with a yellow badge and only you can see them.
            </li>
            <li>
              Readers can like, favorite, comment, and share your recipe.
              Anonymous visitors can like and favorite (their toggle is
              remembered locally in their browser).
            </li>
          </ol>

          <div className="manual-tip">
            A clear lead photo, specific quantities, and a short personal note
            about the dish make a recipe much more inviting.
          </div>
        </section>

        {/* ── 6. Podcasts ── */}
        <section id="podcasts" className="manual-section">
          <h2>6. Podcasts</h2>
          <p>
            Podcasts on Saat Saheli are curated by the site team. Everyone can
            listen, like, favorite, comment on, and share podcasts &mdash; no
            account required to press play.
          </p>

          <h3>Listening</h3>
          <ol>
            <li>
              Open <strong>Podcasts</strong> from the navigation menu.
            </li>
            <li>
              Use the <strong>language filter</strong> (All / हिंदी / English
              / Bilingual) to narrow the list.
            </li>
            <li>
              Tap the play button on any card to start the built-in player.
              You can seek by clicking anywhere on the progress bar.
            </li>
            <li>
              Below each player: like (&hearts;), favorite (&#9733;),
              comment, and share buttons. Liking and favoriting work without
              logging in; commenting requires an account.
            </li>
          </ol>

          <h3>Uploading (admin only)</h3>
          <p>
            Only administrators can upload, edit, publish, or remove podcasts.
            If you have admin access, a <strong>My Podcasts</strong> tab
            appears with an upload form that accepts audio files and an
            optional cover image, language, and category.
          </p>

          <div className="manual-tip">
            If you have a podcast idea you would like published, reach out to
            the Saat Saheli team through the contact form.
          </div>
        </section>

        {/* ── 7. Gallery ── */}
        <section id="gallery" className="manual-section">
          <h2>7. Gallery</h2>
          <p>
            Your gallery is a personal photo collection that is displayed on
            your public profile. Each image is its own small post &mdash;
            readers can react to it directly.
          </p>
          <ol>
            <li>
              Navigate to your <strong>Account</strong> page.
            </li>
            <li>
              Find the <strong>Gallery</strong> section and click{" "}
              <strong>Upload Photo</strong>. Select one or more images (JPG,
              PNG, or similar).
            </li>
            <li>
              Add a <strong>caption</strong> to each image &mdash; captions
              are editable inline from the Gallery edit view.
            </li>
            <li>
              Uploaded photos appear on your public profile and on the
              community Gallery page.
            </li>
          </ol>

          <h3>Viewing and Sharing Single Images</h3>
          <p>
            Every photo has its own like, favorite, and share button. When
            someone shares a single image, the link opens your gallery with
            that exact photo highlighted in a lightbox (the URL ends in
            <code>?img=&lt;id&gt;</code>).
          </p>

          <div className="manual-tip">
            Use the gallery to showcase artwork, photography, or any images
            that complement your books and other writing. A short caption
            helps visitors understand the context.
          </div>
        </section>

        {/* ── 5. Reading Books ── */}
        <section id="reading-books" className="manual-section">
          <h2>8. Reading Books</h2>
          <p>
            Saat Saheli features a <strong>FlipBook reader</strong> that
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
          <h2>9. Search</h2>
          <p>
            Use the <strong>Search</strong> feature to find books across the
            entire Saat Saheli library.
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
          <h2>10. Chat</h2>
          <p>
            Saat Saheli includes <strong>chat rooms</strong> where members can
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
            connect with fellow Saat Saheli members.
          </div>
        </section>

        {/* ── 8. Categories ── */}
        <section id="categories" className="manual-section">
          <h2>11. Categories</h2>
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
          <h2>12. Your Public Profile</h2>
          <p>
            Every member has a public profile page that other users can visit.
            Your public profile displays:
          </p>
          <ul>
            <li>Your display name, bio, profile photo, and optional headline or location.</li>
            <li>Your selected interests and the content types you publish.</li>
            <li>
              Your <strong>published books</strong> &mdash; visitors can click
              any book to open it in the FlipBook reader.
            </li>
            <li>
              Your <strong>articles, poems, and blogs</strong>, grouped into
              their own rows.
            </li>
            <li>
              Your <strong>recipes</strong> &mdash; each opens in the
              side-by-side detail view.
            </li>
            <li>
              Your <strong>gallery</strong> &mdash; photos with captions,
              each individually shareable.
            </li>
          </ul>
          <p>
            To see how your profile looks to others, visit your own public
            profile link. You can share this link with anyone to showcase your
            work.
          </p>

          <div className="manual-tip">
            A complete profile with a photo, bio, interests, and a mix of
            published books, articles, recipes, and gallery photos makes the
            best impression on visitors.
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="manual-footer">
          Saat Saheli &mdash; Create, Share, Inspire
        </div>
      </div>
    </div>
  );
};

export default UserManual;
