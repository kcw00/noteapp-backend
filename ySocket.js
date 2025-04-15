const WebSocket = require('ws')
global.WebSocket = WebSocket

const Y = require('yjs')
const { Server } = require('@hocuspocus/server')

const ydocStore = {} // Store Yjs documents for each room (note)

const initializeYSocket = () => {
    // Create a WebSocket server for Yjs, listen on a separate path
    const wss = new WebSocket.Server({ noServer: true })

    const hocuspocus = Server.configure({
        port: 3001,
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
            const { room } = data
            if (ydocStore[room]) {
                data.document = ydocStore[room]
            } else {
                console.log('No document found for room:', room)
            }
        },
    })


    wss.on('connection', (ws, req) => {
        
        hocuspocus.handleConnection(ws, req)
        hocuspocus.listen(() => {
            console.log('Yjs server is listening:', hocuspocus)
        })

        ws.on('close', () => {
            hocuspocus.destroy() // Clean up when the connection closes
        })
    })

    return wss
}

module.exports = { initializeYSocket }
