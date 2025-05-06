const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const http = require('http')
const { initializeSocket } = require('./socket/socket') // import socket.io setup
const { hocuspocus } = require('./socket/hocuspocus') // import hocuspocus setup

const server = http.createServer(app)


initializeSocket(server) // initialize socket after server creation



hocuspocus.listen(() => {
  console.log(`Yjs server running on port ${config.PORT}`)
})


server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})
