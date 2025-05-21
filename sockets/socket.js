const { Server } = require('socket.io')
const Note = require('../models/note')
const User = require('../models/user')
const config = require('../utils/config')

let io
const activeUsers = {}

const initializeSocket = (server) => {

    io = new Server(server, {
        cors: {
            origin: `${config.FRONTEND_URL}`,
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    })

    io.on("connection", (socket) => {
        socket.on('loggedUser', async (userId) => {
            console.log('[socket.io] User logged in:', userId)
            console.log('---------------------------------')
            activeUsers[userId] = socket.id
            console.log('[socket.io] Active users:', activeUsers)
            console.log('---------------------------------')

            const users = await User.find({ _id: { $in: Object.keys(activeUsers) } })
            io.emit('activeUsers', Object.keys(activeUsers))

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

        socket.on('updateNote', async ({ id, changes }) => {
            try {
                const updatedNote = await Note.findByIdAndUpdate(id, changes, { new: true })
                if (!updatedNote) {
                    return console.error('error while updating note: Note not found')
                }
                io.emit("noteUpdated", updatedNote)
            }
            catch (error) {
                console.error("Error updating note:", error)
            }
        })

        socket.on("logoutUser", () => {
            for (let userId in activeUsers) {
                if (activeUsers[userId] === socket.id) {
                    console.log('[socket.io] User logged out:', activeUsers[userId])
                    console.log('---------------------------------')
                    delete activeUsers[userId]
                    break
                }
            }
            io.emit('activeUsers', Object.keys(activeUsers))
        })
    })

    return io
}

// Used for emitting events to users who are online
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


// const getIo = () => {
//     if (!io) {
//         throw new Error("Socket.io not initialized")
//     }

//     return io
// }

module.exports = { initializeSocket, notifyUsers }