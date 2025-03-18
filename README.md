# 🚀 Contest Reminder

## 📌 Overview
**Contest Reminder** is a **MERN-based** web application that tracks upcoming, ongoing, and completed coding contests from **Codeforces, CodeChef, and LeetCode**. It provides features such as contest filtering, bookmarking, YouTube solution syncing, and Google Calendar integration for reminders.

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
- 🌗 **Dark/Light mode toggle**.
- 📱 **Mobile & Tablet responsive UI**.

## 🌍 Demo
- **Live Demo:** [Click here](https://www.youtube.com/watch?v=aQKZoOK_x2I) 

## 🛠 Tech Stack
- **Frontend:** React, Vite, TypeScript, TailwindCSS, ShadCN UI
- **Backend:** Node.js, Express, MongoDB
- **Database:** MongoDB (Mongoose)
- **APIs & Libraries:**
  - `@tanstack/react-query` for data fetching
  - `axios` for API requests
  - `react-router-dom` for navigation
  - `dotenv` for environment variables
  - `cron` for scheduled contest updates

## 🔌 API Endpoints
### 📢 Fetch all contests
```http
GET /api/contests
```
**Response:**
```json
[
  {
    "contestId": "12345",
    "platform": "Codeforces",
    "name": "Codeforces Round 999",
    "startTime": "2025-03-20T14:00:00Z",
    "duration": "2h",
    "status": "upcoming",
    "youtubeVideo": "https://youtu.be/example"
  }
]
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
- MongoDB instance

### 🚀 Steps
1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-repo/contest-reminder.git
   cd contest-reminder
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:** (Create `.env` file in backend)
   ```env
   MONGO_URI=your_mongo_connection_string
   YOUTUBE_API_KEY=your_youtube_api_key
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
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:5173`

## 🔮 Future Plans
- 🛠 Fix **CodeChef contest fetching** bugs.
- 📥 Auto-fetch YouTube solutions for all contests.
- 🔔 Enable **auto Google Calendar sync** for new contests.

## 👥 Contributors
- **Divyanshu Kumar Jha** - [GitHub](https://github.com/your-profile)

## 📜 License
This project is licensed under the MIT License.

