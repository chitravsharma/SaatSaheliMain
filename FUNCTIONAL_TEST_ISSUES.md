# SaatSaheli Functional Test Report

**Date:** April 3, 2026
**Tested by:** Code audit (static analysis of frontend + backend)
**Total Issues Found:** 33

---

## CRITICAL — Fix Before Public Launch

### ISSUE-01: Contact Form is Non-Functional
- **Severity:** CRITICAL
- **Area:** Forms
- **File:** `FrontEnd/src/pages/Contacts.jsx`
- **Description:** The contact form component simply redirects to an external Google Form via `window.location.href`. There is no in-app contact form, no backend `/api/contact` endpoint, no form validation, no database storage of submissions, and no success/error feedback.
- **Expected:** A proper in-app contact form with fields (name, email, message), backend endpoint to receive and store submissions, email notification to admin, and success/error feedback to user.
- **Steps to Reproduce:** Navigate to the Contact page — user is immediately redirected away from the site.

---

### ISSUE-02: Forgot Password — Temp Password Exposed in Browser
- **Severity:** CRITICAL
- **Area:** Forms / Security
- **Files:** `FrontEnd/src/pages/Login.jsx` (lines 153-156, 356), `SaatSaheli/src/main/java/com/SaatSaheli/spring/controller/AuthController.java` (line 320-322)
- **Description:** The password reset flow displays the temporary password in plain text in the browser UI. The backend has a `TODO: Send tempPassword via email` comment — email delivery is not implemented. The temporary password is returned in the API response and shown in a code block on the frontend.
- **Expected:** Temporary password should NEVER be returned in the API response. It should only be delivered via email (SendGrid, SES, etc.). Frontend should show "Check your email for reset instructions."
- **Steps to Reproduce:** Click "Forgot Password", enter an email, submit — temp password is displayed on screen.

---

### ISSUE-03: Broken Link — Sidebar `/contact` Route Does Not Exist
- **Severity:** CRITICAL
- **Area:** Links
- **File:** `FrontEnd/src/modules/Sidebar.jsx` (line 18)
- **Description:** The sidebar links to `/contact` but the actual route defined in `App.js` is `/contacts`. Clicking this link leads to a blank page (no 404 handler either).
- **Expected:** Link should point to `/contacts`.
- **Steps to Reproduce:** Open the sidebar, click "Contact" — page is blank.

---

### ISSUE-04: No 404 Page — Invalid URLs Show Blank Page
- **Severity:** CRITICAL
- **Area:** Navigation
- **File:** `FrontEnd/src/App.js` (routes section, lines 54-82)
- **Description:** There is no catch-all route (`<Route path="*">`) defined in the router. Navigating to any undefined URL shows a completely blank page with no feedback.
- **Expected:** A friendly 404 "Page Not Found" component with navigation back to home.
- **Steps to Reproduce:** Navigate to any invalid URL like `/doesnotexist`.

---

### ISSUE-05: Stripe Payment Price IDs Are Placeholders
- **Severity:** CRITICAL
- **Area:** Payments
- **File:** `SaatSaheli/src/main/java/com/SaatSaheli/spring/controller/PaymentController.java` (lines 45-49)
- **Description:** The `PLAN_PRICE_IDS` map uses placeholder values like `price_premium_placeholder`, `price_gold_placeholder`, `price_creator_placeholder`. Any attempt to check out with a paid plan will fail.
- **Expected:** Replace placeholder IDs with real Stripe price IDs from the Stripe Dashboard.
- **Steps to Reproduce:** Try to upgrade to any paid plan — Stripe checkout will fail.

---

## FORMS — Validation & UX Issues

### ISSUE-06: Signup — Weak Password Requirements
- **Severity:** MEDIUM
- **Area:** Forms / Security
- **File:** `FrontEnd/src/pages/Login.jsx` (lines 117-120)
- **Description:** Signup only requires a 6-character minimum password. No requirements for uppercase letters, numbers, or special characters. This allows very weak passwords like `aaaaaa`.
- **Expected:** Require at least one uppercase letter, one number, and one special character, with a minimum of 8 characters.

---

### ISSUE-07: Marketplace — Save Button Not Disabled During Submit
- **Severity:** MEDIUM
- **Area:** Forms
- **File:** `FrontEnd/src/pages/Marketplace.jsx` (line 84)
- **Description:** The marketplace listing save/create button does not have a `disabled` state during form submission. Users can click multiple times and create duplicate listings.
- **Expected:** Button should be `disabled={saving || uploading}` during API call, with loading text.

---

### ISSUE-08: Marketplace — Price Field Accepts Non-Numeric Input
- **Severity:** MEDIUM
- **Area:** Forms
- **File:** `FrontEnd/src/pages/Marketplace.jsx` (lines 29, 86)
- **Description:** The price field is stored as a string with no numeric validation. Users can enter text like "free" or "$$" as a price value.
- **Expected:** Validate that price is a positive number before submission. Use `type="number"` with `min="0"` on the input.

