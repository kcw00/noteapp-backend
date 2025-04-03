const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const http = require('http')
const { initializeSocket } = require('./socket') // import socket setup

const server = http.createServer(app)

initializeSocket(server) // initialize socket after server creation

server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})
