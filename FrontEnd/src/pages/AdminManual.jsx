import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminManual.css';

const AdminManual = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-manual-page">
      <button className="admin-manual-back" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="admin-manual-hero">
        <h1>Admin Manual</h1>
        <p className="admin-manual-subtitle">
          A comprehensive guide for administrators and super-administrators of Sarayu.
        </p>
        <hr className="admin-manual-divider" />
      </div>

      {/* Table of Contents */}
      <nav className="admin-manual-toc">
        <h2>Table of Contents</h2>
        <ol>
          <li><a href="#dashboard-overview">Admin Dashboard Overview</a></li>
          <li><a href="#stats-tab">Stats Tab</a></li>
          <li><a href="#managing-users">Managing Users</a></li>
          <li><a href="#managing-books">Managing Books</a></li>
          <li><a href="#chat-room-management">Chat Room Management</a></li>
          <li><a href="#content-moderation">Content Moderation</a></li>
          <li><a href="#site-maintenance">Site Maintenance</a></li>
        </ol>
      </nav>

      {/* 1. Admin Dashboard Overview */}
      <section className="admin-manual-section" id="dashboard-overview">
        <h2>1. Admin Dashboard Overview</h2>
        <p>
          The Admin Dashboard is accessible only to users with the <strong>ADMIN</strong> or{' '}
          <strong>SUPER_ADMIN</strong> role. Once logged in, administrators will see the
          Admin Dashboard link in the navigation sidebar.
        </p>
        <p>
          The dashboard is organized into three main tabs:{' '}
          <strong>Stats</strong>, <strong>Users</strong>, and <strong>Books</strong>.
          Each tab provides tools for monitoring and managing the platform.
        </p>
        <div className="admin-manual-note">
          <strong>Note:</strong> If you do not see the Admin Dashboard option, your account
          may not have admin privileges. Contact a Super Admin to request access.
        </div>
      </section>

      {/* 2. Stats Tab */}
      <section className="admin-manual-section" id="stats-tab">
        <h2>2. Stats Tab</h2>
        <p>
          The Stats tab provides a high-level overview of platform activity. The following
          metrics are displayed:
        </p>
        <ul>
          <li><strong>Total Users</strong> &mdash; The total number of registered accounts.</li>
          <li><strong>Active Users</strong> &mdash; Users whose accounts are currently active.</li>
          <li><strong>Blocked Users</strong> &mdash; Users whose accounts have been suspended.</li>
          <li><strong>Admin Count</strong> &mdash; The number of users with ADMIN or SUPER_ADMIN roles.</li>
          <li><strong>Total Books</strong> &mdash; All books created on the platform.</li>
          <li><strong>Published Books</strong> &mdash; Books that are publicly visible.</li>
          <li><strong>Draft Books</strong> &mdash; Books still being worked on by their authors.</li>
        </ul>
        <p>
          Stats refresh automatically when you navigate to the tab. Use these numbers to
          monitor platform growth and identify trends.
        </p>
      </section>

      {/* 3. Managing Users */}
      <section className="admin-manual-section" id="managing-users">
        <h2>3. Managing Users</h2>
        <p>
          The Users tab displays a complete list of all registered users. For each user,
          you can see their username, email, role, and account status.
        </p>

        <h3>Changing User Roles</h3>
        <p>There are three roles available:</p>
        <ul>
          <li><strong>USER</strong> &mdash; Standard user. Can create and publish books, participate in chat rooms.</li>
          <li><strong>ADMIN</strong> &mdash; Can access the Admin Dashboard, manage users and books.</li>
          <li><strong>SUPER_ADMIN</strong> &mdash; Full platform control, including the ability to promote or demote other admins.</li>
        </ul>
        <p>
          To change a user's role, use the role dropdown next to their name and select the
          desired role. Only Super Admins can promote users to ADMIN or SUPER_ADMIN.
        </p>

        <h3>Blocking and Activating Users</h3>
        <p>
          If a user violates platform policies, you can block their account using the
          Block button. Blocked users cannot log in or access any platform features.
          To restore access, click the Activate button.
        </p>
        <div className="admin-manual-note">
          <strong>Important:</strong> Blocking a user does not delete their content. Their
          books and chat messages will remain on the platform unless manually removed.
        </div>
      </section>

      {/* 4. Managing Books */}
      <section className="admin-manual-section" id="managing-books">
        <h2>4. Managing Books</h2>
        <p>
          The Books tab shows all books on the platform, including both published and draft books.
          Each entry displays the book title, author, status, and creation date.
        </p>

        <h3>Deleting Books</h3>
        <p>
          Admins can delete books that violate content policies. Click the Delete button
          next to the book entry. This action is <strong>permanent</strong> and will remove
          the book and all its pages from the database.
        </p>

        <h3>Monitoring Content</h3>
        <p>
          Regularly review recently published books to ensure they comply with community
          guidelines. Pay attention to books that have been flagged or reported by users.
        </p>
      </section>

      {/* 5. Chat Room Management */}
      <section className="admin-manual-section" id="chat-room-management">
        <h2>5. Chat Room Management</h2>
        <p>
          Sarayu features six dedicated chat rooms, each centered around a creative theme:
        </p>
        <div className="admin-manual-chat-grid">
          <div className="admin-manual-chat-room">Art</div>
          <div className="admin-manual-chat-room">Music</div>
          <div className="admin-manual-chat-room">Writing</div>
          <div className="admin-manual-chat-room">Tech</div>
          <div className="admin-manual-chat-room">Creativity</div>
          <div className="admin-manual-chat-room">Community</div>
        </div>
        <p>
          Chat rooms are open to all registered users. Admins should monitor conversations
          periodically to ensure respectful and constructive dialogue. If a user is
          consistently disruptive, consider issuing a warning or blocking their account.
        </p>
      </section>

      {/* 6. Content Moderation */}
      <section className="admin-manual-section" id="content-moderation">
        <h2>6. Content Moderation</h2>
        <p>
          As an administrator, you are responsible for upholding the community standards
          of Sarayu. When reviewing user content, keep the following guidelines in mind:
        </p>
        <ul>
          <li>All content must be original or properly attributed.</li>
          <li>No hate speech, harassment, or discriminatory language.</li>
          <li>No explicit, violent, or otherwise harmful material.</li>
          <li>Content should be appropriate for a general audience.</li>
          <li>Spam, advertisements, and promotional material are not permitted.</li>
          <li>Respect user privacy &mdash; do not share personal information without consent.</li>
        </ul>
        <p>
          When you encounter a violation, take the appropriate action: remove the content,
          warn the user, or block their account depending on severity. Document your actions
          for transparency and consistency.
        </p>
      </section>

      {/* 7. Site Maintenance */}
      <section className="admin-manual-section" id="site-maintenance">
        <h2>7. Site Maintenance</h2>
        <p>
          Sarayu is deployed across three services. Understanding the architecture
          helps with troubleshooting and maintenance:
        </p>

        <h3>Backend &mdash; Render (Spring Boot)</h3>
        <p>
          The backend API runs as a Spring Boot application hosted on Render. It handles
          authentication, book management, chat, and all data operations. The backend
          listens on port 8081 in development. If the backend becomes unresponsive,
          check the Render dashboard for deployment status and logs.
        </p>

        <h3>Frontend &mdash; GitHub Pages</h3>
        <p>
          The React frontend is deployed to GitHub Pages. Changes pushed to the main
          branch are automatically built and deployed. If the frontend is not reflecting
          recent changes, verify the build succeeded in the GitHub Actions tab.
        </p>

        <h3>Database &mdash; Neon PostgreSQL</h3>
        <p>
          All application data is stored in a Neon PostgreSQL database. Neon provides
          a serverless Postgres instance with automatic scaling. Database connection
          details are managed through environment variables (<code>NEON_DB_URL</code>,{' '}
          <code>NEON_DB_USERNAME</code>, <code>NEON_DB_PASSWORD</code>). Never share
          these credentials publicly.
        </p>

        <div className="admin-manual-note">
          <strong>Reminder:</strong> When making changes to Java source files on the backend,
          always run <code>./mvnw clean spring-boot:run</code> to ensure a full recompile.
          Incremental compilation may miss newly added files.
        </div>
      </section>

      <div className="admin-manual-footer">
        Last updated: March 2026
      </div>
    </div>
  );
};

export default AdminManual;