---

### ISSUE-09: Image Uploads — No File Size Validation
- **Severity:** MEDIUM
- **Area:** Forms
- **Files:** `FrontEnd/src/pages/Account.jsx`, `FrontEnd/src/pages/Profile.jsx`
- **Description:** Gallery image uploads and profile image uploads have no client-side file size validation. Users could upload very large files causing slow uploads or failures.
- **Expected:** Validate file size (e.g., max 5MB) before upload and show a clear error message.

---

### ISSUE-10: Articles — Can Publish Empty Content
- **Severity:** MEDIUM
- **Area:** Forms
- **File:** `FrontEnd/src/pages/Articles.jsx` (line 152)
- **Description:** Articles only require a headline to be published. The content body can be completely empty, allowing users to publish blank articles.
- **Expected:** Require a minimum content length (e.g., 50 characters) before allowing publish.

---

## LINKS & NAVIGATION — Issues

### ISSUE-11: Sidebar Uses `<a>` Tags Instead of React Router `<Link>`
- **Severity:** HIGH
- **Area:** Navigation
- **File:** `FrontEnd/src/modules/Sidebar.jsx` (lines 16-18)
- **Description:** The sidebar uses native `<a href="/">`, `<a href="/about">`, `<a href="/contact">` instead of React Router's `<Link>` component. This causes full page reloads on every click instead of SPA client-side navigation.
- **Expected:** Replace all internal `<a>` tags with `<Link to="...">` from `react-router-dom`.

---

### ISSUE-12: Login Page — Internal Links Open in New Tab
- **Severity:** HIGH
- **Area:** Links
- **File:** `FrontEnd/src/pages/Login.jsx` (lines 467, 505)
- **Description:** Links to `/pricing` and `/policies` use `<a href="/pricing" target="_blank" rel="noopener noreferrer">`. Internal routes should not open in new tabs — this is unexpected UX for a single-page app.
- **Expected:** Use `<Link to="/pricing">` without `target="_blank"`.

---

### ISSUE-13: TermsGate — Internal Link Opens in New Tab
- **Severity:** HIGH
- **Area:** Links
- **File:** `FrontEnd/src/components/TermsGate.jsx` (line 55)
- **Description:** `<Link to="/policies" target="_blank" rel="noopener noreferrer">` opens the policies page in a new tab unnecessarily.
- **Expected:** Remove `target="_blank"` — internal routes should navigate within the app.

---

### ISSUE-14: BookManager — Uses `<a>` Tags for Internal Routes
- **Severity:** MEDIUM
- **Area:** Links
- **File:** `FrontEnd/src/pages/BookManager.jsx` (lines 1023, 1096)
- **Description:** Uses `<a href="/pricing">` instead of React Router `<Link>` component. Causes full page reload.
- **Expected:** Replace with `<Link to="/pricing">`.

---

### ISSUE-15: Dead Code — Duplicate Login Component
- **Severity:** LOW
- **Area:** Code Quality
- **File:** `FrontEnd/src/LoginPage.js`
- **Description:** An old `LoginPage.js` component exists alongside the active `pages/Login.jsx`. The old file is unused but creates confusion and maintenance risk.
- **Expected:** Delete `LoginPage.js` after confirming it is not imported anywhere.

---

## BUTTONS & INTERACTIONS — Issues

### ISSUE-16: Silent Error Swallowing on Social Actions
- **Severity:** HIGH
- **Area:** Buttons / Error Handling
- **Files:**
  - `FrontEnd/src/pages/Home.jsx` (lines 38, 104, 127, 143)
  - `FrontEnd/src/pages/ReadBook.jsx` (line 32)
  - `FrontEnd/src/pages/Articles.jsx` (lines 261, 283, 302, 315)
  - `FrontEnd/src/pages/GalleryView.jsx` (lines 33, 60, 77, 91, 104, 111)
  - `FrontEnd/src/pages/Chat.jsx` (lines 37, 61, 96, 106)
  - `FrontEnd/src/pages/Account.jsx` (lines 54, 93, 107)
- **Description:** Like, favorite, comment, and fetch operations have empty `.catch(() => {})` blocks. When API calls fail, the user receives no feedback at all — the UI just silently does nothing.
- **Expected:** Show a toast/snackbar message on failure (e.g., "Failed to like. Please try again.").

---

### ISSUE-17: Like/Favorite Buttons — No Double-Click Protection
- **Severity:** MEDIUM
- **Area:** Buttons
- **Files:** `FrontEnd/src/pages/Articles.jsx`, `FrontEnd/src/pages/ReadBook.jsx`, `FrontEnd/src/pages/Home.jsx`
- **Description:** Like and favorite buttons have no `disabled` attribute during the API call. Users can rapidly click and send multiple duplicate requests to the server.
- **Expected:** Disable button during API call or debounce clicks.

