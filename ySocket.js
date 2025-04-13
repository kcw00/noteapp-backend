const WebSocket = require('ws')
global.WebSocket = WebSocket

const Y = require('yjs')
const { WebsocketServer } = require('y-websocket')

const ydocStore = {} // Store Yjs documents for each room (note)

const initializeYSocket = (server) => {
    // Create a WebSocket server for Yjs, listen on a separate path
    const wss = new WebSocket.Server({ noServer: true })

    wss.on('connection', (ws, req) => {
        const room = req.url.split('/')[2] // Room identifier (e.g., noteId)

        // Create a new Yjs document if one doesn't exist for this room
        if (!ydocStore[room]) {
            const ydoc = new Y.Doc()
            ydocStore[room] = ydoc
        }

        const ydoc = ydocStore[room]
        const provider = new WebsocketServer({
            server: server,
            ydoc: ydoc,
            awareness: new Y.Awareness(ydoc)
        })

        const awareness = provider.awareness

        awareness.on('change', () => {
            const users = awareness.getStates()
            console.log('current users:', users)
        })

        


        ws.on('close', () => {
            provider.destroy() // Clean up when the connection closes
        })
    })

    return wss
}

module.exports = { initializeYSocket }
