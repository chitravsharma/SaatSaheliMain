# SaatSaheli — Technical Design

Living document. Updated as services / decisions change.
Last revised: 2026-05-01.

---

## 1. System overview

```
┌────────────────┐    HTTPS    ┌──────────────────┐    JDBC    ┌────────────┐
│  Browser (CRA  │◀──────────▶│  Spring Boot 3.4 │◀──────────▶│   Neon     │
│  React 19 SPA) │    JSON    │   on Render       │   pooled   │ Postgres17 │
└───────┬────────┘             └─────┬─────────┬──┘            └────────────┘
        │                            │         │
        │ <img>                      │         │ multipart/form
        ▼                            ▼         ▼
   ┌──────────┐                ┌──────────┐  ┌─────────────┐
   │ Cloudinary │              │ HF Infer │  │ Google APIs │
   │   (CDN)    │              │  FLUX.1  │  │ Drive/Sheets│
   └──────────┘                └──────────┘  └─────────────┘
```

- **Frontend:** Create React App 5.0.1 + React 19.1.1 + react-router 7.9.1.
  Built and deployed by Render alongside the backend (`pom.xml` copies
  `FrontEnd/build/` into `target/classes/static`).
- **Backend:** Spring Boot 3.4.5 on Java 21. Deployed to **Render Starter**
  (always-on). Source at `SaatSaheli/`.
- **Database:** **Neon Postgres** (paid Launch plan, autosuspend OFF).
  Connection via env vars `NEON_DB_URL` / `NEON_DB_USERNAME` / `NEON_DB_PASSWORD`.
  HikariCP pool: max 10, min idle 2, keepalive 5 min.
- **Static assets:** **Cloudinary** for user-uploaded images and AI outputs.
- **Auth:** Google Sign-In (OAuth) + email/password fallback. JWT issued
  by backend, stored in localStorage, sent via `Authorization: Bearer …`.
  `JwtInterceptor` populates `request.getAttribute("jwtUserId" / "jwtRole")`;
  controllers enforce per-endpoint.

---

## 2. Third-party services

### 2.1 Hugging Face Inference (image generation)

| Setting | Value |
|---|---|
| Endpoint | `https://router.huggingface.co/hf-inference/models/<model>` |
| Default model | `black-forest-labs/FLUX.1-schnell` |
| Body shape | `{"inputs": "<prompt>"}` |
| Auth | `Authorization: Bearer ${HUGGINGFACE_API_TOKEN}` |
| Code | `service/ImageGenerationService.java` |
| Property | `huggingface.api.model` (env override: `HUGGINGFACE_API_MODEL`) |

**Why FLUX.1-schnell:**
- HF deprecated `stabilityai/stable-diffusion-xl-base-1.0` on `hf-inference`
  in April 2026 (returned `410 Gone: model deprecated`).
- FLUX.1-schnell is currently supported on the free tier, ~5–10s latency
  (4-step distillation), and uses the same `{"inputs": …}` body — drop-in.
- Made the model name env-overridable so swapping again (when this happens
  next) doesn't need a redeploy.

**License & copyright (FLUX.1-schnell):**
- **Apache 2.0** — most permissive open license. Commercial use allowed.
- License grants full rights to outputs.
- **No indemnification** from HF or Black Forest Labs. If a third party
  claims an output infringes their work, that's our problem.