---

### ISSUE-18: Optimistic UI — No Rollback on API Failure
- **Severity:** MEDIUM
- **Area:** Buttons
- **File:** `FrontEnd/src/pages/Home.jsx` (lines 295-303)
- **Description:** Like/favorite buttons update the UI state immediately (optimistic update) but if the API call fails (silent catch), the UI shows the wrong state permanently.
- **Expected:** Roll back the UI state in the `.catch()` block if the API call fails.

---

### ISSUE-19: Comment Form — Silent Redirect to Login
- **Severity:** MEDIUM
- **Area:** Buttons / UX
- **Files:** `FrontEnd/src/pages/Articles.jsx`, `FrontEnd/src/pages/ReadBook.jsx`, `FrontEnd/src/pages/GalleryView.jsx`
- **Description:** When a non-logged-in user tries to comment, they are silently redirected to `/Login` with no explanation. The user doesn't know why they were redirected.
- **Expected:** Show a message like "Please log in to comment" before or instead of redirecting.

---

### ISSUE-20: Gallery Lightbox — Buttons Missing Accessibility Labels
- **Severity:** MEDIUM
- **Area:** Accessibility
- **File:** `FrontEnd/src/pages/GalleryView.jsx` (lines 219-224)
- **Description:** Lightbox close (`&times;`), previous (`&lsaquo;`), and next (`&rsaquo;`) buttons are icon-only with no `aria-label`. Screen readers cannot announce their purpose.
- **Expected:** Add `aria-label="Close"`, `aria-label="Previous image"`, `aria-label="Next image"`.

---

### ISSUE-21: ImageEditor — Shape Buttons Missing Accessibility Labels
- **Severity:** MEDIUM
- **Area:** Accessibility
- **File:** `FrontEnd/src/components/ImageEditor.jsx`
- **Description:** Shape selection buttons (circle, square, triangle, etc.) display only Unicode symbols with no `aria-label` attribute.
- **Expected:** Add descriptive `aria-label` to each shape button.

---

### ISSUE-22: Clickable Divs Missing Role and Keyboard Support
- **Severity:** MEDIUM
- **Area:** Accessibility
- **Files:**
  - `FrontEnd/src/pages/CategoryPage.jsx` (line 155)
  - `FrontEnd/src/pages/Marketplace.jsx` (line 219)
  - `FrontEnd/src/pages/AdminDashboard.jsx` (line 445)
  - `FrontEnd/src/pages/GalleryView.jsx` (line 167)
- **Description:** These `<div>` elements have `onClick` handlers but no `role="button"`, `tabIndex="0"`, or `onKeyDown` handler. They are not keyboard accessible and not announced as interactive by screen readers.
- **Expected:** Either convert to `<button>` elements or add `role="button"`, `tabIndex="0"`, and keyboard event handlers.

---

### ISSUE-23: Modals Missing Escape Key Handler
- **Severity:** MEDIUM
- **Area:** Buttons / UX
- **Files:** `FrontEnd/src/components/TermsGate.jsx`, `FrontEnd/src/components/ImageEditor.jsx`
- **Description:** These modal dialogs cannot be dismissed by pressing the Escape key, which is standard expected behavior for modals.
- **Expected:** Add `useEffect` with `keydown` listener for Escape key to close/cancel the modal.

---

### ISSUE-24: Empty Gallery Shows No Message
- **Severity:** LOW
- **Area:** UX
- **File:** `FrontEnd/src/pages/GalleryView.jsx`
- **Description:** When a gallery has no images, the page renders an empty grid with no helpful message.
- **Expected:** Show "No photos in this gallery yet" or similar empty state message.

---

## RESPONSIVE DESIGN / DEVICES / BROWSERS — Issues

### ISSUE-25: Eight CSS Files Missing Tablet Breakpoints (600-768px)
- **Severity:** HIGH
- **Area:** Responsive
- **Files:**
  - `FrontEnd/src/pages/Chat.css` (only breaks at 700px)
  - `FrontEnd/src/pages/Checkout.css` (only breaks at 768px, no intermediate)
  - `FrontEnd/src/pages/Marketplace.css` (only breaks at 600px)
  - `FrontEnd/src/pages/GalleryView.css` (only breaks at 600px)
  - `FrontEnd/src/pages/About.css` (only breaks at 600px)
  - `FrontEnd/src/pages/CategoryPage.css` (only breaks at 600px)
  - `FrontEnd/src/BookManager.css` (missing intermediate breakpoints)
  - `FrontEnd/src/pages/MagazineEditor.css` (no mobile breakpoints)
