const { Server } = require('@hocuspocus/server')
const { TiptapTransformer } = require('@hocuspocus/transformer')
const Note = require('./models/note')
const Y = require('yjs')
const jwt = require('jsonwebtoken')
const { Document } = require('@tiptap/extension-document')
const { Paragraph } = require('@tiptap/extension-paragraph')
const { Text } = require('@tiptap/extension-text')
const { Placeholder } = require('@tiptap/extension-placeholder')
const { Bold } = require('@tiptap/extension-bold')
const { debounce } = require('debounce')


const hocuspocus = Server.configure({
    port: 1234,
    address: 'localhost',
    timeout: 1000,
    debounce: 200,
    async onListen(data) {
        console.log('Yjs server is listening:', data)
    },
    async onAuthenticate(data) {
        const { token } = data
        if (!token) {
            return false
        }
        try {
            // const decoded = jwt.decode(token)
            const decoded = jwt.verify(token, process.env.COLLAB_SECRET)
            console.log('[onAuthenticate] User:', decoded)
            if (decoded.permissions === 'write') {
                return true
            } else if (decoded.permissions === 'read') {
                data.connection.readOnly = true
                return true
            }
        } catch (error) {
            console.error('[onAuthenticate] Invalid token:', error)
            return false
        }
    },
    async onDisconnect(data) {
        console.log(`"${data.context}" has disconnected.`)
    },
    async onLoadDocument(data) {
        const { documentName } = data
        const noteId = documentName

        const note = await Note.findById(noteId)
        console.log('note [onLoadDocument]:', note)

        const content = note?.content?.default
        console.log('content [onLoadDocument]:', content)


        const ydoc = TiptapTransformer.toYdoc(
            content,
            "default",
            [Document, Paragraph, Text, Placeholder, Bold]
        )


        return ydoc

    },
    async onChange(data) {
        const noteId = data.documentName
        const save = async () => {
            try {
                const json = TiptapTransformer.fromYdoc(data.document)
                console.log('Content [onChange]:', json)

                const xml = data.document.getXmlFragment('default').toString()
                console.log('[onChange] Yjs XML Fragment:', xml)

                await Note.findByIdAndUpdate(noteId, {
                    content: json,
                })
            } catch (error) {
                console.error('[onChange] Failed to save:', error)
            }
            // decounced?.clear()
            // const decounced = debounce(save, 1000)
            // decounced()
            if (!data.context.deboucedSave) {
                data.context.deboucedSave = debounce(save, 1000)
            }

            data.context.deboucedSave()
            console.log('[onChange] Success')

        }
    },
    async onStoreDocument(data) {
        const ydoc = data.document
        const noteId = data.documentName

        console.log('[onStoreDocument] saving note', noteId)

        try {
            const json = TiptapTransformer.fromYdoc(ydoc)
            console.log('Content [onStoreDocument]:', json)

            if (!json) {
                console.log('Content is undefined or null')
                return
            }

            await Note.findByIdAndUpdate(noteId, {
                content: json,
            })

            console.log('[onStoreDocument] Success')
        } catch (error) {
            console.error('[onStoreDocument] Failed to save:', error)
        }
    }
})

module.exports = { hocuspocus }