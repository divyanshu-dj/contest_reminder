# 🚀 Contest Reminder

## 📌 Overview

**Contest Reminder** is a **MERN-based** web application that tracks upcoming, ongoing, and completed coding contests from **Codeforces, CodeChef, and LeetCode**. It offers features such as contest filtering, bookmarking, YouTube solution syncing, and Google Calendar integration for reminders, ensuring users never miss a contest.

## 🌍 Demo

- **Watch the Video:** [YouTube Link](https://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID)
- **Deployed Version:** [dsabunnies.me](https://dsabunnies.me)


## ✨ Features

- 📅 **Fetch and display** upcoming, ongoing, and past contests.
- 🎯 **Filters** to view contests from selected platforms.
- ⭐ **Bookmarking** contests for easy access.
- 🎥 **YouTube solution integration**:
  - 📌 Manually add solution links.
  - 🔄 Automatically sync solutions from **TLE Eliminator**.
- 🗓 **Google Calendar Integration**:
  - ⏰ Add upcoming contests as reminders.
  - 🔁 Auto-sync new contests if access is granted.
- 📜 **Infinite Scrolling** for completed contests.
- 📤 **Chunked Data Transfer** for optimal backend performance.
- 🚀 **Optimized Performance** with Redis Caching.
- 🌗 **Dark/Light mode toggle**.
- 📱 **Mobile & Tablet responsive UI**.
- 🐳 **Dockerized setup** for easy deployment.
- 🔄 **CI/CD Pipeline** for automated testing and deployment.
- 🔁 **Nginx as Reverse Proxy** for better performance.

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

```http
PATCH /api/contests/:contestId/solution
```

**Request Body:**

```json
{
  "url": "https://youtu.be/example"
}
```

### 🔄 Sync YouTube solutions automatically

```http
POST /api/contests/sync
```

**Response:**

```json
{ "message": "Contests synced successfully" }
```

## ⚙️ Setup & Installation

### 🛠 Prerequisites

- Node.js & npm
- Docker & Docker Compose
- MongoDB instance
- Redis instance

### 🚀 Setup with Docker (Recommended)

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-repo/contest-reminder.git
   cd contest-reminder
   ```
2. **Create a `.env` file in the `backend/` directory:**
   ```env
   MONGO_URI=your_mongo_connection_string
   YOUTUBE_API_KEY=your_youtube_api_key
   REDIS_URL=your_redis_connection_string
   REDIS_PASSWORD=your_redis_password
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
   git clone https://github.com/your-repo/contest-reminder.git
   cd contest-reminder
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:** (Create `.env` file inside `backend/`)
   ```env
   MONGO_URI=your_mongo_connection_string
   YOUTUBE_API_KEY=your_youtube_api_key
   REDIS_URL=your_redis_connection_string
   REDIS_PASSWORD=your_redis_password
   ```
4. **Run the backend:**
   ```sh
   cd backend
   npm run dev
   ```
5. **Run the frontend:**
   ```sh
   npm run dev
   ```
6. **Access the application:**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5000`

## 🚀 CI/CD Pipeline

### ⚙️ Continuous Integration (CI)

- **Build Check:** Every push triggers a build check to ensure the application compiles correctly.

### 🚀 Continuous Deployment (CD)

- **Deployment:** The application is deployed to an **AWS EC2 instance** using **Docker**.
- **Reverse Proxy:** Nginx is used as a reverse proxy for better request handling and security.

## 🔮 Future Plans

- 📨 Add RabbitMQ for cron job (contest fetching and yt video sync).
- 🔗 Connect and integrate user coding profiles from multiple platforms.
- 🎴 Create custom cards displaying user statistics and achievements.
- 🗺️ Develop an interactive DSA Weekly Roadmap like a checklist for guided learning which can be printed.
- 📈 Implement Skill Gap Analysis to identify improvement areas.

## 👥 Contributors

- **Divyanshu Kumar Jha** - [GitHub](https://github.com/divyanshu-dj)

## 📜 License

This project is licensed under the MIT License.

