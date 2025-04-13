const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const http = require('http')
const { initializeSocket } = require('./socket') // import socket.io setup
const { initializeYSocket } = require('./ySocket') // import ySocket setup

const server = http.createServer(app)


const io = initializeSocket(server) // initialize socket after server creation
const wss = initializeYSocket(server) // initialize ySocket after server creation



// Increase max listeners to avoid MaxListenersExceededWarning
require('events').EventEmitter.defaultMaxListeners = 20

// Handle WebSocket upgrades for both socket.io and y-websocket
server.on('upgrade', (req, socket, head) => {
  console.log(`Upgrade request URL: ${req.url}`)

  // First, check for y-websocket upgrade
  if (req.url.startsWith('/y-websocket')) {
    // Handle upgrade request for y-websocket
    if (!wss) {
      console.error('WebSocket server not initialized')
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)  // Hand over to y-websocket
    })
  }
  // If not y-websocket, check for socket.io upgrade
  else if (req.url.startsWith('/socket.io')) {
    if (!io) {
      console.error('Socket.io server not initialized')
      socket.destroy()
      return
    }

    io.emit('connection', socket, req)  // Hand over to socket.io

  }
})
server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})
