const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const http = require('http')
const { initializeSocket } = require('./socket') // import socket.io setup
const { hocuspocus } = require('./hocuspocus') // import hocuspocus setup

const server = http.createServer(app)


initializeSocket(server) // initialize socket after server creation



hocuspocus.listen(() => {
  console.log('Yjs server is listening:', hocuspocus)
})


server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})
