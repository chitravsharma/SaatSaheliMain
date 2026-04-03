# SaatSaheli — Comprehensive Testing Document

**Date:** April 3, 2026
**Version:** Post-fix (all 33 functional issues addressed)
**Test URL (Local):** http://localhost:3000/SaatSaheliMain/
**Backend:** http://localhost:8081
**Contact Email:** avikaventures.info@gmail.com

---

## How to Use This Document

- **Status Column:** Mark each test as PASS / FAIL / SKIP
- **Tester:** Name of person who ran the test
- **Notes:** Any observations, screenshots, or issues found
- Test as both **logged-out user** and **logged-in user** where applicable
- Test on **desktop (Chrome)** first, then cross-browser and mobile

---

## SECTION 1: CRITICAL ISSUES (Fixed)

### 1.1 Contact Form (ISSUE-01)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1.1 | Contact page loads | Navigate to `/contacts` | In-app contact form with Name, Email, Subject, Message fields | | |
| 1.1.2 | No Google Form redirect | Navigate to `/contacts` | Page stays on site, no redirect to docs.google.com | | |
| 1.1.3 | Submit with all fields | Fill Name, Email, Subject, Message and submit | Success message: "Thank you for reaching out!" | | |
| 1.1.4 | Submit without required fields | Leave Name blank, submit | Error message: "Please fill in all required fields." | | |
| 1.1.5 | Submit with invalid email | Enter "notanemail" in email field | Browser validation or error message | | |
| 1.1.6 | Email notification received | Submit a valid form | Admin receives email at avikaventures.info@gmail.com with form details | | |
| 1.1.7 | Footer "Contact Us" link | Click "Contact Us" in footer | Navigates to `/contacts` (no Google Form) | | |
| 1.1.8 | Footer "Feedback" link | Click "Feedback" in footer | Navigates to `/contacts` (no Google Form) | | |
| 1.1.9 | Direct email link visible | Check bottom of contact page | Shows "Or email us directly at avikaventures.info@gmail.com" | | |
| 1.1.10 | Button disabled during submit | Click Send while request is in flight | Button shows "Sending..." and is disabled | | |

