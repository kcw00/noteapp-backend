# 📝 NoteApp Backend – Real-Time Collaboration API

This is the backend for the [Real-Time Collaborative Notes App](https://github.com/kcw00/Noteapp), built with **Node.js**, **Express**, **MongoDB**, **Hocuspocus** and **Socket.IO** / hosted on **DigitalOcean**. It supports real-time multi-user editing, role-based collaboration, and note-sharing logic.

---
## 🛠️ Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/your-username/noteapp-backend.git
cd noteapp-backend
```

### 2. Install dependencies

```bash
cd backend
npm install
```

### 3. Set up environment variables

Create `.env` file in root directory

`backend/.env`
```bash
PORT=your-port
SERVER_ADDRESS=your-backend-address
MONGODB_URI=mongodb+srv://your-db-uri
SECRET=your_jwt_secret
COLLAB_SECRET=your_collab_secret  # this is for tiptap token
```

### 4. Start servers

```bash
cd backend && npm run dev
```
---


## 📦 Features

- 🔐 **JWT authentication** with role-based access (`creator`, `editor`, `viewer`)
- 💡 **CRUD API** for notes and users
- ⚡ **Socket.IO integration** for real-time note updates
- 👥 **Collaboration management** (add/remove collaborators)
- 💬 **WebSocket events** broadcast to specific users
- 🧠 **TipTap + Hocuspocus integration** for collaborative text editing
- 🌐 Backend hosted on **DigitalOcean**

---

## 🛠️ Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- Hocuspocus server (Yjs-based)
- JSON Web Tokens (JWT)

---

## 📁 Project Structure

```bash
noteapp-backend/
├── controllers/          # Express route handlers
│   ├── collab.js
│   ├── login.js
│   ├── notes.js
│   ├── signup.js
│   └── users.js
├── models/               # Mongoose schemas
│   ├── note.js
│   └── user.js
├── sockets/
│   ├── hocuspocus.js     # Hocuspocus WebSocket server for tiptap
│   └── socket.js         # Socket.IO server + notifyUsers()
├── utils/
│   ├── collabToken.js
│   ├── config.js
│   ├── logger.js
│   └── middeleware.js    # Error handler, JWT user extractor
├── app.js                # Express app setup: routes, middleware, MongoDB
├── index.js              # Entry point: starts HTTP + WebSocket servers
└── .env                  # PORT, URL, MongoDB URI, JWT_SECRET
```
---

## 🧠 Key Concepts

### 🔒 Auth Middleware
JWT is verified using `userExtractor` middleware. This attaches the authenticated user to `request.user`
```js
const userExtractor = async (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.substring(7)

    try {
      const decodedToken = jwt.verify(token, process.env.SECRET)

      if (!decodedToken.id) {
        return response.status(401).json({ error: 'Token is missing or invalid' })
      }

      const user = await User.findById(decodedToken.id)
      if (!user) {
        return response.status(401).json({ error: 'User not found' })
      }
      request.user = user // Attach user information to the request object
      next()
    } catch (error) {
      return response.status(401).json({ error: 'Token missing or invalid ' + error })
    }
  } else {
    return response.status(401).json({ error: 'wrong authorization' })
  }
}
```

### 📡 WebSocket Integration
- `Socket.IO` for metadata events (sharing, deleting, etc.)
- `@hocuspocus/server` for real-time collaborative text editing via Yjs

**📢 notifyUsers() Function**
```js
const notifyUsers = (userIds, event, payload) => {
    console.log(`[notifyUsers] Called with userIds:`, userIds, `event: ${event}`)

    userIds.forEach((uid) => {
        const socketId = activeUsers[uid] // Get the socket ID from 'activeUsers'
        if (typeof socketId === 'string') {
            console.log(`[notifyUsers] Emitting '${event}' to user ${uid} at socket ${socketId}`)
            io.to(socketId).emit(event, payload) // Emit an event to collaborators who are online
        } else {
            console.log(`[notifyUsers] No socket IDs found for user ${uid}`, socketId) // if user is not online, log this message
        }
    })
}
```
---
## 🧪 Real-Time Socket Events

This backend uses `notifyUsers(userIds, event, payload)` to emit events to specific connected clients via `Socket.IO`.


#### 🔔 Events Emitted

| Event Name            | Payload Format                                 | Description                                                |
|-----------------------|------------------------------------------------|------------------------------------------------------------|
| `collaboratorAdded`   | `{ noteId, collaborator }`                     | Notify the added collaborators                             |
| `collaboratorRemoved` | `{ noteId, collaboratorId }`                   | Notify the removed collaborators                           |
| `noteDeleted`         | `{ id }`                                       | Notify all collaborators that a note was deleted           |
| `activeUsers`         | `[ { id, username, ... } ]`                    | Broadcasted to all users when connections change           |

---
