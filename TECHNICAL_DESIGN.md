# SaatSaheli — Technical Design

Living document. Updated as services / decisions change.
Last revised: 2026-05-10.

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
- **Static assets:** Routed via `MediaStorageService` (interface), with two
  backends selectable by `MEDIA_STORAGE` env var: `r2` (Cloudflare R2,
  primary going forward — Section 2.9) and `cloudinary` (legacy, retained
  for rollback — Section 2.2). Both implement the same 4-method surface
  so call sites in `FileUploadController`, `GalleryController`,
  `ImageGenerationService`, and `DocumentExtractionService` are unchanged.
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

### 2.2 Cloudinary (image hosting / CDN) — **being deprecated**

| Setting | Value |
|---|---|
| Endpoint | Cloudinary REST + SDK |
| Cloud | `dtweksafm` |
| Auth | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` |
| Code | `service/CloudinaryService.java`, `controller/FileUploadController.java` |
| Endpoint exposed | `POST /api/upload` (multipart `file`) |

- **Status (2026-05-10):** Active in prod (`MEDIA_STORAGE=cloudinary`),
  being migrated to Cloudflare R2 (Section 2.9). Code retained as the
  fallback path for the `MEDIA_STORAGE` toggle so we can flip back via an
  env var without a redeploy. Plan to remove in a follow-up commit once
  R2 has been stable in prod for two weeks.
- Free tier blew past 100% on 2026-05-03 (28.31 / 25 credits). Mitigations
  shipped: hero carousel cut 8→5 then self-hosted as static JPGs, width
  cap `w_1600,c_limit` injected, soft-deleted books purged. These bought
  time until R2 cutover.
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

### 2.9 Cloudflare R2 (primary media storage going forward)

| Setting | Value |
|---|---|
| Protocol | S3-compatible (AWS SDK v2) |
| Bucket | `R2_BUCKET` env var |
| Endpoint | `R2_ENDPOINT` env var (`https://<account-id>.r2.cloudflarestorage.com`) |
| Public read URL | `R2_PUBLIC_BASE_URL` env var |
| Auth | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` |
| Code | `service/R2StorageService.java`, `service/MediaStorageService.java` |
| Toggle | `MEDIA_STORAGE=r2` selects this backend; `=cloudinary` reverts |

**Why R2:**
- $0.015/GB-month storage, **free egress**, no transformation/credit
  metering. ~$0.50/month projected for SaatSaheli's ~5–10 GB library.
- Free 10 GB tier covers current usage outright.
- Cloudflare CDN included; pairs with Cloudflare Images (~$5/mo) later
  if responsive `srcset` becomes a need.

**Architecture:**
- `MediaStorageService` interface declares the 4 methods all upload paths
  use: `uploadFile`, `uploadBytes`, `saveBufferedImage`, `saveJpegImage`.
- Both `CloudinaryService` and `R2StorageService` implement it.
- Spring picks the bean by `MEDIA_STORAGE` env var. Flip is instant;
  no redeploy needed beyond an env-var restart.
- EXIF stripping (local `ImageIO` re-encode) sits **upstream** of the
  storage layer — carries over unchanged.

**Frontend dual-host:**
- `FrontEnd/src/utils/imageUrl.js::optimizeCloudinary(url)` injects
  `f_auto,q_auto,w_1600,c_limit` only when the URL points to
  `res.cloudinary.com`. R2 URLs (and Drive thumbnails, `/uploads/`, etc.)
  pass through unchanged. Same helper handles both backends — no
  conditional logic at call sites.

**CORS:**
- R2 bucket requires an explicit CORS policy for `<img crossOrigin>` /
  canvas reads (book cover designer uses canvas to export the composite).
- Origins whitelisted: `http://localhost:3000`, `https://saatsaheli.com`,
  `https://www.saatsaheli.com`. Methods `GET`, `HEAD`. `ExposeHeaders: ETag`.
- Configured in the Cloudflare dashboard → bucket → Settings → CORS Policy.

**Public URL strategy:**
- Currently using R2's default `pub-<id>.r2.dev` domain.
- **Pending:** custom domain `media.saatsaheli.com` (Cloudflare R2 → Custom
  Domains → CNAME via Namecheap). Must land BEFORE the bulk Cloudinary→R2
  copy + SQL URL rewrite, otherwise the rewrite has to be done twice.

**Migration status (2026-05-10):**
- Code shipped: R2StorageService, MediaStorageService router, frontend
  dual-host helper — all on `postgres-migration` branch.
- Local Phase 0 testing in progress with `MEDIA_STORAGE=r2`.
- Pending: custom domain setup → bulk rclone copy → SQL URL rewrite on a
  Neon branch → Render env flip → smoke test → cancel Cloudinary.

**DB columns holding media URLs (needed by the Phase 4 SQL rewrite):**
- `pages.image_url`, `pages.image_url_2`
- `hero_slides.image_url`
- `articles.image_url`
- `recipe_images.image_url`
- `users.profile_image_url`
- `galleries.cover_image_url`
- `advertisements.image_url`
- `podcasts.cover_image_url`

