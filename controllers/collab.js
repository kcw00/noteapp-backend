const collabRouter = require('express').Router()
const { generateCollabToken } = require('../utils/collabToken')
// const jwt = require('jsonwebtoken')

collabRouter.post('/', async (request, response) => {
    const { userId, noteId, permissions } = request.body

    // Validate input
    if (!userId || !noteId || !permissions) {
        return response.status(400).json({ error: 'Missing required fields' })
    }

    if (permissions === 'read') {
        console.log('Read permissions granted')
    }

    // Generate token
    const token = generateCollabToken(userId, noteId, permissions)

    // // debugging
    // const decoded = jwt.decode(token)
    // console.log('Decoded token:', decoded)

    response.status(201).json({ token })
})

module.exports = collabRouter