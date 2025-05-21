const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const http = require('http')
const { initializeSocket } = require('./sockets/socket') // import socket.io setup
const { hocuspocus } = require('./sockets/hocuspocus') // import hocuspocus setup

const PORT = config.PORT || 443

server = http.createServer(app)
logger.info('✅ Using HTTP in development')


initializeSocket(server) // initialize socket after server creation



hocuspocus.listen(() => {
  console.log(`Yjs server running on port ${PORT}`)
})


server.listen(config.PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