- **Description:** These pages jump directly from desktop layout to phone layout with no tablet-optimized view. Content may appear cramped or broken on iPad/tablet devices (768px-1024px).
- **Expected:** Add `@media (max-width: 768px)` breakpoints for tablet-friendly layouts.

---

### ISSUE-26: Sidebar Fixed at 250px With No Responsive Adjustment
- **Severity:** HIGH
- **Area:** Responsive
- **File:** `FrontEnd/src/modules/sidebar.css` (lines 3-5)
- **Description:** The sidebar has a hardcoded `width: 250px` with `position: fixed` and no media query to adjust for small screens. On mobile devices, the sidebar can take up most of the viewport width.
- **Expected:** Add media query to reduce sidebar width on mobile or use full-width overlay pattern.

---

### ISSUE-27: MagazineEditor 4-Column Grid — No Mobile Breakpoint
- **Severity:** HIGH
- **Area:** Responsive
- **File:** `FrontEnd/src/pages/MagazineEditor.css` (line 153)
- **Description:** Uses `grid-template-columns: repeat(4, 1fr)` at all viewport sizes. On phones, 4 columns will be extremely narrow and unusable.
- **Expected:** Break to 2 columns on tablets and 1 column on phones.

---

### ISSUE-28: Flipbook Buttons Below 44px Touch Target Minimum
- **Severity:** HIGH
- **Area:** Responsive / Accessibility
- **File:** `FrontEnd/src/App.css` (lines 151, 192)
- **Description:** Flipbook navigation arrows are `40x36px` and zoom buttons are `36x36px`. Apple and WCAG guidelines recommend minimum 44x44px touch targets for mobile.
- **Expected:** Increase to at least `min-width: 44px; min-height: 44px`.

---

### ISSUE-29: MagazineEditor — Font Sizes Too Small (9-10px)
- **Severity:** MEDIUM
- **Area:** Responsive
- **File:** `FrontEnd/src/pages/MagazineEditor.css` (lines 363, 393, 433)
- **Description:** Multiple elements use `font-size: 9px` and `font-size: 10px`. WCAG recommends minimum 12px on mobile for readability.
- **Expected:** Increase minimum font size to 12px.

---

### ISSUE-30: Pricing Page — 4-Column Grid Overflows Tablets
- **Severity:** MEDIUM
- **Area:** Responsive
- **File:** `FrontEnd/src/pages/Pricing.css` (line 32)
- **Description:** Uses `grid-template-columns: repeat(4, 1fr)` and only breaks to 2 columns at 1024px. Between 768px-1024px, 4 pricing cards are extremely cramped.
- **Expected:** Break to 2 columns at 900px or use `auto-fill` with `minmax()`.

---

### ISSUE-31: AdminDashboard Form — Fixed 400px Width Overflows Mobile
- **Severity:** MEDIUM
- **Area:** Responsive
- **File:** `FrontEnd/src/pages/AdminDashboard.css` (line 196)
- **Description:** The admin reset card has `width: 400px` which overflows on screens narrower than 400px. Note: it does have `max-width: 90vw` as a fallback, but the fixed width still causes issues.
- **Expected:** Use `width: 100%; max-width: 400px` instead.

---

### ISSUE-32: Inconsistent CSS Breakpoints Across Files
- **Severity:** MEDIUM
- **Area:** Responsive
- **Files:** Multiple (30+ CSS files)
- **Description:** Breakpoints are inconsistent across the codebase: 600px, 700px, 768px, 860px, 1024px. This makes responsive behavior unpredictable across pages.
- **Expected:** Standardize to consistent breakpoints (e.g., 480px, 768px, 1024px, 1280px).

---

### ISSUE-33: Chat Sidebar Fixed 280px — Too Wide on Small Screens
- **Severity:** MEDIUM
- **Area:** Responsive
- **File:** `FrontEnd/src/pages/Chat.css` (line 40)
- **Description:** Chat sidebar has `width: 280px; min-width: 240px`. At 600px viewport, the sidebar takes ~46% of the screen, leaving very little room for the chat messages.
- **Expected:** Add media query to collapse sidebar into a toggle/overlay on screens below 768px.

---

## Summary

| Priority | Count | Categories |
|----------|-------|------------|
| **CRITICAL** | 5 | Contact form, password reset, broken link, no 404, Stripe placeholders |
| **HIGH** | 8 | Silent errors, missing `<Link>`, new-tab links, tablet breakpoints, sidebar, touch targets |
| **MEDIUM** | 17 | Validation gaps, accessibility, double-click, font sizes, grid layouts |
| **LOW** | 3 | Dead code, empty states |
| **TOTAL** | **33** | |

---

*Generated from code-level static analysis. Manual browser testing recommended to catch runtime-only issues.*
