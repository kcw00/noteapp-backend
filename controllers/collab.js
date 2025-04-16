const collabRouter = require('express').Router()
const { generateCollabToken } = require('../utils/collabToken')

collabRouter.post('/', async (request, response) => {
    const { userId, noteId, permissions } = request.body

    // Validate input
    if (!userId || !noteId || !permissions) {
        return response.status(400).json({ error: 'Missing required fields' })
    }

    if (permissions === 'read') {
        return response.status(400).json({ error: 'Invalid permissions' })
    }

    // Generate token
    const token = generateCollabToken(userId, noteId, permissions)

    response.status(201).json({ token })
})

module.exports = collabRouter