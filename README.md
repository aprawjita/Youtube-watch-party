## 🎬 YouTube Watch Party

A real-time YouTube Watch Party application that allows multiple users to watch YouTube videos together in synchronized playback. The application uses WebSockets to keep all participants in sync for play, pause, seek, video changes, and late join synchronization while providing role-based access control.

---

## 🚀 Features

### Real-Time Synchronization
- Synchronized YouTube video playback
- Play/Pause synchronization
- Seek synchronization
- Change video synchronization
- Late join synchronization (new participants automatically receive the current video, playback position, and playback state)

### Room Management
- Create a new watch party room
- Join existing rooms using a Room ID
- Real-time participant list
- User join/leave notifications

### Role-Based Access Control
- Host (Room Creator)
- Moderator
- Participant

Host can:
- Play/Pause videos
- Seek videos
- Change YouTube video
- Assign moderator role
- Transfer host role

Participants can watch synchronized playback but cannot control the video unless promoted.

### YouTube Integration
- Embedded YouTube Player
- Paste any YouTube URL
- Automatically synchronizes playback across all connected users

---
## 🌟 Bonus Features Implemented

### 1. In-Room Text Chat
- Integrated real-time text chat, allowing users to communicate seamlessly while watching the video together. 

### 2. Live Emoji Reactions
- Implemented real-time emoji reactions, letting participants react to key moments in the video instantly.

### 3. Object-Oriented Domain Architecture (OOP)
- Structured the WebSocket backend around clean OOP principles with dedicated `Room` and `Participant` domain models.
- Encapsulated room state, participant lifecycles, and playback state mutations inside strongly typed domain classes.

### 4. Dynamic Host Role Transfer
- Built full Host transfer capabilities.
- When a Host transfers leadership to another participant, the system automatically demotes the current host to a regular participant and transfers exclusive room permissions in real time.

### 5. Real-Time Kick & Eviction Protocol
- Engineered a dedicated WebSocket event channel (`/topic/room/{roomId}/kicked`).
- Allows room Hosts to forcefully remove users, instantly broadcasting eviction events to ensure immediate client-side disconnection.



## 🛠 Tech Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Java Spring Boot
- Spring WebSocket
- STOMP

### Real-Time Communication
- WebSockets

---

## 🏗 Architecture Overview

The application follows a client-server architecture.

1. The Host creates a watch party room.
2. Participants join using the generated Room ID.
3. Playback events (Play, Pause, Seek, Change Video) are sent to the Spring Boot backend using WebSockets.
4. The backend validates user permissions based on their role.
5. Valid events are broadcast to all participants in the room.
6. Every connected client updates its YouTube player, ensuring synchronized playback.
7. When a new participant joins an ongoing watch party, the current playback state (video, timestamp, and play/pause status) is synchronized automatically.

---

## 📡 WebSocket Events

- Join Room
- Leave Room
- Play
- Pause
- Seek
- Change Video
- Assign Role
- Transfer Host
- User Joined
- User Left
- Synchronize Playback State

---

## 📦 Project Structure

```text
youtube-watch-party/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── backend/
│   ├── src/main/java/
│   ├── controller/
│   ├── service/
│   ├── websocket/
│   └── model/
```

---
## 🌐 Live Demo

**Frontend:**  
https://youtube-watch-party-dusky.vercel.app/

**Backend:**  
https://youtube-watch-party-an8d.onrender.com
  
```text
"Backend is hosted on Render free tier; initial load may take a few seconds due to cold start."  
```
---

## 📷 Demo

**Video Link** 
https://drive.google.com/file/d/1QQsSevfN3f1wqyhI2wIx-Y2Jn8zmA2kB/view?usp=sharing




## ⚙ Installation

### Clone the repository

```bash
git clone <repository-url>
cd youtube-watch-party
```

### Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend runs locally on:

```text
http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs locally on:

```text
http://localhost:5173
```

---

## ▶️ How to Use

1. Start the backend server.
2. Start the frontend.
3. Create a Watch Party room.
4. Share the Room ID with participants.
5. Paste a YouTube URL.
6. Enjoy synchronized playback with everyone in the room.

---

git add .
git commit -m "your change message"