### 1.2 Forgot Password (ISSUE-02)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.2.1 | Access forgot password | Go to `/Login`, click "Forgot Password?" | Shows email input form with message "Enter your email..." | | |
| 1.2.2 | Submit with registered email | Enter a registered email, click "Send Reset Link" | Shows "If an account with that email exists, you will receive password reset instructions via email." | | |
| 1.2.3 | No temp password on screen | After submitting forgot password | NO temporary password visible in the browser at any point | | |
| 1.2.4 | Password reset email received | Check inbox of submitted email | Email arrives with temporary password in styled HTML | | |
| 1.2.5 | Temp password works for login | Use the emailed temp password to log in | Successful login with temp password | | |
| 1.2.6 | Submit with non-existent email | Enter fake@email.com | Same success message (doesn't reveal if account exists) | | |
| 1.2.7 | Back to Login button | Click "Back to Login" on forgot page | Returns to login form | | |
| 1.2.8 | Rate limiting | Submit forgot password rapidly (5+ times) | Returns "Too many password reset attempts" after threshold | | |

### 1.3 Sidebar Navigation (ISSUE-03)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.3.1 | Contact link works | Open sidebar, click "Contact" | Navigates to `/contacts` (not blank page) | | |
| 1.3.2 | Home link works | Open sidebar, click "Home" | Navigates to homepage | | |
| 1.3.3 | About link works | Open sidebar, click "About" | Navigates to about page | | |
| 1.3.4 | No full page reload | Click any sidebar link | Page transitions without full reload (SPA navigation) | | |
| 1.3.5 | Sidebar closes on nav | Click any sidebar link | Sidebar closes after navigation | | |

### 1.4 404 Page (ISSUE-04)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.4.1 | 404 for invalid hash URL | Navigate to `/#/doesnotexist` | Shows 404 page with "Page Not Found" | | |
| 1.4.2 | 404 for invalid direct URL | Navigate to `/SaatSaheliMain/doesnotexist` | Redirects to hash URL and shows 404 | | |
| 1.4.3 | Login/Signup buttons (logged out) | View 404 page while not logged in | Shows "Log In" and "Sign Up" buttons (NO "Back to Home") | | |
| 1.4.4 | Home button (logged in) | View 404 page while logged in | Shows "Back to Home" button | | |
| 1.4.5 | Navigation works from 404 | Click any button on 404 page | Navigates to correct destination | | |

### 1.5 Pricing & Plan Upgrade (ISSUE-05)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.5.1 | Pricing page loads | Navigate to `/pricing` | Shows 4 plan cards (Free, Premium, Gold, Creator) | | |
| 1.5.2 | Contact Us to Upgrade button | Click paid plan button (logged in) | Shows "Contact Us to Upgrade" banner with email | | |
| 1.5.3 | Banner scrolls into view | Click paid plan while scrolled down | Page smoothly scrolls to show the contact banner | | |
| 1.5.4 | Banner close button | Click X on the contact banner | Banner dismisses | | |
| 1.5.5 | Contact link in banner | Click "Contact page" link in banner | Navigates to `/contacts` | | |
| 1.5.6 | Email link in banner | Click email address in banner | Opens mailto: link | | |
| 1.5.7 | Redirect to login (not logged in) | Click paid plan button while not logged in | Redirects to login page | | |
| 1.5.8 | Checkout page shows contact info | Navigate to `/checkout?plan=Premium` | Shows "Contact Us to Upgrade" with email and contact page links | | |
| 1.5.9 | Signup plan note | During signup, select a paid plan | Shows note: "Paid plans require manual activation" | | |
| 1.5.10 | Current plan indicator | View pricing page while logged in | Current plan shows "Current Plan" (disabled button) | | |

---

## SECTION 2: FORMS TESTING

### 2.1 Signup Form

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1.1 | Required fields validation | Submit with empty fields | Error: "First name, email, and password are required" | | |
| 2.1.2 | Email format validation | Enter "bademail" | Error about invalid email format | | |
| 2.1.3 | Password — too short | Enter "Ab1!" (4 chars) | Error: "Password must be at least 8 characters long." | | |
| 2.1.4 | Password — no uppercase | Enter "abcdefg1!" | Error: "must contain at least one uppercase letter" | | |
| 2.1.5 | Password — no number | Enter "Abcdefgh!" | Error: "must contain at least one number" | | |
| 2.1.6 | Password — no special char | Enter "Abcdefg1" | Error: "must contain at least one special character" | | |
| 2.1.7 | Password — valid | Enter "MyPass1!" | No password error, proceeds | | |
| 2.1.8 | Password mismatch | Enter different confirm password | Error: passwords don't match | | |
| 2.1.9 | Terms not accepted | Fill all fields, don't check terms | Error: must accept terms | | |
| 2.1.10 | Phone validation | Enter "123" (too short) | Error: at least 10 digits | | |
| 2.1.11 | Duplicate email | Sign up with existing email | Error: "Account with this email already exists" | | |
| 2.1.12 | Successful signup | Fill valid data, submit | Account created, redirected to home | | |
| 2.1.13 | Google signup | Click "Sign up with Google" | Google OAuth flow works | | |
| 2.1.14 | Terms link | Click "Terms and Conditions" link | Navigates to `/policies` (same tab, no new tab) | | |
| 2.1.15 | Pricing link | Click "View plan details" link | Navigates to `/pricing` (same tab) | | |

### 2.2 Login Form

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.2.1 | Empty fields | Submit with blank email/password | Error: "Email and password are required" | | |
| 2.2.2 | Wrong password | Enter valid email, wrong password | Error: "Invalid email or password" | | |
| 2.2.3 | Non-existent account | Enter unregistered email | Error: "Invalid email or password" | | |
| 2.2.4 | Successful login | Enter valid credentials | Redirected to home, user menu visible | | |
| 2.2.5 | Google login | Click "Sign in with Google" | Google OAuth flow works | | |
| 2.2.6 | Loading state | Click login while request is in flight | Button shows "Logging in..." and is disabled | | |
| 2.2.7 | Rate limiting | Attempt login rapidly 10+ times | "Too many login attempts" message | | |

### 2.3 Contact Form (see also 1.1)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.3.1 | Subject is optional | Submit without subject field | Form submits successfully | | |
| 2.3.2 | Long message | Enter 1000+ character message | Submits successfully, textarea scrolls | | |
| 2.3.3 | Form resets after success | Submit successfully | All fields clear, success message shown | | |
| 2.3.4 | Re-submit after success | Submit another message after first success | Second message sends successfully | | |

### 2.4 Article Creation Form

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.4.1 | Title required | Try to publish without title | Error: "Title is required" | | |
| 2.4.2 | Content required for publish | Enter title only, set to Publish, save | Error: "Content must be at least 50 characters to publish" | | |
| 2.4.3 | Draft allows empty content | Enter title only, set to Draft, save | Saves successfully as draft | | |
| 2.4.4 | Publish with content | Enter title + 50+ chars content, publish | Article published successfully | | |

### 2.5 Marketplace Form

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.5.1 | Required fields | Submit without title | Error: "Title is required" | | |
| 2.5.2 | Button disabled during save | Click Publish Listing, observe button | Button disabled, shows loading state | | |
| 2.5.3 | Image upload | Upload a photo for listing | Image uploads and preview shows | | |
| 2.5.4 | Successful listing | Fill all fields, submit | "Listing created" message | | |

### 2.6 File Upload Validation

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.6.1 | Gallery — file over 5MB | Upload a 6MB+ image to gallery | Error: "file(s) exceed the 5MB size limit" | | |
| 2.6.2 | Gallery — file under 5MB | Upload a 2MB image | Upload succeeds | | |
| 2.6.3 | Profile — file over 5MB | Upload 6MB+ profile image | Error: "Image must be under 5MB" | | |
| 2.6.4 | Profile — file under 5MB | Upload a small profile image | Upload succeeds, shows in editor | | |

---

## SECTION 3: LINKS & NAVIGATION

### 3.1 Header Navigation

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1.1 | Logo / Home link | Click site logo in header | Navigates to home page | | |
| 3.1.2 | About link | Click "About" in header | Navigates to `/about` | | |
| 3.1.3 | Help link | Click "Help" in header | Navigates to `/manual` | | |
| 3.1.4 | Chat link (logged in) | Click "Chat" in header | Navigates to `/chat` | | |
| 3.1.5 | Account link (logged in) | Click "Account" in header | Navigates to `/account` | | |
| 3.1.6 | Admin link (admin only) | Login as admin, check header | "Admin" link visible, navigates to `/admin` | | |
| 3.1.7 | Login link (logged out) | Check header when not logged in | "Login" link visible, navigates to `/Login` | | |
| 3.1.8 | Logout link | Click "Logout" in header | Logs out, redirects to home | | |
| 3.1.9 | Search form | Enter a term, press Enter/submit | Navigates to `/search` with results | | |
| 3.1.10 | Language selector | Change language from dropdown | UI text changes to selected language | | |

### 3.2 Footer Navigation

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.2.1 | Contact Us | Click "Contact Us" | Navigates to `/contacts` (in-app form) | | |
| 3.2.2 | Site Policies | Click "Site Policies" | Navigates to `/policies` | | |
| 3.2.3 | Feedback | Click "Feedback" | Navigates to `/contacts` | | |
| 3.2.4 | Help | Click "Help" | Navigates to `/manual` | | |
| 3.2.5 | Admin Manual | Click "Admin Manual" | Navigates to `/admin-manual` | | |
| 3.2.6 | No external redirects | Click any footer link | All stay within the app (no Google Form redirects) | | |

### 3.3 Internal Links — No Broken Links

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.3.1 | Sidebar links | Click each sidebar link | All navigate correctly, no blank pages | | |
| 3.3.2 | BookManager pricing link | Find "Upgrade your plan" in BookManager | Uses `<Link>`, no full page reload | | |
| 3.3.3 | TermsGate policies link | Trigger terms modal, click "Site Policies" | Opens `/policies` in same tab (no new tab) | | |
| 3.3.4 | Login policies links | Check signup form terms links | Open `/policies` in same tab (no target_blank) | | |
| 3.3.5 | Login pricing link | Check "View plan details" on signup | Opens `/pricing` in same tab | | |
| 3.3.6 | No dead links | Navigate to every route in App.js | All 24 routes load without error | | |

### 3.4 Complete Route Test

| Route | Page Loads | Status |
|-------|-----------|--------|
| `/` (Home) | | |
| `/Login` | | |
| `/register` | | |
| `/about` | | |
| `/contacts` | | |
| `/books` | | |
| `/search` | | |
| `/read/:bookId` (use a real bookId) | | |
| `/account` | | |
| `/profile` (logged in) | | |
| `/profile/:userId` (use a real userId) | | |
| `/policies` | | |
| `/category/tech` | | |
| `/category/poetry` | | |
| `/admin` (as admin) | | |
| `/chat` (logged in) | | |
| `/articles` | | |
| `/articles/Poetry` | | |
| `/podcasts` | | |
| `/magazine` | | |
| `/gallery/:galleryId` (use a real galleryId) | | |
| `/pricing` | | |
| `/marketplace` | | |
| `/checkout?plan=Premium` (logged in) | | |
| `/manual` | | |
| `/admin-manual` (as admin) | | |
| `/logout` | | |
| `/nonexistent` (404 test) | | |

---

## SECTION 4: BUTTONS & INTERACTIONS

### 4.1 Social Actions (Like, Favorite, Comment)

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1.1 | Like a book (logged in) | Click heart icon on a book card | Heart fills red, count increases | | |
| 4.1.2 | Unlike a book | Click heart again | Heart unfills, count decreases | | |
| 4.1.3 | Favorite a book | Click star icon | Star fills gold | | |
| 4.1.4 | Double-click protection | Rapidly click like 5 times | Only 1 API call made (no duplicates) | | |
| 4.1.5 | Like error rollback | Like while backend is down | UI reverts to previous state, error message shown | | |
| 4.1.6 | Like as anonymous | Like without logging in | Uses localStorage, visual feedback works | | |
| 4.1.7 | Comment on book | Go to ReadBook, add a comment | Comment appears in list | | |
| 4.1.8 | Comment requires login | Try to comment when not logged in | Shows "Please log in to comment" message | | |
| 4.1.9 | Delete own comment | Click delete on own comment | Comment removed | | |
| 4.1.10 | Gallery like | Like an image in gallery view | Heart fills, count updates | | |
| 4.1.11 | Article like | Like an article on Articles page | Like registers, error feedback on failure | | |
| 4.1.12 | Error feedback on failure | Trigger a failed social action | Error message appears (not silent) | | |

### 4.2 Chat

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.2.1 | Send message | Type a message, click Send | Message appears in chat | | |
| 4.2.2 | Empty message | Click Send with empty input | Nothing happens (no empty messages) | | |
| 4.2.3 | Error feedback | Trigger a send failure | Error message shown to user | | |

### 4.3 Modals & Overlays

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.3.1 | ImageEditor Escape key | Open image editor, press Escape | Modal closes | | |
| 4.3.2 | ImageEditor close button | Open image editor, click X | Modal closes | | |
| 4.3.3 | Lightbox close | Open gallery lightbox, click X | Lightbox closes | | |
| 4.3.4 | Lightbox prev/next | Navigate images in lightbox | Previous/next images load | | |
| 4.3.5 | TermsGate acceptance | Trigger terms gate (create content first time) | Modal shows, must check box to proceed | | |
| 4.3.6 | TermsGate persists | Accept terms, navigate away, return | Terms modal does not show again | | |

### 4.4 Accessibility

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.4.1 | Lightbox aria-labels | Inspect lightbox buttons | Close has `aria-label="Close"`, prev/next have labels | | |
| 4.4.2 | Shape buttons aria-labels | Inspect ImageEditor shape buttons | Each has `aria-label` matching shape name | | |
| 4.4.3 | Gallery grid keyboard | Tab to gallery image, press Enter | Opens lightbox | | |
| 4.4.4 | Message dismiss keyboard | Tab to a dismissible message, press Enter | Message dismisses | | |
| 4.4.5 | Admin message role | Inspect admin dashboard message div | Has `role="status"` | | |

---

## SECTION 5: RESPONSIVE DESIGN & DEVICES

### 5.1 Desktop (1280px+)

| # | Test Case | Page | Expected Result | Status | Notes |
|---|-----------|------|-----------------|--------|-------|
| 5.1.1 | Pricing grid | `/pricing` | 4-column layout, cards readable | | |
| 5.1.2 | Home layout | `/` | Full content visible, no overflow | | |
| 5.1.3 | BookManager | `/books` | Full editor layout | | |
| 5.1.4 | Admin Dashboard | `/admin` | Full dashboard, all tabs work | | |
| 5.1.5 | Chat layout | `/chat` | Sidebar + messages side by side | | |

### 5.2 Tablet (768px - 1024px)

| # | Test Case | Page | Expected Result | Status | Notes |
|---|-----------|------|-----------------|--------|-------|
| 5.2.1 | Pricing grid | `/pricing` | 2-column layout at 900px | | |
| 5.2.2 | Gallery grid | `/gallery/:id` | Grid adjusts, images readable | | |
| 5.2.3 | Chat sidebar | `/chat` | Sidebar reduced to 220px | | |
| 5.2.4 | Marketplace grid | `/marketplace` | Cards fit, no overflow | | |
| 5.2.5 | About page | `/about` | Single-column highlights | | |
| 5.2.6 | Category page | `/category/:cat` | Flexible book grid, scrollable tabs | | |
| 5.2.7 | Checkout page | `/checkout?plan=Premium` | Reduced padding, readable layout | | |
| 5.2.8 | Magazine editor grid | `/magazine` | 2-column grid | | |
| 5.2.9 | Admin reset form | `/admin` | Form width: max-width 400px, no overflow | | |

### 5.3 Mobile (< 600px)

| # | Test Case | Page | Expected Result | Status | Notes |
|---|-----------|------|-----------------|--------|-------|
| 5.3.1 | Pricing grid | `/pricing` | Single column layout | | |
| 5.3.2 | Sidebar | Open sidebar | Full-width overlay (not fixed 250px) | | |
| 5.3.3 | Chat | `/chat` | Sidebar and messages stacked | | |
| 5.3.4 | Flipbook buttons | Read a book | Arrow buttons >= 44px x 44px (tap-friendly) | | |
| 5.3.5 | Magazine fonts | `/magazine` | No text smaller than 12px | | |
| 5.3.6 | Contact form | `/contacts` | Form fills full width, fields readable | | |
| 5.3.7 | Login form | `/Login` | Form fits screen, no horizontal scroll | | |
| 5.3.8 | Gallery lightbox | Open lightbox on mobile | Image fits screen, close/prev/next buttons visible | | |
| 5.3.9 | Magazine grid | `/magazine` | Single column layout | | |
| 5.3.10 | Header responsive | Check header on small screen | Menu collapses properly | | |

### 5.4 Browser Compatibility

Test the following in each browser:
- Login / Signup flow
- Contact form submission
- Book reading (flipbook)
- Gallery lightbox
- File upload

| Browser | Version | OS | Login | Contact Form | Book Read | Gallery | Upload | Status |
|---------|---------|-----|-------|-------------|-----------|---------|--------|--------|
| Chrome | Latest | macOS | | | | | | |
| Chrome | Latest | Windows | | | | | | |
| Safari | Latest | macOS | | | | | | |
| Safari | Latest | iOS | | | | | | |
| Firefox | Latest | macOS/Win | | | | | | |
| Edge | Latest | Windows | | | | | | |
| Chrome | Latest | Android | | | | | | |
| Samsung Internet | Latest | Android | | | | | | |

---

## SECTION 6: EMAIL SERVICE VERIFICATION

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1 | Password reset email sends | Use forgot password with valid email | Email arrives at user's inbox | | |
| 6.2 | Password reset email content | Open the email | Contains styled HTML with temp password | | |
| 6.3 | Contact form email sends | Submit contact form | Admin email (avikaventures.info@gmail.com) receives notification | | |
| 6.4 | Contact email content | Open admin notification email | Contains sender name, email, subject, and message | | |
| 6.5 | Reply to sender | Check contact notification email | Reply-to info shows sender's email | | |
| 6.6 | Spam folder check | Check spam/junk folder | Emails not going to spam | | |

---

## SECTION 7: PROTECTED ROUTES & AUTHENTICATION

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1 | Profile requires login | Navigate to `/profile` while logged out | Redirected to login | | |
| 7.2 | Chat requires login | Navigate to `/chat` while logged out | Redirected to login | | |
| 7.3 | Admin requires admin role | Navigate to `/admin` as regular user | Access denied or redirected | | |
| 7.4 | Checkout requires login | Navigate to `/checkout` while logged out | Redirected to login | | |
| 7.5 | Admin manual requires admin | Navigate to `/admin-manual` as regular user | Access denied | | |
| 7.6 | Session persists | Login, refresh page | Still logged in | | |
| 7.7 | Logout clears session | Click logout | Session cleared, protected routes inaccessible | | |

---

## SECTION 8: ADMIN FUNCTIONALITY

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1 | View all users | Go to Admin > Users tab | List of all users visible | | |
| 8.2 | Block/unblock user | Change a user's status | Status updates | | |
| 8.3 | Reset user password | Use admin password reset | Password resets for target user | | |
| 8.4 | Upgrade user plan | Change a user's plan | Plan updates (for manual upgrade flow) | | |
| 8.5 | Manage advertisements | Create/edit/delete ads | Advertisements function correctly | | |
| 8.6 | View analytics | Go to Admin > Stats tab | Statistics load | | |

---

## SECTION 9: PERFORMANCE & EDGE CASES

| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1 | Server wake-up | Load site after server cold start | Wake-up indicator shows, then site loads | | |
| 9.2 | Slow network | Throttle to 3G in DevTools, navigate | Loading states visible, no crashes | | |
| 9.3 | Back/forward navigation | Use browser back/forward buttons | Pages load correctly | | |
| 9.4 | Deep link sharing | Copy a book URL, open in new tab | Page loads correctly | | |
| 9.5 | Multiple tabs | Open site in 2 tabs, login in one | Both tabs reflect login state on refresh | | |
| 9.6 | Large file rejection | Upload 10MB+ file to gallery | Error shown before upload attempt | | |
| 9.7 | Empty states | Visit gallery with no images | Shows "No photos in this gallery yet" | | |

---

## SECTION 10: FUNCTIONAL TEST ISSUES — FIX STATUS

All 33 issues from `FUNCTIONAL_TEST_ISSUES.md` (static code audit, April 3, 2026).

### CRITICAL (5/5 Fixed)

| # | Issue | Status | Fix Summary |
|---|-------|--------|-------------|
| 01 | Contact form redirects to Google Form | FIXED | Real in-app form + backend `ContactController` + email notification to admin |
| 02 | Temp password exposed in browser | FIXED | Removed from UI; email delivery via Gmail SMTP; forced password change on temp login; old password stays valid if user remembers it |
| 03 | Sidebar `/contact` broken link | FIXED | Changed to `/contacts` + converted `<a>` to `<Link>` |
| 04 | No 404 page for invalid URLs | FIXED | `NotFound.jsx` + catch-all route + hash URL redirect; login-aware buttons |
| 05 | Stripe price IDs are placeholders | FIXED | Replaced Stripe checkout with "Contact Us to Upgrade" flow; admin manually upgrades users |

### HIGH (8/8 Fixed)

| # | Issue | Status | Fix Summary |
|---|-------|--------|-------------|
| 11 | Sidebar uses `<a>` tags instead of `<Link>` | FIXED | Converted to React Router `<Link>`, added `onClick={toggleSidebar}` |
| 12 | Login page internal links open new tab | FIXED | Removed `target="_blank"`, converted to `<Link>` |
| 13 | TermsGate internal link opens new tab | FIXED | Removed `target="_blank"` from policies link |
| 16 | Silent error swallowing on social actions | FIXED | Error feedback added across Home, Articles, GalleryView, Chat, Account, ReadBook |
| 25 | 8 CSS files missing tablet breakpoints | FIXED | Added `@media (max-width: 768px)` to Chat, Checkout, Marketplace, GalleryView, About, CategoryPage, MagazineEditor |
| 26 | Sidebar fixed 250px not responsive | FIXED | Full-width overlay on mobile with drop shadow |
| 27 | MagazineEditor 4-col grid no breakpoint | FIXED | 2 columns at 768px, 1 column at 480px |
| 28 | Flipbook buttons below 44px touch target | FIXED | Increased to `min-width: 44px; min-height: 44px` on mobile |

### MEDIUM (15/17 Fixed, 1 Skipped, 1 Pending)

| # | Issue | Status | Fix Summary |
|---|-------|--------|-------------|
| 06 | Weak password requirements | FIXED | 8+ chars, uppercase, number, special character required |
| 07 | Save button not disabled during submit | FIXED | `disabled={saving \|\| uploading}` on Marketplace |
| 08 | Price field accepts non-numeric input | SKIPPED | Intentional — price allows "Free", "Best Offer", "$25" text values |
| 09 | No file size validation on uploads | FIXED | 5MB limit on gallery and profile image uploads |
| 10 | Articles can publish empty content | FIXED | 50+ characters required to publish; drafts still allowed empty |
| 14 | BookManager uses `<a>` for internal routes | FIXED | Converted to `<Link to="/pricing">` |
| 17 | Like/Favorite no double-click protection | FIXED | `busyActions` guard prevents duplicate API calls |
| 18 | Optimistic UI no rollback on failure | FIXED | `.catch()` reverts UI state for likes/favorites |
| 19 | Comment form silent redirect to login | FIXED | Shows "Please log in to comment" message before redirect |
| 20 | Lightbox buttons missing aria-labels | FIXED | Added `aria-label="Close"`, `"Previous image"`, `"Next image"` |
| 21 | ImageEditor shape buttons missing aria-labels | FIXED | Added `aria-label={s.label}` to each shape button |
| 22 | Clickable divs missing role/keyboard | FIXED | Added `role="button"`, `tabIndex={0}`, `onKeyDown` handler |
| 23 | Modals missing Escape key handler | FIXED | Added `useEffect` keydown listener on ImageEditor |
| 29 | MagazineEditor font sizes 9-10px | FIXED | Increased minimum to 12px |
| 30 | Pricing grid overflows tablets | FIXED | 2-column grid at 900px breakpoint |
| 31 | AdminDashboard form fixed 400px width | FIXED | Changed to `width: 100%; max-width: 400px` |
| 33 | Chat sidebar 280px too wide on mobile | FIXED | Reduced to 220px on tablet, collapses on phone |

> **PENDING ISSUE:**

| # | Issue | Priority | Status | Details |
|---|-------|----------|--------|---------|
| **32** | **Inconsistent CSS breakpoints across files** | **MEDIUM** | **NOT FIXED** | Breakpoints vary across 30+ CSS files (600px, 700px, 768px, 860px, 1024px). Standardizing to consistent values (e.g., 480px, 768px, 1024px, 1280px) requires a large-scale refactor across every CSS file. **Risk: LOW** — existing breakpoints work correctly on each page, they're just not uniform. **Recommendation:** Address during a dedicated CSS cleanup sprint, not as a hotfix. |

### LOW (2/3 Fixed, 1 Already Done)

| # | Issue | Status | Fix Summary |
|---|-------|--------|-------------|
| 15 | Dead code — duplicate LoginPage.js | FIXED | Confirmed unused, deleted |
| 24 | Empty gallery shows no message | ALREADY DONE | Was already implemented (`gv-empty` class) |

### Overall Summary

| Category | Total | Fixed | Skipped | Pending | Already Done |
|----------|-------|-------|---------|---------|-------------|
| CRITICAL | 5 | 5 | 0 | 0 | 0 |
| HIGH | 8 | 8 | 0 | 0 | 0 |
| MEDIUM | 17 | 15 | 1 | **1 (ISSUE-32)** | 0 |
| LOW | 3 | 2 | 0 | 0 | 1 |
| **TOTAL** | **33** | **30** | **1** | **1** | **1** |

---

## TEST SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Reviewer | | | |

---

## ISSUE TRACKING

If a test fails, log it here:

| Test # | Description | Severity | Steps to Reproduce | Assigned To | Status |
|--------|-------------|----------|-------------------|-------------|--------|
| | | | | | |

---

*Total test cases: 140+*
*Generated April 3, 2026*