**Rollback:** set `MEDIA_STORAGE=cloudinary` and redeploy. Existing R2 URLs
in the DB continue to serve from R2 (no DB rewrite needed) because
`optimizeCloudinary()` passes non-Cloudinary URLs through unchanged.

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

- **Repo location:** `~/Code/GitHub/SaatSaheliMain` (relocated 2026-05-10
  from `~/Documents/GitHub/SaatSaheliMain` after git index corruption;
  former path archived as `SaatSaheliMain.corrupt-bak-2026-05-10`).
  Outside `~/Documents` so the iCloud `bird` daemon does NOT touch
  `node_modules` / `target` (was the source of multi-minute filesystem
  stalls).
- Backend: `cd SaatSaheli && ./mvnw clean spring-boot:run -Dspring-boot.run.profiles=dev`
  → port 8081, hits local Postgres `saatsaheli_dev`. **Always** include
  `-Dspring-boot.run.profiles=dev` — default profile = prod Neon.
- Frontend: `cd FrontEnd && npm start` → port 3000, proxies API to 8081
  via `REACT_APP_API_URL`.
- Smoke tests: `BASE_URL=http://localhost:8081 ./scripts/post-deploy-check.sh`.
- When started from a background tool, logs land at
  `/tmp/saatsaheli-logs/backend.log` and `/tmp/saatsaheli-logs/npm-ci.log`.

**Local prerequisites that aren't obvious from the code:**
- **Postgres.app 17.9** running on port 5432 with `saatsaheli_dev` DB
  created from `SaatSaheli/db/schema.sql`.
- **`.env` files** at `SaatSaheli/.env` and `FrontEnd/.env` (gitignored).
  Both copied from a working clone; the repo only ships `.env.example`.
- **Google OAuth client ID** in Google Cloud Console **must** include
  `http://localhost:3000` under **Authorized JavaScript Origins** (no
  path, no trailing slash — that's a separate field). If the GSI console
  logs `The given origin is not allowed for the given client ID`, this
  is the cause. Redirect URIs (with paths) go in the separate "Authorized
  redirect URIs" section.
- **R2 bucket CORS policy** (Section 2.9) must whitelist `localhost:3000`
  or the book-cover designer canvas read will 403.

**Recurring local-dev pitfalls:**
- Stale iCloud-conflict files in `target/` (`* 2.class`) cause Maven
  "multiple main class candidates" failures. Fix: `rm -rf target` then
  `./mvnw clean spring-boot:run …`. Less likely now that repo lives
  outside `~/Documents`, but Postgres.app metadata still lives there.
- Frontend `node_modules` corruption (silently zero-byte/wrong-content
  package.json files) causes webpack errors that look like missing
  exports. Fix: `rm -rf FrontEnd/node_modules FrontEnd/package-lock.json && npm install`.
- CRA dev server (`npm start`) hangs when launched as a background
  process via Claude Code's Bash. Workaround: user runs it in a real
  terminal.
- `[GSI_LOGGER]` Cross-Origin-Opener-Policy warnings in the console are
  downstream of the JavaScript-Origins rejection above — if you see both,
  fix the origin first; the COOP warnings often disappear with it.

---

## 7. Open / planned

| Item | State | Doc |
|---|---|---|
| **R2 migration — Phase 3–7** | Code shipped; Cloudflare custom domain + rclone bulk-copy + Neon SQL rewrite + Render env flip + smoke test + Cloudinary cancel still pending | Section 2.9 / `memory/project_saatsaheli_r2_migration.md` |
| Magazine sponsor mechanic (Plan A) | Designed, not started | (in chat — to be moved here when scoped) |
| "Our Sponsors" cross-issue page (Plan B) | Designed | — |
| Per-magazine size/orientation | Designed | Section 4 |
| Privacy/tracker cleanup (self-host fonts, replace GA4, replace reCAPTCHA) | Logged | `memory/project_saatsaheli_tracker_cleanup.md` |
| #24 SuperAdmin Phase 3 (admin UI) | Phase 1+2 shipped, Phase 3 pending | `memory/project_saatsaheli_superadmin_impersonation.md` |
| Render OOM 2026-05-09 fix (DocumentExtractionService 150→100 DPI JPEG) | Written, never committed; lost when repo relocated. Re-do | `memory/project_saatsaheli_oom_2026-05-09.md` |

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
  issue launches. (Pressure ends once R2 migration completes — Section 2.9.)
- **`MEDIA_STORAGE` toggle is the R2 rollback lever.** Flip to
  `cloudinary` + redeploy if R2 traffic ever misbehaves. Don't change it
  on local without also verifying the right env vars are populated in
  the relevant `.env`.
- **Never leak secret values to the terminal.** `.env` greps must be
  piped through `sed 's/=.*/=<redacted>/'`. R2 and Cloudinary secrets
  have already leaked once each via unfiltered greps and forced
  emergency rotations.
- **Never commit `.env` files.** Both backend and frontend `.env` are
  gitignored. The repo only ships `.env.example` placeholders. When
  re-cloning, copy `.env` from a known-good source (the previous working
  clone, or password-manager-archived copies).
