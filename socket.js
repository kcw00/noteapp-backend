const { Server } = require('socket.io')
const Note = require('./models/note')
const User = require('./models/user')

let io
const activeUsers = {}

const initializeSocket = (server) => {

    io = new Server(server, {
        cors: {
            origin: 'http://localhost:5173',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    })

    io.on("connect", (socket) => {
        console.log('socket:', socket)
        socket.on('loggedUser', (userId) => {
            console.log('User logged in:', userId)
            activeUsers[userId] = socket.id
            console.log('Active users:', activeUsers)
            io.emit('activeUsers', Object.keys(activeUsers))
        })

        socket.on("noteUpdated", async (noteId, changes) => {
            try {
                const updatedNote = await Note.findByIdAndUpdate(noteId, changes, { new: true })
                io.emit("noteUpdated", updatedNote)
            } catch (error) {
                console.error("Error updating note:", error)
            }
        })

        socket.on('noteShared', async (userId) => {
            try {
                const notes = await Note.findById(userId).populate('collaborators.userId')
                notes.map(note => note.collaborators.forEach((collaborator) => {
                    const collaboratorSocketId = activeUsers[collaborator.userId.toString()]
                    if (collaboratorSocketId) {
                        socket.to(collaboratorSocketId).emit('noteShared', note) // Send note to collaborator
                    }
                }))
            } catch (err) {
                console.error('Error sharing note:', err)
            }
        })

        // handle typing event
        socket.on("typing", ({ userId, noteId }) => {
            socket.broadcast.emit("typing", { userId, noteId })
        })

        // handle stop typing event
        socket.on("stopTyping", ({ userId, noteId }) => {
            socket.broadcast.emit("stopTyping", { userId, noteId })
        })

        socket.on('cursorPosition', ({ userId, noteId, position }) => {
            User.findById(userId)
                .then(user => {
                    if (user) {
                        socket.broadcast.emit('cursorUpdate', {
                            userId,
                            noteId,
                            position,
                            username: user.username,
                            userAvatar: user.avatar,
                        })
                    }
                })
                .catch(error => {
                    console.error("Error fetching user:", error)
                })
        })
        socket.on("disconnect", () => {
            for (let userId in activeUsers) {
                if (activeUsers[userId] === socket.id) {
                    delete activeUsers[userId]
                    break
                }
            }
        })
    })

    return io
}

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized")
    }

    return io
}

module.exports = { initializeSocket, getIo }