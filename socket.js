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
        socket.on('loggedUser', async (userId) => {
            console.log('User logged in:', userId)
            activeUsers[userId] = socket.id
            console.log('Active users:', activeUsers)

            // Fetch shared notes for the logged-in user
            try {
                const user = await User.findById(userId).populate('shared')
                const sharedNotes = user.shared || []
                socket.emit('sharedNotesFetched', sharedNotes)
            } catch (error) {
                console.error('Error fetching shared notes:', error)
            }

            io.emit('activeUsers', Object.keys(activeUsers))
        })

        socket.on("updateNote", async ({ noteId, changes }) => {
            try {
                const updatedNote = await Note.findByIdAndUpdate(noteId, changes, { new: true })
                io.to(activeUsers).emit("noteUpdated", updatedNote)
            } catch (error) {
                console.error("Error updating note:", error)
            }
        })


        socket.on('collaboratorAdded', async ({ noteId, collaboratorId }) => {
            try {
                const note = await Note.findById(noteId).populate('collaborators.userId')

                // Add the note to the 'shared' field of each collaborator

                const collaborator = await User.findById(collaboratorId)

                if (collaborator) {
                    if (!collaborator.shared.includes(noteId)) {
                        collaborator.shared.push(noteId)
                        await collaborator.save()
                    }

                    const collaboratorSocketId = activeUsers[collaboratorId]
                    if (collaboratorSocketId) {
                        io.to(collaboratorSocketId).emit("noteShared", note)
                        io.to(collaboratorSocketId).emit("collaboratorAdded", {
                            noteId: note.id,
                            collaboratorId: collaborator.id,
                        })
                    }
                }

            } catch (error) {
                console.error('Error sharing note with collaborators:', error)
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
        socket.on("logoutUser", ({ userId }) => {
            for (let userId in activeUsers) {
                if (activeUsers[userId] === socket.id) {
                    delete activeUsers[userId]
                    break
                }
            }
            io.emit('activeUsers', Object.keys(activeUsers))
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