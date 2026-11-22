# 🚀 Contest Reminder

## 📌 Overview

**Contest Reminder** is a **MERN-based** web application that tracks upcoming, ongoing, and completed coding contests from **Codeforces, CodeChef, and LeetCode**. It offers features such as contest filtering, bookmarking, YouTube solution syncing, and Google Calendar integration for reminders, ensuring users never miss a contest.

## 🌍 Demo

- **Watch the Video:** [YouTube Link](https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID)
- **Deployed Version:** [dsabunnies.me](https://dsabunnies.me)


## ✨ Features

- 📅 Contest Management
   - 📅 **Fetch and display** upcoming, ongoing, and past contests.
   - 🎯 **Apply filters** to view contests from selected platforms.
   - ⭐ **Bookmark contests** for quick and easy access.
- 🎥 YouTube Solution Integration
   - 🔄 **Automatically sync solutions** from **TLE Eliminator** playlists on the 6-hourly cron.
   - 📌 **Manually add a solution link** for the contests the matcher misses (admin only).
- 🗓 Calendar Integration
   - 🔄 **Connect Google Calendar once** and newly announced contests are added automatically.
   - ⏰ **Choose your reminder times** — up to five per contest, from 10 minutes to 2 days before.
   - 🎯 **Pick which platforms** get synced.
   - 📋 **Or export an `.ics` file** with the same reminders, for Google, Apple or Outlook.
- 🎨 User Interface
   - 📜 **Infinite scrolling** for completed contests.
   - 🌗 **Dark/Light mode toggle.**
   - 📱 **Mobile and tablet responsive design.**
- 🚀 Performance Optimization
   - 🚀 **Redis caching** of the first page, invalidated by a version counter rather than a blocking `KEYS` scan.
   - 🔖 **Cursor pagination** over an indexed `(startTime, _id)`, stable while the cron writes.
   - 🧮 **Status derived on read**, so it is never stale regardless of cache TTL.
   - 📥 **Bulk upserts** — one round trip per refresh instead of one query per contest.
- 🛠️ Deployment and Infrastructure
   - 🐳 **Dockerized setup** for seamless deployment.
   - 🔄 **CI/CD pipeline** for automated testing and deployment.
   - 🔁 **Nginx as a reverse proxy** for improved performance.
- 🔒 Security
   - 🔑 **Bearer-token auth** on the single write endpoint (fails closed when unconfigured).
   - 🧵 **One privileged endpoint**, because solution syncing moved to the cron instead of an exposed route.
   - 🧹 **Server-side URL allowlist** on stored solution links, so they can't be used for injection.
   - 🚦 **Per-IP rate limiting** backed by Redis, tighter on quota-spending routes.
   - ☠️ **DDoS protection and Web Application Firewall (WAF)** using Cloudflare.
   - 🔐 **SSL/TLS encryption** for secure HTTPS connections.
- 📊 Analytics
   - 📊 **Google Analytics integration** for insights and tracking.

## 🛠 Tech Stack

- **Frontend:** React, Vite, TypeScript, TailwindCSS, ShadCN UI
- **Backend:** Node.js, Express, MongoDB, Redis
- **Database:** MongoDB (Mongoose), Redis (ioredis)
- **APIs & Libraries:**
  - `@tanstack/react-query` for data fetching
  - `axios` for API requests
  - `react-router-dom` for navigation
  - `cron` for scheduled contest updates
- **DevOps & Deployment:**
  - **Docker** (Containerization)
  - **Nginx** (Reverse Proxy)
  - **EC2** (AWS Hosting)
  - **GitHub Actions** (CI/CD Automation)

## 🔌 API Endpoints

### 📢 Fetch contests

Filtering, search and pagination are all applied by the database, so they cover
every contest rather than only the rows already loaded in the browser.

```http
GET /api/contests?platforms=codeforces,codechef&status=upcoming&q=round&limit=30&cursor=<opaque>
```

| Parameter | Values | Notes |
|---|---|---|
| `platforms` | `codeforces`, `codechef`, `leetcode` (comma separated) | Anything else is ignored |
| `status` | `all`, `upcoming`, `ongoing`, `completed` | Derived from the clock, not stored |
| `q` | free text | Case-insensitive substring of the name, capped at 100 chars |
| `limit` | 1–100 | Defaults to 30, clamped |
| `cursor` | `nextCursor` from a previous response | Opaque `(startTime, _id)` pair |

**Response:**

```json
{
  "contests": [
    {
      "contestId": "cf_2282",
      "platform": "codeforces",
      "name": "Kotlin Heroes: Episode 15",
      "startTime": "2026-12-08T14:35:00.000Z",
      "endTime": "2026-12-08T17:05:00.000Z",
      "duration": 9000,
      "status": "UPCOMING",
      "youtubeVideo": "https://youtu.be/example"
    }
  ],
  "nextCursor": "MjAyNi0xMi0wOFQxNDozNTowMC4wMDBafDY4...",
  "hasMore": true
}
```

Pagination is by cursor rather than offset: the cron inserts contests between a
visitor's page requests, and `skip()` would shift every later row, making the
infinite scroll repeat or skip entries.

### ➕ Add YouTube solution manually

Requires the admin token. Only `https` URLs on YouTube hosts are accepted.

```http
PATCH /api/contests/:contestId/solution
Authorization: Bearer $ADMIN_TOKEN
```

**Request Body:**

```json
{
  "url": "https://youtu.be/example"
}
```

### 🗓 Google Calendar sync

Connecting a Google account creates a **separate calendar** named "Contest Reminder" and
writes upcoming contests into it, with the reminder offsets the user chose. The cron adds
newly announced contests on its next run, so no further action is needed.

| Endpoint | Purpose |
|---|---|
| `GET /api/calendar/config` | Whether sync is configured on this server |
| `GET /api/calendar/connect` | Starts the Google consent flow |
| `GET /api/calendar/callback` | Google redirects here; stores the account and syncs immediately |
| `GET /api/calendar/me` | Connection state and current preferences |
| `PATCH /api/calendar/preferences` | Change platforms and reminder times, then re-sync |
| `POST /api/calendar/sync` | Sync on demand |
| `DELETE /api/calendar/disconnect` | Revokes the token at Google and deletes the record |

Design notes worth knowing before changing any of this:

- **Scope is `calendar.app.created`**, which grants access only to calendars this app
  itself created. Connecting cannot read or modify a user's existing calendars.
- **Event IDs are `sha256(contestId)`.** Google accepts client-supplied IDs in base32hex
  (`a-v`, `0-9`), and a hex digest satisfies that by construction — so re-syncing updates
  the same event instead of creating a duplicate, with nothing to store.
- **Refresh tokens are encrypted at rest** with AES-256-GCM under `TOKEN_ENCRYPTION_KEY`.
  A read-only database leak does not yield usable calendar credentials. If the key is
  missing the feature refuses to operate rather than storing tokens in plaintext.
- **Sessions live in Redis**, not in a JWT, so "Disconnect" genuinely ends them. The
  cookie is `HttpOnly` and `SameSite=Lax`; `Secure` is added only when the redirect URI is
  https, because a browser discards a `Secure` cookie on an insecure origin and local
  development would break in a way that looks like a logic bug.
- **`invalid_grant` deletes the subscription.** That response means the user revoked
  access, so retrying forever would be pointless.

#### Google Cloud setup (required before this works)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Configure the OAuth consent screen. Add yourself as a test user while the app is
   unverified; check the **Data Access** page for whether Google classifies the scope as
   sensitive, since that determines whether verification is needed for public use.
4. Create an **OAuth 2.0 Client ID** of type *Web application*, and add your callback as
   an authorised redirect URI — exactly, including the path:
   `http://localhost:5055/api/calendar/callback` for development.
5. Put the client ID and secret in `backend/.env`, and generate the encryption key with
   `openssl rand -hex 32`.

### 🔐 Admin authentication

The one write endpoint is gated by a shared bearer token read from `ADMIN_TOKEN`.

This is a deliberate shortcut, not a recommendation. It fits the current shape of the
project — exactly one operator, one privileged operation — and its limits are known:
no identity or audit trail, no expiry, no revocation short of a redeploy, and the
token sits in `localStorage`, where any future XSS could read it. `requireAdmin` fails
closed, so an unset `ADMIN_TOKEN` makes the endpoint return `503` rather than opening it.

If a second admin ever needs access, the token should be replaced with identity-based
access rather than reissued: either a Cloudflare Access policy in front of the route
(with the origin locked to Cloudflare and the `Cf-Access-Jwt-Assertion` header verified,
so the origin IP can't be used to bypass it), or Google OIDC with an email allowlist and
a revocable Redis-backed `httpOnly` session cookie.

## ⚙️ Setup & Installation

### 🛠 Prerequisites

- Node.js & npm
- Docker & Docker Compose
- MongoDB instance
- Redis instance

### 🚀 Setup with Docker (Recommended)

1. **Clone the repository:**
   ```sh
   git clone https://github.com/divyanshu-dj/contest_reminder.git
   cd contest_reminder
   ```
2. **Create a `.env` file in the `backend/` directory:**
   ```env
   MONGO_URI=your_mongo_connection_string
   YOUTUBE_API_KEY=your_youtube_api_key
   # Include credentials in the URL if your Redis needs auth: redis://:password@host:6379
   REDIS_URL=your_redis_connection_string
   # Shared secret for the write endpoints. Generate with:
   #   openssl rand -hex 32
   # If unset, the admin endpoints reject every request.
   ADMIN_TOKEN=your_admin_token

   # Google Calendar sync. Optional: without these the API reports the feature
   # unavailable and the frontend offers the .ics download instead.
   GOOGLE_CLIENT_ID=your_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_oauth_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:5055/api/calendar/callback
   FRONTEND_ORIGIN=http://localhost:8080
   # Encrypts stored refresh tokens. Generate with: openssl rand -hex 32
   TOKEN_ENCRYPTION_KEY=64_hex_characters
   ```
3. **Run the application using Docker Compose:**
   ```sh
   docker-compose up -d
   ```
4. **Access the application:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

### 🚀 Setup without Docker (Manual Setup)

1. **Clone the repository:**
   ```sh
   git clone https://github.com/divyanshu-dj/contest_reminder.git
   cd contest_reminder
   ```
2. **Install dependencies** (there is no root `package.json`; each app has its own):
   ```sh
   (cd backend && npm install)
   (cd frontend && npm install)
   ```
3. **Set up environment variables:** (Create `.env` file inside `backend/`)
   ```env
   MONGO_URI=your_mongo_connection_string
   YOUTUBE_API_KEY=your_youtube_api_key
   REDIS_URL=your_redis_connection_string
   ADMIN_TOKEN=your_admin_token
   ```
4. **Run the backend:**
   ```sh
   cd backend
   npm run dev
   ```
5. **Run the frontend:**
   ```sh
   cd frontend
   npm run dev
   ```
6. **Access the application:**
   - Frontend: `http://localhost:8080` — this is the one to open
   - Backend: `http://localhost:5055` (override with `PORT`; the containers pin `PORT=5000`)

   The frontend calls `/api/...` on its own origin, which nginx proxies in production. In
   development Vite's `server.proxy` forwards `/api` to the backend, so there is no CORS
   setup and no API base URL to configure. Point it elsewhere with `VITE_API_TARGET`.

### 🗃 Database migration

Run once after upgrading from a version that stored `startTime`/`endTime` as
strings and `status` as a field. The deploy workflow runs it automatically; for a
manual run:

```sh
cd backend && npm run migrate
```

It converts string dates, removes the stored status, builds the indexes, and
refuses to finish while any string dates remain. Safe to run repeatedly.

### 🧪 Tests

```sh
cd backend && npm test
```

Runs `tsc`, then the Node built-in test runner (`node --test`) over the compiled output —
no test framework dependency. Covers the pagination clamp, the solution-URL allowlist, the
rate limiter (including its fail-open behaviour when Redis is unreachable), and the admin
guard's fail-closed behaviour.

## 🚀 CI/CD Pipeline

### ⚙️ Continuous Integration (CI)

- **Build Check:** Every pull request against `main` builds both apps and runs the backend
  test suite. Pushes made directly to `main` skip CI and deploy immediately, so changes
  should go through a pull request.

### 🚀 Continuous Deployment (CD)

- **Deployment:** The application is deployed to an **AWS EC2 instance** using **Docker**.
- **Reverse Proxy:** Nginx is used as a reverse proxy for better request handling and security.

## 🔮 Future Plans

- 🔗 Connect and integrate user coding profiles from multiple platforms.
- 🎴 Create custom cards displaying user statistics and achievements.
- 🗺️ Develop an interactive DSA Weekly Roadmap like a checklist for guided learning which can be printed.
- 📈 Implement Skill Gap Analysis to identify improvement areas.

## 👥 Contributors

- **Divyanshu Kumar Jha** - [GitHub](https://github.com/divyanshu-dj)

## 📜 License

This project is licensed under the MIT License.

