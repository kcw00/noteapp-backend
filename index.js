const fs = require('fs')
const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const https = require('https')
const { initializeSocket } = require('./sockets/socket') // import socket.io setup
const { hocuspocus } = require('./sockets/hocuspocus') // import hocuspocus setup

const PORT = config.PORT || 443

const server = https.createServer({
  key: fs.readFileSync('/etc/letsencrypt/live/note-api.chaewon.ca/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/note-api.chaewon.ca/fullchain.pem'),
}, app)


initializeSocket(server) // initialize socket after server creation



hocuspocus.listen(() => {
  console.log(`Yjs server running on port ${PORT}`)
})


server.listen(config.PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})
