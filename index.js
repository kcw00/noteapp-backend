const app = require('./app')
const config = require('./utils/config')
const logger = require('./utils/logger')
const http = require('http')
const { initializeSocket } = require('./socket') // import socket.io setup
const { Server } = require('@hocuspocus/server')
const { TiptapTransformer } = require('@hocuspocus/transformer')

const server = http.createServer(app)


initializeSocket(server) // initialize socket after server creation

const ydocStore = {}

const hocuspocus = Server.configure({
  port: 1234,
  address: 'localhost',
  debounce: 10000,
  maxDebounce: 45000,
  unloadImmediately: false,
  async onListen(data) {
    console.log('Yjs server is listening on port:', data.port)
  },
  async onDisconnect(data) {
    console.log('Yjs server disconnected:', data)
  },
  async onStoreDocument(data) {
    const { room } = data
    if (!ydocStore[room]) {
      ydocStore[room] = new Y.Doc()
    }
    data.document = ydocStore[room]
  },
  async onLoadDocument(data) {
    const { document, documentName } = data
    const noteId = documentName

    if (!document.isEmpty('default')) {
      return
    }

    const note = await Note.findById(noteId)

    if (note.ydoc) {
      const doc = new Y.Doc()
      const dbState = new Uint8Array(note.ydoc)
      Y.applyUpdate(doc, dbState)
      ydocStore[noteId] = doc
      return doc
    }

    if (note.content) {
      const ydoc = TiptapTransformer.toYdoc(
        note.conetent,
      )
      Y.encodeStateAsUpdate(ydoc)
      return ydoc
    }

    return new Y.doc()
  },
})

hocuspocus.listen(() => {
  console.log('Yjs server is listening:', hocuspocus)
})

server.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`)
})
