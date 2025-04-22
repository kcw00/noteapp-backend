const { Server } = require('@hocuspocus/server')
const { TiptapTransformer } = require('@hocuspocus/transformer')
const Note = require('./models/note')
const Y = require('yjs')
const jwt = require('jsonwebtoken')
const { Document } = require('@tiptap/extension-document')
const { Paragraph } = require('@tiptap/extension-paragraph')
const { Text } = require('@tiptap/extension-text')
const { Placeholder } = require('@tiptap/extension-placeholder')


const ydocStore = {}

const hocuspocus = Server.configure({
    port: 1234,
    address: 'localhost',
    unloadImmediately: false,
    async onListen(data) {
        console.log('Yjs server is listening:', data)
    },
    async onAuthenticate(data) {
        const { token } = data
        if (!token) {
            return false
        }
        try {
            const decoded = jwt.decode(token)
            console.log('Decoded token:', decoded)
            if (decoded.permissions === 'write') {
                return true
            } else if (decoded.permissions === 'read') {
                data.connection.readOnly = true
                return true
            }
        } catch (error) {
            console.error('Error decoding token:', error)
            return false
        }
    },
    async onDisconnect(data) {
        console.log('Yjs server disconnected:', data)
    },
    async onLoadDocument(data) {
        const { documentName } = data
        const noteId = documentName

        const note = await Note.findById(noteId)
        console.log('note [onLoadDocument]:', note)

        const content = note?.content?.default
        
        if (!content) {
            console.log('Content is undefined or null')
            return new Y.Doc()
        }


        if (content) {
            const ydoc = TiptapTransformer.toYdoc(
                content,
                "default",
                [Document, Paragraph, Text, Placeholder]
            )
            return ydoc
        }
        return new Y.Doc()
    },
    async onStoreDocument(data) {

        try {
            const ydoc = data.document
            const noteId = data.documentName

            const content = TiptapTransformer.fromYdoc(ydoc)
            console.log('Content [onStoreDocument]:', content)

            if (!content) {
                console.log('Content is undefined or null')
                return
            }

            await Note.findByIdAndUpdate(noteId, {
                content: { default: content },
            })

            console.log('[onStoreDocument] Success')
        } catch (error) {
            console.error('[onStoreDocument] Failed to save:', error)
        }
    }
})

module.exports = { hocuspocus }