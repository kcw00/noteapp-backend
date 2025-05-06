const { Server } = require('@hocuspocus/server')
const { TiptapTransformer } = require('@hocuspocus/transformer')
const Note = require('../models/note')
const Y = require('yjs')
const jwt = require('jsonwebtoken')
const { debounce } = require('debounce')
const config = require('../utils/config')
const User = require('../models/user')

// the list of all extensions used in the editor
// used for the node type checking
const { Document } = require('@tiptap/extension-document')
const { Paragraph } = require('@tiptap/extension-paragraph')
const { Text } = require('@tiptap/extension-text')
const { Placeholder } = require('@tiptap/extension-placeholder')
const { Bold } = require('@tiptap/extension-bold')
const { HardBreak } = require('@tiptap/extension-hard-break')
const { Heading } = require('@tiptap/extension-heading')
const { OrderedList } = require('@tiptap/extension-ordered-list')
const { BulletList } = require('@tiptap/extension-bullet-list')
const { ListItem } = require('@tiptap/extension-list-item')
const { CodeBlock } = require('@tiptap/extension-code-block')
const { Strike } = require('@tiptap/extension-strike')


const hocuspocus = Server.configure({
    port: 1234,
    address: config.ADDRESS,
    timeout: 1000,
    debounce: 200,
    async onListen(data) {
        console.log('---------------------------------')
        console.log(`Yjs server is listening on ${config.ADDRESS}:${data.port}`)
        console.log('---------------------------------')
    },
    async onAuthenticate(data) {
        const { token } = data
        if (!token) {
            return false
        }
        try {
            // const decoded = jwt.decode(token)
            const decoded = jwt.verify(token, process.env.COLLAB_SECRET)
            const user = await User.findById(decoded.userId)
            const userName = user.username
            console.log('[onAuthenticate] User:', userName)
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
        console.log('---------------------------------')
        console.log(`Yjs server has disconnected.`)
        console.log('---------------------------------')
    },
    async onLoadDocument(data) {
        const { documentName, document } = data
        const noteId = documentName

        const note = await Note.findById(noteId)
        console.log('[onLoadDocument] note:', note)

        const content = note?.content

        const ydoc = TiptapTransformer.toYdoc(
            content,
            "content",
            [Document, Paragraph, Text, Placeholder, Bold, HardBreak, Heading,
                OrderedList, BulletList, ListItem, CodeBlock, Strike],
        )

        const title = note?.title


        const titleDoc = {
            type: 'doc',
            content: [
                {
                    type: 'heading',
                    attrs: { level: 1 },
                    ...(title ? { content: [{ type: 'text', text: title }] } : {}),
                },
            ],
        }

        console.log('[onLoadDocument] final titleDoc:', JSON.stringify(titleDoc, null, 2))

        try {
            const titleYdoc = TiptapTransformer.toYdoc(titleDoc, 'title')
            const titleUpdate = Y.encodeStateAsUpdate(titleYdoc)
            Y.applyUpdate(ydoc, titleUpdate)
            console.log('[onLoadDocument] Injected title:', title)
        } catch (error) {
            console.error('[onLoadDocument] Failed to load title:', error)
        }

        return ydoc

    },
    async onChange(data) {
        const noteId = data.documentName
        const save = async () => {
            try {
                const json = TiptapTransformer.fromYdoc(data.document)

                const realContent = data.document.getXmlFragment('content').toString()
                const realTitle = data.document.getXmlFragment('title').toString()
                console.log('[onChange] Yjs XML Fragment:', realTitle)
                console.log('[onChange] Yjs XML Fragment:', realContent)

                await Note.findByIdAndUpdate(noteId, {
                    title: realTitle,
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
            // Convert the content to JSON
            const contentJson = TiptapTransformer.fromYdoc(ydoc, 'content')

            // Convert the title to text
            const titleText = ydoc.getXmlFragment('title').toString().replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim()

            console.log('[onStoreDocument] title:', ydoc.getXmlFragment('title').toString())
            console.log('[onStoreDocument] content:', ydoc.getXmlFragment('content').toString())

            if (!contentJson) {
                console.log('Content is undefined or null')
                return
            }

            await Note.findByIdAndUpdate(noteId, {
                title: titleText,
                content: contentJson,
            })

            console.log('[onStoreDocument] Success')
        } catch (error) {
            console.error('[onStoreDocument] Failed to save:', error)
        }
    }
})

module.exports = { hocuspocus }