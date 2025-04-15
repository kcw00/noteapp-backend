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

    io.on("connection", (socket) => {
        socket.on('loggedUser', async (userId) => {
            console.log('User logged in:', userId)
            console.log('---------------------------------')
            activeUsers[userId] = socket.id
            console.log('Active users:', activeUsers)
            console.log('---------------------------------')

            const users = await User.find({ _id: { $in: Object.keys(activeUsers) } })
            io.emit('activeUsers', users)

            socket.on('fetchSharedNotes', async () => {
                const user = await User.findById(userId).populate('shared')
                const sharedNotes = user.shared
                if (!sharedNotes || sharedNotes.length === 0) {
                    return []
                }
                io.emit('sharedNotes', sharedNotes)
                console.log('Shared notes:', sharedNotes)
            })
        })

        socket.on('updateNote', async ({ noteId, changes }) => {
            try {
                const updatedNote = await Note.findByIdAndDelete(noteId, changes, { new: true })
                if (!updatedNote) {
                    return console.error('Note not found')
                }
            }
            catch (error) {
                console.error("Error updating note:", error)
            }
        })

        socket.on("deleteNote", async ({ noteId, userId }) => {
            try {
                const note = await Note.findById(noteId)
                if (!note) {
                    return console.error('Note not found')
                }

                // Check if the user is the creator of the note
                const isCreator = note.creator.toString() === userId.toString()
                if (!isCreator) {
                    return console.error('You do not have permission to delete this note')
                }

                const creator = await User.findById(userId)
                creator.notes = creator.notes.filter(n => n.toString() !== note.id.toString()) // remove note from user
                await creator.save()

                // Remove the note from all collaborators
                for (const collaborator of note.collaborators) {
                    const user = await User.findById(collaborator.userId)
                    if (user) {
                        user.shared = user.shared.filter(n => n.toString() !== note.id.toString()) // remove note from collaborator's shared notes
                        await user.save()
                    }
                }

                await Note.findByIdAndDelete(noteId)

                io.emit("noteDeleted", noteId)
            } catch (error) {
                console.error("Error deleting note:", error)
            }
        })


        socket.on('addCollaborator', async ({ noteId, collaboratorId }) => {
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
                            collaborator: {
                                userId: collaborator.id,
                                username: collaborator.username,
                                userType: collaborator.userType,
                            }

                        })
                    }
                }

            } catch (error) {
                console.error('Error sharing note with collaborators:', error)
            }
        })


        socket.on("logoutUser", () => {
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