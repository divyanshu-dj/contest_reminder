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
- 🗓 Google Calendar Integration
   - ⏰ **Add a contest as a reminder** via a prefilled Google Calendar event.
   - 📋 **Bulk-add by platform** for upcoming and ongoing contests.
- 🎨 User Interface
   - 📜 **Infinite scrolling** for completed contests.
   - 🌗 **Dark/Light mode toggle.**
   - 📱 **Mobile and tablet responsive design.**
- 🚀 Performance Optimization
   - 🚀 **Caching of Contests** using Redis.
   - 📤 **Chunked data transfer** for optimal backend performance.
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

### 📢 Fetch all contests

```http
GET /api/contests?offset=0&limit=30
```

**Response:**

```json
{
  "contests": [
    {
      "contestId": "12345",
      "platform": "Codeforces",
      "name": "Codeforces Round 999",
      "startTime": "2025-03-20T14:00:00Z",
      "duration": "2h",
      "status": "upcoming",
      "youtubeVideo": "https://youtu.be/example"
    }
  ],
  "hasMore": true
}
```

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