- US Copyright Office position: AI-only outputs are **not** copyrightable;
  human-edited derivatives can be. Plan accordingly if outputs ever need
  to be defended (e.g., logos, brand marks — don't generate via AI).

**Operational notes:**
- Free tier rate limits change frequently; with our token we get the
  signed-in cap (~thousands/hour, but throttled under load).
- Cold-start 503 on first call after model idle is normal — service has a
  retry loop (3 attempts, 20s sleep on 503).
- Output is uploaded to Cloudinary by `cloudinaryService.uploadBytes` so
  HF doesn't need to host the URL long-term.

**Content guardrails — moderate prompts that mention:**
- Real people's names / likenesses (defamation, right of publicity).
- Trademarked characters or brands ("Disney princess", "Marvel hero").
- Living artists' styles ("in the style of <artist>") — increasingly contentious.
- NSFW / hateful / dangerous content.

**If we ever need indemnification:** Adobe Firefly (~$5/mo, Apache-2-equivalent
plus contractual indemnity) or Getty Generative AI (enterprise, ironclad
provenance).

### 2.2 Cloudinary (image hosting / CDN)

| Setting | Value |
|---|---|
| Endpoint | Cloudinary REST + SDK |
| Cloud | `dtweksafm` |
| Auth | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` |
| Code | `service/CloudinaryService.java`, `controller/FileUploadController.java` |
| Endpoint exposed | `POST /api/upload` (multipart `file`) |

- All user uploads + AI outputs go here. URLs persist; no migration needed
  on backend redeploys.
- **Plan:** Free tier (25 GB storage, 25 GB monthly bandwidth). Watch the
  monthly bandwidth on the Cloudinary dashboard as photo-heavy
  magazines/galleries scale.
- Public-by-default URLs (no signed-URL logic). Anything sensitive must
  not be uploaded.

### 2.3 Neon Postgres

- Paid **Launch plan** (autosuspend disabled to keep the warm pool useful).
- Schema dump committed at `SaatSaheli/db/schema.sql`.
- Local dev uses Postgres.app 17.9 with `saatsaheli_dev` and `saatsaheli_test`
  databases; Spring profile `dev` (`application-dev.properties`).
- Migration runner: `DataMigrationRunner.java` (one-shot, profile `migrate`).
- Hibernate Envers wired for per-entity audit (Phase 1 + 2 complete).

### 2.4 Google APIs

| API | Use | Cred |
|---|---|---|
| Google OAuth | Sign-in | Front-end `@react-oauth/google` |
| Google Drive | Legacy upload path (kept for reference) | service-account JSON in `GOOGLE_CREDENTIALS_FILE` |
| Google Sheets | Legacy data source pre-Postgres migration | same |

Google Sheets / Drive are no longer the primary store; kept around for the
migration runner. New uploads go to Cloudinary.

### 2.5 reCAPTCHA v2 (Google)

| Setting | Value |
|---|---|
| Backend env | `RECAPTCHA_SECRET_KEY` |
| Frontend env | `REACT_APP_RECAPTCHA_SITE_KEY` |
| Code | `service/RecaptchaService.java` |
| Forms covered | Advertise, Contacts, Feedback, HelpSupport, MagazineSubmit |

If the secret key is unset, verification is skipped (so local dev works
without keys). In production both must be set.

### 2.6 Render (hosting)

- Backend: Render web service (Starter), always-on.
- Auto-deploys on push to `postgres-migration` branch.
- ~3–5 min from push to live.

### 2.7 Email (SMTP)

- `EmailService.java` sends contact-form notifications to admin inbox.
- Subject routing in `sendContactNotification()` distinguishes between
  Magazine Submission, Help & Support, Feedback, **Advertising Inquiry**,
  and generic Contact Us based on the user-supplied subject prefix.

### 2.8 PWA

- Hand-rolled service worker (`public/sw.js`) + manifest. iOS apple-touch
  icons in `public/icons/`. Install only works once HTTPS is live.

---

## 3. Auth & authorization model

- **JWT issued by backend** on successful login (Google or email/pw).
- Stored in `localStorage` as `saatSaheliToken`; user object as
  `saatSaheliUser`. Session marker in `sessionStorage` so a closed tab logs out.
- `AuthContext.js` enforces a 15-minute inactivity logout (full reload
  → `/Login?reason=idle`).
- `JwtInterceptor.preHandle` parses Bearer token and sets request
  attributes `jwtUserId`, `jwtRole`. **Always returns true** — auth
  enforcement is per-controller.
- **SuperAdmin act-on-behalf:** if role is `SUPER_ADMIN` and `X-Act-As-User`
  header is set, the effective user becomes the target. Original SA is
  retained as `actorUserId` for the audit trail.

### Per-controller auth pattern (post #24 hardening)

```java
Long jwtUserId = (Long) request.getAttribute("jwtUserId");
String jwtRole = (String) request.getAttribute("jwtRole");
if (jwtUserId == null) return 401;
if (!RoleUtil.isAdmin(jwtRole)) return 403;
// use jwtUserId — never trust body.userId
```

Currently enforced on: `BookController`, `RecipeController`,
`AdvertisementController` (writes), audit-log endpoints. Other controllers
still being migrated.

---

## 4. Data model — magazine

`book` (table `books`) + `page` (table `pages`).
Pages store layout in JSON `format` column:
```json
{
  "backgroundColor": "#fff8e7",
  "border": {"style": "double", "color": "#8a3a24", "width": "3px"},
  "textBlocks": [{"id": "tb…", "content": "…", "fontFamily": "…",
                  "fontSize": "14px", "color": "#…", "x": 30, "y": 40,
                  "width": 490, "height": 200, …}],
  "imageBlocks": [{"id": "ib…", "url": "https://res.cloudinary.com/…",
                   "x": 0, "y": 0, "width": 550, "height": 700,
                   "objectFit": "cover", "opacity": 100}]
}
```

Canvas: **550 × 700 px** (portrait) — hard-coded in
`MagazineEditor.jsx:11-12`. No per-book size/orientation columns yet
(planned Plan B after Baishaakh ships).

---

## 5. Advertisement model

- **Placements (whitelist in `AdvertisementService.java:98`):**
  `HEADER_TOP`, `FOOTER_TOP`, `SIDE_RAIL`, `ARTICLE_TOP`, `PODCAST_TOP`.
- Magazine and Gallery sponsorships are fulfilled via **content tools**
  (admin adds an image block in MagazineEditor or creates a dedicated
  sponsor gallery), not via the AdBanner placement system.
- AdBanner component fetches `/api/advertisements/active/{placement}` —
  public endpoint, returns active ads for that slot.
- Writes (POST/PUT/DELETE) require admin JWT.

---

## 6. Local dev

- Backend: `cd SaatSaheli && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`
  → port 8081, hits local Postgres `saatsaheli_dev`.
- Frontend: `cd FrontEnd && npm start` → port 3000, proxies API to 8081
  via `REACT_APP_API_URL`.
- Smoke tests: `BASE_URL=http://localhost:8081 ./scripts/post-deploy-check.sh`.

**Recurring local-dev pitfalls:**
- Stale iCloud-conflict files in `target/` (`* 2.class`) cause Maven
  "multiple main class candidates" failures. Fix: `rm -rf target` then
  `./mvnw clean spring-boot:run …`.
- Frontend `node_modules` corruption (silently zero-byte/wrong-content
  package.json files) causes webpack errors that look like missing
  exports. Fix: `rm -rf FrontEnd/node_modules FrontEnd/package-lock.json && npm install`.
- CRA dev server (`npm start`) hangs when launched as a background
  process via Claude Code's Bash. Workaround: user runs it in a real
  terminal.

---

## 7. Open / planned

| Item | State | Doc |
|---|---|---|
| Magazine sponsor mechanic (Plan A) | Designed, not started | (in chat — to be moved here when scoped) |
| "Our Sponsors" cross-issue page (Plan B) | Designed | — |
| Per-magazine size/orientation | Designed | Section 4 |
| Privacy/tracker cleanup (self-host fonts, replace GA4, replace reCAPTCHA) | Logged | `memory/project_saatsaheli_tracker_cleanup.md` |
| #24 SuperAdmin Phase 3 (admin UI) | Phase 1+2 shipped, Phase 3 pending | `memory/project_saatsaheli_superadmin_impersonation.md` |

---

## 8. Operational reminders

- **Never hit prod DB from local backend.** Always use `-Dspring-boot.run.profiles=dev`.
  Default profile = prod Neon.
- **Never push without user approval.** Working tree changes accumulate
  across sessions; commit groups are negotiated.
- **HF model can be deprecated without notice.** When `410 Gone` happens,
  override `HUGGINGFACE_API_MODEL` to a current model — no redeploy needed
  if you set it in Render's env vars.
- **Cloudinary bandwidth is the scaling cliff.** Free tier 25 GB/month.
  Magazine + galleries are the heavy users. Watch the dashboard around
  issue launches.
