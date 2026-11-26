# INARI DTI (Draw to Impress) Platform

Platform event ilustrasi bulanan & tiered voting untuk **Divisi Gambar (GA) — UKM Inari (IPB University)**.

## Architecture

- **Frontend (`frontend/`)**: Next.js (App Router), TypeScript, Tailwind CSS — deployed on **Vercel**.
- **Backend (`backend/`)**: Laravel 13 REST API + PostgreSQL + Sanctum Bearer Auth + Intervention Image v4 (GD) — deployed on **Railway**.
- **Object Storage**: S3-compatible storage (**Cloudflare R2**) via Laravel Filesystem (`MEDIA_DISK=s3` in production) — stores both lossless originals and lightweight WebP grid thumbnails.
- **Transactional Email**: HTTP API mail driver (**Resend**) so outbound verification & password reset emails work on Railway Hobby without SMTP ports `25/465/587`.

## Key Features

- **Dark Atelier Theme**: Deep charcoal (`#0E1015`) & elevated surfaces (`#161922`) with `Plus Jakarta Sans` + `JetBrains Mono`, keeping UI chrome neutral while highlighting the 5 Minecraft-inspired voting tiers (**Netherite 5pt**, **Diamond 4pt**, **Gold 3pt**, **Iron 2pt**, **Copper 1pt**).
- **IPB & Whitelist Access Control**: Registration restricted to `@apps.ipb.ac.id`, `@ipb.ac.id` (regex `/@([a-z0-9-]+\.)*ipb\.ac\.id$/i`), or emails in `whitelisted_emails`, with `MustVerifyEmail` enforcement and password reset flows.
- **Submission Privacy & Overwrite**: Verified members can submit 1 artwork (PNG/JPG/WEBP, max 15 MB) per edition and overwrite before `submission_deadline` (old files are removed from storage). Submissions remain hidden from non-admin users until `submission_deadline` passes.
- **Aspect-Preserving Masonry & Lossless Lightbox**: Gallery previews load compressed WebP thumbnails without rigid square cropping; clicking an artwork opens a lossless pan/zoom lightbox with direct tier voting and single-image original download.
- **Flexible Sticky 5-Tier Voting Dock**: Voters allocate 1–5 distinct tiers to distinct artworks (excluding their own). Anonymous mode masks author names & avatars until the edition reaches `completed`.
- **Automatic State Transitions**: `dti:process-transitions` scheduled command + `EvaluateEditionTransitions` lazy-evaluation middleware handle `submission_open` → `extension_poll` (if `< 5` non-hidden entries, +24h poll) or `voting_open` → `completed`.
- **Hall of Fame & Archive Bulk Download**: Top 3 podium winners, Ranks 4–6 Honorable Mentions, full tier breakdowns, and per-edition `.zip` bulk artwork downloads on `/archive`.
- **User Profile & Avatar Cropper**: Members can update display name, password, and crop/zoom their profile picture interactively (`1:1` canvas cropper) on `/profile`.
- **Admin & Superadmin Panel (`/admin`)**:
  - Edition CRUD, inline editing, submission moderation (`is_hidden`), and confirmed manual state overrides.
  - Registered user directory with role editing (`member` ↔ `admin`), locking the `superadmin` (ID 1) role from modification.
  - 3-tier account blacklist (`upload_blocked`, `interaction_blocked`, `full_ban`) and non-IPB email whitelist management.

---

## Local Development Setup

### 1. Backend (`backend/`)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```
Configure PostgreSQL (`DB_CONNECTION=pgsql`) and local media storage (`MEDIA_DISK=public` for localhost without R2) in `backend/.env`, then run:
```bash
php artisan storage:link
php artisan migrate --seed
php artisan serve
```
Optional scheduler worker:
```bash
php artisan schedule:work
```

### 2. Frontend (`frontend/`)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## Production Environment Notes (Railway + Vercel)

- **Backend (Railway):** Set `APP_ENV=production`, `APP_DEBUG=false`, `FILESYSTEM_DISK=s3`, `MEDIA_DISK=s3`, Cloudflare R2 credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`, `AWS_ENDPOINT`, `AWS_URL`, `AWS_DEFAULT_REGION=auto`, `AWS_USE_PATH_STYLE_ENDPOINT=true`), `MAIL_MAILER=resend`, `RESEND_API_KEY`, `FRONTEND_URL`, and `CORS_ALLOWED_ORIGINS`. Ensure PHP upload limits allow `>= 20M` for 15 MB artwork uploads.
- **Frontend (Vercel):** Set `NEXT_PUBLIC_API_URL` to your Railway `/api` URL.

## Verification

- **Backend Feature Suite:** `cd backend && php artisan test` (24 tests, 163 assertions)
- **Frontend Checks:** `cd frontend && npx tsc --noEmit && npm run lint && npm run build`
